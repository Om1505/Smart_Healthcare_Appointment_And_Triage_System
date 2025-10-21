const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');

const models = {
  patient: Patient,
  doctor: Doctor,
  admin: Admin,
};


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
    const { fullName } = req.body;

    const Model = models[userType];
    if (!Model) {
      return res.status(400).json({ message: 'Invalid user type in token.' });
    }

    const updatedUser = await Model.findByIdAndUpdate(
      userId,
      { fullName },
      { new: true }
    ).select('-password'); 

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
