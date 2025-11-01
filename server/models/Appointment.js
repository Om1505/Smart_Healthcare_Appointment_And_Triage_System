const mongoose = require('mongoose');
const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  patientNameForVisit: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['upcoming', 'completed', 'cancelled'], 
    default: 'upcoming' 
  },
  consultationFeeAtBooking: {
    type: Number,
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending',
    required: true,
  },
  emergencyDisclaimerAcknowledged: { type: Boolean, default: false },
  primaryReason: { type: String, default: '' },
  symptomsList: [String],
  symptomsOther: { type: String, default: '' },
  symptomsBegin: { type: String, default: '' },
  severeSymptomsCheck: [String],
  preExistingConditions: [String],
  preExistingConditionsOther: { type: String, default: '' },
  pastSurgeries: { type: String, default: '' },
  familyHistory: [String],
  familyHistoryOther: { type: String, default: '' },
  allergies: { type: String, default: '' },
  medications: { type: String, default: '' },
  consentToAI: { type: Boolean, default: false },

}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);