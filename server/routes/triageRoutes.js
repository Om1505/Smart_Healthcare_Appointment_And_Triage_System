const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const protect = require('../middleware/auth');
const Appointment = require('../models/Appointment');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});
    
const ESI_KNOWLEDGE_BASE = `
EMERGENCY SEVERITY INDEX (ESI) TRIAGE SYSTEM:

RED (P1) - IMMEDIATE/LIFE THREATENING:
- Immediate life-saving intervention (e.g., unresponsive, severe bleeding).
- Cardiac arrest, respiratory arrest
- Severe respiratory distress
- Unresponsive or altered mental status
- Severe hemorrhage, shock
- Chest pain with cardiac symptoms
- Stroke symptoms (FAST positive)
- Severe trauma with unstable vitals
- Seizures (active/continuous)

YELLOW (P2) - URGENT/NON-LIFE THREATENING:
- High risk (e.g., confusion, severe pain, high fever in infant).
- High fever with concerning symptoms
- Moderate respiratory distress
- Disoriented, severe pain, signs of stroke
- Suspected fractures with deformity
- Vomiting blood, severe dehydration
- Chest pain (stable vitals)


GREEN (P3) - MINOR/OBSERVATION:
- Multiple resources needed (stable but requires tests/treatment)
- Minor injuries, lacerations
- Low-grade fever without red flags
- Stable vital sign
- Chronic conditions without acute exacerbation
- Minor infections

BLACK (P4) - NON-URGENT:
- One resource (e.g., simple laceration)
- Prescription refills
- Routine check-ups
- No immediate medical concerns
`;

const formatTriageData = (appointment) => {
const symptomsList = appointment.symptomsList || [];
const symptomsOther = appointment.symptomsOther || '';
const allSymptoms = [...symptomsList];
if (symptomsOther) {
allSymptoms.push(symptomsOther);
}

const severeSymptoms = appointment.severeSymptomCheck || [];

const conditions = appointment.preExistingConditions || [];
const conditionsOther = appointment.preExistingConditionsOther || '';
const allConditions = [...conditions];
if (conditionsOther) {
allConditions.push(conditionsOther);
}

const familyHistory = appointment.familyHistory || [];
const familyHistoryOther = appointment.familyHistoryOther || '';
const allFamilyHistory = [...familyHistory];
if (familyHistoryOther) {
allFamilyHistory.push(familyHistoryOther);
}

return `
PATIENT TRIAGE ASSESSMENT:

CHIEF COMPLAINT:
${appointment.primaryReason || 'Not specified'}

CURRENT SYMPTOMS:
${allSymptoms.length > 0 ? '- ' + allSymptoms.join('\n- ') : 'None reported'}

SYMPTOM ONSET:
${appointment.symptomsBegin || 'Unknown'}

SEVERE SYMPTOMS - RED FLAGS:
${severeSymptoms.length > 0 ? '- ' + severeSymptoms.join('\n- ') : 'None reported'}
${severeSymptoms.includes('Severe chest pain or pressure') ? 'CRITICAL: Severe chest pain reported' : ''}
${severeSymptoms.includes('Sudden difficulty breathing or shortness of breath') ? 'CRITICAL: Respiratory distress reported' : ''}
${severeSymptoms.includes('Sudden confusion, disorientation, or difficulty speaking') ? 'CRITICAL: Neurological symptoms reported' : ''}
${severeSymptoms.includes('Sudden weakness, numbness, or drooping on one side of your face or body') ? 'CRITICAL: Stroke symptoms reported' : ''}
${severeSymptoms.includes('Sudden, severe headache (worst of your life)') ? 'CRITICAL: Severe headache reported' : ''}
${severeSymptoms.includes('High fever (over 103°F / 39.4°C)') ? 'WARNING: High fever reported' : ''}
${severeSymptoms.includes('Uncontrolled bleeding') ? 'CRITICAL: Uncontrolled bleeding reported' : ''}

MEDICAL HISTORY:

Pre-existing Conditions:
${allConditions.length > 0 ? '- ' + allConditions.join('\n- ') : 'None'}

Past Surgeries/Hospitalizations:
${appointment.pastSurgeries || 'None'}

Family Medical History:
${allFamilyHistory.length > 0 ? '- ' + allFamilyHistory.join('\n- ') : 'None'}

Current Medications:
${appointment.medications || 'None'}

Allergies:
${appointment.allergies || 'None'}

DEMOGRAPHICS:
Age: ${appointment.age || 'Unknown'}
Sex: ${appointment.sex || 'Unknown'}
;

`;
};

const performAITriage = async (patientData) => {
  const prompt = `${ESI_KNOWLEDGE_BASE}

${patientData}

Thinking yourself as a nurse or a medical practitioner using the ESI system, analyze the patient and provide triage classification.
Respond in this exact JSON format:
{
  "priority": "RED/YELLOW/GREEN/BLACK",
  "priorityLevel": "P1/P2/P3/P4",
  "label": "Immediate/Urgent/Minor/Non-Urgent"
}`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(chatCompletion.choices[0]?.message?.content || '{}');
    console.log("ai is giving the triage");
    return result;
  } catch (error) {
    console.error('Groq AI Triage Error:', error);
    throw new Error('Failed to perform AI triage');
  }
};

router.get('/appointment/:appointmentId', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.triagePriority && appointment.triagePriorityLevel) {
      return res.json({
        success: true,
        triage: {
          priority: appointment.triagePriority,
          priorityLevel: appointment.triagePriorityLevel,
          label: appointment.triageLabel
        },
        cached: true
      });
    }

    const patientData = formatTriageData(appointment);
    const triageResult = await performAITriage(patientData);

    appointment.triagePriority = triageResult.priority;
    appointment.triagePriorityLevel = triageResult.priorityLevel;
    appointment.triageLabel = triageResult.label;
    
    await appointment.save();

    res.json({
      success: true,
      triage: triageResult,
      cached: false
    });

  } catch (error) {
    console.error('Error performing triage:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to perform triage',
      error: error.message 
    });
  }
});

module.exports = router;
