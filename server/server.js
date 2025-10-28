const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const app = express();
const PORT = process.env.PORT || 5001;

// Verify environment variables are loaded
console.log('MongoDB URI:', process.env.MONGO_URI ? 'Defined' : 'Not defined');

// Configure CORS with specific options
app.use(cors({
  origin: 'http://localhost:5173', // Allow your React app's origin
  credentials: true, // Allow credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Allowed methods
  allowedHeaders: ['Content-Type', 'Authorization'] // Allowed headers
}));
app.use(cors());
app.use(express.json());
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => console.error('MongoDB connection error:', err));
app.get('/', (req, res) => {
  res.send('IntelliConsult API is up and running!');
});
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const appointmentRoutes = require('./routes/appointments');
const doctorRoutes = require('./routes/doctors');
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors', doctorRoutes);
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});