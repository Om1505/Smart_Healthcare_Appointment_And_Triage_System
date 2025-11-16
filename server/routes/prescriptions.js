const express = require('express');

const router = express.Router();

const authMiddleware = require('../middleware/auth');

const Appointment = require('../models/Appointment');

const MedicalRecord = require('../models/MedicalRecord');

const Patient = require('../models/Patient');

const sendEmail = require('../utils/email_utils');



// @route   POST api/prescriptions

// @desc    Create a prescription/medical record for an appointment

// @access  Private (Doctor only)

router.post('/', authMiddleware, async (req, res) => {

  if (req.user.userType !== 'doctor') {

    return res.status(403).json({ message: 'Access denied. Not a doctor.' });

  }



  try {

    const {

      appointmentId,

      diagnosis,

      notes,

      prescription,

      followUpRequired,

      followUpDate,

      followUpNotes

    } = req.body;



    console.log('POST /api/prescriptions payload:', {

      appointmentId,

      doctor: req.user.userId

    });



    const normalizedAppointmentId = appointmentId?.trim();



    // Validate required fields

    if (!normalizedAppointmentId || !diagnosis) {

      return res.status(400).json({ message: 'Appointment ID and diagnosis are required.' });

    }



    // Verify appointment exists and belongs to this doctor

    const appointment = await Appointment.findById(normalizedAppointmentId)

      .populate('patient', 'fullName email')

      .populate('doctor', 'fullName email');



    if (!appointment) {

      console.warn('Prescription create: appointment not found', {

        appointmentId: normalizedAppointmentId,

        doctor: req.user.userId

      });

      return res.status(404).json({ message: 'Appointment not found.' });

    }



    // Handle both ObjectId and populated doctor

    const doctorIdString = appointment.doctor._id ? appointment.doctor._id.toString() : appointment.doctor.toString();

    if (doctorIdString !== req.user.userId) {

      return res.status(403).json({ message: 'Access denied. This appointment does not belong to you.' });

    }



    // Check if medical record already exists

    const existingRecord = await MedicalRecord.findOne({ appointment: normalizedAppointmentId });

    if (existingRecord) {

      return res.status(400).json({ message: 'Prescription already exists for this appointment. Use update endpoint instead.' });

    }



    // Create medical record

    // Handle both ObjectId and populated patient/doctor

    const patientId = appointment.patient._id ? appointment.patient._id : appointment.patient;

    const doctorId = appointment.doctor._id ? appointment.doctor._id : appointment.doctor;
    

    const medicalRecord = new MedicalRecord({

      appointment: normalizedAppointmentId,

      patient: patientId,

      doctor: doctorId,

      diagnosis: diagnosis.trim(),

      notes: notes ? notes.trim() : '',

      prescription: prescription || [],

      followUpRequired: followUpRequired || false,

      followUpDate: followUpRequired && followUpDate ? new Date(followUpDate) : null,

      followUpNotes: followUpRequired && followUpNotes ? followUpNotes.trim() : '',

      createdBy: req.user.userId

    });



    await medicalRecord.save();



    // Send follow-up email if required

    if (followUpRequired && followUpDate) {

      try {

        // Get patient - either from populated appointment or fetch from DB

        const patient = appointment.patient._id 

          ? await Patient.findById(appointment.patient._id)

          : await Patient.findById(appointment.patient);
          

        if (patient && patient.email) {

          const followUpDateFormatted = new Date(followUpDate).toLocaleDateString('en-US', {

            weekday: 'long',

            year: 'numeric',

            month: 'long',

            day: 'numeric'

          });



          const emailHtml = `

            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">

              <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">

                <div style="text-align: center; margin-bottom: 30px;">

                  <h1 style="color: #0F5257; margin: 0; font-size: 28px;">📅 Follow-up Appointment Reminder</h1>

                </div>

                

                <div style="margin-bottom: 25px;">

                  <h2 style="color: #333; margin-bottom: 15px;">Dear ${patient.fullName},</h2>

                  <p style="color: #666; line-height: 1.6; font-size: 16px;">

                    Your doctor has recommended a follow-up appointment after your recent consultation.

                  </p>

                </div>

                

                <div style="background-color: #f0fdf4; padding: 25px; border-radius: 10px; border: 2px solid #16a34a; margin: 25px 0;">

                  <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 18px;">📋 Follow-up Details</h3>

                  <div style="color: #333; line-height: 1.8;">

                    <p style="margin: 8px 0;"><strong>📅 Recommended Date:</strong> ${followUpDateFormatted}</p>

                    ${followUpNotes ? `<p style="margin: 8px 0;"><strong>📝 Notes:</strong> ${followUpNotes}</p>` : ''}

                  </div>

                </div>

                

                <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 25px 0;">

                  <p style="color: #1e40af; font-weight: 600; margin: 0; font-size: 16px;">

                    💡 Please book your follow-up appointment through your IntelliConsult dashboard.

                  </p>

                </div>

                

                <div style="text-align: center; margin: 30px 0;">

                  <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/patient/dashboard" 

                     style="background-color: #0F5257; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">

                    Book Follow-up Appointment

                  </a>

                </div>

                

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">

                  <p style="color: #9ca3af; font-size: 14px; margin: 0;">

                    If you have any questions, please contact your doctor or our support team.

                  </p>

                  <p style="color: #9ca3af; font-size: 14px; margin: 5px 0 0 0;">

                    Thank you for choosing IntelliConsult!<br>

                    <strong>IntelliConsult Team</strong>

                  </p>

                </div>

              </div>

            </div>

          `;



          await sendEmail({

            email: patient.email,

            subject: '📅 Follow-up Appointment Reminder - IntelliConsult',

            html: emailHtml

          });

        }

      } catch (emailError) {

        console.error('Error sending follow-up email:', emailError);

        // Don't fail the prescription save if email fails

      }

    }



    res.status(201).json({

      success: true,

      message: 'Prescription saved successfully',

      medicalRecord

    });



  } catch (err) {

    console.error('Error creating prescription:', err);

    res.status(500).json({ message: 'Server error while saving prescription.' });

  }

});



