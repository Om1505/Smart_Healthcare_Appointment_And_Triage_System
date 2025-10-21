const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const authMiddleware = require('../middleware/auth');
const Doctor = require('../models/Doctor');

router.get('/my-appointments', authMiddleware, async (req, res) => {
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
            .populate('patient', 'fullName') 
            .sort({ date: 1 });
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
   
    if (!doctorId || !date || !time || !patientNameForVisit || !reasonForVisit) {
      return res.status(400).json({ message: 'Missing required fields for booking.' });
    }

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
    });

    const appointment = await newAppointment.save();
    
    res.status(201).json(appointment);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.put('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

   
    if (appointment.patient.toString() !== req.user.userId) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    
    
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

module.exports = router;