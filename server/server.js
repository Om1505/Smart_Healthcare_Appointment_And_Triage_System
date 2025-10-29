// 1. IMPORT PACKAGES
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// 2. INITIALIZE APP & DEFINE PORT
const app = express();
const PORT = process.env.PORT || 5001;

// 3. MIDDLEWARE SETUP
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Add error logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// 4. DATABASE CONNECTION
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected successfully.'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// 5. API ROUTES
// A simple test route to make sure the server is alive
app.get('/', (req, res) => {
  res.send('IntelliConsult API is up and running!');
});

// Import all route handlers
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const appointmentRoutes = require('./routes/appointments');
const doctorRoutes = require('./routes/doctors'); // Ensure this is present

// Register all routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors', doctorRoutes); // Ensure this is present


// 6. START THE SERVER
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
