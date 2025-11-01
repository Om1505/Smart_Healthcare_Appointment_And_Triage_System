const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
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
  const { userType, email } = req.body;
  const Model = models[userType];

  if (!Model) {
    return res.status(400).json({ message: 'Invalid user type specified.' });
  }
  try {
    const patientExists = await Patient.findOne({ email });
    const doctorExists = await Doctor.findOne({ email });
    const adminExists = await Admin.findOne({ email });

    if (patientExists || doctorExists || adminExists) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    const user = new Model(req.body);
    
    user.isProfileComplete = true; 
    
    await user.save();
    
    res.status(201).json({ message: `${userType.charAt(0).toUpperCase() + userType.slice(1)} created successfully!` });
  } catch (error) {
    console.error('Signup Error:', error);
    if (error.name === 'ValidationError') {
        let messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ message: messages.join(', ') });
    }
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
    
    if (!user.password) {
        return res.status(400).json({ message: 'This account was registered using Google. Please use Google Sign In.' });
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

    if (!user.isProfileComplete) {
        return res.status(200).json({ 
          token, 
          profileComplete: false, 
          message: 'Login successful, please complete your profile.' 
        });
    }

    res.status(200).json({ 
      token, 
      profileComplete: true, 
      message: 'Logged in successfully!' 
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error during login.', error: error.message });
  }
});

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: 'http://localhost:5173/login?error=google_failed', 
    failureMessage: true,
    session: false 
   }),
  (req, res) => {
    const user = req.user;
    const userType = user.userType; 

    const token = jwt.sign(
      { userId: user.id, userType: userType },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    let redirectPath;
    if (!user.isProfileComplete) {
      redirectPath = '/complete-profile'; 
    } else {
      
      switch (userType) {
        case 'doctor': redirectPath = '/doctor/dashboard'; break;
        case 'patient': redirectPath = '/patient/dashboard'; break;
        case 'admin': redirectPath = '/admin/dashboard'; break; 
        default: redirectPath = '/'; 
      }
    }

    res.redirect(`http://localhost:5173/auth/callback?token=${token}&userType=${userType}&next=${encodeURIComponent(redirectPath)}`);
  }
);

module.exports = router;

