const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const authMiddleware = require('../middleware/auth');

// Import Razorpay
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID ,
  key_secret: process.env.RAZORPAY_KEY_SECRET 
});

router.get('/available-slots/:doctorId', authMiddleware, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    // --- Add guard clauses to prevent crash ---
    if (!doctor.workingHours) {
      console.error("Doctor model is missing 'workingHours'. Skipping slot generation.");
      return res.json([]); 
    }
    
    // 1. Get all upcoming appointments for this doctor
    const bookedAppointments = await Appointment.find({
      doctor: doctorId,
      status: 'upcoming',
    });

    const bookedSlots = new Set();
    bookedAppointments.forEach(apt => {
      // --- FIX: Correct template literal syntax ---
      const dateTimeString = `${new Date(apt.date).toDateString()}_${apt.time}`;
      bookedSlots.add(dateTimeString);
    });

    // 2. Get the doctor's blocked times
    const blockedTimes = doctor.blockedTimes || []; // Use empty array if undefined
    
    // 3. Generate potential slots for the next 14 days
    const availableSlots = [];
    const slotDuration = 60; // 60 minutes per slot (you can change this)
    const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const today = new Date();

    for (let i = 0; i < 14; i++) { // Generate for the next 14 days
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toDateString();
      
      const dayKey = daysOfWeek[date.getDay()];
      const daySchedule = doctor.workingHours.get(dayKey);

      // 4. Check if the doctor works on this day
      if (daySchedule && daySchedule.enabled) {
        const [startHour, startMin] = daySchedule.start.split(':').map(Number);
        const [endHour, endMin] = daySchedule.end.split(':').map(Number);

        const startTime = new Date(date.setHours(startHour, startMin, 0, 0));
        const endTime = new Date(date.setHours(endHour, endMin, 0, 0));

        // 5. Loop through the workday and create slots
        let currentSlotTime = new Date(startTime);
        while (currentSlotTime < endTime) {
          const timeString = currentSlotTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
          // --- FIX: Correct template literal syntax ---
          const dateTimeString = `${dateString}_${timeString}`;

          // 6. Check for Blocks
          let isBlocked = false;
          for (const block of blockedTimes) {
            const blockDate = new Date(block.date).toDateString();
            if (blockDate === dateString) {
              const slotTime = currentSlotTime.toTimeString().substring(0, 5); // "HH:MM"
              if (slotTime >= block.startTime && slotTime < block.endTime) {
                isBlocked = true;
                break;
              }
            }
          }

          // 7. Add to list ONLY if not booked AND not blocked
          if (!bookedSlots.has(dateTimeString) && !isBlocked) {
            availableSlots.push({
              date: currentSlotTime.toISOString().split('T')[0], // "YYYY-MM-DD"
              time: timeString
            });
          }
          
          currentSlotTime.setMinutes(currentSlotTime.getMinutes() + slotDuration);
        }
      }
    }
    res.json(availableSlots);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/appointments/my-appointments
// @desc    Get all appointments for the logged-in patient
// @access  Private (Patient only)
router.get('/my-appointments', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'patient') {
    return res.status(403).json({ message: 'Access denied. Not a patient.' });
  }
  try {
    const appointments = await Appointment.find({ patient: req.user.userId })
      .populate('doctor', 'fullName specialization')
      .sort({ date: -1 });

    res.json(appointments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/appointments/doctor
// @desc    Get all appointments for the logged-in doctor
// @access  Private (Doctor only)
router.get('/doctor', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'doctor') {
    return res.status(403).json({ message: 'Access denied. Not a doctor.' });
  }
  try {
    const appointments = await Appointment.find({ doctor: req.user.userId })
      .populate('patient', 'fullName email') // Get patient details
      .sort({ date: 1 });
    res.json(appointments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/appointments/book
// @desc    Book a new appointment
// @access  Private (Patient only)
router.post('/book', authMiddleware, async (req, res) => {
  // 1. Destructure ALL fields from the body
  const {
    doctorId, date, time, patientNameForVisit,
    // Triage fields
    emergencyDisclaimerAcknowledged,
    primaryReason,
    symptomsList,
    symptomsOther,
    symptomsBegin,
    severeSymptomsCheck,
    preExistingConditions,
    preExistingConditionsOther,
    pastSurgeries,
    familyHistory,
    familyHistoryOther,
    allergies,
    medications,
    consentToAI
  } = req.body;

  try {
    // 2. Basic validation
    if (!doctorId || !date || !time || !patientNameForVisit || !primaryReason) {
      return res.status(400).json({ message: 'Missing required fields: doctor, date, time, patient name, or reason.' });
    }

    // 3. Check for double-bookings (race condition)
    const existingAppointment = await Appointment.findOne({
      doctor: doctorId,
      date: new Date(date),
      time: time,
      status: 'upcoming'
    });
    if (existingAppointment) {
      return res.status(409).json({ message: 'This time slot is no longer available. Please select another.' });
    }

    // 4. Fetch the doctor to get their fee
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }
    const fee = doctor.consultationFee || 0; // Use default if fee is missing

    // 5. Create new appointment with all fields
    const newAppointment = new Appointment({
      patient: req.user.userId,
      doctor: doctorId,
      date,
      time,
      patientNameForVisit,
      consultationFeeAtBooking: fee,
      paymentStatus: 'pending',
      // Triage fields
      emergencyDisclaimerAcknowledged,
      primaryReason,
      symptomsList,
      symptomsOther,
      symptomsBegin,
      severeSymptomsCheck,
      preExistingConditions,
      preExistingConditionsOther,
      pastSurgeries,
      familyHistory,
      familyHistoryOther,
      allergies,
      medications,
      consentToAI
    });

    const appointment = await newAppointment.save();
    res.status(201).json(appointment);
  } catch (err) {
    console.error('Booking Error:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/appointments/:id/cancel
// @desc    Cancel an appointment
// @access  Private (Patient only)
router.put('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    if (appointment.patient.toString() !== req.user.userId) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    // --- FIX: Add backticks for template literal ---
    if (appointment.status !== 'upcoming') {
      return res.status(400).json({ message: `Cannot cancel an appointment that is already ${appointment.status}.` });
    }

    appointment.status = 'cancelled';
    await appointment.save();
    res.json({ message: 'Appointment cancelled successfully', appointment });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/appointments/:id/complete
// @desc    Mark an appointment as completed
// @access  Private (Doctor only)
router.put('/:id/complete', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'doctor') {
    return res.status(403).json({ message: 'Access denied. Not a doctor.' });
  }

  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    if (appointment.doctor.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied. You are not assigned to this appointment.' });
    }
    // --- FIX: Add backticks for template literal ---
    if (appointment.status !== 'upcoming') {
      return res.status(400).json({ message: `Cannot complete an appointment that is already ${appointment.status}.` });
    }

    appointment.status = 'completed';
    await appointment.save();
    res.json({ message: 'Appointment marked as completed successfully', appointment });
  } catch (err) {
    console.error('Complete Appointment Error:', err.message);
    res.status(500).send('Server Error');
  }
});

// Create payment order
router.post('/create-payment-order', authMiddleware, async (req, res) => {
  try {
    const { doctorId, amount, currency = 'INR' } = req.body;

    // Validate doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    // Create Razorpay order
    const options = {
      amount: amount, // amount in paisa
      currency: currency,
      receipt: `order_${Date.now()}`,
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });

  } catch (error) {
    console.error('Payment order creation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create payment order' 
    });
  }
});

// Verify payment and book appointment
router.post('/verify-payment', authMiddleware, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      doctorId,
      ...appointmentData
    } = req.body;

    // Verify payment signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_key_secret')
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    // Get doctor's consultation fee
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    // Payment verified, now create appointment
    const appointment = new Appointment({
      patient: req.user.userId,
      doctor: doctorId,
      date: appointmentData.date,
      time: appointmentData.time,
      reasonForVisit: appointmentData.primaryReason,
      symptoms: appointmentData.symptoms || [],
      patientNameForVisit: appointmentData.patientNameForVisit,
      phoneNumber: appointmentData.phoneNumber,
      email: appointmentData.email,
      birthDate: appointmentData.birthDate,
      sex: appointmentData.sex,
      primaryLanguage: appointmentData.primaryLanguage,
      symptomsBegin: appointmentData.symptomsBegin,
      severeSymptomsCheck: appointmentData.severeSymptomsCheck || [],
      preExistingConditions: appointmentData.preExistingConditions || [],
      pastSurgeries: appointmentData.pastSurgeries,
      familyHistory: appointmentData.familyHistory || [],
      allergies: appointmentData.allergies,
      medications: appointmentData.medications,
      consentToAI: appointmentData.consentToAI,
      emergencyDisclaimerAcknowledged: appointmentData.emergencyDisclaimerAcknowledged,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      paymentStatus: 'paid',
      status: 'upcoming',
      consultationFeeAtBooking: doctor.consultationFee || 0
    });

    await appointment.save();

    res.json({
      success: true,
      message: 'Payment verified and appointment booked successfully',
      appointment: appointment
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed'
    });
  }
});

module.exports = router;

