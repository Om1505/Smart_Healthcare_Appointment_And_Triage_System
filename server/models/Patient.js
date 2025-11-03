const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // <-- Added crypto import

const patientSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: {
    type: String,
    required: function() { return !this.googleId; }
  },
  userType: { type: String, default: 'patient' },
  googleId: { type: String, unique: true, sparse: true },
  
  isProfileComplete: { 
    type: Boolean, 
    default: false 
  },
  // Note: 'isVerified' (for admin approval) is not needed for patients

  // --- ADDED EMAIL VERIFICATION FIELDS ---
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

// --- UPDATED pre('save') hook ---
patientSchema.pre('save', async function(next) {
  
  // Hash password if it's new or modified
  if (this.password && this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error);
    }
  }

  // Set profile complete status
  if (this.isNew) {
    // For a patient, the profile is considered complete on signup
    // (both Google and manual) as they don't have a separate profile form.
    this.isProfileComplete = true;
  }

  next();
});

// --- ADDED EMAIL VERIFICATION METHOD ---
patientSchema.methods.createEmailVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');

  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Set expiry to 10 minutes
  this.emailVerificationTokenExpires = Date.now() + 10 * 60 * 1000;

  // Return the unhashed token (this is what we email to the user)
  return token;
};
// ------------------------------------

module.exports = mongoose.model('Patient', patientSchema);

