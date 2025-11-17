const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const authMiddleware = require('../middleware/auth');
const sendEmail = require('../utils/email_utils');

// Import Razorpay
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

router.get('/available-slots/:doctorId', authMiddleware, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    const bookedAppointments = await Appointment.find({
      doctor: doctorId,
      status: 'upcoming',
    });

    const bookedSlots = new Set();
    bookedAppointments.forEach(apt => {
      const dateTimeString = `${new Date(apt.date).toDateString()}_${apt.time}`;
      bookedSlots.add(dateTimeString);
    });

    const blockedTimes = doctor.blockedTimes || [];

    const availableSlots = [];
    const slotDuration = 60; 
    const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const today = new Date();

    for (let i = 0; i < 14; i++) { 
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dayKey = daysOfWeek[date.getDay()];
      const daySchedule = doctor.workingHours.get(dayKey);

      if (daySchedule && daySchedule.enabled) {
        const [startHour, startMin] = daySchedule.start.split(':').map(Number);
        const [endHour, endMin] = daySchedule.end.split(':').map(Number);

        const startTime = new Date(date.setHours(startHour, startMin, 0, 0));
        const endTime = new Date(date.setHours(endHour, endMin, 0, 0));

        let currentSlotTime = new Date(startTime);
        while (currentSlotTime < endTime) {
          const timeString = currentSlotTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
          const dateString = currentSlotTime.toDateString();
          const dateTimeString = `${dateString}_${timeString}`;
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
          if (!bookedSlots.has(dateTimeString) && !isBlocked) {
            availableSlots.push({
              date: currentSlotTime.toISOString().split('T')[0],
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

router.get('/doctor', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'doctor') {
    return res.status(403).json({ message: 'Access denied. Not a doctor.' });
  }
  try {
    const appointments = await Appointment.find({ doctor: req.user.userId })
      .populate('patient', 'fullName email') // Get patient details
      .sort({ date: 1 });
    
    // Filter out appointments where patient is null (deleted patient references)
    const validAppointments = appointments.filter(appointment => appointment.patient);
    
    res.json(validAppointments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/appointments/book
// @desc    Book a new appointment
// @access  Private (Patient only)
router.post('/book', authMiddleware, async (req, res) => {
  console.log(req.body);
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
    
    console.log('Payment order request body:', req.body);
    console.log('Doctor ID:', doctorId);
    console.log('Amount:', amount);
    console.log('Currency:', currency);

    // Validate required fields
    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID is required.' });
    }
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required.' });
    }

    // Validate doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    // Create Razorpay order
    const options = {
      amount: parseInt(amount), // Ensure amount is an integer in paisa
      currency: currency,
      receipt: `order_${Date.now()}`,
      payment_capture: 1
    };
    
    console.log('Razorpay order options:', options);

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

    // Send confirmation email to patient for paid appointment
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #16a34a; margin: 0; font-size: 28px;">🎉 Payment Successful!</h1>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h2 style="color: #333; margin-bottom: 15px;">Dear ${appointmentData.patientNameForVisit},</h2>
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              Thank you for your payment! Your appointment has been successfully confirmed with IntelliConsult.
            </p>
          </div>
          
          <div style="background-color: #f0fdf4; padding: 25px; border-radius: 10px; border: 2px solid #16a34a; margin: 25px 0;">
            <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 18px;">📋 Appointment Details</h3>
            <div style="color: #333; line-height: 1.8;">
              <p style="margin: 8px 0;"><strong>👨‍⚕️ Doctor:</strong> ${doctor.fullName}</p>
              <p style="margin: 8px 0;"><strong>🏥 Specialization:</strong> ${doctor.specialization}</p>
              <p style="margin: 8px 0;"><strong>📅 Date:</strong> ${new Date(appointmentData.date).toDateString()}</p>
              <p style="margin: 8px 0;"><strong>🕐 Time:</strong> ${appointmentData.time}</p>
              <p style="margin: 8px 0;"><strong>💰 Amount Paid:</strong> ₹${doctor.consultationFee}</p>
              <p style="margin: 8px 0;"><strong>💳 Payment ID:</strong> ${razorpay_payment_id}</p>
              <p style="margin: 8px 0;"><strong>✅ Status:</strong> <span style="color: #16a34a; font-weight: 600;">Confirmed & Paid</span></p>
            </div>
          </div>
          
          <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 25px 0;">
            <p style="color: #1e40af; font-weight: 600; margin: 0; font-size: 16px;">
              📞 You will receive a video call link before your appointment time.
            </p>
          </div>
          
          <div style="margin: 25px 0;">
            <p style="color: #666; line-height: 1.6;">
              <strong>Preparation for your consultation:</strong>
            </p>
            <ul style="color: #666; line-height: 1.8; padding-left: 20px;">
              <li>Have your medical history and current medications ready</li>
              <li>Prepare a list of questions you want to ask the doctor</li>
              <li>Ensure you have a stable internet connection</li>
              <li>Find a quiet, well-lit space for the video call</li>
              <li>Test your camera and microphone beforehand</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/patient/dashboard" 
               style="background-color: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; margin-right: 10px;">
              View My Appointments
            </a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #9ca3af; font-size: 14px; margin: 0;">
              If you need to reschedule or have any questions, please contact our support team.
            </p>
            <p style="color: #9ca3af; font-size: 14px; margin: 5px 0 0 0;">
              Thank you for choosing IntelliConsult!<br>
              <strong>IntelliConsult Team</strong>
            </p>
          </div>
        </div>
      </div>
    `;

    try {
      await sendEmail({
        email: appointmentData.email,
        subject: '🎉 Payment Successful - Appointment Confirmed | IntelliConsult',
        html: emailHtml
      });
    } catch (emailError) {
      console.error('Error sending payment confirmation email:', emailError);
      // Continue with the response even if email fails
    }

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

