//Doctor.js
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
  },
  bio: { type: String },
}, { timestamps: true });

// Hash password before saving
doctorSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model('Doctor', doctorSchema);