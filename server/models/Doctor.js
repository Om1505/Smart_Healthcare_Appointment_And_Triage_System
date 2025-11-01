const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const doctorSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: {
    type: String,
    required: function() { return !this.googleId; }
  },
  userType: { type: String, default: 'doctor' },
  specialization: { type: String, required: true },
  experience: {
    type: Number,
    required: true,
    min: [0, 'Years of experience must be positive.'],
  },
  licenseNumber: { type: String, required: true, unique: true, sparse: true },
  address: { type: String, required: true },
  consultationFee: { type: Number, required: true, min: [0] },
  bio: { type: String },
  googleId: { type: String, unique: true, sparse: true },
  isProfileComplete: { 
    type: Boolean, 
    default: false 
  },
  isVerified: {
    type: Boolean,
    default: false
  },
}, { timestamps: true });

doctorSchema.pre('save', async function(next) {
  
  if (this.password && this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error);
    }
  }

  if (this.isNew) {
    if (this.googleId) {
      this.isProfileComplete = false;
    } else {
      this.isProfileComplete = true;
    }
  }

  next();
});

doctorSchema.index({ fullName: 'text', specialization: 'text' });

module.exports = mongoose.model('Doctor', doctorSchema);

