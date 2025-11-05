const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const workingHoursSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  start: { type: String, default: '09:00' },
  end: { type: String, default: '17:00' },
}, { _id: false });

const doctorSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: {
    type: String,
    required: function() { return !this.googleId; },

    validate: {
      validator: function(v) {
       
        if (this.isNew || this.isModified('password')) {
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(v);
        }
        return true; // Skip validation if password is not modified
      },
      message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
    }
    // ----------------------
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

  isEmailVerified: { 
    type: Boolean, 
    default: false 
  },
  emailVerificationToken: { 
    type: String 
  },
  emailVerificationTokenExpires: { 
    type: Date 
  },

  passwordResetToken: {
    type: String
  },
  passwordResetTokenExpires: {
    type: Date
  },
  
  workingHours: {
    type: Map,
    of: workingHoursSchema,
    default: {
      monday: { enabled: true, start: "09:00", end: "17:00" },
      tuesday: { enabled: true, start: "09:00", end: "17:00" },
      wednesday: { enabled: true, start: "09:00", end: "17:00" },
      thursday: { enabled: true, start: "09:00", end: "17:00" },
      friday: { enabled: true, start: "09:00", end: "17:00" },
      saturday: { enabled: false, start: "09:00", end: "17:00" },
      sunday: { enabled: false, start: "09:00", end: "17:00" },
    }
  },
  blockedTimes: [{
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    reason: { type: String }
  }]
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

doctorSchema.methods.createEmailVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  this.emailVerificationTokenExpires = Date.now() + 10 * 60 * 1000;
  return token;
};

doctorSchema.methods.createPasswordResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  this.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000;
  return token;
};

doctorSchema.index({ fullName: 'text', specialization: 'text' });
module.exports = mongoose.model('Doctor', doctorSchema);