import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

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
Module.prototype.require = function(id) {
    if (id === '../middleware/auth') {
        return mockAuth;
    }
    return originalRequire.apply(this, arguments);
};

const Doctor = require('../models/Doctor');

let mongoServer;
let app;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    app = express();
    app.use(express.json());
    app.use('/api/schedule', require('../routes/schedule'));
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    await Doctor.deleteMany({});
});

// Helper function to create mock user header
const createMockUserHeader = (userId, userType) => {
    return JSON.stringify({ userId, userType });
};

describe('GET /api/schedule/working-hours', () => {
    it('should get working hours for a doctor successfully', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Test',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567890',
            licenseNumber: 'LIC123456',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get('/api/schedule/working-hours')
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
        expect(response.body.monday).toBeDefined();
        expect(response.body.monday.enabled).toBe(true);
        expect(response.body.monday.start).toBe('09:00');
        expect(response.body.monday.end).toBe('17:00');
    });

    it('should return default working hours for newly created doctor', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. New',
            email: 'new@test.com',
            password: 'Test@1234',
            specialization: 'Neurology',
            experience: 5,
            qualifications: ['MBBS'],
            consultationFee: 400,
            phoneNumber: '1234567891',
            licenseNumber: 'LIC123457',
            address: '456 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get('/api/schedule/working-hours')
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.saturday.enabled).toBe(false);
        expect(response.body.sunday.enabled).toBe(false);
    });

    it('should return 403 if user is not a doctor', async () => {
        const mockUser = createMockUserHeader(new mongoose.Types.ObjectId(), 'patient');

        const response = await request(app)
            .get('/api/schedule/working-hours')
            .set('mock-user', mockUser);

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Access denied. Not a doctor.');
    });

    it('should return 404 if doctor not found', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const mockUser = createMockUserHeader(nonExistentId, 'doctor');

        const response = await request(app)
            .get('/api/schedule/working-hours')
            .set('mock-user', mockUser);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Doctor not found');
    });

    it('should return 401 if no token is provided', async () => {
        const response = await request(app)
            .get('/api/schedule/working-hours');

        expect(response.status).toBe(401);
    });

    it('should return 500 on server error', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Test',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567890',
            licenseNumber: 'LIC123456',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        // Spy on Doctor.findById to throw an error
        const findByIdSpy = vi.spyOn(Doctor, 'findById').mockImplementationOnce(() => {
            throw new Error('Database error');
        });

        const response = await request(app)
            .get('/api/schedule/working-hours')
            .set('mock-user', mockUser);

        expect(response.status).toBe(500);
        expect(response.text).toBe('Server Error');

        findByIdSpy.mockRestore();
    });
});

