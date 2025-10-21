const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const doctorSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  userType: { type: String, default: 'doctor' },
  specialization: { type: String, required: true },
  experience: {
    type: Number,
    required: true,
    min: [0, 'Years of experience must be a positive number.'],
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true,
    sparse: true,
  },
  bio: { type: String },
  address: { type: String, required: true },
  // ADDED: New field for consultation fee
  consultationFee: {
    type: Number,
    required: true,
    min: [0, 'Consultation fee cannot be negative.'],
  },
}, { timestamps: true });

doctorSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

doctorSchema.index({ fullName: 'text', specialty: 'text' });

module.exports = mongoose.model('Doctor', doctorSchema);