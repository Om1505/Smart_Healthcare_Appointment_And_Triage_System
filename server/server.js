const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const session = require('express-session');
const passport = require('passport');
const app = express();
const PORT = process.env.PORT || 5001;
require('./config/passport')(passport);
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log(' MongoDB connected successfully.'))
  .catch(err => console.error(' MongoDB connection error:', err));
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const appointmentRoutes = require('./routes/appointments');
const doctorRoutes = require('./routes/doctors');
const adminRoutes = require('./routes/admin');
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/admin', adminRoutes);
app.get('/', (req, res) => res.send('API Running'));
app.listen(PORT, () => console.log(` Server running on port ${PORT}`));