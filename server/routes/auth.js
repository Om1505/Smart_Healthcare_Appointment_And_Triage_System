const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');
const router = express.Router();
const models = {
  patient: Patient,
  doctor: Doctor,
  admin: Admin,
};
router.post('/signup', async (req, res) => {
  const { userType } = req.body;
  const Model = models[userType];

  if (!Model) {
    return res.status(400).json({ message: 'Invalid user type specified.' });
  }
  try {
    const patientExists = await Patient.findOne({ email: req.body.email });
    const doctorExists = await Doctor.findOne({ email: req.body.email });
    const adminExists = await Admin.findOne({ email: req.body.email });
    if (patientExists || doctorExists || adminExists) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }
    const user = new Model(req.body);
    await user.save();
    res.status(201).json({ message: `${userType.charAt(0).toUpperCase() + userType.slice(1)} created successfully!` });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ message: 'Server error during signup.', error: error.message });
  }
});
router.post('/login', async (req, res) => {
  const { email, password, userType } = req.body;
  const Model = models[userType];

  if (!Model) {
    return res.status(400).json({ message: 'Invalid user type specified.' });
  }
  try {
    const user = await Model.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials or user role.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }
    const token = jwt.sign(
      { userId: user._id, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ token, message: 'Logged in successfully!' });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error during login.', error: error.message });
  }
});
module.exports = router;
