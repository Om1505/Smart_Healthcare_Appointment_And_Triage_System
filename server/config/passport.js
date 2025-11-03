const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');

module.exports = function(passport) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:5001/api/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      const googleId = profile.id;
      const fullName = profile.displayName;

      // Find user across all collections
      let user = await Patient.findOne({ email }) || 
                 await Doctor.findOne({ email }) || 
                 await Admin.findOne({ email });

      if (user) {
        // User exists, update their Google ID if it's missing
        if (!user.googleId) {
          user.googleId = googleId;
          await user.save();
        }
        return done(null, user);
      } else {
        // New user - default to Patient
        const newUser = new Patient({
          googleId,
          fullName,
          email,
          isProfileComplete: true, // Patient profile is simple, so complete
          
          // --- THIS IS THE NEW LINE ---
          // Google has already verified this email, so we set it to true
          isEmailVerified: true 
        });

        await newUser.save();
        return done(null, newUser);
      }
    } catch (err) {
      console.error(err);
      return done(err, false);
    }
  }));
  
  // Note: Passport session serialization (passport.serializeUser)
  // is not required for stateless JWT authentication.
};

