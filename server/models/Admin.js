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
  isProfileComplete: { type: Boolean, default: false },
}, { timestamps: true });
adminSchema.pre('save', async function(next) {
   if (this.isNew && !this.googleId) {
      this.isProfileComplete = true;
  }

  if (!this.password || !this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Admin', adminSchema);

