const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const protect = require('../middleware/auth');
const Appointment = require('../models/Appointment');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const formatAppointmentData = (appointment) => {
  const symptoms = appointment.symptoms || [];
  const otherSymptoms = appointment.otherSymptoms || '';
  const symptomText = symptoms.join(', ') + (otherSymptoms ? ` + ${otherSymptoms}` : '');
  
  const severeSymptoms = appointment.severeSymptoms || [];
  const severeText = severeSymptoms.length > 0 ? severeSymptoms.join(', ') : 'None';
  
  const conditions = appointment.preExistingConditions || [];
  const conditionsText = conditions.length > 0 ? conditions.join(', ') : 'None';
  
  const familyHistory = appointment.familyHistory || [];
  const familyText = familyHistory.length > 0 ? familyHistory.join(', ') : 'None';
  
  return `
    Name: ${appointment.patientName || appointment.patientNameForVisit || 'N/A'}
    Age: ${appointment.age || 'N/A'}
    Sex: ${appointment.sex || 'N/A'}
    Primary Reason: ${appointment.primaryReason || appointment.reasonForVisit || 'N/A'}
    Symptoms: ${symptomText || 'None reported'}
    Onset: ${appointment.symptomOnset || 'N/A'}
    Severe Symptoms: ${severeText}
    Pre-existing Conditions: ${conditionsText}
    Past Surgeries: ${appointment.pastSurgeries || 'None'}
    Family History: ${familyText}
    Current Medications: ${appointment.currentMedications || 'None'}
    Allergies: ${appointment.allergies || 'None'}
  `;
};

const generateAISummary = async (formData) => {
  const prompt = `Generate a concise clinical summary.

PATIENT DATA:
${formData}

Provide a brief 2-3 sentence summary focusing on:
- provide age and gender if given by the patient
- Chief complaint and symptoms
- Any red flags or urgent concerns
- Key medical history

Keep it professional and concise.`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
    });

    return chatCompletion.choices[0]?.message?.content || 'Unable to generate summary';
  } catch (error) {
    console.error('Groq API Error:', error);
    throw new Error('Failed to generate AI summary');
  }
};

router.get('/appointment/:appointmentId', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if summary already exists
    if (appointment.doctorSummary) {
      return res.json({
        success: true,
        summary: appointment.doctorSummary,
        cached: true
      });
    }

    // Generate new summary
    const formattedData = formatAppointmentData(appointment);
    const summary = await generateAISummary(formattedData);

    // Save to database
    appointment.doctorSummary = summary;
    appointment.summaryGeneratedAt = new Date();
    await appointment.save();

    res.json({
      success: true,
      summary: summary,
      cached: false
    });

  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate summary',
      error: error.message 
    });
  }
});

module.exports = router;
