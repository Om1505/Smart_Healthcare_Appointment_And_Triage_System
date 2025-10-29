const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');

// An object to easily access the correct model based on userType
const models = {
  patient: Patient,
  doctor: Doctor,
  admin: Admin,
};

// Add the /all endpoint for admin access
router.get('/all', authMiddleware, async (req, res) => {
  try {
    // Check if the requesting user is an admin
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    // Fetch all users from each collection
    const patients = await Patient.find().select('-password');
    const doctors = await Doctor.find().select('-password');
    const admins = await Admin.find().select('-password');

    // Send all users data
    res.json({
      patients,
      doctors,
      admins
    });
  } catch (err) {
    console.error('Error fetching all users:', err);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
});

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const { userId, userType } = req.user;
    const Model = models[userType];

    if (!Model) {
      return res.status(400).json({ message: 'Invalid user type found in token.' });
    }

    // Find the user by their ID and remove the password from the result
    const user = await Model.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { userId, userType } = req.user;
    const { fullName } = req.body; // Get the fields to update from the request body

    const Model = models[userType];
    if (!Model) {
      return res.status(400).json({ message: 'Invalid user type in token.' });
    }

    // Find the user by ID and update their details
    // The { new: true } option ensures the updated document is returned
    const updatedUser = await Model.findByIdAndUpdate(
      userId,
      { fullName }, // Pass an object with the fields to update
      { new: true }
    ).select('-password'); // Exclude the password from the response

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(updatedUser);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
