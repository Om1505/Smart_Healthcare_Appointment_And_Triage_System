const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Review = require('../models/Review');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');

async function updateDoctorRating(doctorId) {
  const reviews = await Review.find({ doctor: doctorId });

  if (reviews.length === 0) {
    await Doctor.findByIdAndUpdate(doctorId, {
      averageRating: 0,
      reviewCount: 0,
    });
    return;
  }

  const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
  const average = totalRating / reviews.length;

  await Doctor.findByIdAndUpdate(doctorId, {
    averageRating: average,
    reviewCount: reviews.length,
  });
}

router.post('/', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'patient') {
    return res.status(403).json({ message: 'Access denied. Not a patient.' });
  }

  const { doctorId, appointmentId, rating, comment } = req.body;

  try {
    const appointment = await Appointment.findById(appointmentId);
    if (appointment.status !== 'completed') {
      return res.status(400).json({ message: 'You can only review completed appointments.' });
    }
    if (appointment.patient.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'You are not authorized to review this appointment.' });
    }

    const existingReview = await Review.findOne({ appointment: appointmentId });
    if (existingReview) {
      return res.status(400).json({ message: 'This appointment has already been reviewed.' });
    }

    const newReview = new Review({
      doctor: doctorId,
      patient: req.user.userId,
      appointment: appointmentId,
      rating,
      comment,
    });

    await newReview.save();

    await updateDoctorRating(doctorId);

    res.status(201).json(newReview);
  } catch (err) {
    console.error('Review POST Error:', err.message);
    res.status(500).send('Server Error');
  }
});

router.get('/doctor/:doctorId', async (req, res) => {
  try {
    const reviews = await Review.find({ doctor: req.params.doctorId })
      .populate('patient', 'fullName') 
      .sort({ createdAt: -1 }); 

    res.json(reviews);
  } catch (err) {
    console.error('Get Reviews Error:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;