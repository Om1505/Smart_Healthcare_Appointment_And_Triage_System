import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Mock Groq SDK
const mockGroqCreate = vi.fn();
const mockGroq = {
    chat: {
        completions: {
            create: mockGroqCreate
        }
    }
};

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
    if (id === 'groq-sdk') {
        return function Groq() {
            return mockGroq;
        };
    }
    return originalRequire.apply(this, arguments);
};

const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');

let mongoServer;
let app;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    app = express();
    app.use(express.json());
    app.use('/api/summary', require('../routes/SummaryRoutes'));
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    await Appointment.deleteMany({});
    await Doctor.deleteMany({});
    await Patient.deleteMany({});
    vi.clearAllMocks();
});

// Helper function to create mock user header
const createMockUserHeader = (userId, userType) => {
    return JSON.stringify({ userId, userType });
};

describe('GET /api/summary/appointment/:appointmentId', () => {
    it('should generate AI summary for appointment successfully', async () => {
        // Use insertMany to bypass pre-save hooks
        const doctors = await Doctor.insertMany([{
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
        }]);
        const doctor = doctors[0];

        const patients = await Patient.insertMany([{
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
        }]);
        const patient = patients[0];

        const appointments = await Appointment.insertMany([{
            patient: patient._id,
            patientNameForVisit: 'John Doe',
            doctor: doctor._id,
            date: new Date('2024-01-15'),
            time: '10:00 AM',
            status: 'upcoming',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
            primaryReason: 'Chest pain',
            symptomsList: ['Chest pain', 'Shortness of breath'],
            symptomsBegin: 'Yesterday',
            age: 35,
            sex: 'Male',
        }]);
        const appointment = appointments[0];

        // Mock Groq API response
        mockGroqCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: 'A 35-year-old male presents with chest pain and shortness of breath that began yesterday. This requires immediate medical attention due to potential cardiac concerns.'
                }
            }]
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.summary).toBeDefined();
        expect(response.body.cached).toBe(false);
        expect(mockGroqCreate).toHaveBeenCalledTimes(1);

        // Verify the summary was saved to database
        const updatedAppointment = await Appointment.findById(appointment._id);
        expect(updatedAppointment.doctorSummary).toBeDefined();
        expect(updatedAppointment.summaryGeneratedAt).toBeDefined();
    });

    it('should return cached summary if already exists', async () => {
        const doctors = await Doctor.insertMany([{
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
        }]);
        const doctor = doctors[0];

        const patients = await Patient.insertMany([{
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
        }]);
        const patient = patients[0];

        const appointments = await Appointment.insertMany([{
            patient: patient._id,
            patientNameForVisit: 'John Doe',
            doctor: doctor._id,
            date: new Date('2024-01-15'),
            time: '10:00 AM',
            status: 'upcoming',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
            primaryReason: 'Follow-up',
            doctorSummary: 'Previously generated summary',
            summaryGeneratedAt: new Date(),
        }]);
        const appointment = appointments[0];

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.summary).toBe('Previously generated summary');
        expect(response.body.cached).toBe(true);
        expect(mockGroqCreate).not.toHaveBeenCalled();
    });

    it('should handle appointment with comprehensive medical history', async () => {
        const doctors = await Doctor.insertMany([{
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
        }]);
        const doctor = doctors[0];

        const patients = await Patient.insertMany([{
            fullName: 'Jane Smith',
            email: 'jane@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543211',
            dateOfBirth: new Date('1985-05-15'),
            gender: 'female',
            address: {
                street: '456 Oak St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const patient = patients[0];

        const appointments = await Appointment.insertMany([{
            patient: patient._id,
            patientNameForVisit: 'Jane Smith',
            doctor: doctor._id,
            date: new Date('2024-01-20'),
            time: '2:00 PM',
            status: 'upcoming',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
            primaryReason: 'Diabetes management',
            symptomsList: ['Increased thirst', 'Frequent urination', 'Fatigue'],
            symptomsOther: 'Blurred vision',
            symptomsBegin: 'Two weeks ago',
            severeSymptomsCheck: ['Severe fatigue'],
            preExistingConditions: ['Diabetes', 'Hypertension'],
            preExistingConditionsOther: 'Thyroid disorder',
            pastSurgeries: 'Appendectomy in 2010',
            familyHistory: ['Heart disease', 'Diabetes'],
            familyHistoryOther: 'Stroke',
            medications: 'Metformin 500mg, Lisinopril 10mg',
            allergies: 'Penicillin',
            age: 40,
            sex: 'Female',
        }]);
        const appointment = appointments[0];

        mockGroqCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: 'A 40-year-old female with diabetes and hypertension presents with increased thirst, frequent urination, fatigue, and blurred vision starting two weeks ago. Patient has significant family history and is on Metformin and Lisinopril. Requires diabetes management review.'
                }
            }]
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.summary).toContain('40-year-old female');
        expect(response.body.cached).toBe(false);
    });

    it('should handle appointment with minimal data', async () => {
        const doctors = await Doctor.insertMany([{
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
        }]);
        const doctor = doctors[0];

        const patients = await Patient.insertMany([{
            fullName: 'Test Patient',
            email: 'test@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543212',
            dateOfBirth: new Date('1995-01-01'),
            gender: 'male',
            address: {
                street: '789 Pine St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const patient = patients[0];

        const appointments = await Appointment.insertMany([{
            patient: patient._id,
            patientNameForVisit: 'Test Patient',
            doctor: doctor._id,
            date: new Date('2024-01-25'),
            time: '3:00 PM',
            status: 'upcoming',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
        }]);
        const appointment = appointments[0];

        mockGroqCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: 'Patient presents for general consultation. Limited medical history provided.'
                }
            }]
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.summary).toBeDefined();
    });

    it('should return 404 if appointment not found', async () => {
        const doctors = await Doctor.insertMany([{
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
        }]);
        const doctor = doctors[0];

        const mockUser = createMockUserHeader(doctor._id, 'doctor');
        const nonExistentId = new mongoose.Types.ObjectId();

        const response = await request(app)
            .get(`/api/summary/appointment/${nonExistentId}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Appointment not found');
    });

    it('should return 401 if no token is provided', async () => {
        const response = await request(app)
            .get(`/api/summary/appointment/${new mongoose.Types.ObjectId()}`);

        expect(response.status).toBe(401);
    });

    it('should return 500 if Groq API fails', async () => {
        const doctors = await Doctor.insertMany([{
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
        }]);
        const doctor = doctors[0];

        const patients = await Patient.insertMany([{
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
        }]);
        const patient = patients[0];

        const appointments = await Appointment.insertMany([{
            patient: patient._id,
            patientNameForVisit: 'John Doe',
            doctor: doctor._id,
            date: new Date('2024-01-15'),
            time: '10:00 AM',
            status: 'upcoming',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
            primaryReason: 'Test',
        }]);
        const appointment = appointments[0];

        // Mock Groq API to throw error
        mockGroqCreate.mockRejectedValue(new Error('API Error'));

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Failed to generate summary');
    });

    it('should handle Groq API returning empty response', async () => {
        const doctors = await Doctor.insertMany([{
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
        }]);
        const doctor = doctors[0];

        const patients = await Patient.insertMany([{
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
        }]);
        const patient = patients[0];

        const appointments = await Appointment.insertMany([{
            patient: patient._id,
            patientNameForVisit: 'John Doe',
            doctor: doctor._id,
            date: new Date('2024-01-15'),
            time: '10:00 AM',
            status: 'upcoming',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
            primaryReason: 'Test',
        }]);
        const appointment = appointments[0];

        // Mock Groq API to return empty content
        mockGroqCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: null
                }
            }]
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.summary).toBe('Unable to generate summary');
    });

    it('should handle severe symptoms correctly', async () => {
        const doctors = await Doctor.insertMany([{
            fullName: 'Dr. Test',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Emergency Medicine',
            experience: 15,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567890',
            licenseNumber: 'LIC123456',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const doctor = doctors[0];

        const patients = await Patient.insertMany([{
            fullName: 'Emergency Patient',
            email: 'emergency@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543213',
            dateOfBirth: new Date('1970-01-01'),
            gender: 'male',
            address: {
                street: '111 Emergency St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const patient = patients[0];

        const appointments = await Appointment.insertMany([{
            patient: patient._id,
            patientNameForVisit: 'Emergency Patient',
            doctor: doctor._id,
            date: new Date('2024-01-15'),
            time: '10:00 AM',
            status: 'upcoming',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
            primaryReason: 'Severe chest pain',
            symptomsList: ['Chest pain', 'Difficulty breathing'],
            severeSymptomsCheck: ['Chest pain radiating to arm', 'Severe shortness of breath', 'Loss of consciousness'],
            symptomsBegin: '30 minutes ago',
            age: 55,
            sex: 'Male',
        }]);
        const appointment = appointments[0];

        mockGroqCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: 'URGENT: A 55-year-old male with severe chest pain radiating to arm, severe shortness of breath, and loss of consciousness that began 30 minutes ago. Immediate emergency evaluation required for possible cardiac event.'
                }
            }]
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.summary).toContain('URGENT');
    });

    it('should handle patient with allergies and medications', async () => {
        const doctors = await Doctor.insertMany([{
            fullName: 'Dr. Test',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Internal Medicine',
            experience: 10,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567890',
            licenseNumber: 'LIC123456',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const doctor = doctors[0];

        const patients = await Patient.insertMany([{
            fullName: 'Allergic Patient',
            email: 'allergic@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543214',
            dateOfBirth: new Date('1980-06-15'),
            gender: 'female',
            address: {
                street: '222 Allergy St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const patient = patients[0];

        const appointments = await Appointment.insertMany([{
            patient: patient._id,
            patientNameForVisit: 'Allergic Patient',
            doctor: doctor._id,
            date: new Date('2024-01-15'),
            time: '11:00 AM',
            status: 'upcoming',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
            primaryReason: 'Medication review',
            medications: 'Aspirin 81mg daily, Atorvastatin 20mg, Omeprazole 20mg',
            allergies: 'Penicillin (anaphylaxis), Sulfa drugs (rash), Latex',
            age: 45,
            sex: 'Female',
        }]);
        const appointment = appointments[0];

        mockGroqCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: 'A 45-year-old female presents for medication review. Patient is on Aspirin, Atorvastatin, and Omeprazole. IMPORTANT: Multiple drug allergies including Penicillin (anaphylaxis), Sulfa drugs, and Latex.'
                }
            }]
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.summary).toContain('allergies');
    });

    it('should return 500 on database error', async () => {
        const doctors = await Doctor.insertMany([{
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
        }]);
        const doctor = doctors[0];

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        // Spy on Appointment.findById to throw error
        const findByIdSpy = vi.spyOn(Appointment, 'findById').mockImplementationOnce(() => {
            throw new Error('Database error');
        });

        const response = await request(app)
            .get(`/api/summary/appointment/${new mongoose.Types.ObjectId()}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);

        findByIdSpy.mockRestore();
    });

    it('should properly format patient data for AI summary', async () => {
        const doctors = await Doctor.insertMany([{
            fullName: 'Dr. Test',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Family Medicine',
            experience: 12,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567890',
            licenseNumber: 'LIC123456',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const doctor = doctors[0];

        const patients = await Patient.insertMany([{
            fullName: 'Complete Patient',
            email: 'complete@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543215',
            dateOfBirth: new Date('1975-03-20'),
            gender: 'male',
            address: {
                street: '333 Complete St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const patient = patients[0];

        const appointments = await Appointment.insertMany([{
            patient: patient._id,
            patientNameForVisit: 'Complete Patient',
            doctor: doctor._id,
            date: new Date('2024-02-01'),
            time: '9:00 AM',
            status: 'upcoming',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
            primaryReason: 'Annual checkup',
            symptomsList: ['None'],
            symptomsBegin: 'N/A',
            preExistingConditions: ['Hypertension'],
            pastSurgeries: 'None',
            familyHistory: ['Heart disease'],
            medications: 'Lisinopril 10mg',
            allergies: 'None',
            age: 50,
            sex: 'Male',
        }]);
        const appointment = appointments[0];

        mockGroqCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: 'A 50-year-old male presents for annual checkup. Patient has controlled hypertension on Lisinopril with family history of heart disease. No acute concerns reported.'
                }
            }]
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.summary).toBeDefined();
        expect(mockGroqCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                messages: expect.arrayContaining([
                    expect.objectContaining({
                        role: 'user',
                        content: expect.stringContaining('Complete Patient')
                    })
                ]),
                model: 'llama-3.3-70b-versatile',
                temperature: 0
            })
        );
    });

    it('should handle appointment with no severe symptoms', async () => {
        const doctors = await Doctor.insertMany([{
            fullName: 'Dr. Test',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Family Medicine',
            experience: 8,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567890',
            licenseNumber: 'LIC123456',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const doctor = doctors[0];

        const patients = await Patient.insertMany([{
            fullName: 'Healthy Patient',
            email: 'healthy@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543216',
            dateOfBirth: new Date('1990-05-10'),
            gender: 'male',
            address: {
                street: '444 Wellness St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const patient = patients[0];

        const appointments = await Appointment.insertMany([{
            patient: patient._id,
            patientNameForVisit: 'Healthy Patient',
            doctor: doctor._id,
            date: new Date('2024-02-05'),
            time: '11:00 AM',
            status: 'upcoming',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
            primaryReason: 'Routine checkup',
            symptomsList: ['Mild headache'],
            symptomsBegin: 'This morning',
            severeSymptomsCheck: [], // Empty array - should trigger "None reported"
            age: 35,
            sex: 'Male',
        }]);
        const appointment = appointments[0];

        mockGroqCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: 'A 35-year-old male presents for routine checkup with mild headache since this morning. No severe symptoms reported. Routine evaluation appropriate.'
                }
            }]
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.summary).toBeDefined();
        
        // Verify that the prompt includes "None reported" for severe symptoms
        expect(mockGroqCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                messages: expect.arrayContaining([
                    expect.objectContaining({
                        role: 'user',
                        content: expect.stringContaining('- None reported')
                    })
                ])
            })
        );
    });

    it('should handle appointment with all fields null/undefined', async () => {
        const doctors = await Doctor.insertMany([{
            fullName: 'Dr. Test',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Family Medicine',
            experience: 8,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567890',
            licenseNumber: 'LIC123456',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const doctor = doctors[0];

        const patients = await Patient.insertMany([{
            fullName: 'Minimal Patient',
            email: 'minimal@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543217',
            dateOfBirth: new Date('1990-05-10'),
            gender: 'male',
            address: {
                street: '555 Minimal St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const patient = patients[0];

        // Create appointment with no optional fields (only required fields)
        const appointments = await Appointment.insertMany([{
            patient: patient._id,
            patientNameForVisit: 'Minimal Patient', // Required field
            doctor: doctor._id,
            date: new Date('2024-02-05'),
            time: '11:00 AM',
            status: 'upcoming',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
            // All optional fields are intentionally omitted to test fallbacks
        }]);
        const appointment = appointments[0];

        mockGroqCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: 'Patient presents with minimal information provided. Further evaluation needed.'
                }
            }]
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.summary).toBeDefined();
        
        // Verify all fallback values are used
        expect(mockGroqCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                messages: expect.arrayContaining([
                    expect.objectContaining({
                        role: 'user',
                        content: expect.stringMatching(/Not provided.*Not provided.*Not specified/s)
                    })
                ])
            })
        );
    });

    it('should handle appointment with only "other" fields populated', async () => {
        const doctors = await Doctor.insertMany([{
            fullName: 'Dr. Test',
            email: 'doctor2@test.com',
            password: 'Test@1234',
            specialization: 'Family Medicine',
            experience: 8,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567891',
            licenseNumber: 'LIC123457',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const doctor = doctors[0];

        const patients = await Patient.insertMany([{
            fullName: 'Other Fields Patient',
            email: 'otherfields@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543218',
            dateOfBirth: new Date('1990-05-10'),
            gender: 'male',
            address: {
                street: '666 Other St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const patient = patients[0];

        // Create appointment with empty arrays but populated "other" fields
        const appointments = await Appointment.insertMany([{
            patient: patient._id,
            patientNameForVisit: 'Other Fields Patient',
            doctor: doctor._id,
            date: new Date('2024-02-05'),
            time: '11:00 AM',
            status: 'upcoming',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
            primaryReason: 'Check unusual conditions',
            symptomsList: [],
            symptomsOther: 'Unusual tingling sensation',
            symptomsBegin: 'Last week',
            severeSymptomsCheck: [],
            preExistingConditions: [],
            preExistingConditionsOther: 'Rare autoimmune condition',
            pastSurgeries: 'Minor procedure',
            familyHistory: [],
            familyHistoryOther: 'Genetic disorder',
            medications: 'Custom medication',
            allergies: 'Rare allergen',
            age: 35,
            sex: 'Male',
        }]);
        const appointment = appointments[0];

        mockGroqCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: 'A 35-year-old male with unusual conditions. Requires specialized evaluation for rare autoimmune condition and genetic disorder.'
                }
            }]
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.summary).toBeDefined();
        
        // Verify "other" fields are included in the prompt
        expect(mockGroqCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                messages: expect.arrayContaining([
                    expect.objectContaining({
                        role: 'user',
                        content: expect.stringContaining('Unusual tingling sensation')
                    })
                ])
            })
        );
        
        expect(mockGroqCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                messages: expect.arrayContaining([
                    expect.objectContaining({
                        role: 'user',
                        content: expect.stringContaining('Rare autoimmune condition')
                    })
                ])
            })
        );
        
        expect(mockGroqCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                messages: expect.arrayContaining([
                    expect.objectContaining({
                        role: 'user',
                        content: expect.stringContaining('Genetic disorder')
                    })
                ])
            })
        );
    });

    it('should handle appointment with empty arrays for all list fields', async () => {
        const doctors = await Doctor.insertMany([{
            fullName: 'Dr. Test',
            email: 'doctor3@test.com',
            password: 'Test@1234',
            specialization: 'Family Medicine',
            experience: 8,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567892',
            licenseNumber: 'LIC123458',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const doctor = doctors[0];

        const patients = await Patient.insertMany([{
            fullName: 'Empty Arrays Patient',
            email: 'emptyarrays@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543219',
            dateOfBirth: new Date('1990-05-10'),
            gender: 'male',
            address: {
                street: '777 Empty St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const patient = patients[0];

        // Create appointment with all list fields as empty arrays
        const appointments = await Appointment.insertMany([{
            patient: patient._id,
            patientNameForVisit: 'Empty Arrays Patient',
            doctor: doctor._id,
            date: new Date('2024-02-05'),
            time: '11:00 AM',
            status: 'upcoming',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
            primaryReason: 'General consultation',
            symptomsList: [],
            symptomsOther: '',
            symptomsBegin: 'Today',
            severeSymptomsCheck: [],
            preExistingConditions: [],
            preExistingConditionsOther: '',
            pastSurgeries: '',
            familyHistory: [],
            familyHistoryOther: '',
            medications: '',
            allergies: '',
            age: 30,
            sex: 'Male',
        }]);
        const appointment = appointments[0];

        mockGroqCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: 'A 30-year-old male presents for general consultation. No significant medical history or symptoms reported.'
                }
            }]
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.summary).toBeDefined();
        
        // Verify fallback messages for empty arrays
        expect(mockGroqCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                messages: expect.arrayContaining([
                    expect.objectContaining({
                        role: 'user',
                        content: expect.stringMatching(/None reported.*None reported.*None.*None/s)
                    })
                ])
            })
        );
    });

    it('should handle Groq API response with missing choices array', async () => {
        const doctors = await Doctor.insertMany([{
            fullName: 'Dr. Test',
            email: 'doctor4@test.com',
            password: 'Test@1234',
            specialization: 'Family Medicine',
            experience: 8,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567893',
            licenseNumber: 'LIC123459',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const doctor = doctors[0];

        const patients = await Patient.insertMany([{
            fullName: 'Edge Case Patient',
            email: 'edgecase@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543220',
            dateOfBirth: new Date('1990-05-10'),
            gender: 'male',
            address: {
                street: '888 Edge St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const patient = patients[0];

        const appointments = await Appointment.insertMany([{
            patient: patient._id,
            patientNameForVisit: 'Edge Case Patient',
            doctor: doctor._id,
            date: new Date('2024-02-05'),
            time: '11:00 AM',
            status: 'upcoming',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
            primaryReason: 'Test',
        }]);
        const appointment = appointments[0];

        // Mock Groq API to return malformed response
        mockGroqCreate.mockResolvedValue({
            choices: []
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.summary).toBe('Unable to generate summary');
    });

    it('should handle Groq API response with null message', async () => {
        const doctors = await Doctor.insertMany([{
            fullName: 'Dr. Test',
            email: 'doctor5@test.com',
            password: 'Test@1234',
            specialization: 'Family Medicine',
            experience: 8,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567894',
            licenseNumber: 'LIC123460',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const doctor = doctors[0];

        const patients = await Patient.insertMany([{
            fullName: 'Null Message Patient',
            email: 'nullmessage@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543221',
            dateOfBirth: new Date('1990-05-10'),
            gender: 'male',
            address: {
                street: '999 Null St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const patient = patients[0];

        const appointments = await Appointment.insertMany([{
            patient: patient._id,
            patientNameForVisit: 'Null Message Patient',
            doctor: doctor._id,
            date: new Date('2024-02-05'),
            time: '11:00 AM',
            status: 'upcoming',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
            primaryReason: 'Test',
        }]);
        const appointment = appointments[0];

        // Mock Groq API to return null message object
        mockGroqCreate.mockResolvedValue({
            choices: [{
                message: null
            }]
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.summary).toBe('Unable to generate summary');
    });

    it('should handle severe symptoms with multiple items and proper formatting', async () => {
        const doctors = await Doctor.insertMany([{
            fullName: 'Dr. Test',
            email: 'doctor6@test.com',
            password: 'Test@1234',
            specialization: 'Emergency Medicine',
            experience: 15,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567895',
            licenseNumber: 'LIC123461',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const doctor = doctors[0];

        const patients = await Patient.insertMany([{
            fullName: 'Severe Case Patient',
            email: 'severecase@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543222',
            dateOfBirth: new Date('1965-01-01'),
            gender: 'male',
            address: {
                street: '1000 Severe St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const patient = patients[0];

        const appointments = await Appointment.insertMany([{
            patient: patient._id,
            patientNameForVisit: 'Severe Case Patient',
            doctor: doctor._id,
            date: new Date('2024-02-10'),
            time: '10:00 AM',
            status: 'upcoming',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
            primaryReason: 'Emergency symptoms',
            symptomsList: ['Dizziness', 'Nausea'],
            severeSymptomsCheck: ['Severe chest pain', 'Difficulty breathing', 'Numbness in left arm'],
            symptomsBegin: '1 hour ago',
            age: 60,
            sex: 'Male',
        }]);
        const appointment = appointments[0];

        mockGroqCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: 'CRITICAL: 60-year-old male with severe chest pain, difficulty breathing, and numbness in left arm for 1 hour. Immediate cardiac evaluation required.'
                }
            }]
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.summary).toContain('CRITICAL');
        
        // Verify the severe symptoms are properly formatted in the prompt
        expect(mockGroqCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                messages: expect.arrayContaining([
                    expect.objectContaining({
                        role: 'user',
                        content: expect.stringMatching(/- Severe chest pain\n- Difficulty breathing\n- Numbness in left arm/)
                    })
                ])
            })
        );
    });

    it('should handle appointment with single severe symptom (edge case for mapping)', async () => {
        const doctors = await Doctor.insertMany([{
            fullName: 'Dr. Test',
            email: 'doctor7@test.com',
            password: 'Test@1234',
            specialization: 'Emergency Medicine',
            experience: 12,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567896',
            licenseNumber: 'LIC123462',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const doctor = doctors[0];

        const patients = await Patient.insertMany([{
            fullName: 'Single Severe Patient',
            email: 'singlesevere@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543223',
            dateOfBirth: new Date('1975-06-15'),
            gender: 'female',
            address: {
                street: '1001 Single St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const patient = patients[0];

        const appointments = await Appointment.insertMany([{
            patient: patient._id,
            patientNameForVisit: 'Single Severe Patient',
            doctor: doctor._id,
            date: new Date('2024-02-12'),
            time: '2:00 PM',
            status: 'upcoming',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
            primaryReason: 'Sudden severe headache',
            symptomsList: ['Headache'],
            severeSymptomsCheck: ['Worst headache of life'],
            symptomsBegin: '30 minutes ago',
            age: 50,
            sex: 'Female',
        }]);
        const appointment = appointments[0];

        mockGroqCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: 'URGENT: 50-year-old female with sudden worst headache of life. Rule out subarachnoid hemorrhage. Immediate imaging required.'
                }
            }]
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.summary).toBeDefined();
        
        // Verify single severe symptom is formatted correctly (tests line 57)
        expect(mockGroqCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                messages: expect.arrayContaining([
                    expect.objectContaining({
                        role: 'user',
                        content: expect.stringContaining('- Worst headache of life')
                    })
                ])
            })
        );
    });

    it('should verify exact formatting of severe symptoms section', async () => {
        const doctors = await Doctor.insertMany([{
            fullName: 'Dr. Format Test',
            email: 'formattest@test.com',
            password: 'Test@1234',
            specialization: 'Emergency Medicine',
            experience: 10,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567897',
            licenseNumber: 'LIC123463',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const doctor = doctors[0];

        const patients = await Patient.insertMany([{
            fullName: 'Format Test Patient',
            email: 'formatpatient@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543224',
            dateOfBirth: new Date('1980-03-10'),
            gender: 'male',
            address: {
                street: '1002 Format St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const patient = patients[0];

        const appointments = await Appointment.insertMany([{
            patient: patient._id,
            patientNameForVisit: 'Format Test Patient',
            doctor: doctor._id,
            date: new Date('2024-02-15'),
            time: '3:00 PM',
            status: 'upcoming',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
            primaryReason: 'Multiple severe symptoms',
            severeSymptomsCheck: ['Symptom A', 'Symptom B', 'Symptom C'],
            age: 45,
            sex: 'Male',
        }]);
        const appointment = appointments[0];

        mockGroqCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: 'Test summary'
                }
            }]
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        // Verify the exact formatting with newlines between items
        const callArgs = mockGroqCreate.mock.calls[0][0];
        const promptContent = callArgs.messages[0].content;
        
        // Check that severe symptoms section exists and is properly formatted
        expect(promptContent).toContain('SEVERE SYMPTOMS :');
        expect(promptContent).toMatch(/- Symptom A[\s\S]*- Symptom B[\s\S]*- Symptom C/);
    });

    it('should handle database save error after generating summary', async () => {
        const doctors = await Doctor.insertMany([{
            fullName: 'Dr. Save Error',
            email: 'saveerror@test.com',
            password: 'Test@1234',
            specialization: 'Family Medicine',
            experience: 8,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567898',
            licenseNumber: 'LIC123464',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const doctor = doctors[0];

        const patients = await Patient.insertMany([{
            fullName: 'Save Error Patient',
            email: 'saveerrorpatient@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543225',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'male',
            address: {
                street: '1003 Error St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const patient = patients[0];

        const appointments = await Appointment.insertMany([{
            patient: patient._id,
            patientNameForVisit: 'Save Error Patient',
            doctor: doctor._id,
            date: new Date('2024-02-20'),
            time: '4:00 PM',
            status: 'upcoming',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
            primaryReason: 'Test save error',
        }]);
        const appointment = appointments[0];

        mockGroqCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: 'Summary generated successfully'
                }
            }]
        });

        // Mock the save method to throw an error
        const saveSpy = vi.spyOn(Appointment.prototype, 'save').mockRejectedValueOnce(
            new Error('Database save failed')
        );

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Failed to generate summary');

        saveSpy.mockRestore();
    });

    it('should verify all fallback strings are used correctly', async () => {
        const doctors = await Doctor.insertMany([{
            fullName: 'Dr. Fallback',
            email: 'fallback@test.com',
            password: 'Test@1234',
            specialization: 'Family Medicine',
            experience: 8,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567899',
            licenseNumber: 'LIC123465',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const doctor = doctors[0];

        const patients = await Patient.insertMany([{
            fullName: 'Fallback Patient',
            email: 'fallbackpatient@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543226',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'male',
            address: {
                street: '1004 Fallback St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const patient = patients[0];

        // Create appointment with all null/undefined fields to trigger all fallbacks
        const appointments = await Appointment.insertMany([{
            patient: patient._id,
            patientNameForVisit: 'Fallback Patient', // Required field
            doctor: doctor._id,
            date: new Date('2024-02-25'),
            time: '5:00 PM',
            status: 'upcoming',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
            // All other optional fields left as undefined/null to test fallbacks
        }]);
        const appointment = appointments[0];

        mockGroqCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: 'Summary with all fallbacks'
                }
            }]
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        const callArgs = mockGroqCreate.mock.calls[0][0];
        const promptContent = callArgs.messages[0].content;
        
        // Verify all fallback strings are present
        expect(promptContent).toContain('Not provided'); // For name, age, sex
        expect(promptContent).toContain('Not specified'); // For primaryReason and symptomsBegin
        expect(promptContent).toContain('- None reported'); // For empty symptoms and severe symptoms
        expect(promptContent).toContain('- None'); // For empty conditions and family history
        expect(promptContent).toContain('None'); // For surgeries, medications, allergies
    });

    it('should handle appointment with very long symptom descriptions', async () => {
        const doctors = await Doctor.insertMany([{
            fullName: 'Dr. Long Text',
            email: 'longtext@test.com',
            password: 'Test@1234',
            specialization: 'Family Medicine',
            experience: 8,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '1234567800',
            licenseNumber: 'LIC123466',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const doctor = doctors[0];

        const patients = await Patient.insertMany([{
            fullName: 'Long Text Patient',
            email: 'longtextpatient@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543227',
            dateOfBirth: new Date('1985-05-20'),
            gender: 'female',
            address: {
                street: '1005 Long St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const patient = patients[0];

        const longSymptom = 'Very long symptom description that contains multiple words and detailed information about the patient\'s condition';
        
        const appointments = await Appointment.insertMany([{
            patient: patient._id,
            patientNameForVisit: 'Long Text Patient',
            doctor: doctor._id,
            date: new Date('2024-02-28'),
            time: '6:00 PM',
            status: 'upcoming',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
            primaryReason: 'Complex multi-faceted condition requiring detailed evaluation and comprehensive treatment plan',
            symptomsList: [longSymptom, 'Another detailed symptom with extensive description'],
            severeSymptomsCheck: [longSymptom],
            age: 40,
            sex: 'Female',
        }]);
        const appointment = appointments[0];

        mockGroqCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: 'Summary handles long text appropriately'
                }
            }]
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        
        // Verify long text is included in the prompt
        const callArgs = mockGroqCreate.mock.calls[0][0];
        const promptContent = callArgs.messages[0].content;
        expect(promptContent).toContain(longSymptom);
    });

    // Additional mutation-killing tests
    it('should verify newline separator in symptoms list formatting', async () => {
        const doctors = await Doctor.insertMany([{
            fullName: 'Dr. Format Tester',
            email: 'format@test.com',
            password: 'Test@1234',
            specialization: 'Internal Medicine',
            experience: 5,
            qualifications: ['MBBS'],
            consultationFee: 500,
            phoneNumber: '1234567890',
            licenseNumber: 'LIC123',
            address: '123 Test St',
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const doctor = doctors[0];

        const patients = await Patient.insertMany([{
            fullName: 'Format Patient',
            email: 'format.patient@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543210',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'male',
            address: {
                street: '456 Test St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const patient = patients[0];

        const appointments = await Appointment.insertMany([{
            patient: patient._id,
            patientNameForVisit: 'Format Patient',
            doctor: doctor._id,
            date: new Date('2024-03-01'),
            time: '10:00 AM',
            status: 'upcoming',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
            symptomsList: ['Headache', 'Nausea', 'Dizziness'],
            age: 34,
            sex: 'male',
        }]);
        const appointment = appointments[0];

        mockGroqCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: 'Summary generated'
                }
            }]
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        
        const callArgs = mockGroqCreate.mock.calls[0][0];
        const promptContent = callArgs.messages[0].content;
        
        // Verify newlines are used to separate symptoms
        expect(promptContent).toContain('- Headache\n- Nausea\n- Dizziness');
    });

    it('should verify array spread operator preserves all symptom values', async () => {
        const doctors = await Doctor.insertMany([{
            fullName: 'Dr. Array Tester',
            email: 'array@test.com',
            password: 'Test@1234',
            specialization: 'General Medicine',
            experience: 5,
            qualifications: ['MBBS'],
            consultationFee: 500,
            phoneNumber: '1234567890',
            licenseNumber: 'LIC124',
            address: '123 Test St',
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const doctor = doctors[0];

        const patients = await Patient.insertMany([{
            fullName: 'Array Patient',
            email: 'array.patient@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543211',
            dateOfBirth: new Date('1988-01-01'),
            gender: 'female',
            address: {
                street: '789 Test St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const patient = patients[0];

        const appointments = await Appointment.insertMany([{
            patient: patient._id,
            patientNameForVisit: 'Array Patient',
            doctor: doctor._id,
            date: new Date('2024-03-02'),
            time: '11:00 AM',
            status: 'upcoming',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
            symptomsList: ['Symptom1', 'Symptom2'],
            symptomsOther: 'OtherSymptom',
            preExistingConditions: ['Condition1', 'Condition2'],
            preExistingConditionsOther: 'OtherCondition',
            familyHistory: ['History1', 'History2'],
            familyHistoryOther: 'OtherHistory',
            age: 36,
            sex: 'female',
        }]);
        const appointment = appointments[0];

        mockGroqCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: 'Summary generated'
                }
            }]
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        
        const callArgs = mockGroqCreate.mock.calls[0][0];
        const promptContent = callArgs.messages[0].content;
        
        // Verify all symptoms including "other" are present
        expect(promptContent).toContain('Symptom1');
        expect(promptContent).toContain('Symptom2');
        expect(promptContent).toContain('OtherSymptom');
        
        // Verify all conditions including "other" are present
        expect(promptContent).toContain('Condition1');
        expect(promptContent).toContain('Condition2');
        expect(promptContent).toContain('OtherCondition');
        
        // Verify all family history including "other" are present
        expect(promptContent).toContain('History1');
        expect(promptContent).toContain('History2');
        expect(promptContent).toContain('OtherHistory');
    });

    it('should verify logical OR operator works correctly with falsy values', async () => {
        const doctors = await Doctor.insertMany([{
            fullName: 'Dr. Logic Tester',
            email: 'logic@test.com',
            password: 'Test@1234',
            specialization: 'Medicine',
            experience: 5,
            qualifications: ['MBBS'],
            consultationFee: 500,
            phoneNumber: '1234567891',
            licenseNumber: 'LIC125',
            address: '123 Test St',
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const doctor = doctors[0];

        const patients = await Patient.insertMany([{
            fullName: 'Logic Patient',
            email: 'logic.patient@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543212',
            dateOfBirth: new Date('1992-01-01'),
            gender: 'male',
            address: {
                street: '101 Test St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const patient = patients[0];

        const appointments = await Appointment.insertMany([{
            patient: patient._id,
            patientNameForVisit: 'Logic Patient',
            doctor: doctor._id,
            date: new Date('2024-03-03'),
            time: '12:00 PM',
            status: 'upcoming',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
            // Leave arrays undefined to test || operator
            symptomsList: undefined,
            severeSymptomsCheck: undefined,
            preExistingConditions: undefined,
            familyHistory: undefined,
            age: 32,
            sex: 'male',
        }]);
        const appointment = appointments[0];

        mockGroqCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: 'Summary generated'
                }
            }]
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        
        const callArgs = mockGroqCreate.mock.calls[0][0];
        const promptContent = callArgs.messages[0].content;
        
        // Verify fallback strings are used when fields are undefined
        expect(promptContent).toContain('- None reported'); // For symptoms
        expect(promptContent).toContain('- None'); // For conditions/history
    });

    it('should verify exact "Not specified" string for null primaryReason', async () => {
        const doctors = await Doctor.insertMany([{
            fullName: 'Dr. String Tester',
            email: 'string@test.com',
            password: 'Test@1234',
            specialization: 'Medicine',
            experience: 5,
            qualifications: ['MBBS'],
            consultationFee: 500,
            phoneNumber: '1234567892',
            licenseNumber: 'LIC126',
            address: '123 Test St',
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const doctor = doctors[0];

        const patients = await Patient.insertMany([{
            fullName: 'String Patient',
            email: 'string.patient@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543213',
            dateOfBirth: new Date('1993-01-01'),
            gender: 'female',
            address: {
                street: '202 Test St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const patient = patients[0];

        const appointments = await Appointment.insertMany([{
            patient: patient._id,
            patientNameForVisit: 'String Patient',
            doctor: doctor._id,
            date: new Date('2024-03-04'),
            time: '1:00 PM',
            status: 'upcoming',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
            primaryReason: null,
            symptomsBegin: null,
            pastSurgeries: null,
            medications: null,
            allergies: null,
            age: 31,
            sex: 'female',
        }]);
        const appointment = appointments[0];

        mockGroqCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: 'Summary generated'
                }
            }]
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        
        const callArgs = mockGroqCreate.mock.calls[0][0];
        const promptContent = callArgs.messages[0].content;
        
        // Verify exact fallback strings
        expect(promptContent).toMatch(/CHIEF COMPLAINT:\s*Not specified/);
        expect(promptContent).toMatch(/SYMPTOM BEGINNING:\s*Not specified/);
        expect(promptContent).toMatch(/Past Surgeries\/Hospitalizations:\s*None/);
        expect(promptContent).toMatch(/Current Medications:\s*None/);
        expect(promptContent).toMatch(/Allergies:\s*None/);
    });

    it('should verify newline separator in conditions formatting', async () => {
        const doctors = await Doctor.insertMany([{
            fullName: 'Dr. Conditions Tester',
            email: 'conditions@test.com',
            password: 'Test@1234',
            specialization: 'Medicine',
            experience: 5,
            qualifications: ['MBBS'],
            consultationFee: 500,
            phoneNumber: '1234567893',
            licenseNumber: 'LIC127',
            address: '123 Test St',
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const doctor = doctors[0];

        const patients = await Patient.insertMany([{
            fullName: 'Conditions Patient',
            email: 'conditions.patient@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543214',
            dateOfBirth: new Date('1985-01-01'),
            gender: 'male',
            address: {
                street: '303 Test St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const patient = patients[0];

        const appointments = await Appointment.insertMany([{
            patient: patient._id,
            patientNameForVisit: 'Conditions Patient',
            doctor: doctor._id,
            date: new Date('2024-03-05'),
            time: '2:00 PM',
            status: 'upcoming',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
            preExistingConditions: ['Diabetes', 'Hypertension', 'Asthma'],
            familyHistory: ['Heart Disease', 'Cancer'],
            age: 39,
            sex: 'male',
        }]);
        const appointment = appointments[0];

        mockGroqCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: 'Summary generated'
                }
            }]
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        
        const callArgs = mockGroqCreate.mock.calls[0][0];
        const promptContent = callArgs.messages[0].content;
        
        // Verify newlines separate conditions
        expect(promptContent).toContain('- Diabetes\n- Hypertension\n- Asthma');
        
        // Verify newlines separate family history
        expect(promptContent).toContain('- Heart Disease\n- Cancer');
    });

    it('should verify greater than 0 comparison for array length', async () => {
        const doctors = await Doctor.insertMany([{
            fullName: 'Dr. Comparison Tester',
            email: 'comparison@test.com',
            password: 'Test@1234',
            specialization: 'Medicine',
            experience: 5,
            qualifications: ['MBBS'],
            consultationFee: 500,
            phoneNumber: '1234567894',
            licenseNumber: 'LIC128',
            address: '123 Test St',
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const doctor = doctors[0];

        const patients = await Patient.insertMany([{
            fullName: 'Comparison Patient',
            email: 'comparison.patient@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543215',
            dateOfBirth: new Date('1987-01-01'),
            gender: 'female',
            address: {
                street: '404 Test St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
            },
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const patient = patients[0];

        const appointments = await Appointment.insertMany([{
            patient: patient._id,
            patientNameForVisit: 'Comparison Patient',
            doctor: doctor._id,
            date: new Date('2024-03-06'),
            time: '3:00 PM',
            status: 'upcoming',
            consultationFeeAtBooking: 500,
            paymentStatus: 'paid',
            symptomsList: [], // Exactly empty array
            preExistingConditions: [], // Exactly empty array
            familyHistory: [], // Exactly empty array
            age: 37,
            sex: 'female',
        }]);
        const appointment = appointments[0];

        mockGroqCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: 'Summary generated'
                }
            }]
        });

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        
        const callArgs = mockGroqCreate.mock.calls[0][0];
        const promptContent = callArgs.messages[0].content;
        
        // When array.length === 0, should show fallback text (not items)
        expect(promptContent).toContain('- None reported');
        expect(promptContent).toContain('- None');
    });
});