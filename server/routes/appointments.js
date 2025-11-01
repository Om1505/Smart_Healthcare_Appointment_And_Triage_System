const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const authMiddleware = require('../middleware/auth');
const Doctor = require('../models/Doctor');

router.get('/available-slots/:doctorId', authMiddleware, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    // 1. Get all upcoming appointments for this doctor
    const bookedAppointments = await Appointment.find({
      doctor: doctorId,
      status: 'upcoming',
    });

    // Create a Set of booked "date_time" strings for fast lookup
    const bookedSlots = new Set();
    bookedAppointments.forEach(apt => {
      const dateTimeString = `${new Date(apt.date).toDateString()}_${apt.time}`;
      bookedSlots.add(dateTimeString);
    });

    // 2. Generate potential slots for the next 14 days
    const availableSlots = [];
    const slotDuration = 60; // 60 minutes per slot (you can change this)
    const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const today = new Date();

    for (let i = 0; i < 14; i++) { // Generate for the next 14 days
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dayKey = daysOfWeek[date.getDay()];
      const daySchedule = doctor.workingHours.get(dayKey);

      // 3. Check if the doctor works on this day
      if (daySchedule && daySchedule.enabled) {
        const [startHour, startMin] = daySchedule.start.split(':').map(Number);
        const [endHour, endMin] = daySchedule.end.split(':').map(Number);

        const startTime = new Date(date.setHours(startHour, startMin, 0, 0));
        const endTime = new Date(date.setHours(endHour, endMin, 0, 0));

        // 4. Loop through the workday and create slots
        let currentSlotTime = new Date(startTime);
        while (currentSlotTime < endTime) {
          // Format time to "10:00 AM"
          const timeString = currentSlotTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
          const dateString = currentSlotTime.toDateString();
          const dateTimeString = `${dateString}_${timeString}`;

          // 5. Add to list ONLY if it's not in the booked set
          if (!bookedSlots.has(dateTimeString)) {
            availableSlots.push({
              date: currentSlotTime.toISOString().split('T')[0], // "YYYY-MM-DD"
              time: timeString
            });
          }
          
          // Move to the next slot
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

router.get('/my-appointments', authMiddleware, async (req, res) => {
  try {
    const appointments = await Appointment.find({ patient: req.user.userId })
      // --- 2. FIX: 'specialty' changed to 'specialization' to match your Doctor model
      .populate('doctor', 'fullName specialization')
      .sort({ date: -1 });

    res.json(appointments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.get('/doctor', authMiddleware, async (req, res) => {
    // First, ensure the user is a doctor
    if (req.user.userType !== 'doctor') {
        return res.status(403).json({ message: 'Access denied. Not a doctor.' });
    }
    try {
        const appointments = await Appointment.find({ doctor: req.user.userId })
            .populate('patient', 'fullName') // Get patient's name from the Patient collection
            .sort({ date: 1 }); // Sort by the soonest date
        res.json(appointments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.post('/book', authMiddleware, async (req, res) => {
  const {
    doctorId,
    date,
    time,
    patientNameForVisit,
    reasonForVisit,
    symptoms,
    symptomDuration,
    previousTreatments,
    medications,
  } = req.body;

  try {
    if (!doctorId || !date || !time || !patientNameForVisit /* Removed reason validation for flexibility */) {
      return res.status(400).json({ message: 'Missing required fields: doctor, date, time, patient name.' });
    }
    const existingAppointment = await Appointment.findOne({
      doctor: doctorId,
      date: new Date(date), // Ensure date is compared as a Date object
      time: time,
      status: 'upcoming'
    });

    if (existingAppointment) {
      return res.status(409).json({ message: 'This time slot is no longer available. Please select another.' });
    }
    // --- 1. FETCH THE DOCTOR TO GET THEIR FEE ---
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }
    const fee = doctor.consultationFee; // Get the fee

    const newAppointment = new Appointment({
      patient: req.user.userId,
      doctor: doctorId,
      date,
      time,
      patientNameForVisit,
      reasonForVisit,
      symptoms,
      symptomDuration,
      previousTreatments,
      medications,
      // --- 2. SET THE NEW FIELDS ---
      consultationFeeAtBooking: fee,
      paymentStatus: 'pending', // Hardcoded for now
    });

    const appointment = await newAppointment.save();
    res.status(201).json(appointment);
  } catch (err) {
    console.error('Booking Error:', err.message); // Added context
    res.status(500).send('Server Error');
  }
});

router.put('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    // Check 1: Does the appointment exist?
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check 2: Is the person canceling the one who booked it?
    if (appointment.patient.toString() !== req.user.userId) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    
    // Check 3: Is it already completed or cancelled?
    if (appointment.status !== 'upcoming') {
      return res.status(400).json({ message: `Cannot cancel an appointment that is already ${appointment.status}.` });
    }

    // Update the status
    appointment.status = 'cancelled';
    await appointment.save();

    res.json({ message: 'Appointment cancelled successfully', appointment });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


router.put('/:id/complete', authMiddleware, async (req, res) => {
  // 1. Verify user is a doctor
  if (req.user.userType !== 'doctor') {
    return res.status(403).json({ message: 'Access denied. Not a doctor.' });
  }

  try {
    const appointment = await Appointment.findById(req.params.id);

    // 2. Check if appointment exists
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // 3. Verify the logged-in doctor is assigned to this appointment
    if (appointment.doctor.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied. You are not assigned to this appointment.' });
    }

    // 4. Check if the appointment is 'upcoming' (can only complete upcoming)
    if (appointment.status !== 'upcoming') {
      return res.status(400).json({ message: `Cannot complete an appointment that is already ${appointment.status}.` });
    }

    // 5. Update the status
    appointment.status = 'completed';
    await appointment.save();

    res.json({ message: 'Appointment marked as completed successfully', appointment });
  } catch (err) {
    console.error('Complete Appointment Error:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;