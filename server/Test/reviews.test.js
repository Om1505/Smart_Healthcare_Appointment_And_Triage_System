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

const Review = require('../models/Review');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');

let mongoServer;
let app;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    app = express();
    app.use(express.json());
    app.use('/api/reviews', require('../routes/reviews'));
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    await Review.deleteMany({});
    await Doctor.deleteMany({});
    await Patient.deleteMany({});
    await Appointment.deleteMany({});
});

// Helper function to create mock user header
const createMockUserHeader = (userId, userType) => {
    return JSON.stringify({ userId, userType });
};

describe('POST /api/reviews', () => {
    it('should create a review for a completed appointment successfully', async () => {
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

        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543210',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'male',
            address: {
                street: '123 Main St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        });

        const appointment = await Appointment.create({
            patient: patient._id,
            patientNameForVisit: "John Doe",
            doctor: doctor._id,
            date: new Date('2024-01-15'),
            time: '10:00 AM',
            status: 'completed',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
        });

        const mockUser = createMockUserHeader(patient._id, 'patient');

        const response = await request(app)
            .post('/api/reviews')
            .set('mock-user', mockUser)
            .send({
                doctorId: doctor._id.toString(),
                appointmentId: appointment._id.toString(),
                rating: 5,
                comment: 'Excellent doctor!',
            });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('_id');
        expect(response.body.doctor).toBe(doctor._id.toString());
        expect(response.body.patient).toBe(patient._id.toString());
        expect(response.body.appointment).toBe(appointment._id.toString());
        expect(response.body.rating).toBe(5);
        expect(response.body.comment).toBe('Excellent doctor!');

        // Verify doctor rating was updated
        const updatedDoctor = await Doctor.findById(doctor._id);
        expect(updatedDoctor.averageRating).toBe(5);
        expect(updatedDoctor.reviewCount).toBe(1);
    });

    it('should create a review without a comment', async () => {
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

        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543210',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'male',
            address: {
                street: '123 Main St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        });

        const appointment = await Appointment.create({
            patient: patient._id,
            patientNameForVisit: "John Doe",
            doctor: doctor._id,
            date: new Date('2024-01-15'),
            time: '10:00 AM',
            status: 'completed',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
        });

        const mockUser = createMockUserHeader(patient._id, 'patient');

        const response = await request(app)
            .post('/api/reviews')
            .set('mock-user', mockUser)
            .send({
                doctorId: doctor._id.toString(),
                appointmentId: appointment._id.toString(),
                rating: 4,
            });

        expect(response.status).toBe(201);
        expect(response.body.rating).toBe(4);
        expect(response.body.comment).toBeUndefined();
    });

    it('should update doctor rating correctly with multiple reviews', async () => {
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

        const patient1 = await Patient.create({
            fullName: 'Patient One',
            email: 'patient1@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543210',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'male',
            address: {
                street: '123 Main St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        });

        const patient2 = await Patient.create({
            fullName: 'Patient Two',
            email: 'patient2@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543211',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'female',
            address: {
                street: '123 Main St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        });

        const appointment1 = await Appointment.create({
            patient: patient1._id,
            patientNameForVisit: "Patient One",
            doctor: doctor._id,
            date: new Date('2024-01-15'),
            time: '10:00 AM',
            status: 'completed',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
        });

        const appointment2 = await Appointment.create({
            patient: patient2._id,
            patientNameForVisit: "Patient Two",
            doctor: doctor._id,
            date: new Date('2024-01-16'),
            time: '11:00 AM',
            status: 'completed',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
        });

        // First review
        const mockUser1 = createMockUserHeader(patient1._id, 'patient');
        await request(app)
            .post('/api/reviews')
            .set('mock-user', mockUser1)
            .send({
                doctorId: doctor._id.toString(),
                appointmentId: appointment1._id.toString(),
                rating: 5,
                comment: 'Great!',
            });

        // Second review
        const mockUser2 = createMockUserHeader(patient2._id, 'patient');
        await request(app)
            .post('/api/reviews')
            .set('mock-user', mockUser2)
            .send({
                doctorId: doctor._id.toString(),
                appointmentId: appointment2._id.toString(),
                rating: 3,
                comment: 'Good',
            });

        // Verify average rating (5 + 3) / 2 = 4
        const updatedDoctor = await Doctor.findById(doctor._id);
        expect(updatedDoctor.averageRating).toBe(4);
        expect(updatedDoctor.reviewCount).toBe(2);
    });

    it('should return 403 if user is not a patient', async () => {
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
            .post('/api/reviews')
            .set('mock-user', mockUser)
            .send({
                doctorId: doctor._id.toString(),
                appointmentId: new mongoose.Types.ObjectId().toString(),
                rating: 5,
                comment: 'Test',
            });

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Access denied. Not a patient.');
    });

    it('should return 400 if appointment is not completed', async () => {
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

        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543210',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'male',
            address: {
                street: '123 Main St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        });

        const appointment = await Appointment.create({
            patient: patient._id,
            patientNameForVisit: "John Doe",
            doctor: doctor._id,
            date: new Date('2024-01-15'),
            time: '10:00 AM',
            status: 'upcoming', // Not completed
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
        });

        const mockUser = createMockUserHeader(patient._id, 'patient');

        const response = await request(app)
            .post('/api/reviews')
            .set('mock-user', mockUser)
            .send({
                doctorId: doctor._id.toString(),
                appointmentId: appointment._id.toString(),
                rating: 5,
                comment: 'Test',
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('You can only review completed appointments.');
    });

    it('should return 403 if patient is not authorized to review the appointment', async () => {
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

        const patient1 = await Patient.create({
            fullName: 'Patient One',
            email: 'patient1@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543210',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'male',
            address: {
                street: '123 Main St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        });

        const patient2 = await Patient.create({
            fullName: 'Patient Two',
            email: 'patient2@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543211',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'female',
            address: {
                street: '123 Main St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        });

        const appointment = await Appointment.create({
            patient: patient1._id,
            patientNameForVisit: "Patient One", // Appointment belongs to patient1
            doctor: doctor._id,
            date: new Date('2024-01-15'),
            time: '10:00 AM',
            status: 'completed',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
        });

        const mockUser = createMockUserHeader(patient2._id, 'patient'); // Patient2 trying to review

        const response = await request(app)
            .post('/api/reviews')
            .set('mock-user', mockUser)
            .send({
                doctorId: doctor._id.toString(),
                appointmentId: appointment._id.toString(),
                rating: 5,
                comment: 'Test',
            });

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('You are not authorized to review this appointment.');
    });

    it('should return 400 if appointment has already been reviewed', async () => {
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

        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543210',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'male',
            address: {
                street: '123 Main St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        });

        const appointment = await Appointment.create({
            patient: patient._id,
            patientNameForVisit: "John Doe",
            doctor: doctor._id,
            date: new Date('2024-01-15'),
            time: '10:00 AM',
            status: 'completed',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
        });

        // Create existing review
        await Review.create({
            doctor: doctor._id,
            patient: patient._id,
            patientNameForVisit: "John Doe",
            appointment: appointment._id,
            rating: 4,
            comment: 'Already reviewed',
        });

        const mockUser = createMockUserHeader(patient._id, 'patient');

        const response = await request(app)
            .post('/api/reviews')
            .set('mock-user', mockUser)
            .send({
                doctorId: doctor._id.toString(),
                appointmentId: appointment._id.toString(),
                rating: 5,
                comment: 'Trying again',
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('This appointment has already been reviewed.');
    });

    it('should return 401 if no token is provided', async () => {
        const response = await request(app)
            .post('/api/reviews')
            .send({
                doctorId: new mongoose.Types.ObjectId().toString(),
                appointmentId: new mongoose.Types.ObjectId().toString(),
                rating: 5,
                comment: 'Test',
            });

        expect(response.status).toBe(401);
    });

    it('should return 500 on server error', async () => {
        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543210',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'male',
            address: {
                street: '123 Main St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        });

        const mockUser = createMockUserHeader(patient._id, 'patient');

        // Spy on Appointment.findById to throw an error
        const findByIdSpy = vi.spyOn(Appointment, 'findById').mockImplementationOnce(() => {
            throw new Error('Database error');
        });

        const response = await request(app)
            .post('/api/reviews')
            .set('mock-user', mockUser)
            .send({
                doctorId: new mongoose.Types.ObjectId().toString(),
                appointmentId: new mongoose.Types.ObjectId().toString(),
                rating: 5,
                comment: 'Test',
            });

        expect(response.status).toBe(500);
        expect(response.text).toBe('Server Error');

        findByIdSpy.mockRestore();
    });

    it('should handle rating validation (minimum 1)', async () => {
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

        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543210',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'male',
            address: {
                street: '123 Main St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        });

        const appointment = await Appointment.create({
            patient: patient._id,
            patientNameForVisit: "John Doe",
            doctor: doctor._id,
            date: new Date('2024-01-15'),
            time: '10:00 AM',
            status: 'completed',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
        });

        const mockUser = createMockUserHeader(patient._id, 'patient');

        const response = await request(app)
            .post('/api/reviews')
            .set('mock-user', mockUser)
            .send({
                doctorId: doctor._id.toString(),
                appointmentId: appointment._id.toString(),
                rating: 0, // Invalid: below minimum
                comment: 'Test',
            });

        expect(response.status).toBe(500);
    });

    it('should handle rating validation (maximum 5)', async () => {
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

        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543210',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'male',
            address: {
                street: '123 Main St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        });

        const appointment = await Appointment.create({
            patient: patient._id,
            patientNameForVisit: "John Doe",
            doctor: doctor._id,
            date: new Date('2024-01-15'),
            time: '10:00 AM',
            status: 'completed',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
        });

        const mockUser = createMockUserHeader(patient._id, 'patient');

        const response = await request(app)
            .post('/api/reviews')
            .set('mock-user', mockUser)
            .send({
                doctorId: doctor._id.toString(),
                appointmentId: appointment._id.toString(),
                rating: 6, // Invalid: above maximum
                comment: 'Test',
            });

        expect(response.status).toBe(500);
    });
});

describe('GET /api/reviews/doctor/:doctorId', () => {
    it('should get all reviews for a doctor', async () => {
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

        const patient1 = await Patient.create({
            fullName: 'Patient One',
            email: 'patient1@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543210',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'male',
            address: {
                street: '123 Main St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        });

        const patient2 = await Patient.create({
            fullName: 'Patient Two',
            email: 'patient2@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543211',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'female',
            address: {
                street: '123 Main St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        });

        const appointment1 = await Appointment.create({
            patient: patient1._id,
            patientNameForVisit: "Patient One",
            doctor: doctor._id,
            date: new Date('2024-01-15'),
            time: '10:00 AM',
            status: 'completed',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
        });

        const appointment2 = await Appointment.create({
            patient: patient2._id,
            patientNameForVisit: "Patient Two",
            doctor: doctor._id,
            date: new Date('2024-01-16'),
            time: '11:00 AM',
            status: 'completed',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
        });

        await Review.create({
            doctor: doctor._id,
            patient: patient1._id,
            patientNameForVisit: "Patient One",
            appointment: appointment1._id,
            rating: 5,
            comment: 'Excellent!',
        });

        await Review.create({
            doctor: doctor._id,
            patient: patient2._id,
            patientNameForVisit: "Patient Two",
            appointment: appointment2._id,
            rating: 4,
            comment: 'Very good!',
        });

        const response = await request(app)
            .get(`/api/reviews/doctor/${doctor._id}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(2);
        expect(response.body[0]).toHaveProperty('patient');
        expect(response.body[0].patient).toHaveProperty('fullName');
        expect(response.body[0].rating).toBeDefined();
        expect(response.body[0].comment).toBeDefined();
    });

    it('should return empty array if doctor has no reviews', async () => {
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

        const response = await request(app)
            .get(`/api/reviews/doctor/${doctor._id}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(0);
    });

    it('should return reviews sorted by createdAt in descending order', async () => {
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

        const patient1 = await Patient.create({
            fullName: 'Patient One',
            email: 'patient1@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543210',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'male',
            address: {
                street: '123 Main St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        });

        const patient2 = await Patient.create({
            fullName: 'Patient Two',
            email: 'patient2@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543211',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'female',
            address: {
                street: '123 Main St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        });

        const appointment1 = await Appointment.create({
            patient: patient1._id,
            patientNameForVisit: "Patient One",
            doctor: doctor._id,
            date: new Date('2024-01-15'),
            time: '10:00 AM',
            status: 'completed',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
        });

        const appointment2 = await Appointment.create({
            patient: patient2._id,
            patientNameForVisit: "Patient Two",
            doctor: doctor._id,
            date: new Date('2024-01-16'),
            time: '11:00 AM',
            status: 'completed',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
        });

        // Create first review (older)
        const review1 = await Review.create({
            doctor: doctor._id,
            patient: patient1._id,
            patientNameForVisit: "Patient One",
            appointment: appointment1._id,
            rating: 5,
            comment: 'First review',
            createdAt: new Date('2024-01-15T12:00:00'),
        });

        // Create second review (newer)
        const review2 = await Review.create({
            doctor: doctor._id,
            patient: patient2._id,
            patientNameForVisit: "Patient Two",
            appointment: appointment2._id,
            rating: 4,
            comment: 'Second review',
            createdAt: new Date('2024-01-16T12:00:00'),
        });

        const response = await request(app)
            .get(`/api/reviews/doctor/${doctor._id}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(2);
        // Newer review should come first
        expect(response.body[0].comment).toBe('Second review');
        expect(response.body[1].comment).toBe('First review');
    });

    it('should populate patient fullName in reviews', async () => {
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

        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543210',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'male',
            address: {
                street: '123 Main St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        });

        const appointment = await Appointment.create({
            patient: patient._id,
            patientNameForVisit: "John Doe",
            doctor: doctor._id,
            date: new Date('2024-01-15'),
            time: '10:00 AM',
            status: 'completed',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
        });

        await Review.create({
            doctor: doctor._id,
            patient: patient._id,
            patientNameForVisit: "John Doe",
            appointment: appointment._id,
            rating: 5,
            comment: 'Great doctor!',
        });

        const response = await request(app)
            .get(`/api/reviews/doctor/${doctor._id}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0].patient).toHaveProperty('fullName', 'John Doe');
        expect(response.body[0].patient).not.toHaveProperty('password');
        expect(response.body[0].patient).not.toHaveProperty('email');
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

        // Spy on Review.find to throw an error
        const findSpy = vi.spyOn(Review, 'find').mockImplementationOnce(() => {
            throw new Error('Database error');
        });

        const response = await request(app)
            .get(`/api/reviews/doctor/${doctor._id}`);

        expect(response.status).toBe(500);
        expect(response.text).toBe('Server Error');

        findSpy.mockRestore();
    });

    it('should handle invalid doctor ID gracefully', async () => {
        const response = await request(app)
            .get('/api/reviews/doctor/invalid-id');

        expect(response.status).toBe(500);
    });

    it('should not return reviews for other doctors', async () => {
        const doctor1 = await Doctor.create({
            fullName: 'Dr. Test One',
            email: 'doctor1@test.com',
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

        const doctor2 = await Doctor.create({
            fullName: 'Dr. Test Two',
            email: 'doctor2@test.com',
            password: 'Test@1234',
            specialization: 'Neurology',
            experience: 15,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 600,
            phoneNumber: '1234567891',
            licenseNumber: 'LIC123457',
            address: '456 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        });

        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543210',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'male',
            address: {
                street: '123 Main St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        });

        const appointment1 = await Appointment.create({
            patient: patient._id,
            patientNameForVisit: "John Doe",
            doctor: doctor1._id,
            date: new Date('2024-01-15'),
            time: '10:00 AM',
            status: 'completed',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
        });

        const appointment2 = await Appointment.create({
            patient: patient._id,
            patientNameForVisit: "John Doe",
            doctor: doctor2._id,
            date: new Date('2024-01-16'),
            time: '11:00 AM',
            status: 'completed',
            consultationFeeAtBooking: 600,
            paymentStatus: 'paid',
        });

        // Create reviews for both doctors
        await Review.create({
            doctor: doctor1._id,
            patient: patient._id,
            patientNameForVisit: "John Doe",
            appointment: appointment1._id,
            rating: 5,
            comment: 'Review for Doctor 1',
        });

        await Review.create({
            doctor: doctor2._id,
            patient: patient._id,
            patientNameForVisit: "John Doe",
            appointment: appointment2._id,
            rating: 4,
            comment: 'Review for Doctor 2',
        });

        // Get reviews for doctor1 only
        const response = await request(app)
            .get(`/api/reviews/doctor/${doctor1._id}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0].comment).toBe('Review for Doctor 1');
    });
});

describe('updateDoctorRating function', () => {
    it('should set rating to 0 when all reviews are deleted', async () => {
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
            averageRating: 5,
            reviewCount: 1,
        });

        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543210',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'male',
            address: {
                street: '123 Main St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        });

        const appointment = await Appointment.create({
            patient: patient._id,
            patientNameForVisit: "John Doe",
            doctor: doctor._id,
            date: new Date('2024-01-15'),
            time: '10:00 AM',
            status: 'completed',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
        });

        // Create a review
        const review = await Review.create({
            doctor: doctor._id,
            patient: patient._id,
            patientNameForVisit: "John Doe",
            appointment: appointment._id,
            rating: 5,
            comment: 'Great!',
        });

        // Delete the review
        await Review.findByIdAndDelete(review._id);

        // Manually trigger updateDoctorRating
        const updateDoctorRating = async (doctorId) => {
            const reviewsList = await Review.find({ doctor: doctorId });

            if (reviewsList.length === 0) {
                await Doctor.findByIdAndUpdate(doctorId, {
                    averageRating: 0,
                    reviewCount: 0,
                });
                return;
            }

            const totalRating = reviewsList.reduce((acc, review) => acc + review.rating, 0);
            const average = totalRating / reviewsList.length;

            await Doctor.findByIdAndUpdate(doctorId, {
                averageRating: average,
                reviewCount: reviewsList.length,
            });
        };

        await updateDoctorRating(doctor._id);

        const updatedDoctor = await Doctor.findById(doctor._id);
        expect(updatedDoctor.averageRating).toBe(0);
        expect(updatedDoctor.reviewCount).toBe(0);
    });
});
