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
  symptomsBegin: { type: String, default: '', required: true },
  severeSymptomsCheck: [String],
  preExistingConditions: [String],
  preExistingConditionsOther: { type: String, default: '' },
  pastSurgeries: { type: String, default: '' },
  familyHistory: [String],
  familyHistoryOther: { type: String, default: '' },
  allergies: { type: String, default: '' },
  medications: { type: String, default: '' },
  consentToAI: { type: Boolean, default: false },
  
  // AI Summary fields - for caching generated summaries
  doctorSummary: { type: String },
  summaryGeneratedAt: { type: Date },
  age: { type: Number },
  
  // AI Triage fields - for caching triage results
  triagePriority: { type: String }, // RED/YELLOW/GREEN/BLACK
  triagePriorityLevel: { type: String }, // P1/P2/P3/P4
  triageLabel: { type: String }, // Immediate/Urgent/Minor/Non-Urgent
  
  // Payment related fields
  paymentId: { type: String }, // Razorpay payment ID
  orderId: { type: String }, // Razorpay order ID
  reasonForVisit: { type: String },
  symptoms: [String],
  phoneNumber: { type: String, required: true },
  email: { type: String, required: true },
  birthDate: { type: Date, required: true },
  sex: { type: String, required: true },
  primaryLanguage: { type: String, required: true},

}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);