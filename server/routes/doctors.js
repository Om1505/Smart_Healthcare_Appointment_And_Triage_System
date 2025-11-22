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

    // By default, only return verified doctors to public clients.
    // Use `?includeUnverified=true` to explicitly request unverified doctors (admin/debug use).
    if (req.query.includeUnverified !== 'true') {
      query.isVerified = true;
    }

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

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

    const shouldCountAppointment = (apt) => {
      const status = apt.status?.toLowerCase();
      return status === 'completed' || status === 'upcoming';
    };

    appointments.forEach(apt => {
      if (!shouldCountAppointment(apt)) return;

      const fee = apt.consultationFeeAtBooking || 0;
      totalEarnings += fee;
      const aptDate = new Date(apt.date);

      if (aptDate >= todayStart && aptDate < tomorrowStart) today += fee;
      if (aptDate >= weekStart && aptDate < weekEnd) thisWeek += fee;
      if (aptDate >= monthStart && aptDate < monthEnd) thisMonth += fee;

      const monthIndex = aptDate.getMonth();
      const year = aptDate.getFullYear();
      const monthKey = `${year}-${monthIndex}`;
      if (!monthlyBreakdownMap[monthKey]) {
        monthlyBreakdownMap[monthKey] = {
          key: monthKey,
          month: `${aptDate.toLocaleString('default', { month: 'long' })} ${year}`,
          monthIndex,
          year,
          appointments: 0,
          earnings: 0
        };
      }
      monthlyBreakdownMap[monthKey].appointments++;
      monthlyBreakdownMap[monthKey].earnings += fee;
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
      .sort((a, b) => {
        if (b.year === a.year) {
          return b.monthIndex - a.monthIndex;
        }
        return b.year - a.year;
      })
      .map(({ month, appointments, earnings }) => ({ month, appointments, earnings }));


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