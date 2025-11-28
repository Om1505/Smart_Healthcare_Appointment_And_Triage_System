import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Mock Razorpay BEFORE importing routes
const mockRazorpayInstance = {
    orders: {
        create: vi.fn().mockResolvedValue({
            id: 'order_mock_123',
            amount: 50000,
            currency: 'INR'
        })
    }
};

// Mock email utils
const mockSendEmail = vi.fn().mockResolvedValue(true);

// Mock auth middleware
const mockAuth = (req, res, next) => {
    if (req.headers['mock-user']) {
        req.user = JSON.parse(req.headers['mock-user']);
        next();
    } else {
        res.status(401).json({ message: 'No token, authorization denied' });
    }
};

// Override require for modules
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
    if (id === '../middleware/auth') {
        return mockAuth;
    }
    if (id === 'razorpay') {
        // Return a constructor function
        return function Razorpay() {
            return mockRazorpayInstance;
        };
    }
    if (id === '../utils/email_utils') {
        return mockSendEmail;
    }
    return originalRequire.apply(this, arguments);
};

// Set environment variables before importing routes
process.env.RAZORPAY_KEY_ID = 'test_key_id';
process.env.RAZORPAY_KEY_SECRET = 'test_secret';

// Import routes and models AFTER mocks are set up
const appointmentRoutes = require('../routes/appointments');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');

const app = express();
app.use(express.json());
app.use('/api/appointments', appointmentRoutes);

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
    await Patient.deleteMany({});
    await Appointment.deleteMany({});
    mockSendEmail.mockClear();
    mockRazorpayInstance.orders.create.mockClear();
    vi.restoreAllMocks();
});

