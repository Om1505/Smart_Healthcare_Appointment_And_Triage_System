const express = require('express');
const router = express.Router();
const Doctor = require('../models/Doctor');

router.get('/', async (req, res) => {
  try {
    const { search, specialty } = req.query;
    const query = {};
    if (specialty && specialty !== 'All Specialties') {
      query.specialization = specialty;
    }

    // 2. Add a case-insensitive, "starts-with" search filter
    if (search) {
      // Using regex for better "autocomplete" style search
      query.fullName = { $regex: new RegExp('^' + search, 'i') };
    }

    
    const doctors = await Doctor.find(query).select('-password');

    res.json(doctors);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
router.get('/:id', async (req, res) => {
  try {

    const doctor = await Doctor.findById(req.params.id).select('-password');


    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json(doctor);
  } catch (err) {
 
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
module.exports = router;