describe('POST /api/schedule/working-hours', () => {
    it('should update working hours for a doctor successfully', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Test',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567890',
            licenseNumber: 'LIC123456',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const newWorkingHours = {
            monday: { enabled: true, start: '08:00', end: '16:00' },
            tuesday: { enabled: true, start: '08:00', end: '16:00' },
            wednesday: { enabled: true, start: '08:00', end: '16:00' },
            thursday: { enabled: true, start: '08:00', end: '16:00' },
            friday: { enabled: true, start: '08:00', end: '16:00' },
            saturday: { enabled: true, start: '10:00', end: '14:00' },
            sunday: { enabled: false, start: '09:00', end: '17:00' },
        };

        const response = await request(app)
            .post('/api/schedule/working-hours')
            .set('mock-user', mockUser)
            .send({ workingHours: newWorkingHours });

        expect(response.status).toBe(200);
        expect(response.body.monday.start).toBe('08:00');
        expect(response.body.monday.end).toBe('16:00');
        expect(response.body.saturday.enabled).toBe(true);
        expect(response.body.saturday.start).toBe('10:00');

        // Verify in database
        const updatedDoctor = await Doctor.findById(doctor._id);
        expect(updatedDoctor.workingHours.get('monday').start).toBe('08:00');
    });

    it('should update only specific days working hours', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Test',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567890',
            licenseNumber: 'LIC123456',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const partialWorkingHours = {
            monday: { enabled: false, start: '09:00', end: '17:00' },
            friday: { enabled: true, start: '10:00', end: '18:00' },
        };

        const response = await request(app)
            .post('/api/schedule/working-hours')
            .set('mock-user', mockUser)
            .send({ workingHours: partialWorkingHours });

        expect(response.status).toBe(200);
        expect(response.body.monday.enabled).toBe(false);
        expect(response.body.friday.start).toBe('10:00');
        expect(response.body.friday.end).toBe('18:00');
    });

    it('should enable weekend hours', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Test',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567890',
            licenseNumber: 'LIC123456',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const workingHours = {
            saturday: { enabled: true, start: '09:00', end: '13:00' },
            sunday: { enabled: true, start: '10:00', end: '14:00' },
        };

        const response = await request(app)
            .post('/api/schedule/working-hours')
            .set('mock-user', mockUser)
            .send({ workingHours });

        expect(response.status).toBe(200);
        expect(response.body.saturday.enabled).toBe(true);
        expect(response.body.sunday.enabled).toBe(true);
    });

    it('should return 403 if user is not a doctor', async () => {
        const mockUser = createMockUserHeader(new mongoose.Types.ObjectId(), 'patient');

        const response = await request(app)
            .post('/api/schedule/working-hours')
            .set('mock-user', mockUser)
            .send({ workingHours: {} });

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Access denied. Not a doctor.');
    });

    it('should return 404 if doctor not found', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const mockUser = createMockUserHeader(nonExistentId, 'doctor');

        const response = await request(app)
            .post('/api/schedule/working-hours')
            .set('mock-user', mockUser)
            .send({ workingHours: {} });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Doctor not found');
    });

    it('should return 401 if no token is provided', async () => {
        const response = await request(app)
            .post('/api/schedule/working-hours')
            .send({ workingHours: {} });

        expect(response.status).toBe(401);
    });

    it('should return 500 on server error', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Test',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567890',
            licenseNumber: 'LIC123456',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        // Spy on Doctor.findByIdAndUpdate to throw an error
        const findByIdAndUpdateSpy = vi.spyOn(Doctor, 'findByIdAndUpdate').mockImplementationOnce(() => {
            throw new Error('Database error');
        });

        const response = await request(app)
            .post('/api/schedule/working-hours')
            .set('mock-user', mockUser)
            .send({ workingHours: {} });

        expect(response.status).toBe(500);
        expect(response.text).toBe('Server Error');

        findByIdAndUpdateSpy.mockRestore();
    });
});