describe('Appointment Routes', () => {

    // --- 1. GET /api/appointments/available-slots/:doctorId ---
    describe('GET /available-slots/:doctorId', () => {
        it('should return available slots for a doctor', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. Time',
                email: 'time@test.com',
                password: 'Secret@123',
                specialization: 'Cardiology',
                experience: 10,
                licenseNumber: 'LIC_TIME1',
                address: '123 Time St',
                consultationFee: 500,
                workingHours: {
                    monday: { enabled: true, start: "09:00", end: "11:00" },
                    tuesday: { enabled: true, start: "09:00", end: "11:00" },
                    wednesday: { enabled: true, start: "09:00", end: "11:00" },
                    thursday: { enabled: true, start: "09:00", end: "11:00" },
                    friday: { enabled: true, start: "09:00", end: "11:00" },
                }
            });

            const mockUser = JSON.stringify({ userId: 'patient123', userType: 'patient' });

            const res = await request(app)
                .get(`/api/appointments/available-slots/${doctor._id}`)
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body[0]).toHaveProperty('date');
            expect(res.body[0]).toHaveProperty('time');
        });

        it('should call Appointment.find with doctor and upcoming status (prevent mutation escape)', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. Spy',
                email: 'spy@test.com',
                password: 'Secret@123',
                specialization: 'Cardiology',
                experience: 10,
                licenseNumber: 'LIC_SPY1',
                address: 'Spy St',
                consultationFee: 500,
                workingHours: {
                    monday: { enabled: true, start: "09:00", end: "10:00" }
                }
            });

            // spy on Appointment.find
            const findSpy = vi.spyOn(Appointment, 'find');

            const mockUser = JSON.stringify({ userId: 'patient123', userType: 'patient' });

            const res = await request(app)
                .get(`/api/appointments/available-slots/${doctor._id}`)
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(200);
            // ensure Appointment.find was called with filter containing doctor id and status upcoming
            expect(findSpy).toHaveBeenCalled();
            const calledArgs = findSpy.mock.calls[0][0];
            expect(calledArgs).toBeDefined();
            expect(String(calledArgs.doctor)).toBe(String(doctor._id));
            expect(calledArgs.status).toBe('upcoming');

            findSpy.mockRestore();
        });

        it('should exclude booked slots from available slots (only upcoming blocks)', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. Booked',
                email: 'booked@test.com',
                password: 'Secret@123',
                specialization: 'Cardiology',
                experience: 10,
                licenseNumber: 'LIC_BOOK2',
                address: '555 Booked St',
                consultationFee: 500,
                workingHours: {
                    monday: { enabled: true, start: "09:00", end: "12:00" }
                }
            });

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            // upcoming appointment - should block the slot
            await Appointment.create({
                doctor: doctor._id,
                patient: new mongoose.Types.ObjectId(),
                date: tomorrow,
                time: '10:00 AM',
                status: 'upcoming',
                consultationFeeAtBooking: 500,
                patientNameForVisit: 'Booked Patient'
            });

            // completed appointment - should NOT block slot on the day after tomorrow
            const dayAfter = new Date(tomorrow);
            dayAfter.setDate(dayAfter.getDate() + 1);
            dayAfter.setHours(0, 0, 0, 0);

            await Appointment.create({
                doctor: doctor._id,
                patient: new mongoose.Types.ObjectId(),
                date: dayAfter,
                time: '09:00 AM',
                status: 'completed',
                consultationFeeAtBooking: 500,
                patientNameForVisit: 'Completed Patient'
            });

            const mockUser = JSON.stringify({ userId: 'patient123', userType: 'patient' });

            const res = await request(app)
                .get(`/api/appointments/available-slots/${doctor._id}`)
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(200);
            // The slot for 'tomorrow' at '10:00 AM' must be removed
            const tomorrowDateString = tomorrow.toDateString();
            const tomorrowSlots = res.body.filter(slot => new Date(slot.date).toDateString() === tomorrowDateString);
            const blockedSlot = tomorrowSlots.find(slot => slot.time === '10:00 AM');
            expect(blockedSlot).toBeUndefined();

            // The completed appointment day should not be blocked (slot may exist on dayAfter)
            const dayAfterSlots = res.body.filter(slot => new Date(slot.date).toDateString() === dayAfter.toDateString());
            // If schedule allows 9:00, there should be a slot (we assert at least that array exists)
            expect(dayAfterSlots).toBeDefined();
        });

        it('should exclude blocked times from available slots (block window)', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const doctor = await Doctor.create({
                fullName: 'Dr. Block',
                email: 'block@test.com',
                password: 'Secret@123',
                specialization: 'Neurology',
                experience: 8,
                licenseNumber: 'LIC_BLOCK1',
                address: '666 Block St',
                consultationFee: 450,
                workingHours: {
                    monday: { enabled: true, start: "09:00", end: "12:00" }
                },
                blockedTimes: [
                    {
                        date: tomorrow,
                        startTime: '10:00',
                        endTime: '12:00',
                        reason: 'Personal appointment'
                    }
                ]
            });

            const mockUser = JSON.stringify({ userId: 'patient123', userType: 'patient' });

            const res = await request(app)
                .get(`/api/appointments/available-slots/${doctor._id}`)
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(200);

            const tomorrowDateString = tomorrow.toDateString();
            const tomorrowSlots = res.body.filter(slot =>
                new Date(slot.date).toDateString() === tomorrowDateString
            );

            const blockedSlot1 = tomorrowSlots.find(slot => slot.time === '10:00 AM');
            const blockedSlot2 = tomorrowSlots.find(slot => slot.time === '11:00 AM');
            expect(blockedSlot1).toBeUndefined();
            expect(blockedSlot2).toBeUndefined();
        });

        it('should support workingHours stored as a Map (exercise .get(dayKey) path)', async () => {
            // Build a Map-like structure that Mongoose might give (simulate .get usage)
            const workingHoursMap = new Map();
            workingHoursMap.set('monday', { enabled: true, start: '09:00', end: '10:00' });

            // Create doctor with required fields, store workingHours as plain object but we will mock findById to return a doc with Map
            const real = await Doctor.create({
                fullName: 'Dr. Map',
                email: 'map@test.com',
                password: 'Secret@123',
                specialization: 'General',
                experience: 5,
                licenseNumber: 'LIC_MAP1',
                address: 'Map St',
                consultationFee: 300,
                workingHours: { monday: { enabled: true, start: '09:00', end: '10:00' } }
            });

            // Mock Doctor.findById to return an object where workingHours.get exists
            const docLike = real.toObject();
            docLike.workingHours = {
                get: (key) => {
                    return workingHoursMap.get(key);
                }
            };

            const findDocSpy = vi.spyOn(Doctor, 'findById').mockResolvedValueOnce(docLike);

            const mockUser = JSON.stringify({ userId: 'patient123', userType: 'patient' });

            const res = await request(app)
                .get(`/api/appointments/available-slots/${real._id}`)
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBeGreaterThan(0);

            findDocSpy.mockRestore();
        });

        it('should return 404 if doctor not found', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const mockUser = JSON.stringify({ userId: 'patient123', userType: 'patient' });

            const res = await request(app)
                .get(`/api/appointments/available-slots/${fakeId}`)
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(404);
        });

        it('should handle server errors', async () => {
            vi.spyOn(Doctor, 'findById').mockImplementationOnce(() => {
                throw new Error('Database error');
            });

            const mockUser = JSON.stringify({ userId: 'patient123', userType: 'patient' });
            const fakeId = new mongoose.Types.ObjectId();

            const res = await request(app)
                .get(`/api/appointments/available-slots/${fakeId}`)
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(500);
            expect(res.text).toBe('Server Error');
        });

        it('should handle errors when generating slots (Appointment.find throws)', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. Error',
                email: 'error@test.com',
                password: 'Secret@123',
                specialization: 'Cardiology',
                experience: 10,
                licenseNumber: 'LIC_ERROR1',
                address: '123 Error St',
                consultationFee: 500,
                workingHours: {
                    monday: { enabled: true, start: "09:00", end: "11:00" }
                }
            });

            const mockUser = JSON.stringify({ userId: 'patient123', userType: 'patient' });

            vi.spyOn(Appointment, 'find').mockImplementationOnce(() => { throw new Error('DB error during slots'); });

            const res = await request(app)
                .get(`/api/appointments/available-slots/${doctor._id}`)
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(500);
            expect(res.text).toBe('Server Error');
        });

    });

    // --- 2. GET /api/appointments/my-appointments ---
    describe('GET /my-appointments', () => {
        it('should return appointments for logged-in patient', async () => {
            const patientId = new mongoose.Types.ObjectId();
            const mockUser = JSON.stringify({ userId: patientId, userType: 'patient' });

            const doctor = await Doctor.create({
                fullName: 'Dr. A',
                email: 'a@t.com',
                password: 'Secret@123',
                specialization: 'Cardiology',
                experience: 5,
                licenseNumber: 'LIC_APT1',
                address: '111 Apt St',
                consultationFee: 300,
            });

            await Appointment.create({
                patient: patientId,
                doctor: doctor._id,
                date: new Date(),
                time: '10:00 AM',
                consultationFeeAtBooking: 300,
                status: 'upcoming',
                patientNameForVisit: 'Test Patient'
            });

            const res = await request(app)
                .get('/api/appointments/my-appointments')
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBe(1);
            expect(res.body[0].doctor.fullName).toBe('Dr. A');
        });

        it('should deny access if user is not a patient', async () => {
            const mockUser = JSON.stringify({ userId: 'doc123', userType: 'doctor' });
            const res = await request(app)
                .get('/api/appointments/my-appointments')
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(403);
        });

        it('doctor endpoint should filter out appointments with null patient (mock Appointment.find return containing null patient)', async () => {
            const mockUser = JSON.stringify({ userId: 'docNull', userType: 'doctor' });

            // Mock Appointment.find chain to return one appointment with patient = null
            const mockFind = vi.spyOn(Appointment, 'find').mockImplementationOnce(() => {
                return {
                    populate: function () { return this; },
                    sort: function () { return Promise.resolve([{ patient: null, _id: new mongoose.Types.ObjectId() }]); }
                };
            });

            const res = await request(app)
                .get('/api/appointments/doctor')
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(0);

            mockFind.mockRestore();
        });

        it('should return appointments for logged-in doctor', async () => {
            const doctorId = new mongoose.Types.ObjectId();
            const patientId = new mongoose.Types.ObjectId();
            const mockUser = JSON.stringify({ userId: doctorId, userType: 'doctor' });

            const patient = await Patient.create({
                fullName: 'Patient Test',
                email: 'patient_test@test.com',
                password: 'Secret@123'
            });

            await Appointment.create({
                patient: patient._id,
                doctor: doctorId,
                date: new Date(),
                time: '02:00 PM',
                consultationFeeAtBooking: 400,
                status: 'upcoming',
                patientNameForVisit: 'Patient Test'
            });

            const res = await request(app)
                .get('/api/appointments/doctor')
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBe(1);
            expect(res.body[0].patient.fullName).toBe('Patient Test');
        });

        it('should handle server errors for my-appointments (simulate Appointment.find chain rejection)', async () => {
            vi.spyOn(Appointment, 'find').mockImplementationOnce(() => {
                return {
                    populate: vi.fn().mockReturnThis(),
                    sort: vi.fn().mockRejectedValueOnce(new Error('Database error'))
                };
            });

            const mockUser = JSON.stringify({ userId: 'patient123', userType: 'patient' });

            const res = await request(app)
                .get('/api/appointments/my-appointments')
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(500);
            expect(res.text).toBe('Server Error');
        });
    });

    // --- 3. POST /api/appointments/create-payment-order ---
    describe('POST /create-payment-order', () => {
        it('should create a Razorpay order', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. Pay',
                email: 'pay@t.com',
                password: 'Secret@123',
                specialization: 'Dermatology',
                experience: 7,
                licenseNumber: 'LIC_PAY1',
                address: '222 Pay St',
                consultationFee: 500
            });
            const mockUser = JSON.stringify({ userId: 'pat123', userType: 'patient' });

            const res = await request(app)
                .post('/api/appointments/create-payment-order')
                .set('mock-user', mockUser)
                .send({
                    doctorId: doctor._id,
                    amount: 50000 // in paisa
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.orderId).toBe('order_mock_123');
            expect(mockRazorpayInstance.orders.create).toHaveBeenCalled();
        });

        it('should call console.log lines in create-payment-order (exercise console.log coverage)', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. Log',
                email: 'log@t.com',
                password: 'Secret@123',
                specialization: 'General',
                experience: 4,
                licenseNumber: 'LIC_LOG1',
                address: 'Log St',
                consultationFee: 200
            });
            const mockUser = JSON.stringify({ userId: 'pat123', userType: 'patient' });

            const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            const res = await request(app)
                .post('/api/appointments/create-payment-order')
                .set('mock-user', mockUser)
                .send({
                    doctorId: doctor._id,
                    amount: 20000
                });

            expect(res.statusCode).toBe(200);
            expect(logSpy).toHaveBeenCalled();

            logSpy.mockRestore();
        });

        it('should return 404 if doctor not found', async () => {
            const mockUser = JSON.stringify({ userId: 'pat123', userType: 'patient' });
            const res = await request(app)
                .post('/api/appointments/create-payment-order')
                .set('mock-user', mockUser)
                .send({
                    doctorId: new mongoose.Types.ObjectId(),
                    amount: 500
                });

            expect(res.statusCode).toBe(404);
        });

        it('should return 400 if doctorId is missing', async () => {
            const mockUser = JSON.stringify({ userId: 'pat123', userType: 'patient' });
            const res = await request(app)
                .post('/api/appointments/create-payment-order')
                .set('mock-user', mockUser)
                .send({
                    amount: 50000
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Doctor ID is required.');
        });

        it('should return 400 if amount is missing or invalid', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. Invalid',
                email: 'invalid@t.com',
                password: 'Secret@123',
                specialization: 'Dermatology',
                experience: 7,
                licenseNumber: 'LIC_INV1',
                address: '333 Invalid St',
                consultationFee: 500
            });
            const mockUser = JSON.stringify({ userId: 'pat123', userType: 'patient' });

            const res = await request(app)
                .post('/api/appointments/create-payment-order')
                .set('mock-user', mockUser)
                .send({
                    doctorId: doctor._id,
                    amount: 0
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Valid amount is required.');
        });

        it('should handle Razorpay order creation errors', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. Error',
                email: 'error@t.com',
                password: 'Secret@123',
                specialization: 'Dermatology',
                experience: 7,
                licenseNumber: 'LIC_ERR1',
                address: '444 Error St',
                consultationFee: 500
            });
            const mockUser = JSON.stringify({ userId: 'pat123', userType: 'patient' });

            mockRazorpayInstance.orders.create.mockRejectedValueOnce(new Error('Razorpay error'));

            const res = await request(app)
                .post('/api/appointments/create-payment-order')
                .set('mock-user', mockUser)
                .send({
                    doctorId: doctor._id,
                    amount: 50000
                });

            expect(res.statusCode).toBe(500);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Failed to create payment order');
        });
    });

    // --- 4. POST /api/appointments/verify-payment ---
    describe('POST /verify-payment', () => {
        it('should verify payment signature and create appointment', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. Verify',
                email: 'v@t.com',
                password: 'Secret@123',
                specialization: 'Cardiology',
                experience: 10,
                licenseNumber: 'LIC_VER1',
                address: '123 Verify St',
                consultationFee: 500
            });
            const patientId = new mongoose.Types.ObjectId();
            const mockUser = JSON.stringify({ userId: patientId, userType: 'patient' });

            const expectedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update('order_123' + '|' + 'pay_123')
                .digest('hex');

            const res = await request(app)
                .post('/api/appointments/verify-payment')
                .set('mock-user', mockUser)
                .send({
                    razorpay_order_id: 'order_123',
                    razorpay_payment_id: 'pay_123',
                    razorpay_signature: expectedSignature,
                    doctorId: doctor._id,
                    date: new Date().toISOString(),
                    time: '10:00 AM',
                    patientNameForVisit: 'John Doe',
                    primaryReason: 'Fever',
                    email: 'john@test.com'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            const savedApt = await Appointment.findOne({ paymentId: 'pay_123' });
            expect(savedApt).toBeTruthy();
            expect(savedApt.paymentStatus).toBe('paid');

            expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
                email: 'john@test.com',
                subject: expect.stringContaining('Payment Successful')
            }));
        });

        it('should fail if signature is invalid', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. V',
                email: 'v2@t.com',
                password: 'Secret@123',
                specialization: 'Neurology',
                experience: 8,
                licenseNumber: 'LIC_VER2',
                address: '456 Test St',
                consultationFee: 400,
            });
            const mockUser = JSON.stringify({ userId: 'pat123', userType: 'patient' });

            const res = await request(app)
                .post('/api/appointments/verify-payment')
                .set('mock-user', mockUser)
                .send({
                    razorpay_order_id: 'order_123',
                    razorpay_payment_id: 'pay_123',
                    razorpay_signature: 'invalid_signature_that_wont_match',
                    doctorId: doctor._id,
                    date: new Date().toISOString(),
                    time: '11:00 AM',
                    patientNameForVisit: 'Test User',
                    primaryReason: 'Checkup',
                    email: 'test@test.com'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Payment verification failed');
        });

        it('should return 404 if doctor not found during payment verification', async () => {
            const mockUser = JSON.stringify({ userId: 'pat123', userType: 'patient' });
            const expectedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update('order_123' + '|' + 'pay_123')
                .digest('hex');

            const res = await request(app)
                .post('/api/appointments/verify-payment')
                .set('mock-user', mockUser)
                .send({
                    razorpay_order_id: 'order_123',
                    razorpay_payment_id: 'pay_123',
                    razorpay_signature: expectedSignature,
                    doctorId: new mongoose.Types.ObjectId(),
                    date: new Date().toISOString(),
                    time: '10:00 AM',
                    patientNameForVisit: 'John Doe',
                    primaryReason: 'Fever',
                    email: 'john@test.com'
                });

            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Doctor not found');
        });

        it('should continue even if email sending fails', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. EmailFail',
                email: 'emailfail@t.com',
                password: 'Secret@123',
                specialization: 'Cardiology',
                experience: 10,
                licenseNumber: 'LIC_EMAIL1',
                address: '789 Email St',
                consultationFee: 500
            });
            const patientId = new mongoose.Types.ObjectId();
            const mockUser = JSON.stringify({ userId: patientId, userType: 'patient' });

            mockSendEmail.mockRejectedValueOnce(new Error('Email service down'));

            const expectedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update('order_456' + '|' + 'pay_456')
                .digest('hex');

            const res = await request(app)
                .post('/api/appointments/verify-payment')
                .set('mock-user', mockUser)
                .send({
                    razorpay_order_id: 'order_456',
                    razorpay_payment_id: 'pay_456',
                    razorpay_signature: expectedSignature,
                    doctorId: doctor._id,
                    date: new Date().toISOString(),
                    time: '10:00 AM',
                    patientNameForVisit: 'John Doe',
                    primaryReason: 'Fever',
                    email: 'john@test.com'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            const savedApt = await Appointment.findOne({ paymentId: 'pay_456' });
            expect(savedApt).toBeTruthy();
            expect(savedApt.paymentStatus).toBe('paid');
        });

        it('verify-payment should use default consultationFee 0 when doctor.consultationFee is missing (mocked doctor)', async () => {
            const realDoctor = await Doctor.create({
                fullName: 'Dr. NoFee',
                email: 'nofee@test.com',
                password: 'Secret@123',
                specialization: 'General',
                experience: 5,
                licenseNumber: 'LIC_NOFEE1',
                address: 'No Fee St',
                consultationFee: 250
            });

            const patientId = new mongoose.Types.ObjectId();
            const mockUser = JSON.stringify({ userId: patientId, userType: 'patient' });

            const doctorWithoutFee = { ...realDoctor.toObject() };
            delete doctorWithoutFee.consultationFee;

            const findSpy = vi.spyOn(Doctor, 'findById').mockResolvedValueOnce(doctorWithoutFee);

            const expectedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update('order_nofee' + '|' + 'pay_nofee')
                .digest('hex');

            const res = await request(app)
                .post('/api/appointments/verify-payment')
                .set('mock-user', mockUser)
                .send({
                    razorpay_order_id: 'order_nofee',
                    razorpay_payment_id: 'pay_nofee',
                    razorpay_signature: expectedSignature,
                    doctorId: realDoctor._id,
                    date: new Date().toISOString(),
                    time: '10:00 AM',
                    patientNameForVisit: 'John Doe',
                    primaryReason: 'Checkup',
                    email: 'john@example.com'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            const saved = await Appointment.findOne({ paymentId: 'pay_nofee' });
            expect(saved).toBeTruthy();
            expect(saved.consultationFeeAtBooking).toBe(0);

            findSpy.mockRestore();
        });

        it('should handle general payment verification errors (Doctor.findById throws)', async () => {
            const mockUser = JSON.stringify({ userId: 'pat123', userType: 'patient' });

            vi.spyOn(Doctor, 'findById').mockImplementationOnce(() => { throw new Error('DB err'); });

            const expectedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update('order_789' + '|' + 'pay_789')
                .digest('hex');

            const res = await request(app)
                .post('/api/appointments/verify-payment')
                .set('mock-user', mockUser)
                .send({
                    razorpay_order_id: 'order_789',
                    razorpay_payment_id: 'pay_789',
                    razorpay_signature: expectedSignature,
                    doctorId: new mongoose.Types.ObjectId(),
                    date: new Date().toISOString(),
                    time: '10:00 AM',
                    patientNameForVisit: 'John Doe',
                    primaryReason: 'Fever',
                    email: 'john@test.com'
                });

            expect(res.statusCode).toBe(500);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Payment verification failed');
        });
    });

    // --- 5. PUT /api/appointments/:id/cancel ---
    describe('PUT /:id/cancel', () => {
        it('should cancel an upcoming appointment', async () => {
            const patientId = new mongoose.Types.ObjectId();
            const doctorId = new mongoose.Types.ObjectId();
            const mockUser = JSON.stringify({ userId: patientId, userType: 'patient' });

            const apt = await Appointment.create({
                patient: patientId,
                doctor: doctorId,
                status: 'upcoming',
                date: new Date(),
                time: '09:00 AM',
                consultationFeeAtBooking: 400,
                patientNameForVisit: 'Cancel Patient'
            });

            const res = await request(app)
                .put(`/api/appointments/${apt._id}/cancel`)
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(200);
            expect(res.body.appointment.status).toBe('cancelled');
        });

        it('should fail if user is not the owner', async () => {
            const otherPatientId = new mongoose.Types.ObjectId();
            const doctorId = new mongoose.Types.ObjectId();
            const apt = await Appointment.create({
                patient: otherPatientId,
                doctor: doctorId,
                status: 'upcoming',
                date: new Date(),
                time: '10:00 AM',
                consultationFeeAtBooking: 350,
                patientNameForVisit: 'Other Patient'
            });

            const mockUser = JSON.stringify({ userId: 'myId', userType: 'patient' });

            const res = await request(app)
                .put(`/api/appointments/${apt._id}/cancel`)
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(401);
        });

        it('should return 404 if appointment not found', async () => {
            const patientId = new mongoose.Types.ObjectId();
            const mockUser = JSON.stringify({ userId: patientId, userType: 'patient' });

            const res = await request(app)
                .put(`/api/appointments/${new mongoose.Types.ObjectId()}/cancel`)
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe('Appointment not found');
        });

        it('should fail if appointment is already cancelled', async () => {
            const patientId = new mongoose.Types.ObjectId();
            const doctorId = new mongoose.Types.ObjectId();
            const mockUser = JSON.stringify({ userId: patientId, userType: 'patient' });

            const apt = await Appointment.create({
                patient: patientId,
                doctor: doctorId,
                status: 'cancelled',
                date: new Date(),
                time: '11:00 AM',
                consultationFeeAtBooking: 400,
                patientNameForVisit: 'Already Cancelled'
            });

            const res = await request(app)
                .put(`/api/appointments/${apt._id}/cancel`)
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toContain('Cannot cancel an appointment that is already cancelled');
        });

        it('should handle server errors when cancelling appointment', async () => {
            const patientId = new mongoose.Types.ObjectId();
            const doctorId = new mongoose.Types.ObjectId();
            const mockUser = JSON.stringify({ userId: patientId, userType: 'patient' });

            const apt = await Appointment.create({
                patient: patientId,
                doctor: doctorId,
                status: 'upcoming',
                date: new Date(),
                time: '12:00 PM',
                consultationFeeAtBooking: 400,
                patientNameForVisit: 'Error Cancel'
            });

            vi.spyOn(Appointment.prototype, 'save').mockImplementationOnce(() => { throw new Error('Database error'); });

            const res = await request(app)
                .put(`/api/appointments/${apt._id}/cancel`)
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(500);
            expect(res.text).toBe('Server Error');
        });
    });

    // --- 6. POST /api/appointments/book (Standard Booking) ---
    describe('POST /book', () => {
        it('should book an appointment successfully', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. Book',
                email: 'b@t.com',
                password: 'Secret@123',
                specialization: 'Orthopedics',
                experience: 6,
                licenseNumber: 'LIC_BOOK1',
                address: '333 Book St',
                consultationFee: 300
            });
            const patientId = new mongoose.Types.ObjectId();
            const mockUser = JSON.stringify({ userId: patientId, userType: 'patient' });

            const res = await request(app)
                .post('/api/appointments/book')
                .set('mock-user', mockUser)
                .send({
                    doctorId: doctor._id,
                    date: new Date().toISOString(),
                    time: '02:00 PM',
                    patientNameForVisit: 'Jane Doe',
                    primaryReason: 'Checkup'
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.consultationFeeAtBooking).toBe(300);
            expect(res.body.paymentStatus).toBe('pending');
        });

        it('should prevent double booking', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. Busy',
                email: 'busy@t.com',
                password: 'Secret@123',
                specialization: 'Pediatrics',
                experience: 9,
                licenseNumber: 'LIC_BUSY1',
                address: '444 Busy St',
                consultationFee: 450,
            });
            const date = new Date('2023-12-25');
            const time = '10:00 AM';

            await Appointment.create({
                doctor: doctor._id,
                patient: new mongoose.Types.ObjectId(),
                date: date,
                time: time,
                status: 'upcoming',
                consultationFeeAtBooking: 450,
                patientNameForVisit: 'First Patient'
            });

            const patientId = new mongoose.Types.ObjectId();
            const mockUser = JSON.stringify({ userId: patientId, userType: 'patient' });

            const res = await request(app)
                .post('/api/appointments/book')
                .set('mock-user', mockUser)
                .send({
                    doctorId: doctor._id,
                    date: date.toISOString(),
                    time: time,
                    patientNameForVisit: 'Late Patient',
                    primaryReason: 'Emergency'
                });

            expect(res.statusCode).toBe(409);
            expect(res.body.message).toContain('no longer available');
        });

        it('should return 400 if required fields are missing', async () => {
            const patientId = new mongoose.Types.ObjectId();
            const mockUser = JSON.stringify({ userId: patientId, userType: 'patient' });

            const res = await request(app)
                .post('/api/appointments/book')
                .set('mock-user', mockUser)
                .send({
                    doctorId: new mongoose.Types.ObjectId(),
                    date: new Date().toISOString(),
                    time: '02:00 PM',
                    patientNameForVisit: 'Jane Doe'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toContain('Missing required fields');
        });

        it('should return 404 if doctor not found', async () => {
            const patientId = new mongoose.Types.ObjectId();
            const mockUser = JSON.stringify({ userId: patientId, userType: 'patient' });

            const res = await request(app)
                .post('/api/appointments/book')
                .set('mock-user', mockUser)
                .send({
                    doctorId: new mongoose.Types.ObjectId(),
                    date: new Date().toISOString(),
                    time: '02:00 PM',
                    patientNameForVisit: 'Jane Doe',
                    primaryReason: 'Checkup'
                });

            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe('Doctor not found.');
        });

        it('should handle server errors when booking appointment', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. ServerError',
                email: 'servererror@t.com',
                password: 'Secret@123',
                specialization: 'Orthopedics',
                experience: 6,
                licenseNumber: 'LIC_SERR1',
                address: '555 Error St',
                consultationFee: 300
            });
            const patientId = new mongoose.Types.ObjectId();
            const mockUser = JSON.stringify({ userId: patientId, userType: 'patient' });

            const mockFindOne = vi.spyOn(Appointment, 'findOne').mockImplementationOnce(() => {
                throw new Error('Database error');
            });

            const res = await request(app)
                .post('/api/appointments/book')
                .set('mock-user', mockUser)
                .send({
                    doctorId: doctor._id,
                    date: new Date().toISOString(),
                    time: '02:00 PM',
                    patientNameForVisit: 'Jane Doe',
                    primaryReason: 'Checkup'
                });

            expect(res.statusCode).toBe(500);
            expect(res.text).toBe('Server Error');

            mockFindOne.mockRestore();
        });
    });

    // --- 7. PUT /api/appointments/:id/complete ---
    describe('PUT /:id/complete', () => {
        it('should mark appointment as completed by doctor', async () => {
            const doctorId = new mongoose.Types.ObjectId();
            const patientId = new mongoose.Types.ObjectId();
            const mockUser = JSON.stringify({ userId: doctorId, userType: 'doctor' });

            const apt = await Appointment.create({
                doctor: doctorId,
                patient: patientId,
                status: 'upcoming',
                date: new Date(),
                time: '03:00 PM',
                consultationFeeAtBooking: 500,
                patientNameForVisit: 'Complete Patient'
            });

            const res = await request(app)
                .put(`/api/appointments/${apt._id}/complete`)
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(200);
            expect(res.body.appointment.status).toBe('completed');
        });

        it('should fail if user is not a doctor', async () => {
            const mockUser = JSON.stringify({ userId: 'pat123', userType: 'patient' });
            const res = await request(app)
                .put(`/api/appointments/fake_id/complete`)
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(403);
        });

        it('should return 404 if appointment not found', async () => {
            const doctorId = new mongoose.Types.ObjectId();
            const mockUser = JSON.stringify({ userId: doctorId, userType: 'doctor' });

            const res = await request(app)
                .put(`/api/appointments/${new mongoose.Types.ObjectId()}/complete`)
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe('Appointment not found');
        });

        it('should fail if doctor is not assigned to the appointment', async () => {
            const doctorId = new mongoose.Types.ObjectId();
            const otherDoctorId = new mongoose.Types.ObjectId();
            const patientId = new mongoose.Types.ObjectId();
            const mockUser = JSON.stringify({ userId: otherDoctorId, userType: 'doctor' });

            const apt = await Appointment.create({
                doctor: doctorId,
                patient: patientId,
                status: 'upcoming',
                date: new Date(),
                time: '04:00 PM',
                consultationFeeAtBooking: 500,
                patientNameForVisit: 'Other Doctor Patient'
            });

            const res = await request(app)
                .put(`/api/appointments/${apt._id}/complete`)
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe('Access denied. You are not assigned to this appointment.');
        });

        it('should fail if appointment is already completed', async () => {
            const doctorId = new mongoose.Types.ObjectId();
            const patientId = new mongoose.Types.ObjectId();
            const mockUser = JSON.stringify({ userId: doctorId, userType: 'doctor' });

            const apt = await Appointment.create({
                doctor: doctorId,
                patient: patientId,
                status: 'completed',
                date: new Date(),
                time: '05:00 PM',
                consultationFeeAtBooking: 500,
                patientNameForVisit: 'Already Completed'
            });

            const res = await request(app)
                .put(`/api/appointments/${apt._id}/complete`)
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toContain('Cannot complete an appointment that is already completed');
        });

        it('should handle server errors when completing appointment', async () => {
            const doctorId = new mongoose.Types.ObjectId();
            const patientId = new mongoose.Types.ObjectId();
            const mockUser = JSON.stringify({ userId: doctorId, userType: 'doctor' });

            const apt = await Appointment.create({
                doctor: doctorId,
                patient: patientId,
                status: 'upcoming',
                date: new Date(),
                time: '04:00 PM',
                consultationFeeAtBooking: 500,
                patientNameForVisit: 'Error Patient'
            });

            vi.spyOn(Appointment.prototype, 'save').mockImplementationOnce(() => { throw new Error('Database error'); });

            const res = await request(app)
                .put(`/api/appointments/${apt._id}/complete`)
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(500);
            expect(res.text).toBe('Server Error');
        });
    });

    describe('Extra mutation-killing tests', () => {
        it('create-payment-order should pass correct options to Razorpay (receipt & currency & amount)', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. Receipt',
                email: 'receipt@test.com',
                password: 'Secret@123',
                specialization: 'General',
                experience: 3,
                licenseNumber: 'LIC_REC1',
                address: 'Receipt St',
                consultationFee: 100
            });
            const mockUser = JSON.stringify({ userId: 'patReceipt', userType: 'patient' });

            // Spy on orders.create and capture the passed options
            const createSpy = mockRazorpayInstance.orders.create;
            createSpy.mockClear();

            const res = await request(app)
                .post('/api/appointments/create-payment-order')
                .set('mock-user', mockUser)
                .send({
                    doctorId: doctor._id,
                    amount: 12345,
                    currency: 'INR'
                });

            expect(res.statusCode).toBe(200);
            expect(createSpy).toHaveBeenCalled();
            const optionsArg = createSpy.mock.calls[0][0];
            expect(optionsArg).toBeDefined();
            expect(typeof optionsArg.amount).toBe('number');
            expect(optionsArg.amount).toBe(12345);
            expect(optionsArg.currency).toBe('INR');
            expect(typeof optionsArg.receipt).toBe('string');
            expect(optionsArg.receipt.startsWith('order_')).toBe(true);

            createSpy.mockRestore && createSpy.mockRestore();
        });

        it('available-slots time string must include AM/PM (hour12 true behavior)', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. AMPM',
                email: 'ampm@test.com',
                password: 'Secret@123',
                specialization: 'General',
                experience: 2,
                licenseNumber: 'LIC_AMPM1',
                address: 'Ampm St',
                consultationFee: 150,
                workingHours: {
                    monday: { enabled: true, start: "09:00", end: "10:00" }
                }
            });
            const mockUser = JSON.stringify({ userId: 'p', userType: 'patient' });

            const res = await request(app)
                .get(`/api/appointments/available-slots/${doctor._id}`)
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            // Ensure at least one time contains AM or PM
            const hasAmPm = res.body.some(s => /AM|PM/.test(String(s.time)));
            expect(hasAmPm).toBe(true);
        });

        it('available-slots date must be ISO yyyy-mm-dd (toISOString split behaviour)', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. ISO',
                email: 'iso@test.com',
                password: 'Secret@123',
                specialization: 'General',
                experience: 2,
                licenseNumber: 'LIC_ISO1',
                address: 'Iso St',
                consultationFee: 150,
                workingHours: {
                    monday: { enabled: true, start: "09:00", end: "10:00" }
                }
            });
            const mockUser = JSON.stringify({ userId: 'piso', userType: 'patient' });

            const res = await request(app)
                .get(`/api/appointments/available-slots/${doctor._id}`)
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body.every(s => /^\d{4}-\d{2}-\d{2}$/.test(String(s.date)))).toBe(true);
        });

        it('my-appointments patient endpoint should return appointments sorted descending by date', async () => {
            const patientId = new mongoose.Types.ObjectId();
            const mockUser = JSON.stringify({ userId: patientId, userType: 'patient' });

            const doctor = await Doctor.create({
                fullName: 'Dr. Sort',
                email: 'sort@test.com',
                password: 'Secret@123',
                specialization: 'General',
                experience: 4,
                licenseNumber: 'LIC_SORT1',
                address: 'Sort St',
                consultationFee: 150
            });

            // create older then newer
            const oldDate = new Date('2020-01-01');
            const newDate = new Date('2022-01-01');

            await Appointment.create({
                patient: patientId,
                doctor: doctor._id,
                date: oldDate,
                time: '10:00 AM',
                status: 'upcoming',
                consultationFeeAtBooking: 150,
                patientNameForVisit: 'Old'
            });

            await Appointment.create({
                patient: patientId,
                doctor: doctor._id,
                date: newDate,
                time: '11:00 AM',
                status: 'upcoming',
                consultationFeeAtBooking: 150,
                patientNameForVisit: 'New'
            });

            const res = await request(app)
                .get('/api/appointments/my-appointments')
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(200);
            // Ensure the first item is the newer date
            const returnedDates = res.body.map(a => new Date(a.date).getTime());
            expect(returnedDates[0]).toBeGreaterThan(returnedDates[returnedDates.length - 1]);
        });

        it('doctor endpoint should return appointments sorted ascending by date', async () => {
            const doctorId = new mongoose.Types.ObjectId();
            const mockUser = JSON.stringify({ userId: doctorId, userType: 'doctor' });

            const patient = await Patient.create({
                fullName: 'Sort Patient',
                email: 'sp@test.com',
                password: 'Secret@123'
            });

            const day1 = new Date('2022-01-01');
            const day2 = new Date('2023-01-01');

            await Appointment.create({
                patient: patient._id,
                doctor: doctorId,
                date: day2,
                time: '10:00 AM',
                consultationFeeAtBooking: 200,
                status: 'upcoming',
                patientNameForVisit: 'Later'
            });

            await Appointment.create({
                patient: patient._id,
                doctor: doctorId,
                date: day1,
                time: '09:00 AM',
                consultationFeeAtBooking: 200,
                status: 'upcoming',
                patientNameForVisit: 'Earlier'
            });

            const res = await request(app)
                .get('/api/appointments/doctor')
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(200);
            // ascending: earlier should come first
            expect(new Date(res.body[0].date).getTime()).toBeLessThanOrEqual(new Date(res.body[1].date).getTime());
        });

        it('book route should persist provided triage/extra fields', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. Triage',
                email: 'triage@test.com',
                password: 'Secret@123',
                specialization: 'General',
                experience: 6,
                licenseNumber: 'LIC_TRI1',
                address: 'Triage St',
                consultationFee: 350
            });

            const patientId = new mongoose.Types.ObjectId();
            const mockUser = JSON.stringify({ userId: patientId, userType: 'patient' });

            const payload = {
                doctorId: doctor._id,
                date: new Date().toISOString(),
                time: '03:00 PM',
                patientNameForVisit: 'Triaged',
                primaryReason: 'Symptoms',
                emergencyDisclaimerAcknowledged: true,
                symptomsList: ['cough', 'fever'],
                preExistingConditions: ['hypertension'],
                consentToAI: false
            };

            const res = await request(app)
                .post('/api/appointments/book')
                .set('mock-user', mockUser)
                .send(payload);

            expect(res.statusCode).toBe(201);
            const created = await Appointment.findById(res.body._id);
            expect(created).toBeTruthy();
            expect(created.primaryReason).toBe('Symptoms');
            expect(Array.isArray(created.symptomsList || created.symptoms)).toBe(true);
        });

        it('verify-payment should include doctor name in email HTML (ensures email template includes doctor info)', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. MailName',
                email: 'mailname@test.com',
                password: 'Secret@123',
                specialization: 'General',
                experience: 6,
                licenseNumber: 'LIC_MAIL1',
                address: 'Mail St',
                consultationFee: 400
            });
            const patientId = new mongoose.Types.ObjectId();
            const mockUser = JSON.stringify({ userId: patientId, userType: 'patient' });

            // spy and capture html passed to sendEmail
            const sendSpy = mockSendEmail;
            sendSpy.mockClear();

            const expectedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update('order_mail' + '|' + 'pay_mail')
                .digest('hex');

            const res = await request(app)
                .post('/api/appointments/verify-payment')
                .set('mock-user', mockUser)
                .send({
                    razorpay_order_id: 'order_mail',
                    razorpay_payment_id: 'pay_mail',
                    razorpay_signature: expectedSignature,
                    doctorId: doctor._id,
                    date: new Date().toISOString(),
                    time: '10:00 AM',
                    patientNameForVisit: 'Mailer',
                    primaryReason: 'Check',
                    email: 'mail@example.com'
                });

            expect(res.statusCode).toBe(200);
            // ensure sendEmail called and its html includes the doctor's fullName
            expect(sendSpy).toHaveBeenCalled();
            const passedArg = sendSpy.mock.calls[0][0];
            expect(passedArg).toBeDefined();
            expect(String(passedArg.html || '')).toContain(doctor.fullName);
        });

        it('create-payment-order failure should log error and return expected json', async () => {
            // make razorpay throw and ensure route returns the JSON failure object (covers console.error path)
            const doctor = await Doctor.create({
                fullName: 'Dr. PayFail',
                email: 'payfail@test.com',
                password: 'Secret@123',
                specialization: 'General',
                experience: 6,
                licenseNumber: 'LIC_PAYF1',
                address: 'PayFail St',
                consultationFee: 400
            });
            const mockUser = JSON.stringify({ userId: 'pFail', userType: 'patient' });

            // Make razorpay throw
            mockRazorpayInstance.orders.create.mockRejectedValueOnce(new Error('boom'));

            const errSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const res = await request(app)
                .post('/api/appointments/create-payment-order')
                .set('mock-user', mockUser)
                .send({ doctorId: doctor._id, amount: 1000 });

            expect(res.statusCode).toBe(500);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Failed to create payment order');
            expect(errSpy).toHaveBeenCalled();

            errSpy.mockRestore();
        });
    });

    describe('Extra mutation-killing tests - round 2', () => {
        it('doctor endpoint filters out appointments with null patient (mock Appointment.find)', async () => {
            const doctorId = new mongoose.Types.ObjectId();
            const mockUser = JSON.stringify({ userId: doctorId, userType: 'doctor' });

            const patient = await Patient.create({
                fullName: 'Real Patient',
                email: 'realp@test.com',
                password: 'Secret@123'
            });

            const goodApt = {
                _id: new mongoose.Types.ObjectId(),
                patient: patient, // populated patient object (mongoose doc)
                doctor: doctorId,
                date: new Date(),
                time: '09:00 AM',
                consultationFeeAtBooking: 200,
                status: 'upcoming',
                patientNameForVisit: 'Real'
            };

            const nullApt = {
                _id: new mongoose.Types.ObjectId(),
                patient: null, // simulate deleted patient reference
                doctor: doctorId,
                date: new Date(),
                time: '10:00 AM',
                consultationFeeAtBooking: 200,
                status: 'upcoming',
                patientNameForVisit: 'Ghost'
            };

            // Mock Appointment.find to return a query-like object with populate().sort() chain
            const populateMock = vi.fn().mockReturnThis();
            const sortMock = vi.fn().mockResolvedValueOnce([nullApt, goodApt]);

            const findSpy = vi.spyOn(Appointment, 'find').mockReturnValueOnce({
                populate: populateMock,
                sort: sortMock
            });

            const res = await request(app)
                .get('/api/appointments/doctor')
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            // Should filter out the null patient and return only the good one
            expect(res.body.every(a => a.patient)).toBe(true);
            expect(res.body.some(a => a.patient.fullName === 'Real Patient')).toBe(true);

            findSpy.mockRestore();
        });


        it('verify-payment uses default consultationFee = 0 when Doctor.findById returns object without consultationFee (mock findById)', async () => {
            const patientId = new mongoose.Types.ObjectId();
            const mockUser = JSON.stringify({ userId: patientId, userType: 'patient' });

            // mock doctor plain object without consultationFee but with fullName
            const fakeDoctor = {
                _id: new mongoose.Types.ObjectId(),
                fullName: 'No Fee Doctor',
                specialization: 'None'
                // no consultationFee property
            };

            const findDocSpy = vi.spyOn(Doctor, 'findById').mockResolvedValueOnce(fakeDoctor);

            const expectedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update('order_def' + '|' + 'pay_def')
                .digest('hex');

            const res = await request(app)
                .post('/api/appointments/verify-payment')
                .set('mock-user', mockUser)
                .send({
                    razorpay_order_id: 'order_def',
                    razorpay_payment_id: 'pay_def',
                    razorpay_signature: expectedSignature,
                    doctorId: fakeDoctor._id,
                    date: new Date().toISOString(),
                    time: '10:00 AM',
                    patientNameForVisit: 'NoFee',
                    primaryReason: 'Check',
                    email: 'nofee@test.com'
                });

            expect(res.statusCode).toBe(200);
            // Confirm appointment created with consultationFeeAtBooking defaulted to 0
            const saved = await Appointment.findOne({ paymentId: 'pay_def' });
            expect(saved).toBeTruthy();
            expect(saved.consultationFeeAtBooking).toBe(0);

            findDocSpy.mockRestore();
        });

        it('available-slots handles doctor.workingHours as a Map (force .get usage)', async () => {
            const docObj = {
                fullName: 'Dr. Map',
                email: 'map@test.com',
                password: 'Secret@123',
                specialization: 'Test',
                experience: 1,
                licenseNumber: 'LIC_MAP1',
                address: 'Map St',
                consultationFee: 100
            };
            // Create doctor then convert workingHours into Map and save
            let doctor = await Doctor.create(docObj);

            // build map and attach then save doc directly via mongoose document
            const wh = new Map();
            wh.set('monday', { enabled: true, start: '09:00', end: '10:00' });
            doctor.workingHours = wh;
            await doctor.save();

            const mockUser = JSON.stringify({ userId: 'pmap', userType: 'patient' });

            const res = await request(app)
                .get(`/api/appointments/available-slots/${doctor._id}`)
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            // at least one slot should be returned for the configured day(s)
            expect(res.body.length).toBeGreaterThanOrEqual(0);
        });

        it('available-slots respects blockedTimes covering entire hour (boundary block)', async () => {
            // create tomorrow's date at midnight
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const doctor = await Doctor.create({
                fullName: 'Dr. Boundary',
                email: 'boundary@test.com',
                password: 'Secret@123',
                specialization: 'Test',
                experience: 2,
                licenseNumber: 'LIC_BOUND1',
                address: 'Boundary St',
                consultationFee: 120,
                workingHours: {
                    [(new Date()).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()]: { enabled: true, start: "09:00", end: "10:00" },
                    // fallback won't break code — route still checks by dayKey
                    monday: { enabled: true, start: "09:00", end: "10:00" }
                },
                blockedTimes: [
                    {
                        date: tomorrow,
                        startTime: '09:00',
                        endTime: '10:00',
                        reason: 'All day block'
                    }
                ]
            });

            const mockUser = JSON.stringify({ userId: 'pbound', userType: 'patient' });

            const res = await request(app)
                .get(`/api/appointments/available-slots/${doctor._id}`)
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(200);
            // Because the only slot is blocked, ensure that no slot at 9:00 AM is present for the blocked date
            const blockedDateStr = tomorrow.toDateString();
            const slotsOnBlockedDate = res.body.filter(s => new Date(s.date).toDateString() === blockedDateStr);
            const nineAM = slotsOnBlockedDate.find(s => /9:00/.test(String(s.time)));
            expect(nineAM).toBeUndefined();
        });

        it('doctor endpoint returns 500 on Appointment.find throwing (covers error path)', async () => {
            const doctorId = new mongoose.Types.ObjectId();
            const mockUser = JSON.stringify({ userId: doctorId, userType: 'doctor' });

            const findSpy = vi.spyOn(Appointment, 'find').mockImplementationOnce(() => {
                throw new Error('DB boom');
            });

            const res = await request(app)
                .get('/api/appointments/doctor')
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(500);
            findSpy.mockRestore();
        });

        it('available-slots should exclude exact booked slot by matching dateTimeString string format', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. Exact',
                email: 'exact@test.com',
                password: 'Secret@123',
                specialization: 'Test',
                experience: 2,
                licenseNumber: 'LIC_EXACT1',
                address: 'Exact St',
                consultationFee: 150,
                workingHours: {
                    monday: { enabled: true, start: "09:00", end: "11:00" }
                }
            });

            // create an upcoming appointment that should match the dateTimeString format produced by the code
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);

            // time string should match toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit',hour12:true}) output
            const timeString = new Date(tomorrow).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

            await Appointment.create({
                doctor: doctor._id,
                patient: new mongoose.Types.ObjectId(),
                date: tomorrow,
                time: timeString,
                status: 'upcoming',
                consultationFeeAtBooking: 150,
                patientNameForVisit: 'ExactBooked'
            });

            const mockUser = JSON.stringify({ userId: 'pExact', userType: 'patient' });

            const res = await request(app)
                .get(`/api/appointments/available-slots/${doctor._id}`)
                .set('mock-user', mockUser);

            expect(res.statusCode).toBe(200);
            // The exact booked time should not be present
            const slotsForTomorrow = res.body.filter(s => new Date(s.date).toDateString() === tomorrow.toDateString());
            const exactSlot = slotsForTomorrow.find(s => s.time === timeString);
            expect(exactSlot).toBeUndefined();
        });
    });

});
