const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const protect = require('../middleware/auth');
const Appointment = require('../models/Appointment');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const formatAppointmentData = (appointment) => {
  // symptoms
  const symptomsList = appointment.symptomsList || [];
  const symptomsOther = appointment.symptomsOther || '';
  const allSymptoms = [...symptomsList];
  if (symptomsOther) {
    allSymptoms.push(symptomsOther);
  }

  // severe symptoms
  const severeSymptoms = appointment.severeSymptomCheck || [];

  // pre-existing conditions
  const conditions = appointment.preExistingConditions || [];
  const conditionsOther = appointment.preExistingConditionsOther || '';
  const allConditions = [...conditions];
  if (conditionsOther) {
    allConditions.push(conditionsOther);
  }

  // family history
  const familyHistory = appointment.familyHistory || [];
  const familyHistoryOther = appointment.familyHistoryOther || '';
  const allFamilyHistory = [...familyHistory];
  if (familyHistoryOther) {
    allFamilyHistory.push(familyHistoryOther);
  }

  return `
PATIENT CONSULTATION SUMMARY REQUEST:

PATIENT BASIC DETAILS:
- Name: ${appointment.patientNameForVisit || 'Not provided'}
- Age: ${appointment.age || 'Not provided'}
- Sex: ${appointment.sex || 'Not provided'}

CHIEF COMPLAINT:
${appointment.primaryReason || 'Not specified'}

CURRENT SYMPTOMS:
${allSymptoms.length > 0 ? allSymptoms.map(s => `- ${s}`).join('\n') : '- None reported'}

SYMPTOM BEGINNING:
${appointment.symptomsBegin || 'Not specified'}

SEVERE SYMPTOMS :
${severeSymptoms.length > 0 ? severeSymptoms.map(s => `- ${s}`).join('\n') : '- None reported'}

MEDICAL HISTORY:

Pre-existing Conditions:
${allConditions.length > 0 ? allConditions.map(c => `- ${c}`).join('\n') : '- None'}

Past Surgeries/Hospitalizations:
${appointment.pastSurgeries || 'None'}

Family Medical History:
${allFamilyHistory.length > 0 ? allFamilyHistory.map(h => `- ${h}`).join('\n') : '- None'}

Current Medications:
${appointment.medications || 'None'}

Allergies:
${appointment.allergies || 'None'}
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
