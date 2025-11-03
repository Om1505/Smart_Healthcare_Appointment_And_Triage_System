const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const adminSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: {
    type: String,
    required: function() { return !this.googleId; }
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
  // ----------------------------------------

}, { timestamps: true });

adminSchema.pre('save', async function(next) {
  
  // Hash password if it's new or modified
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

module.exports = mongoose.model('Admin', adminSchema);