describe('POST /api/schedule/blocked-times', () => {
    it('should add blocked time successfully', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Test',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567890',
            licenseNumber: 'LIC123456',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const blockedTime = {
            reason: 'Conference',
            date: new Date('2025-12-01'),
            startTime: '10:00',
            endTime: '12:00',
        };

        const response = await request(app)
            .post('/api/schedule/blocked-times')
            .set('mock-user', mockUser)
            .send(blockedTime);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('_id');
        expect(response.body.reason).toBe('Conference');
        expect(response.body.startTime).toBe('10:00');
        expect(response.body.endTime).toBe('12:00');

        // Verify in database
        const updatedDoctor = await Doctor.findById(doctor._id);
        expect(updatedDoctor.blockedTimes).toHaveLength(1);
        expect(updatedDoctor.blockedTimes[0].reason).toBe('Conference');
    });

    it('should add multiple blocked times', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Test',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567890',
            licenseNumber: 'LIC123456',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        // First blocked time
        await request(app)
            .post('/api/schedule/blocked-times')
            .set('mock-user', mockUser)
            .send({
                reason: 'Conference',
                date: new Date('2025-12-01'),
                startTime: '10:00',
                endTime: '12:00',
            });

        // Second blocked time
        const response = await request(app)
            .post('/api/schedule/blocked-times')
            .set('mock-user', mockUser)
            .send({
                reason: 'Personal',
                date: new Date('2025-12-05'),
                startTime: '14:00',
                endTime: '16:00',
            });

        expect(response.status).toBe(201);
        expect(response.body.reason).toBe('Personal');

        // Verify in database
        const updatedDoctor = await Doctor.findById(doctor._id);
        expect(updatedDoctor.blockedTimes).toHaveLength(2);
    });

    it('should return 403 if user is not a doctor', async () => {
        const mockUser = createMockUserHeader(new mongoose.Types.ObjectId(), 'patient');

        const response = await request(app)
            .post('/api/schedule/blocked-times')
            .set('mock-user', mockUser)
            .send({
                reason: 'Test',
                date: new Date('2025-12-01'),
                startTime: '10:00',
                endTime: '12:00',
            });

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Access denied.');
    });

    it('should return 400 if reason is missing', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Test',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567890',
            licenseNumber: 'LIC123456',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .post('/api/schedule/blocked-times')
            .set('mock-user', mockUser)
            .send({
                date: new Date('2025-12-01'),
                startTime: '10:00',
                endTime: '12:00',
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('All fields are required.');
    });

    it('should return 400 if date is missing', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Test',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567890',
            licenseNumber: 'LIC123456',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .post('/api/schedule/blocked-times')
            .set('mock-user', mockUser)
            .send({
                reason: 'Conference',
                startTime: '10:00',
                endTime: '12:00',
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('All fields are required.');
    });

    it('should return 400 if startTime is missing', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Test',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567890',
            licenseNumber: 'LIC123456',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .post('/api/schedule/blocked-times')
            .set('mock-user', mockUser)
            .send({
                reason: 'Conference',
                date: new Date('2025-12-01'),
                endTime: '12:00',
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('All fields are required.');
    });

    it('should return 400 if endTime is missing', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Test',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567890',
            licenseNumber: 'LIC123456',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .post('/api/schedule/blocked-times')
            .set('mock-user', mockUser)
            .send({
                reason: 'Conference',
                date: new Date('2025-12-01'),
                startTime: '10:00',
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('All fields are required.');
    });

    it('should return 404 if doctor not found', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const mockUser = createMockUserHeader(nonExistentId, 'doctor');

        const response = await request(app)
            .post('/api/schedule/blocked-times')
            .set('mock-user', mockUser)
            .send({
                reason: 'Conference',
                date: new Date('2025-12-01'),
                startTime: '10:00',
                endTime: '12:00',
            });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Doctor not found');
    });

    it('should return 401 if no token is provided', async () => {
        const response = await request(app)
            .post('/api/schedule/blocked-times')
            .send({
                reason: 'Conference',
                date: new Date('2025-12-01'),
                startTime: '10:00',
                endTime: '12:00',
            });

        expect(response.status).toBe(401);
    });

    it('should return 500 on server error', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Test',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567890',
            licenseNumber: 'LIC123456',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        // Spy on Doctor.findById to throw an error
        const findByIdSpy = vi.spyOn(Doctor, 'findById').mockImplementationOnce(() => {
            throw new Error('Database error');
        });

        const response = await request(app)
            .post('/api/schedule/blocked-times')
            .set('mock-user', mockUser)
            .send({
                reason: 'Conference',
                date: new Date('2025-12-01'),
                startTime: '10:00',
                endTime: '12:00',
            });

        expect(response.status).toBe(500);
        expect(response.text).toBe('Server Error');

        findByIdSpy.mockRestore();
    });
});

