const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');
const router = express.Router();
const crypto = require('crypto');
const sendEmail = require('../utils/email_utils.js');

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
    
    const verificationToken = user.createEmailVerificationToken();
    
    await user.save();
    
    const verificationURL = `https://smart-healthcare-appointment-and-triage.onrender.com/api/auth/verify-email/${verificationToken}`;
    
    const message = `
      <h1>Welcome to IntelliConsult!</h1>
      <p>Thank you for registering. Please click the link below to verify your email address. This link is valid for 10 minutes.</p>
      <a href="${verificationURL}" style="background-color: #0F5257; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Your Email</a>
      <p>If you did not create this account, please ignore this email.</p>
    `;
    
    try {
      await sendEmail({
        email: user.email,
        subject: 'IntelliConsult - Email Verification',
        html: message,
      });
      
      res.status(201).json({ 
        message: `Registration successful! Please check your email at ${user.email} to verify your account.` 
      });
      
    } catch (emailError) {
      console.error(emailError);
      await Model.findByIdAndDelete(user._id);
      return res.status(500).json({ message: 'Failed to send verification email. Please try signing up again.' });
    }
    
  } catch (error) {
    console.error('Signup Error:', error);
    if (error.name === 'ValidationError') {
        let messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server error during signup.', error: error.message });
  }
});

router.get('/verify-email/:token', async (req, res) => {
  try {
    const token = req.params.token;
    
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
      
    const query = {
      emailVerificationToken: hashedToken,
      emailVerificationTokenExpires: { $gt: Date.now() }
    };

    let user = await Patient.findOne(query) ||
               await Doctor.findOne(query) ||
               await Admin.findOne(query);
    
    if (!user) {
      return res.redirect('https://smart-healthcare-appointment-and-triage.onrender.com/login?verified=false');
    }
    
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpires = undefined;
    await user.save();
    
    res.redirect('https://smart-healthcare-appointment-and-triage.onrender.com/login?verified=true');
    
  } catch (error) {
    console.error('Email verification error:', error);
    res.redirect('https://smart-healthcare-appointment-and-triage.onrender.com/login?verified=false');
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email, userType } = req.body;
  const Model = models[userType];
  
  if (!Model) {
    return res.status(400).json({ message: 'Invalid user type specified.' });
  }

  try {
    const user = await Model.findOne({ email });

    if (!user) {
      return res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    if (user.googleId && !user.password) {
      return res.status(200).json({ message: 'This account is registered with Google. Please log in using Google.' });
    }

    const resetToken = user.createPasswordResetToken();
    
    await user.save({ validateBeforeSave: false });

    const resetURL = `https://smart-healthcare-appointment-and-triage.onrender.com/reset-password/${resetToken}`;

    const message = `
      <h1>Password Reset Request</h1>
      <p>Please click the link below to create a new password. This link is valid for 10 minutes.</p>
      <a href="${resetURL}" style="background-color: #0F5257; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Your Password</a>
      <p>If you did not request this, please ignore this email.</p>
    `;

    await sendEmail({
      email: user.email,
      subject: 'IntelliConsult - Password Reset',
      html: message,
    });

    res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });

  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  }
});

router.put('/reset-password/:token', async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    const unhashedToken = req.params.token;

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(unhashedToken)
      .digest('hex');

    const query = {
      passwordResetToken: hashedToken,
      passwordResetTokenExpires: { $gt: Date.now() }
    };

    let user = await Patient.findOne(query) ||
               await Doctor.findOne(query) ||
               await Admin.findOne(query);

    if (!user) {
      return res.status(400).json({ message: 'Token is invalid or has expired.' });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    user.isEmailVerified = true; 

    await user.save();

    res.status(200).json({ message: 'Password reset successful! You can now log in.' });

  } catch (error) {
    console.error('Reset Password Error:', error);
    if (error.name === 'ValidationError') {
        let messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'An error occurred while resetting your password.' });
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
    
    if (user.googleId && !user.password) {
      return res.status(400).json({ message: 'This account is registered with Google. Please use Google Sign In.' });
    }
    
    if (!user.password) {
       return res.status(400).json({ message: 'Invalid account. No password set.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }
    if (user.isVerified === false) {
      return res.status(403).json({ 
        message: 'Your account has been suspended or is currently under review. Please contact support.' 
      });
    }

    if (!user.isEmailVerified) {
      return res.status(401).json({ 
        message: 'Your email is not verified. Please check your inbox for the verification link.' 
      });
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

router.get('/google', passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
}));

router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: 'https://smart-healthcare-appointment-and-triage.onrender.com/login?error=google_failed', 
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

    res.redirect(`https://smart-healthcare-appointment-and-triage.onrender.com/auth/callback?token=${token}&userType=${userType}&next=${encodeURIComponent(redirectPath)}`);
  }
);

module.exports = router;