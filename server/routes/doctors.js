const express = require('express');
const router = express.Router();
const Doctor = require('../models/Doctor');
const DoctorSchedule = require('../models/DoctorSchedule');
const authMiddleware = require('../middleware/auth');
router.get('/', async (req, res) => {
  try {
    const { search, specialty } = req.query;
    const query = { isVerified: true };
    if (specialty && specialty !== 'All Specialties') {
      query.specialization = specialty;
    }
    if (search) {
      query.fullName = { $regex: new RegExp('^' + search, 'i') };
    }
    const doctors = await Doctor.find(query).select('-password');
    res.json(doctors);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
router.get('/:id', async (req, res) => {
  try {
   
    const doctor = await Doctor.findById(req.params.id).select('-password');

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    if (!doctor.isVerified) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    res.json(doctor);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
router.get('/schedule/my-schedule', authMiddleware, async (req, res) => {
  try {
    if (req.user.userType !== 'doctor') {
      return res.status(403).json({ message: 'Access denied. Not a doctor.' });
    }

    const schedules = await DoctorSchedule.find({ 
      doctor: req.user.userId,
      isActive: true 
    }).sort({ dayOfWeek: 1 });

    res.json(schedules);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

