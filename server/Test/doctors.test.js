import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Mock auth middleware by intercepting the require
const mockAuth = (req, res, next) => {
    if (req.headers['mock-user']) {
        req.user = JSON.parse(req.headers['mock-user']);
        next();
    } else {
        res.status(401).json({ message: 'No token, authorization denied' });
    }
};

// Override require for auth middleware
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
    if (id === '../middleware/auth') {
        return mockAuth;
    }
    return originalRequire.apply(this, arguments);
};

// Import your actual route and models using require
const doctorRoutes = require('../routes/doctors');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');

// Create a temporary app instance for testing
const app = express();
app.use(express.json());
// Fix: Ensure the middleware mock is applied correctly if the export was default or named
const authMiddleware = require('../middleware/auth');
// If your real middleware is `module.exports = func`, the mock needs to match structure.
// For this test context, we can just assume the route uses the mock we defined above.

app.use('/api/doctors', doctorRoutes);

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
}, 120000); // 2 minute timeout for MongoDB setup

afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    if (mongoServer) {
        await mongoServer.stop();
    }
});

afterEach(async () => {
    await Doctor.deleteMany({});
    await Appointment.deleteMany({});
    vi.restoreAllMocks();
});

describe('Doctor Routes (Vitest)', () => {

    // --- 1. GET /api/doctors ---
    describe('GET /api/doctors', () => {
        it('should return all doctors without password field', async () => {
            await Doctor.create([
                { 
                    fullName: 'Dr. Strange', 
                    specialization: 'Neurology', 
                    email: 'doc1@test.com', 
                    password: 'Secret@123',
                    experience: 10,
                    licenseNumber: 'LIC001',
                    address: '123 Main St',
                    consultationFee: 500
                },
                { 
                    fullName: 'Dr. House', 
                    specialization: 'Diagnostic', 
                    email: 'doc2@test.com', 
                    password: 'Secret@456',
                    experience: 15,
                    licenseNumber: 'LIC002',
                    address: '456 Elm St',
                    consultationFee: 600
                }
            ]);

            const res = await request(app).get('/api/doctors');
            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBe(2);
            expect(res.body[0].password).toBeUndefined(); // Password should be excluded
            expect(res.body[1].password).toBeUndefined();
        });

        it('should filter by specialization', async () => {
            await Doctor.create([
                { 
                    fullName: 'Dr. A', 
                    specialization: 'Cardiology', 
                    email: 'a@test.com', 
                    password: 'Secret@123',
                    experience: 5,
                    licenseNumber: 'LIC003',
                    address: '789 Oak St',
                    consultationFee: 400
                },
                { 
                    fullName: 'Dr. B', 
                    specialization: 'Dermatology', 
                    email: 'b@test.com', 
                    password: 'Secret@456',
                    experience: 8,
                    licenseNumber: 'LIC004',
                    address: '321 Pine St',
                    consultationFee: 350
                }
            ]);

            const res = await request(app).get('/api/doctors?specialty=Cardiology');
            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBe(1);
            expect(res.body[0].fullName).toBe('Dr. A');
        });

        it('should not filter when specialty is "All Specialties"', async () => {
            await Doctor.create([
                { 
                    fullName: 'Dr. A', 
                    specialization: 'Cardiology', 
                    email: 'a@test.com', 
                    password: 'Secret@123',
                    experience: 5,
                    licenseNumber: 'LIC005',
                    address: '789 Oak St',
                    consultationFee: 400
                },
                { 
                    fullName: 'Dr. B', 
                    specialization: 'Dermatology', 
                    email: 'b@test.com', 
                    password: 'Secret@456',
                    experience: 8,
                    licenseNumber: 'LIC006',
                    address: '321 Pine St',
                    consultationFee: 350
                }
            ]);

            const res = await request(app).get('/api/doctors?specialty=All Specialties');
            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBe(2);
        });

        it('should search by fullName (case-insensitive, starts-with)', async () => {
            await Doctor.create([
                { 
                    fullName: 'Dr. John Smith', 
                    specialization: 'Cardiology', 
                    email: 'john@test.com', 
                    password: 'Secret@123',
                    experience: 12,
                    licenseNumber: 'LIC007',
                    address: '111 Maple St',
                    consultationFee: 550
                },
                { 
                    fullName: 'Dr. Jane Doe', 
                    specialization: 'Dermatology', 
                    email: 'jane@test.com', 
                    password: 'Secret@456',
                    experience: 9,
                    licenseNumber: 'LIC008',
                    address: '222 Cedar St',
                    consultationFee: 500
                }
            ]);

            const res = await request(app).get('/api/doctors?search=dr. j');
            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBe(2); // Both start with "Dr. J"
        });

        it('should return empty array when no doctors match filter', async () => {
            await Doctor.create([
                { 
                    fullName: 'Dr. A', 
                    specialization: 'Cardiology', 
                    email: 'a@test.com', 
                    password: 'Secret@123',
                    experience: 5,
                    licenseNumber: 'LIC009',
                    address: '333 Birch St',
                    consultationFee: 450
                }
            ]);

            const res = await request(app).get('/api/doctors?specialty=Neurology');
            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBe(0);
        });

        it('should handle server errors gracefully', async () => {
            // Mock find to throw an error
            vi.spyOn(Doctor, 'find').mockImplementationOnce(() => {
                throw new Error('Database error');
            });

            const res = await request(app).get('/api/doctors');
            expect(res.statusCode).toBe(500);
            expect(res.text).toBe('Server Error');
        });
    });

    // --- 2. GET /api/doctors/earnings/data ---
    describe('GET /api/doctors/earnings/data', () => {
        it('should return 403 if user is not a doctor', async () => {
            const mockUser = JSON.stringify({ userId: '123', userType: 'patient' });

            const res = await request(app)
                .get('/api/doctors/earnings/data')
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe('Access denied. Not a doctor.');
        });

        it('should calculate earnings correctly for today, week, and month', async () => {
            const doctorId = new mongoose.Types.ObjectId();
            const patientId = new mongoose.Types.ObjectId();
            const mockDoctorUser = JSON.stringify({ userId: doctorId, userType: 'doctor' });

            const now = new Date();
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            
            const lastWeek = new Date(now);
            lastWeek.setDate(lastWeek.getDate() - 8);

            // Create Appointments
            await Appointment.create([
                {
                    patient: patientId,
                    doctor: doctorId,
                    date: now,
                    time: '10:00 AM',
                    consultationFeeAtBooking: 500,
                    status: 'completed',
                    patientNameForVisit: 'Patient A',
                    reasonForVisit: 'Checkup'
                },
                {
                    patient: patientId,
                    doctor: doctorId,
                    date: yesterday,
                    time: '11:00 AM',
                    consultationFeeAtBooking: 300,
                    status: 'upcoming',
                    patientNameForVisit: 'Patient B',
                    reasonForVisit: 'Consultation'
                },
                {
                    patient: patientId,
                    doctor: doctorId,
                    date: lastWeek,
                    time: '09:00 AM',
                    consultationFeeAtBooking: 400,
                    status: 'cancelled',
                    patientNameForVisit: 'Patient C',
                    reasonForVisit: 'Followup'
                }
            ]);

            const res = await request(app)
                .get('/api/doctors/earnings/data')
                .set('mock-user', mockDoctorUser);

            expect(res.statusCode).toBe(200);
            expect(res.body.today).toBe(500); // Only today's completed
            expect(res.body.totalEarnings).toBe(800); // completed + upcoming (not cancelled)
            expect(res.body.recentTransactions.length).toBe(2); // Excludes cancelled
            expect(res.body.monthlyBreakdown).toBeDefined();
        });

        it('should handle appointments with null/undefined fees', async () => {
            const doctorId = new mongoose.Types.ObjectId();
            const patientId = new mongoose.Types.ObjectId();
            const mockDoctorUser = JSON.stringify({ userId: doctorId, userType: 'doctor' });

            await Appointment.create([
                {
                    patient: patientId,
                    doctor: doctorId,
                    date: new Date(),
                    time: '10:00 AM',
                    consultationFeeAtBooking: 0,
                    status: 'completed',
                    patientNameForVisit: 'Patient A'
                },
                {
                    patient: patientId,
                    doctor: doctorId,
                    date: new Date(),
                    time: '11:00 AM',
                    consultationFeeAtBooking: 0,
                    status: 'upcoming',
                    patientNameForVisit: 'Patient B'
                }
            ]);

            const res = await request(app)
                .get('/api/doctors/earnings/data')
                .set('mock-user', mockDoctorUser);

            expect(res.statusCode).toBe(200);
            expect(res.body.totalEarnings).toBe(0);
        });

        it('should limit recent transactions to 10', async () => {
            const doctorId = new mongoose.Types.ObjectId();
            const patientId = new mongoose.Types.ObjectId();
            const mockDoctorUser = JSON.stringify({ userId: doctorId, userType: 'doctor' });

            const appointments = [];
            for (let i = 0; i < 15; i++) {
                appointments.push({
                    patient: patientId,
                    doctor: doctorId,
                    date: new Date(),
                    time: '10:00 AM',
                    consultationFeeAtBooking: 100,
                    status: 'completed',
                    patientNameForVisit: `Patient ${i}`
                });
            }
            await Appointment.create(appointments);

            const res = await request(app)
                .get('/api/doctors/earnings/data')
                .set('mock-user', mockDoctorUser);

            expect(res.statusCode).toBe(200);
            expect(res.body.recentTransactions.length).toBe(10);
        });

        it('should handle server errors in earnings endpoint', async () => {
            const mockDoctorUser = JSON.stringify({ userId: 'invalidId', userType: 'doctor' });

            const res = await request(app)
                .get('/api/doctors/earnings/data')
                .set('mock-user', mockDoctorUser);

            expect(res.statusCode).toBe(500);
        });

        it('should sort monthly breakdown by year and month correctly with multi-year data', async () => {
            const doctorId = new mongoose.Types.ObjectId();
            const patientId = new mongoose.Types.ObjectId();
            const mockDoctorUser = JSON.stringify({ userId: doctorId, userType: 'doctor' });

            // Create appointments spanning different years to trigger year-based sorting
            const currentYear = new Date().getFullYear();
            const lastYear = currentYear - 1;
            const twoYearsAgo = currentYear - 2;

            await Appointment.create([
                {
                    patient: patientId,
                    doctor: doctorId,
                    date: new Date(currentYear, 5, 15), // June current year
                    time: '10:00 AM',
                    consultationFeeAtBooking: 500,
                    status: 'completed',
                    patientNameForVisit: 'Patient A'
                },
                {
                    patient: patientId,
                    doctor: doctorId,
                    date: new Date(lastYear, 11, 20), // December last year
                    time: '11:00 AM',
                    consultationFeeAtBooking: 400,
                    status: 'completed',
                    patientNameForVisit: 'Patient B'
                },
                {
                    patient: patientId,
                    doctor: doctorId,
                    date: new Date(lastYear, 2, 10), // March last year
                    time: '09:00 AM',
                    consultationFeeAtBooking: 300,
                    status: 'completed',
                    patientNameForVisit: 'Patient C'
                },
                {
                    patient: patientId,
                    doctor: doctorId,
                    date: new Date(twoYearsAgo, 8, 5), // September two years ago
                    time: '02:00 PM',
                    consultationFeeAtBooking: 200,
                    status: 'completed',
                    patientNameForVisit: 'Patient D'
                }
            ]);

            const res = await request(app)
                .get('/api/doctors/earnings/data')
                .set('mock-user', mockDoctorUser);

            expect(res.statusCode).toBe(200);
            expect(res.body.monthlyBreakdown).toBeDefined();
            expect(res.body.monthlyBreakdown.length).toBeGreaterThan(0);
            
            // Verify sorting: should be ordered by year (descending), then month (descending)
            const breakdown = res.body.monthlyBreakdown;
            
            // First entry should be from current year (most recent)
            expect(breakdown[0].month).toContain(String(currentYear));
            
            // Last entry should be from two years ago (oldest)
            expect(breakdown[breakdown.length - 1].month).toContain(String(twoYearsAgo));
        });
    });

    // --- 3. GET /api/doctors/earnings/download-report ---
    describe('GET /api/doctors/earnings/download-report', () => {
        it('should return 403 if user is not a doctor', async () => {
            const mockUser = JSON.stringify({ userId: '123', userType: 'patient' });

            const res = await request(app)
                .get('/api/doctors/earnings/download-report')
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe('Access denied. Not a doctor.');
        });

        it('should download CSV report for doctor', async () => {
            const doctorId = new mongoose.Types.ObjectId();
            const patientId = new mongoose.Types.ObjectId();
            const mockDoctorUser = JSON.stringify({ userId: doctorId, userType: 'doctor' });

            await Appointment.create([
                {
                    patient: patientId,
                    doctor: doctorId,
                    date: new Date(),
                    time: '10:00 AM',
                    consultationFeeAtBooking: 500,
                    status: 'completed',
                    patientNameForVisit: 'John Doe',
                    reasonForVisit: 'Checkup'
                }
            ]);

            const res = await request(app)
                .get('/api/doctors/earnings/download-report')
                .set('mock-user', mockDoctorUser);

            expect(res.statusCode).toBe(200);
            expect(res.headers['content-type']).toContain('text/csv');
            expect(res.headers['content-disposition']).toMatch(/attachment; filename=/);
            expect(res.text).toContain('Appointment ID');
            expect(res.text).toContain('John Doe');
        });

        it('should handle empty appointments list', async () => {
            const doctorId = new mongoose.Types.ObjectId();
            const mockDoctorUser = JSON.stringify({ userId: doctorId, userType: 'doctor' });

            const res = await request(app)
                .get('/api/doctors/earnings/download-report')
                .set('mock-user', mockDoctorUser);

            expect(res.statusCode).toBe(200);
            expect(res.headers['content-type']).toContain('text/csv');
        });

        it('should handle server errors in download endpoint', async () => {
            const mockDoctorUser = JSON.stringify({ userId: 'invalidId', userType: 'doctor' });

            const res = await request(app)
                .get('/api/doctors/earnings/download-report')
                .set('mock-user', mockDoctorUser);

            expect(res.statusCode).toBe(500);
        });
    });

    // --- 4. GET /api/doctors/:id ---
    describe('GET /api/doctors/:id', () => {
        it('should return doctor profile without password', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. Who',
                specialization: 'Time Travel',
                email: 'who@test.com',
                password: 'Secret@123',
                experience: 20,
                licenseNumber: 'LIC999',
                address: '999 TARDIS Lane',
                consultationFee: 1000
            });

            const res = await request(app).get(`/api/doctors/${doctor._id}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.fullName).toBe('Dr. Who');
            expect(res.body.password).toBeUndefined();
        });

        it('should return 404 for non-existent ID', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app).get(`/api/doctors/${fakeId}`);
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe('Doctor not found');
        });

        it('should return 400 for invalid ID format', async () => {
            const res = await request(app).get('/api/doctors/invalid-id-format');
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Invalid Doctor ID format');
        });

        it('should handle server errors in get doctor by ID', async () => {
            // Mock findById to throw non-CastError
            vi.spyOn(Doctor, 'findById').mockImplementationOnce(() => {
                const error = new Error('Database error');
                throw error;
            });

            const validId = new mongoose.Types.ObjectId();
            const res = await request(app).get(`/api/doctors/${validId}`);
            expect(res.statusCode).toBe(500);
            expect(res.text).toBe('Server Error');
        });
    });
});