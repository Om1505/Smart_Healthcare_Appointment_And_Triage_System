const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Doctor = require('../models/Doctor');

router.get('/working-hours', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'doctor') {
    return res.status(403).json({ message: 'Access denied. Not a doctor.' });
  }
  try {
    const doctor = await Doctor.findById(req.user.userId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    res.json(doctor.workingHours);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.post('/working-hours', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'doctor') {
    return res.status(403).json({ message: 'Access denied. Not a doctor.' });
  }
  
  const { workingHours } = req.body; 

  try {
    const doctor = await Doctor.findByIdAndUpdate(
      req.user.userId,
      { workingHours: workingHours }, 
      { new: true } 
    );
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    res.json(doctor.workingHours);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.post('/blocked-times', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'doctor') {
    return res.status(403).json({ message: 'Access denied.' });
  }

  const { reason, date, startTime, endTime } = req.body;

  if (!reason || !date || !startTime || !endTime) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const doctor = await Doctor.findById(req.user.userId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const newBlock = { reason, date, startTime, endTime };
    doctor.blockedTimes.push(newBlock);
    await doctor.save();

    res.status(201).json(doctor.blockedTimes[doctor.blockedTimes.length - 1]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.delete('/blocked-times/:blockId', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'doctor') {
    return res.status(403).json({ message: 'Access denied.' });
  }

  try {
    const doctor = await Doctor.findById(req.user.userId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const blockIndex = doctor.blockedTimes.findIndex(
      (block) => block._id.toString() === req.params.blockId
    );

    if (blockIndex === -1) {
      return res.status(404).json({ message: 'Blocked time not found.' });
    }

    doctor.blockedTimes.splice(blockIndex, 1);
    await doctor.save();

    res.json({ message: 'Blocked time removed successfully.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;