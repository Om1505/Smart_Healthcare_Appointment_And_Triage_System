const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');
const Appointment = require('../models/Appointment');
const sendEmail = require('../utils/email_utils');
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

    // Send verification email to the doctor
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0891b2; margin: 0; font-size: 28px;">🎉 Verification Complete!</h1>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h2 style="color: #333; margin-bottom: 15px;">Dear Dr. ${doctor.fullName},</h2>
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              Congratulations! Your verification has been successfully completed by our admin team.
            </p>
          </div>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #0891b2; margin: 25px 0;">
            <p style="color: #0369a1; font-weight: 600; margin: 0; font-size: 16px;">
              🚀 You can now start your consultancy journey with IntelliConsult!
            </p>
          </div>
          
          <div style="margin: 25px 0;">
            <p style="color: #666; line-height: 1.6;">
              As a verified doctor, you can now:
            </p>
            <ul style="color: #666; line-height: 1.8; padding-left: 20px;">
              <li>Accept patient appointments</li>
              <li>Manage your schedule</li>
              <li>Conduct video consultations</li>
              <li>Update your profile and specialization</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" 
               style="background-color: #0891b2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Login to Your Dashboard
            </a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #9ca3af; font-size: 14px; margin: 0;">
              Thank you for choosing IntelliConsult to serve your patients.
            </p>
            <p style="color: #9ca3af; font-size: 14px; margin: 5px 0 0 0;">
              Best regards,<br>
              <strong>IntelliConsult Admin Team</strong>
            </p>
          </div>
        </div>
      </div>
    `;

    try {
      await sendEmail({
        email: doctor.email,
        subject: '🎉 Verification Complete - Start Your Consultancy Journey!',
        html: emailHtml
      });
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Continue with the response even if email fails
    }

    res.json({ message: 'Doctor verified successfully', doctor });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ... existing imports

router.get('/user/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const userId = req.params.id;

    // 1. Try to find the user in the Doctor collection first
    let user = await Doctor.findById(userId).select('-password');

    // 2. If not found in Doctors, try the Patient collection
    if (!user) {
      user = await Patient.findById(userId).select('-password');
    }

    // 3. If still not found, return a 404 error
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 4. Return the found user
    res.json(user);

  } catch (error) {
    console.error('Error fetching user details for admin:', error);
    res.status(500).json({ message: 'Server error while fetching user details' });
  }
});

// ... rest of the file

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

