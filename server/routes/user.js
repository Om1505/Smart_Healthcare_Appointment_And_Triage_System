const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
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

    const user = await Model.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error("GET /profile Error:", err.message);
    res.status(500).send('Server Error');
  }
});
router.put('/complete-profile', authMiddleware, async (req, res) => {
  try {
    const { userId, userType: originalUserType } = req.user;
    const { userType: newUserType, ...profileData } = req.body;

    const OriginalModel = models[originalUserType];
    const NewModel = models[newUserType];

    if (!OriginalModel || !NewModel) {
      return res.status(400).json({ message: 'Invalid user type specified.' });
    }
    const originalUser = await OriginalModel.findById(userId);
    if (!originalUser) {
      return res.status(404).json({ message: 'Original user account not found.' });
    }
    if (originalUserType === newUserType) {
      const updateData = {
        ...profileData,
        isProfileComplete: true,
      };

      const updatedUser = await OriginalModel.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select('-password');

      return res.json({
        message: 'Profile completed successfully!',
        user: updatedUser,
      });
    }
    const newUserProfile = {
      ...originalUser.toObject(),
      ...profileData,            
      _id: originalUser._id,       
      userType: newUserType,       
      isProfileComplete: true,
    };
    
    
    delete newUserProfile.__v;

  
    const newUser = new NewModel(newUserProfile);
    await newUser.save();

    await OriginalModel.findByIdAndDelete(userId);

    const newToken = jwt.sign(
      { userId: newUser._id, userType: newUser.userType },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      message: 'Profile transformed and completed successfully!',
      user: newUser.toObject(),
      token: newToken,
    });

  } catch (err) {
    console.error("PUT /complete-profile Error:", err);
   
    if (err.name === 'ValidationError') {
        let messages = Object.values(err.errors).map(val => val.message);
        return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;

