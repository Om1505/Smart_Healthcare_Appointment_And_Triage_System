const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const MedicalRecord = require('../models/MedicalRecord');
const Patient = require('../models/Patient');
const sendEmail = require('../utils/email_utils');
const PDFDocument = require('pdfkit');

async function sendPrescriptionSummaryEmail(medicalRecord, patient, doctor) {
  if (!patient || !patient.email) {
    console.error('Cannot send prescription summary: Patient email is missing.');
    return;
  }

  try {
    const followUpDateFormatted = medicalRecord.followUpRequired && medicalRecord.followUpDate
      ? new Date(medicalRecord.followUpDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      : null;

    const prescriptionHtmlList = medicalRecord.prescription.length > 0
      ? '<ul style="padding-left: 20px; margin: 0;">' + medicalRecord.prescription.map(item =>
        `<li style="margin-bottom: 12px;">
           <strong style="color: #111827; font-size: 16px;">${item.medication || 'Item'}</strong><br> 
           ${item.dosage ? `<span style="color: #555;">Dosage:</span> ${item.dosage}<br>` : ''}
           ${item.frequency ? `<span style="color: #555;">Frequency:</span> ${item.frequency}<br>` : ''}
           ${item.instructions ? `<span style="color: #555;">Instructions:</span> ${item.instructions}` : ''}
         </li>`
      ).join('') + '</ul>'
      : '<p style="margin: 0;">No specific prescription items listed.</p>';

    const followUpHtml = medicalRecord.followUpRequired && followUpDateFormatted
      ? `
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">📋 Follow-up Details</h3>
        <div style="color: #155724; line-height: 1.7;">
          <p style="margin: 8px 0;"><strong>Recommended Date:</strong> ${followUpDateFormatted}</p>
          ${medicalRecord.followUpNotes ? `<p style="margin: 8px 0;"><strong>Notes:</strong> ${medicalRecord.followUpNotes}</p>` : ''}
        </div>
      </div>
      `
      : '';

    const actionsHtml = medicalRecord.followUpRequired ? `
      <div style="text-align: center; margin: 30px 0 15px;">
        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/patient/dashboard" 
           style="background-color: #0F5257; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">
          Book Follow-up
        </a>
      </div>
      ` : '';

    const emailHtml = `
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f7f6;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          
          <div style="background-color: #0F5257; color: #ffffff; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Consultation Summary</h1>
          </div>
          
          <div style="padding: 30px;">
            <h2 style="color: #333; margin-top: 0; margin-bottom: 20px; font-size: 22px;">Dear ${patient.fullName},</h2>
            <p style="color: #555; line-height: 1.6; font-size: 16px; margin-bottom: 25px;">
              Here is the summary from your recent consultation with ${doctor.fullName || 'your doctor'}.
            </p>

            <div style="margin-bottom: 25px;">
              <h3 style="font-size: 18px; color: #0F5257; margin-bottom: 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; font-weight: 600;">Diagnosis</h3>
              <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
                <p style="color: #333; line-height: 1.6; font-size: 16px; margin: 0;">${medicalRecord.diagnosis}</p>
              </div>
            </div>

            ${medicalRecord.notes ? `
            <div style="margin-bottom: 25px;">
              <h3 style="font-size: 18px; color: #0F5257; margin-bottom: 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; font-weight: 600;">Doctor's Notes</h3>
              <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
                <p style="color: #333; line-height: 1.6; font-size: 16px; margin: 0;">${medicalRecord.notes}</p>
              </div>
            </div>
            ` : ''}
            
            <div style="margin-bottom: 25px;">
              <h3 style="font-size: 18px; color: #0F5257; margin-bottom: 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; font-weight: 600;">Prescription (Rx)</h3>
              <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; font-size: 16px; line-height: 1.7;">
                ${prescriptionHtmlList}
              </div>
            </div>
            
            ${followUpHtml}
            ${actionsHtml}
            
          </div>
          
          <div style="border-top: 1px solid #e0e0e0; margin: 0 30px; padding: 20px 0; text-align: center; color: #888888; font-size: 12px;">
            <p style="margin: 0;">Thank you for choosing IntelliConsult.</p>
            <p style="margin: 5px 0 0 0;">This is an auto-generated email. Please do not reply.</p>
          </div>
        </div>
      </body>
    `;

    await sendEmail({
      email: patient.email,
      subject: `🩺 Your Consultation Summary - IntelliConsult`,
      html: emailHtml
    });

  } catch (emailError) {
    console.error('Error sending prescription summary email:', emailError);
  }
}

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

    const normalizedAppointmentId = appointmentId?.trim();

    if (!normalizedAppointmentId || !diagnosis) {
      return res.status(400).json({ message: 'Appointment ID and diagnosis are required.' });
    }

    const appointment = await Appointment.findById(normalizedAppointmentId)
      .populate('patient', 'fullName email')
      .populate('doctor', 'fullName email');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    const doctorIdString = appointment.doctor._id ? appointment.doctor._id.toString() : appointment.doctor.toString();
    if (doctorIdString !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied. This appointment does not belong to you.' });
    }

    const existingRecord = await MedicalRecord.findOne({ appointment: normalizedAppointmentId });
    if (existingRecord) {
      return res.status(400).json({ message: 'Prescription already exists for this appointment. Use update endpoint instead.' });
    }

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

    try {
      await sendPrescriptionSummaryEmail(medicalRecord, appointment.patient, appointment.doctor);
    } catch (emailError) {
      console.error('Error queuing prescription summary email:', emailError);
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

router.get('/appointment/:appointmentId', authMiddleware, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const normalizedAppointmentId = appointmentId?.trim();

    if (!normalizedAppointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required.' });
    }

    const appointment = await Appointment.findById(normalizedAppointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    if (req.user.userType === 'doctor' && appointment.doctor.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    if (req.user.userType === 'patient' && appointment.patient.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const medicalRecord = await MedicalRecord.findOne({ appointment: normalizedAppointmentId })
      .populate('doctor', 'fullName specialization')
      .populate('patient', 'fullName email')
      .populate('appointment', 'date'); // Populated appointment date

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

router.get('/:recordId/pdf', authMiddleware, async (req, res) => {
  try {
    const { recordId } = req.params;

    const medicalRecord = await MedicalRecord.findById(recordId)
      .populate('doctor', 'fullName specialization')
      .populate('patient', 'fullName email')
      .populate('appointment', 'date time');

    if (!medicalRecord) {
      return res.status(404).json({ message: 'Medical record not found.' });
    }

    const isDoctor = req.user.userType === 'doctor' && medicalRecord.doctor._id.toString() === req.user.userId;
    const isPatient = req.user.userType === 'patient' && medicalRecord.patient._id.toString() === req.user.userId;

    if (!isDoctor && !isPatient) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const doc = new PDFDocument({ margin: 50 });

    const filename = `Prescription-${medicalRecord._id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    
    doc.fillColor('#0F5257').fontSize(26).font('Helvetica-Bold').text('IntelliConsult', 50, 50);
    
    doc.strokeColor('#0F5257').lineWidth(1).moveTo(50, 95).lineTo(550, 95).stroke();
    
    
    doc.moveDown(1); 
    doc.fontSize(20).fillColor('#000').font('Helvetica-Bold').text('Consultation Summary', { align: 'left' });
    doc.moveDown(2);

  
    const infoTop = doc.y;
    doc.fontSize(12).fillColor('#555');
    doc.font('Helvetica-Bold').text('Patient:', 50, infoTop);
    doc.font('Helvetica').text(medicalRecord.patient.fullName, 110, infoTop);
    
    doc.font('Helvetica-Bold').text('Doctor:', 300, infoTop);
    doc.font('Helvetica').text(medicalRecord.doctor.fullName, 360, infoTop);

    doc.font('Helvetica-Bold').text('Email:', 50, infoTop + 20);
    doc.font('Helvetica').text(medicalRecord.patient.email, 110, infoTop + 20);

    doc.font('Helvetica-Bold').text('Specialization:', 300, infoTop + 20);
    doc.font('Helvetica').text(medicalRecord.doctor.specialization, 390, infoTop + 20);

    doc.font('Helvetica-Bold').text('Consultation Date:', 50, infoTop + 40);
    doc.font('Helvetica').text(new Date(medicalRecord.appointment.date).toLocaleDateString(), 160, infoTop + 40);
    
    doc.moveDown(5);

   
    const drawSection = (title, content) => {
      if (!content) return;
      doc.fontSize(16).fillColor('#0F5257').font('Helvetica-Bold').text(title);
      doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
      doc.moveDown(1);
      doc.fontSize(12).fillColor('#333').font('Helvetica').text(content, { width: 500, align: 'left' });
      doc.moveDown(2);
    };

    drawSection('Diagnosis', medicalRecord.diagnosis);

 
    doc.fontSize(16).fillColor('#0F5257').font('Helvetica-Bold').text('Prescription (Rx)');
    doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
    doc.moveDown(1);

    if (medicalRecord.prescription && medicalRecord.prescription.length > 0) {
      medicalRecord.prescription.forEach(med => {
        doc.fontSize(13).fillColor('#000').font('Helvetica-Bold').text(med.medication || 'N/A');
        doc.moveDown(0.2);
        doc.fontSize(12).fillColor('#333').font('Helvetica');
        doc.text(`Dosage: ${med.dosage || 'N/A'}`, { indent: 15 });
        doc.text(`Frequency: ${med.frequency || 'N/A'}`, { indent: 15 });
        doc.text(`Instructions: ${med.instructions || 'N/A'}`, { indent: 15 });
        doc.moveDown(1);
      });
    } else {
      doc.fontSize(12).fillColor('#333').font('Helvetica').text('No medications prescribed.');
      doc.moveDown(2);
    }
    
    doc.moveDown(1);
    drawSection("Doctor's Notes", medicalRecord.notes);

    
    if (medicalRecord.followUpRequired) {
      doc.fontSize(16).fillColor('#0F5257').font('Helvetica-Bold').text('Follow-up Required');
      doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
      doc.moveDown(1);
      doc.fontSize(12).fillColor('#333').font('Helvetica');
      doc.text(`Date: ${new Date(medicalRecord.followUpDate).toLocaleDateString()}`);
      if (medicalRecord.followUpNotes) {
        doc.text(`Notes: ${medicalRecord.followUpNotes}`);
      }
      doc.moveDown(2);
    }

    
    doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, 710).lineTo(550, 710).stroke();
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('grey');
    doc.text(`Record ID: ${medicalRecord._id}`, 50, 720, { align: 'left' });
    doc.text('IntelliConsult | Confidential', 50, 735, { align: 'left' });

    doc.end();

  } catch (err) {
    console.error('Error generating PDF:', err);
    res.status(500).json({ message: 'Server error while generating PDF.' });
  }
});


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

    const medicalRecord = await MedicalRecord.findById(recordId)
      .populate('patient', 'fullName email')
      .populate('doctor', 'fullName');

    if (!medicalRecord) {
      return res.status(404).json({ message: 'Medical record not found.' });
    }

    if (medicalRecord.doctor._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied. This record does not belong to you.' });
    }

    if (diagnosis !== undefined) medicalRecord.diagnosis = diagnosis.trim();
    if (notes !== undefined) medicalRecord.notes = notes.trim();
    if (prescription !== undefined) medicalRecord.prescription = prescription;
    
    if (followUpRequired !== undefined) {
        medicalRecord.followUpRequired = followUpRequired;
    }
    
    if (followUpDate !== undefined) {
      medicalRecord.followUpDate = medicalRecord.followUpRequired && followUpDate ? new Date(followUpDate) : null;
    }

    if (followUpNotes !== undefined) {
      medicalRecord.followUpNotes = medicalRecord.followUpRequired && followUpNotes ? followUpNotes.trim() : '';
    }

    await medicalRecord.save();

    try {
      await sendPrescriptionSummaryEmail(medicalRecord, medicalRecord.patient, medicalRecord.doctor);
    } catch (emailError) {
      console.error('Error queuing prescription summary email:', emailError);
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