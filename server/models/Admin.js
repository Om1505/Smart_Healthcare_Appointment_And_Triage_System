const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const adminSchema = new mongoose.Schema({
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
        return true;
      },
      message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
    }
  },
  userType: { type: String, default: 'admin' },
  googleId: { type: String, unique: true, sparse: true },
  
  isProfileComplete: { 
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

}, { timestamps: true });

adminSchema.pre('save', async function(next) {

  if (this.password && this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error);
    }
  }

  if (this.isNew) {
  
    this.isProfileComplete = true;
  }

  next();
});

adminSchema.methods.createEmailVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');

  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  this.emailVerificationTokenExpires = Date.now() + 10 * 60 * 1000;

  return token;
};

adminSchema.methods.createPasswordResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  this.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000;

  return token;
};

module.exports = mongoose.model('Admin', adminSchema);