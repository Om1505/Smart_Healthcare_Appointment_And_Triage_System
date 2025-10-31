const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');

module.exports = function(passport) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: 'http://localhost:5001/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails[0].value;
          const fullName = profile.displayName;
          const profilePhoto = profile.photos[0].value;

          let user = await Patient.findOne({ googleId: googleId }) || 
                     await Doctor.findOne({ googleId: googleId }) || 
                     await Admin.findOne({ googleId: googleId });

          
          if (!user) {
            user = await Patient.findOne({ email: email }) || 
                   await Doctor.findOne({ email: email }) || 
                   await Admin.findOne({ email: email });
            
           
            if (user) {
              user.googleId = googleId;
              if (!user.profilePhoto) user.profilePhoto = profilePhoto;
              await user.save();
              return done(null, user);
            }
          }

          
          if (user) {
            return done(null, user);
          }

          
          const newUser = new Patient({
            googleId: googleId,
            email: email,
            fullName: fullName,
            profilePhoto: profilePhoto,
            userType: 'patient',
            isProfileComplete: false,
          });

          await newUser.save();
          return done(null, newUser);

        } catch (err) {
          console.error('Error in Google Strategy:', err);
          return done(err, false, { message: 'Google authentication failed.' });
        }
      }
    )
  );


  passport.serializeUser((user, done) => {
    done(null, { id: user.id, userType: user.userType });
  });

  passport.deserializeUser(async (sessionData, done) => {
    try {
      const { id, userType } = sessionData;
      let Model;
      if (userType === 'doctor') Model = Doctor;
      else if (userType === 'admin') Model = Admin;
      else Model = Patient;
      
      const user = await Model.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};

