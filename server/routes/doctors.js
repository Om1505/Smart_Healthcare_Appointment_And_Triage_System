const express = require('express');
const router = express.Router();
const Doctor = require('../models/Doctor'); // Assuming path is correct
const Appointment = require('../models/Appointment'); // Assuming path is correct
const authMiddleware = require('../middleware/auth'); // Assuming path is correct
const { Parser } = require('json2csv'); // For CSV download

// @route   GET api/doctors
// @desc    Get all doctors with filtering and search
// @access  Public (or Private if login required to browse)
router.get('/', async (req, res) => {
  try {
    const { search, specialty } = req.query;
    const query = {};

    // Filter by specialization (corrected field name)
    if (specialty && specialty !== 'All Specialties') {
      query.specialization = specialty;
    }

    // Case-insensitive, "starts-with" search on fullName
    if (search) {
      query.fullName = { $regex: new RegExp('^' + search, 'i') };
    }

    const doctors = await Doctor.find(query).select('-password');
    res.json(doctors);
  } catch (err) {
    console.error('Get Doctors Error:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/doctors/earnings/data
// @desc    Get earnings data for the logged-in doctor
// @access  Private (Doctor only)
router.get('/earnings/data', authMiddleware, async (req, res) => {
  // 1. Verify user is a doctor
  if (req.user.userType !== 'doctor') {
    return res.status(403).json({ message: 'Access denied. Not a doctor.' });
  }

  try {
    const doctorId = req.user.userId;

    // 2. Fetch all appointments for this doctor
    const appointments = await Appointment.find({ doctor: doctorId })
      .sort({ date: -1 }); // Sort newest first for transactions

    // 3. Calculate earnings (only count 'completed' appointments)
    let today = 0;
    let thisWeek = 0;
    let thisMonth = 0;
    let totalEarnings = 0;
    const monthlyBreakdownMap = {};

    const now = new Date();
    // Ensure todayStart calculation doesn't modify 'now' permanently for subsequent calculations
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - todayStart.getDay()); // Start of current week (Sunday)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    appointments.forEach(apt => {
      if (apt.status === 'completed') {
        const fee = apt.consultationFeeAtBooking || 0;
        totalEarnings += fee;
        const aptDate = new Date(apt.date);

        if (aptDate >= todayStart) today += fee;
        if (aptDate >= weekStart) thisWeek += fee;
        if (aptDate >= monthStart) thisMonth += fee;

        const monthYear = `${aptDate.toLocaleString('default', { month: 'long' })} ${aptDate.getFullYear()}`;
        if (!monthlyBreakdownMap[monthYear]) {
          monthlyBreakdownMap[monthYear] = { month: monthYear, appointments: 0, earnings: 0 };
        }
        monthlyBreakdownMap[monthYear].appointments++;
        monthlyBreakdownMap[monthYear].earnings += fee;
      }
    });

    // 4. Format recent transactions (show non-cancelled, use main status)
    const recentTransactions = appointments
      .filter(apt => apt.status !== 'cancelled')
      .slice(0, 10)
      .map(apt => ({
        id: apt._id,
        patientName: apt.patientNameForVisit,
        date: apt.date,
        time: apt.time,
        amount: apt.consultationFeeAtBooking,
        status: apt.status, // Use main appointment status ('upcoming' or 'completed')
      }));

    const monthlyBreakdown = Object.values(monthlyBreakdownMap)
      // Correct sorting: Compare Date objects for reliability
      .sort((a, b) => new Date(b.month.split(' ')[1], getMonthIndex(b.month.split(' ')[0])) - new Date(a.month.split(' ')[1], getMonthIndex(a.month.split(' ')[0])));


    res.json({
      today,
      thisWeek,
      thisMonth,
      totalEarnings,
      recentTransactions,
      monthlyBreakdown: monthlyBreakdown.slice(0, 6),
    });

  } catch (err) {
    console.error('Earnings Error:', err.message);
    res.status(500).send('Server Error');
  }
});

// Helper function to get month index for sorting
function getMonthIndex(monthName) {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return months.indexOf(monthName);
}


// @route   GET api/doctors/earnings/download-report
// @desc    Download earnings report as CSV for the logged-in doctor
// @access  Private (Doctor only)
router.get('/earnings/download-report', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'doctor') {
    return res.status(403).json({ message: 'Access denied. Not a doctor.' });
  }

  try {
    const doctorId = req.user.userId;

    const appointments = await Appointment.find({
      doctor: doctorId,
    }).sort({ date: -1 });

    const fields = [
      { label: 'Appointment ID', value: '_id' },
      { label: 'Date', value: row => new Date(row.date).toLocaleDateString() },
      { label: 'Time', value: 'time' },
      { label: 'Patient Name', value: 'patientNameForVisit' },
      { label: 'Reason', value: 'reasonForVisit' },
      { label: 'Fee', value: 'consultationFeeAtBooking' },
      { label: 'Status', value: 'status' },
      // Removed paymentStatus as per your request
    ];
    const csvData = appointments.map(apt => ({
      _id: apt._id,
      date: apt.date,
      time: apt.time,
      patientNameForVisit: apt.patientNameForVisit,
      reasonForVisit: apt.reasonForVisit,
      consultationFeeAtBooking: apt.consultationFeeAtBooking,
      status: apt.status,
    }));

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(csvData);

    const fileName = `earnings-report-${new Date().toISOString().split('T')[0]}.csv`;
    res.header('Content-Type', 'text/csv');
    res.attachment(fileName);
    res.send(csv);

  } catch (err) {
    console.error('Download Report Error:', err.message);
    res.status(500).send('Server Error generating report');
  }
});


// @route   GET api/doctors/:id
// @desc    Get a single doctor's profile by their ID
// @access  Public (or Private if login required)
// IMPORTANT: This MUST come AFTER specific routes like '/earnings/...'
router.get('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).select('-password');
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    res.json(doctor);
  } catch (err) {
    console.error('Get Doctor by ID Error:', err.message);
    // Handle potential CastError if the ID format is invalid
    if (err.kind === 'ObjectId') {
        return res.status(400).json({ message: 'Invalid Doctor ID format' });
    }
    res.status(500).send('Server Error');
  }
});


module.exports = router;