// @route   GET api/prescriptions/appointment/:appointmentId

// @desc    Get prescription/medical record for an appointment

// @access  Private (Doctor or Patient)

router.get('/appointment/:appointmentId', authMiddleware, async (req, res) => {

  try {

    const { appointmentId } = req.params;

    const normalizedAppointmentId = appointmentId?.trim();



    if (!normalizedAppointmentId) {

      return res.status(400).json({ message: 'Appointment ID is required.' });

    }

    console.log('GET /api/prescriptions/appointment/:appointmentId', {

      appointmentId,

      user: req.user.userId,

      role: req.user.userType

    });



    // Get appointment to verify access

    const appointment = await Appointment.findById(normalizedAppointmentId);

    if (!appointment) {

      return res.status(404).json({ message: 'Appointment not found.' });

    }



    // Check if user has access (doctor or patient)

    if (req.user.userType === 'doctor' && appointment.doctor.toString() !== req.user.userId) {

      return res.status(403).json({ message: 'Access denied.' });

    }



    if (req.user.userType === 'patient' && appointment.patient.toString() !== req.user.userId) {

      return res.status(403).json({ message: 'Access denied.' });

    }



    // Get medical record

    const medicalRecord = await MedicalRecord.findOne({ appointment: normalizedAppointmentId })

      .populate('doctor', 'fullName specialization')

      .populate('patient', 'fullName email');



    if (!medicalRecord) {

      return res.status(404).json({ message: 'Prescription not found for this appointment.' });

    }



    res.json({

      success: true,

      medicalRecord

    });



  } catch (err) {

    console.error('Error fetching prescription:', err);

    res.status(500).json({ message: 'Server error while fetching prescription.' });

  }

});



// @route   GET api/prescriptions/doctor

// @desc    List prescriptions for logged-in doctor

// @access  Private (Doctor only)

router.get('/doctor', authMiddleware, async (req, res) => {

  if (req.user.userType !== 'doctor') {

    return res.status(403).json({ message: 'Access denied. Not a doctor.' });

  }



  try {

    const records = await MedicalRecord.find({ doctor: req.user.userId })

      .populate('patient', 'fullName email')

      .populate('appointment', 'date time primaryReason')

      .sort({ createdAt: -1 });



    res.json({

      success: true,

      count: records.length,

      records

    });

  } catch (err) {

    console.error('Error fetching doctor prescriptions:', err);

    res.status(500).json({ message: 'Server error while fetching prescriptions.' });

  }

});



// @route   GET api/prescriptions/patient

// @desc    List prescriptions for logged-in patient

// @access  Private (Patient only)

router.get('/patient', authMiddleware, async (req, res) => {

  if (req.user.userType !== 'patient') {

    return res.status(403).json({ message: 'Access denied. Not a patient.' });

  }



  try {

    const records = await MedicalRecord.find({ patient: req.user.userId })

      .populate('doctor', 'fullName specialization')

      .populate('appointment', 'date time primaryReason')

      .sort({ createdAt: -1 });



    res.json({

      success: true,

      count: records.length,

      records

    });

  } catch (err) {

    console.error('Error fetching patient prescriptions:', err);

    res.status(500).json({ message: 'Server error while fetching prescriptions.' });

  }

});



