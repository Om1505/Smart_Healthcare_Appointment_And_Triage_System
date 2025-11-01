const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');
const Appointment = require('../models/Appointment');
router.get('/users', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const patients = await Patient.find().select('-password');
    const doctors = await Doctor.find().select('-password');
    res.json({ patients, doctors });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
router.get('/appointments', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate('patient', 'fullName email')
      .populate('doctor', 'fullName email specialization');
    
    res.json(appointments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
router.put('/verify-doctor/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    doctor.isVerified = true;
    
    await doctor.save();
    
    res.json({ message: 'Doctor verified successfully', doctor });
  
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
router.delete('/user/:userType/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const { userType, id } = req.params;
    let Model;

    if (userType === 'patient') {
      Model = Patient;
    } else if (userType === 'doctor') {
      Model = Doctor;
    } else {
      return res.status(400).json({ message: 'Invalid user type' });
    }

    const user = await Model.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await Model.findByIdAndDelete(id);
    
    res.json({ message: `${userType} deleted successfully` });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
module.exports = router;