describe('DELETE /api/schedule/blocked-times/:blockId', () => {
    it('should delete blocked time successfully', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Test',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567890',
            licenseNumber: 'LIC123456',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
            blockedTimes: [
                {
                    reason: 'Conference',
                    date: new Date('2025-12-01'),
                    startTime: '10:00',
                    endTime: '12:00',
                },
            ],
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');
        const blockId = doctor.blockedTimes[0]._id.toString();

        const response = await request(app)
            .delete(`/api/schedule/blocked-times/${blockId}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Blocked time removed successfully.');

        // Verify in database
        const updatedDoctor = await Doctor.findById(doctor._id);
        expect(updatedDoctor.blockedTimes).toHaveLength(0);
    });

    it('should delete specific blocked time from multiple blocks', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Test',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567890',
            licenseNumber: 'LIC123456',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
            blockedTimes: [
                {
                    reason: 'Conference',
                    date: new Date('2025-12-01'),
                    startTime: '10:00',
                    endTime: '12:00',
                },
                {
                    reason: 'Personal',
                    date: new Date('2025-12-05'),
                    startTime: '14:00',
                    endTime: '16:00',
                },
                {
                    reason: 'Vacation',
                    date: new Date('2025-12-10'),
                    startTime: '09:00',
                    endTime: '17:00',
                },
            ],
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');
        const blockId = doctor.blockedTimes[1]._id.toString(); // Delete second block

        const response = await request(app)
            .delete(`/api/schedule/blocked-times/${blockId}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);

        // Verify in database
        const updatedDoctor = await Doctor.findById(doctor._id);
        expect(updatedDoctor.blockedTimes).toHaveLength(2);
        expect(updatedDoctor.blockedTimes[0].reason).toBe('Conference');
        expect(updatedDoctor.blockedTimes[1].reason).toBe('Vacation');
    });

    it('should return 403 if user is not a doctor', async () => {
        const mockUser = createMockUserHeader(new mongoose.Types.ObjectId(), 'patient');

        const response = await request(app)
            .delete(`/api/schedule/blocked-times/${new mongoose.Types.ObjectId()}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Access denied.');
    });

    it('should return 404 if doctor not found', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const mockUser = createMockUserHeader(nonExistentId, 'doctor');

        const response = await request(app)
            .delete(`/api/schedule/blocked-times/${new mongoose.Types.ObjectId()}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Doctor not found');
    });

    it('should return 404 if blocked time not found', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Test',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567890',
            licenseNumber: 'LIC123456',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');
        const nonExistentBlockId = new mongoose.Types.ObjectId();

        const response = await request(app)
            .delete(`/api/schedule/blocked-times/${nonExistentBlockId}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Blocked time not found.');
    });

    it('should return 401 if no token is provided', async () => {
        const response = await request(app)
            .delete(`/api/schedule/blocked-times/${new mongoose.Types.ObjectId()}`);

        expect(response.status).toBe(401);
    });

    it('should return 500 on server error', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Test',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567890',
            licenseNumber: 'LIC123456',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        // Spy on Doctor.findById to throw an error
        const findByIdSpy = vi.spyOn(Doctor, 'findById').mockImplementationOnce(() => {
            throw new Error('Database error');
        });

        const response = await request(app)
            .delete(`/api/schedule/blocked-times/${new mongoose.Types.ObjectId()}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(500);
        expect(response.text).toBe('Server Error');

        findByIdSpy.mockRestore();
    });

    it('should handle deletion when multiple blocked times exist with same reason', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Test',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567890',
            licenseNumber: 'LIC123456',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
            blockedTimes: [
                {
                    reason: 'Conference',
                    date: new Date('2025-12-01'),
                    startTime: '10:00',
                    endTime: '12:00',
                },
                {
                    reason: 'Conference',
                    date: new Date('2025-12-02'),
                    startTime: '10:00',
                    endTime: '12:00',
                },
            ],
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');
        const blockId = doctor.blockedTimes[0]._id.toString();

        const response = await request(app)
            .delete(`/api/schedule/blocked-times/${blockId}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);

        // Verify only first one was deleted
        const updatedDoctor = await Doctor.findById(doctor._id);
        expect(updatedDoctor.blockedTimes).toHaveLength(1);
        expect(updatedDoctor.blockedTimes[0]._id.toString()).toBe(doctor.blockedTimes[1]._id.toString());
    });
});
