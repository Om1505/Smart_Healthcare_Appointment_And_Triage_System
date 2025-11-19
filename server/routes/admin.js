const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');
const Appointment = require('../models/Appointment');
const sendEmail = require('../utils/email_utils');

// ==========================================
// GET USERS (Doctors & Patients with Filters)
// ==========================================
router.get('/users', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const { 
      name, email, license, status, specialization,
      patientName, patientEmail, patientDateFrom, patientDateTo
    } = req.query;

    let doctorQuery = {};
    
    if (name) {
      doctorQuery.fullName = { $regex: '^' + name, $options: 'i' };
    }
    if (email) {
      doctorQuery.email = { $regex: '^' + email, $options: 'i' };
    }
    if (license) {
      doctorQuery.licenseNumber = { $regex: '^'+license, $options: 'i' };
    }
    if (specialization && specialization !== 'all') {
      doctorQuery.specialization = specialization;
    }
    if (status && status !== 'all') {
      doctorQuery.isVerified = (status === 'verified');
    }

    let patientQuery = {};
    
    if (patientName) {
      patientQuery.fullName = { $regex: '^' + patientName, $options: 'i' };
    }
    if (patientEmail) {
      patientQuery.email = { $regex: '^' + patientEmail, $options: 'i' };
    }
    if (patientDateFrom) {
      patientQuery.createdAt = { ...patientQuery.createdAt, $gte: new Date(patientDateFrom) };
    }
    if (patientDateTo) {
      patientQuery.createdAt = { ...patientQuery.createdAt, $lte: new Date(patientDateTo + 'T23:59:59') };
    }

    const [patients, doctors] = await Promise.all([
      Patient.find(patientQuery).select('-password').sort({ createdAt: -1 }),
      Doctor.find(doctorQuery).select('-password').sort({ createdAt: -1 })
    ]);

    res.json({ patients, doctors });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ==========================================
// GET ALL APPOINTMENTS
// ==========================================
router.get('/appointments', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate('patient', 'fullName email')
      .populate('doctor', 'fullName email specialization')
      .sort({ date: -1 });

    res.json(appointments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ==========================================
// VERIFY DOCTOR
// ==========================================
router.put('/verify-doctor/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    doctor.isVerified = true;
    await doctor.save();

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
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" 
               style="background-color: #0891b2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Login to Your Dashboard
            </a>
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
    }

    res.json({ message: 'Doctor verified successfully', doctor });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ==========================================
// SUSPEND DOCTOR
// ==========================================
router.put('/suspend-doctor/:id', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
      const doctor = await Doctor.findById(req.params.id);
  
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
  
      doctor.isVerified = false;
      await doctor.save();
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff1f2;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-top: 5px solid #e11d48;">
            <h1 style="color: #e11d48; margin-top: 0;">Account Suspended</h1>
            <p style="color: #333; font-size: 16px; margin-bottom: 15px;">Dear Dr. ${doctor.fullName},</p>
            <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">
              Your IntelliConsult account has been temporarily suspended by our administrative team. 
              Your profile is no longer visible to patients, and you cannot accept new appointments at this time.
            </p>
            <p style="color: #666; line-height: 1.6;">
              If you believe this is an error, or to discuss reinstating your account, please contact our support team immediately.
            </p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
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
              subject: '⚠️ IntelliConsult Account Suspended',
              html: emailHtml,
          });
      } catch (emailError) {
          console.error("Failed to send suspension email:", emailError);
      }
      
      res.json({ message: 'Doctor suspended successfully', doctor });
    
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
});

// ==========================================
// REJECT DOCTOR (DELETE)
// ==========================================
router.delete('/reject-doctor/:id', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id);

        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h1 style="color: #333; margin-top: 0; margin-bottom: 20px;">Application Status Update</h1>
                <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Dear Dr. ${doctor.fullName},</p>
                <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">
                  Thank you for your interest in joining IntelliConsult. After carefully reviewing your profile, 
                  we are unable to approve your application at this time.
                </p>
                <p style="color: #666; line-height: 1.6;">
                  Your account information has been removed from our system. You are welcome to re-apply in the future if your qualifications change.
                </p>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
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
                subject: 'IntelliConsult Application Status',
                html: emailHtml,
            });
        } catch (emailError) {
            console.error("Failed to send rejection email:", emailError);
        }

        await Doctor.findByIdAndDelete(req.params.id);
        
        res.json({ message: 'Doctor rejected and removed successfully' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// ==========================================
// NEW: VERIFY (RE-ACTIVATE) PATIENT
// ==========================================
router.put('/verify-patient/:id', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
      const patient = await Patient.findById(req.params.id);
  
      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }
  
      patient.isVerified = true;
      await patient.save();
  
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f0fdf4;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-top: 5px solid #16a34a;">
            <h1 style="color: #16a34a; margin-top: 0;">Account Reactivated</h1>
            <p style="color: #333; font-size: 16px; margin-bottom: 15px;">Dear ${patient.fullName},</p>
            <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">
              Great news! Your IntelliConsult account has been reactivated by our administrative team.
            </p>
            <p style="color: #666; line-height: 1.6;">
              You can now log in, search for doctors, and book appointments as usual.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" 
                 style="background-color: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                Login to Portal
              </a>
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
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
          email: patient.email,
          subject: '✅ IntelliConsult Account Reactivated',
          html: emailHtml
        });
      } catch (emailError) {
        console.error('Error sending patient verification email:', emailError);
      }
  
      res.json({ message: 'Patient verified successfully', patient });
  
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

// ==========================================
// NEW: SUSPEND PATIENT
// ==========================================
router.put('/suspend-patient/:id', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
      const patient = await Patient.findById(req.params.id);
  
      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }
  
      // Set verified to false (suspend)
      patient.isVerified = false;
      await patient.save();
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff1f2;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-top: 5px solid #e11d48;">
            <h1 style="color: #e11d48; margin-top: 0;">Account Suspended</h1>
            <p style="color: #333; font-size: 16px; margin-bottom: 15px;">Dear ${patient.fullName},</p>
            <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">
              We are writing to inform you that your IntelliConsult account has been temporarily suspended by the administrator.
            </p>
            <p style="color: #666; line-height: 1.6;">
              During this suspension, you will not be able to book new appointments or access certain features of the platform. 
              If you believe this action was taken in error, please contact our support team for assistance.
            </p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
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
              email: patient.email,
              subject: '⚠️ IntelliConsult Account Suspended',
              html: emailHtml,
          });
      } catch (emailError) {
          console.error("Failed to send suspension email:", emailError);
      }
      
      res.json({ message: 'Patient suspended successfully', patient });
    
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

// ==========================================
// GENERIC DELETE USER
// ==========================================
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

// ==========================================
// GET SINGLE USER DETAILS
// ==========================================
router.get('/user/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const userId = req.params.id;
    let user = await Doctor.findById(userId).select('-password');
    if (!user) {
      user = await Patient.findById(userId).select('-password');
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);

  } catch (error) {
    console.error('Error fetching user details for admin:', error);
    res.status(500).json({ message: 'Server error while fetching user details' });
  }
});

module.exports = router;