// @route   PUT api/prescriptions/:recordId

// @desc    Update a prescription/medical record

// @access  Private (Doctor only)

router.put('/:recordId', authMiddleware, async (req, res) => {

  if (req.user.userType !== 'doctor') {

    return res.status(403).json({ message: 'Access denied. Not a doctor.' });

  }



  try {

    const { recordId } = req.params;

    const {

      diagnosis,

      notes,

      prescription,

      followUpRequired,

      followUpDate,

      followUpNotes

    } = req.body;



    const medicalRecord = await MedicalRecord.findById(recordId);

    if (!medicalRecord) {

      return res.status(404).json({ message: 'Medical record not found.' });

    }



    // Verify doctor owns this record

    if (medicalRecord.doctor.toString() !== req.user.userId) {

      return res.status(403).json({ message: 'Access denied. This record does not belong to you.' });

    }



    // Update fields

    if (diagnosis !== undefined) medicalRecord.diagnosis = diagnosis.trim();

    if (notes !== undefined) medicalRecord.notes = notes.trim();

    if (prescription !== undefined) medicalRecord.prescription = prescription;

    if (followUpRequired !== undefined) medicalRecord.followUpRequired = followUpRequired;

    if (followUpDate !== undefined) {

      medicalRecord.followUpDate = followUpRequired && followUpDate ? new Date(followUpDate) : null;

    }

    if (followUpNotes !== undefined) {

      medicalRecord.followUpNotes = followUpRequired && followUpNotes ? followUpNotes.trim() : '';

    }



    await medicalRecord.save();



    // Send follow-up email if follow-up is required and date is set/updated

    if (followUpRequired && followUpDate) {

      try {

        const appointment = await Appointment.findById(medicalRecord.appointment)

          .populate('patient', 'fullName email');
        

        if (appointment && appointment.patient) {

          const patient = appointment.patient;

          if (patient.email) {

            const followUpDateFormatted = new Date(followUpDate).toLocaleDateString('en-US', {

              weekday: 'long',

              year: 'numeric',

              month: 'long',

              day: 'numeric'

            });



            const emailHtml = `

              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">

                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">

                  <div style="text-align: center; margin-bottom: 30px;">

                    <h1 style="color: #0F5257; margin: 0; font-size: 28px;">📅 Follow-up Appointment Reminder</h1>

                  </div>

                  

                  <div style="margin-bottom: 25px;">

                    <h2 style="color: #333; margin-bottom: 15px;">Dear ${patient.fullName},</h2>

                    <p style="color: #666; line-height: 1.6; font-size: 16px;">

                      Your doctor has updated your follow-up appointment details.

                    </p>

                  </div>

                  

                  <div style="background-color: #f0fdf4; padding: 25px; border-radius: 10px; border: 2px solid #16a34a; margin: 25px 0;">

                    <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 18px;">📋 Follow-up Details</h3>

                    <div style="color: #333; line-height: 1.8;">

                      <p style="margin: 8px 0;"><strong>📅 Recommended Date:</strong> ${followUpDateFormatted}</p>

                      ${followUpNotes ? `<p style="margin: 8px 0;"><strong>📝 Notes:</strong> ${followUpNotes}</p>` : ''}

                    </div>

                  </div>

                  

                  <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 25px 0;">

                    <p style="color: #1e40af; font-weight: 600; margin: 0; font-size: 16px;">

                      💡 Please book your follow-up appointment through your IntelliConsult dashboard.

                    </p>

                  </div>

                  

                  <div style="text-align: center; margin: 30px 0;">

                    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/patient/dashboard" 

                       style="background-color: #0F5257; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">

                      Book Follow-up Appointment

                    </a>

                  </div>

                  

                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">

                    <p style="color: #9ca3af; font-size: 14px; margin: 0;">

                      If you have any questions, please contact your doctor or our support team.

                    </p>

                    <p style="color: #9ca3af; font-size: 14px; margin: 5px 0 0 0;">

                      Thank you for choosing IntelliConsult!<br>

                      <strong>IntelliConsult Team</strong>

                    </p>

                  </div>

                </div>

              </div>

            `;



            await sendEmail({

              email: patient.email,

              subject: '📅 Follow-up Appointment Reminder - IntelliConsult',

              html: emailHtml

            });

          }

        }

      } catch (emailError) {

        console.error('Error sending follow-up email:', emailError);

        // Don't fail the prescription update if email fails

      }

    }



    res.json({

      success: true,

      message: 'Prescription updated successfully',

      medicalRecord

    });



  } catch (err) {

    console.error('Error updating prescription:', err);

    res.status(500).json({ message: 'Server error while updating prescription.' });

  }

});



module.exports = router;

