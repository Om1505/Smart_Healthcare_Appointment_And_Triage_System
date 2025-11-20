const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');

module.exports = function(passport) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'https://smart-healthcare-appointment-and-triage.onrender.com/api/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => { 
    try {
      const email = profile.emails[0].value;
      const googleId = profile.id;
      let user = await Patient.findOne({ email }) || 
                 await Doctor.findOne({ email }) || 
                 await Admin.findOne({ email });

      if (user) {
        if (!user.googleId) {
          user.googleId = googleId;
          await user.save();
        }
        return done(null, user);
      } else {
        return done(null, false, { message: 'No account is associated with this Google email. Please sign up first.' });
      }
    } catch (err) {
      console.error(err);
      return done(err, false);
    }
  }));
};