const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    if (this.googleId) {
      this.isProfileComplete = false;
    } else {
      this.isProfileComplete = true;
    }
  }

  next();
});

module.exports = mongoose.model('Admin', adminSchema);

