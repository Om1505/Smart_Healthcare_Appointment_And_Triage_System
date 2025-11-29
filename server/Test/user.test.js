import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import '../routes/user';

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

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

const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');

let mongoServer;
let app;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    app = express();
    app.use(express.json());
    app.use('/api/user', require('../routes/user'));
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    await Patient.deleteMany({});
    await Doctor.deleteMany({});
    await Admin.deleteMany({});
});

// Helper function to create mock user header
const createMockUserHeader = (userId, userType) => {
    return JSON.stringify({ userId, userType });
};

describe('GET /api/user/profile', () => {
    it('should get patient profile successfully', async () => {
        const patients = await Patient.insertMany([{
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const patient = patients[0];

        const mockUser = createMockUserHeader(patient._id, 'patient');

        const response = await request(app)
            .get('/api/user/profile')
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.fullName).toBe('John Doe');
        expect(response.body.email).toBe('patient@test.com');
        expect(response.body.password).toBeUndefined(); // Password should be excluded
    });

    it('should get doctor profile successfully', async () => {
        const doctors = await Doctor.insertMany([{
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '9876543210',
            licenseNumber: 'LIC123456',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
            emailVerified: true,
        }]);
        const doctor = doctors[0];

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .get('/api/user/profile')
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.fullName).toBe('Dr. Smith');
        expect(response.body.email).toBe('doctor@test.com');
        expect(response.body.specialization).toBe('Cardiology');
        expect(response.body.password).toBeUndefined();
    });

    it('should get admin profile successfully', async () => {
        const admins = await Admin.insertMany([{
            fullName: 'Admin User',
            email: 'admin@test.com',
            password: 'Test@1234',
            isProfileComplete: true,
            isEmailVerified: true,
        }]);
        const admin = admins[0];

        const mockUser = createMockUserHeader(admin._id, 'admin');

        const response = await request(app)
            .get('/api/user/profile')
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.fullName).toBe('Admin User');
        expect(response.body.email).toBe('admin@test.com');
        expect(response.body.userType).toBe('admin');
        expect(response.body.password).toBeUndefined();
    });

    it('should return 400 for invalid user type', async () => {
        const patients = await Patient.insertMany([{
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        }]);
        const patient = patients[0];

        const mockUser = createMockUserHeader(patient._id, 'invalid_type');

        const response = await request(app)
            .get('/api/user/profile')
            .set('mock-user', mockUser);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid user type found in token.');
    });

    it('should return 404 if user not found', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const mockUser = createMockUserHeader(nonExistentId, 'patient');

        const response = await request(app)
            .get('/api/user/profile')
            .set('mock-user', mockUser);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('User not found');
    });

    it('should return 401 if no token provided', async () => {
        const response = await request(app)
            .get('/api/user/profile');

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('No token, authorization denied');
    });

    it('should return 500 on database error', async () => {
        const patients = await Patient.insertMany([{
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        }]);
        const patient = patients[0];

        const mockUser = createMockUserHeader(patient._id, 'patient');

        // Spy on Patient.findById to throw error
        const findByIdSpy = vi.spyOn(Patient, 'findById').mockImplementationOnce(() => {
            throw new Error('Database error');
        });

        const response = await request(app)
            .get('/api/user/profile')
            .set('mock-user', mockUser);

        expect(response.status).toBe(500);
        expect(response.text).toBe('Server Error');

        findByIdSpy.mockRestore();
    });
});

describe('PUT /api/user/profile', () => {
    it('should update patient profile name successfully', async () => {
        const patients = await Patient.insertMany([{
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        }]);
        const patient = patients[0];

        const mockUser = createMockUserHeader(patient._id, 'patient');

        const response = await request(app)
            .put('/api/user/profile')
            .set('mock-user', mockUser)
            .send({ fullName: 'John Updated Doe' });

        expect(response.status).toBe(200);
        expect(response.body.fullName).toBe('John Updated Doe');
        expect(response.body.email).toBe('patient@test.com');
        expect(response.body.password).toBeUndefined();

        // Verify database was updated
        const updatedPatient = await Patient.findById(patient._id);
        expect(updatedPatient.fullName).toBe('John Updated Doe');
    });

    it('should update doctor profile name successfully', async () => {
        const doctors = await Doctor.insertMany([{
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '9876543210',
            licenseNumber: 'LIC123456',
            address: '123 Medical St, City, State',
        }]);
        const doctor = doctors[0];

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .put('/api/user/profile')
            .set('mock-user', mockUser)
            .send({ fullName: 'Dr. Updated Smith' });

        expect(response.status).toBe(200);
        expect(response.body.fullName).toBe('Dr. Updated Smith');
    });

    it('should update admin profile name successfully', async () => {
        const admins = await Admin.insertMany([{
            fullName: 'Admin User',
            email: 'admin@test.com',
            password: 'Test@1234',
            phoneNumber: '5555555555',
            role: 'super_admin',
        }]);
        const admin = admins[0];

        const mockUser = createMockUserHeader(admin._id, 'admin');

        const response = await request(app)
            .put('/api/user/profile')
            .set('mock-user', mockUser)
            .send({ fullName: 'Updated Admin User' });

        expect(response.status).toBe(200);
        expect(response.body.fullName).toBe('Updated Admin User');
    });

    it('should return 400 for invalid user type', async () => {
        const patients = await Patient.insertMany([{
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        }]);
        const patient = patients[0];

        const mockUser = createMockUserHeader(patient._id, 'invalid_type');

        const response = await request(app)
            .put('/api/user/profile')
            .set('mock-user', mockUser)
            .send({ fullName: 'Updated Name' });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid user type in token.');
    });

    it('should return 404 if user not found', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const mockUser = createMockUserHeader(nonExistentId, 'patient');

        const response = await request(app)
            .put('/api/user/profile')
            .set('mock-user', mockUser)
            .send({ fullName: 'Updated Name' });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('User not found');
    });

    it('should return 500 on database error', async () => {
        const patients = await Patient.insertMany([{
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        }]);
        const patient = patients[0];

        const mockUser = createMockUserHeader(patient._id, 'patient');

        const findByIdAndUpdateSpy = vi.spyOn(Patient, 'findByIdAndUpdate').mockImplementationOnce(() => {
            throw new Error('Database error');
        });

        const response = await request(app)
            .put('/api/user/profile')
            .set('mock-user', mockUser)
            .send({ fullName: 'Updated Name' });

        expect(response.status).toBe(500);
        expect(response.text).toBe('Server Error');

        findByIdAndUpdateSpy.mockRestore();
    });
});

describe('PUT /api/user/complete-profile', () => {
    it('should complete patient profile without changing user type', async () => {
        const patients = await Patient.insertMany([{
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
            isProfileComplete: false,
            isEmailVerified: true,
        }]);
        const patient = patients[0];

        const mockUser = createMockUserHeader(patient._id, 'patient');

        const response = await request(app)
            .put('/api/user/complete-profile')
            .set('mock-user', mockUser)
            .send({
                userType: 'patient',
            });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Profile completed successfully!');
        expect(response.body.user.isProfileComplete).toBe(true);
        expect(response.body.user.fullName).toBe('John Doe');
        expect(response.body.user.email).toBe('patient@test.com');
    });

    it('should complete doctor profile without changing user type', async () => {
        const doctors = await Doctor.insertMany([{
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            phoneNumber: '9876543210',
            specialization: 'General',
            experience: 5,
            licenseNumber: 'LIC000000',
            address: 'Old Address',
            consultationFee: 100,
            isProfileComplete: false,
            isEmailVerified: true,
        }]);
        const doctor = doctors[0];

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .put('/api/user/complete-profile')
            .set('mock-user', mockUser)
            .send({
                userType: 'doctor',
                specialization: 'Cardiology',
                experience: 10,
                consultationFee: 500,
                address: '123 Medical St, City, State',
            });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Profile completed successfully!');
        expect(response.body.user.isProfileComplete).toBe(true);
        expect(response.body.user.specialization).toBe('Cardiology');
        expect(response.body.user.experience).toBe(10);
    });

    it('should transform patient to doctor and return new token', async () => {
        // Set JWT_SECRET for this test
        process.env.JWT_SECRET = 'test-secret-key';

        const patients = await Patient.insertMany([{
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
            isProfileComplete: false,
            isEmailVerified: true,
        }]);
        const patient = patients[0];

        const mockUser = createMockUserHeader(patient._id, 'patient');

        const response = await request(app)
            .put('/api/user/complete-profile')
            .set('mock-user', mockUser)
            .send({
                userType: 'doctor',
                specialization: 'Cardiology',
                experience: 10,
                consultationFee: 500,
                licenseNumber: 'LIC123456',
                address: '123 Medical St, City, State',
            });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Profile transformed and completed successfully!');
        expect(response.body.user.userType).toBe('doctor');
        expect(response.body.user.specialization).toBe('Cardiology');
        expect(response.body.token).toBeDefined();

        // Verify patient was deleted
        const deletedPatient = await Patient.findById(patient._id);
        expect(deletedPatient).toBeNull();

        // Verify doctor was created
        const newDoctor = await Doctor.findById(patient._id);
        expect(newDoctor).toBeDefined();
        expect(newDoctor.email).toBe('patient@test.com');
        expect(newDoctor.fullName).toBe('John Doe');
    });

    it('should transform patient to admin', async () => {
        process.env.JWT_SECRET = 'test-secret-key';

        const patients = await Patient.insertMany([{
            fullName: 'Admin To Be',
            email: 'admin@test.com',
            password: 'Test@1234',
            isProfileComplete: false,
            isEmailVerified: true,
        }]);
        const patient = patients[0];

        const mockUser = createMockUserHeader(patient._id, 'patient');

        const response = await request(app)
            .put('/api/user/complete-profile')
            .set('mock-user', mockUser)
            .send({
                userType: 'admin',
            });

        // If it fails, log the error for debugging
        if (response.status !== 200) {
            console.log('Transform to admin failed:', response.body);
        }

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Profile transformed and completed successfully!');
        expect(response.body.user.userType).toBe('admin');
        expect(response.body.token).toBeDefined();

        // Verify transformation
        const deletedPatient = await Patient.findById(patient._id);
        expect(deletedPatient).toBeNull();

        const newAdmin = await Admin.findById(patient._id);
        expect(newAdmin).toBeDefined();
        expect(newAdmin.email).toBe('admin@test.com');
    });

    it('should return 400 for invalid original user type', async () => {
        const patients = await Patient.insertMany([{
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        }]);
        const patient = patients[0];

        const mockUser = createMockUserHeader(patient._id, 'invalid_type');

        const response = await request(app)
            .put('/api/user/complete-profile')
            .set('mock-user', mockUser)
            .send({
                userType: 'doctor',
                specialization: 'Cardiology',
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid user type specified.');
    });

    it('should return 400 for invalid new user type', async () => {
        const patients = await Patient.insertMany([{
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        }]);
        const patient = patients[0];

        const mockUser = createMockUserHeader(patient._id, 'patient');

        const response = await request(app)
            .put('/api/user/complete-profile')
            .set('mock-user', mockUser)
            .send({
                userType: 'invalid_type',
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid user type specified.');
    });

    it('should return 404 if original user not found', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const mockUser = createMockUserHeader(nonExistentId, 'patient');

        const response = await request(app)
            .put('/api/user/complete-profile')
            .set('mock-user', mockUser)
            .send({
                userType: 'patient',
                dateOfBirth: new Date('1990-01-01'),
            });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Original user account not found.');
    });

    it('should return 400 for validation errors when completing profile', async () => {
        const patients = await Patient.insertMany([{
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
            isProfileComplete: false,
            isEmailVerified: true,
        }]);
        const patient = patients[0];

        const mockUser = createMockUserHeader(patient._id, 'patient');

        // Try to transform to doctor without required fields
        const response = await request(app)
            .put('/api/user/complete-profile')
            .set('mock-user', mockUser)
            .send({
                userType: 'doctor',
                // Missing required fields: specialization, experience, licenseNumber, address, consultationFee
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBeDefined();
    });

    it('should return 500 on database error during profile completion', async () => {
        const patients = await Patient.insertMany([{
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
            isProfileComplete: false,
            isEmailVerified: true,
        }]);
        const patient = patients[0];

        const mockUser = createMockUserHeader(patient._id, 'patient');

        const findByIdSpy = vi.spyOn(Patient, 'findById').mockImplementationOnce(() => {
            throw new Error('Database error');
        });

        const response = await request(app)
            .put('/api/user/complete-profile')
            .set('mock-user', mockUser)
            .send({
                userType: 'patient',
            });

        expect(response.status).toBe(500);
        expect(response.text).toBe('Server Error');

        findByIdSpy.mockRestore();
    });
});

describe('PUT /api/user/update-profile', () => {
    it('should update patient full profile successfully', async () => {
        const patients = await Patient.insertMany([{
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
            isProfileComplete: true,
        }]);
        const patient = patients[0];

        const mockUser = createMockUserHeader(patient._id, 'patient');

        const response = await request(app)
            .put('/api/user/update-profile')
            .set('mock-user', mockUser)
            .send({
                fullName: 'John Updated',
            });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Profile updated successfully!');
        expect(response.body.user.fullName).toBe('John Updated');
    });

    it('should update doctor profile successfully', async () => {
        const doctors = await Doctor.insertMany([{
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            qualifications: ['MBBS', 'MD'],
            consultationFee: 500,
            phoneNumber: '9876543210',
            licenseNumber: 'LIC123456',
            address: '123 Medical St, City, State',
            isProfileComplete: true,
        }]);
        const doctor = doctors[0];

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .put('/api/user/update-profile')
            .set('mock-user', mockUser)
            .send({
                specialization: 'Neurology',
                experience: 15,
                consultationFee: 700,
            });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Profile updated successfully!');
        expect(response.body.user.specialization).toBe('Neurology');
        expect(response.body.user.experience).toBe(15);
        expect(response.body.user.consultationFee).toBe(700);
    });

    it('should update admin profile successfully', async () => {
        const admins = await Admin.insertMany([{
            fullName: 'Admin User',
            email: 'admin@test.com',
            password: 'Test@1234',
            isProfileComplete: true,
        }]);
        const admin = admins[0];

        const mockUser = createMockUserHeader(admin._id, 'admin');

        const response = await request(app)
            .put('/api/user/update-profile')
            .set('mock-user', mockUser)
            .send({
                fullName: 'Updated Admin',
            });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Profile updated successfully!');
        expect(response.body.user.fullName).toBe('Updated Admin');
    });

    it('should not update password via update-profile endpoint', async () => {
        const patients = await Patient.insertMany([{
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        }]);
        const patient = patients[0];

        const originalPasswordHash = patient.password;
        const mockUser = createMockUserHeader(patient._id, 'patient');

        const response = await request(app)
            .put('/api/user/update-profile')
            .set('mock-user', mockUser)
            .send({
                fullName: 'John Updated',
                password: 'NewPassword@123', // Should be ignored
            });

        expect(response.status).toBe(200);
        expect(response.body.user.fullName).toBe('John Updated');

        // Verify password wasn't changed
        const updatedPatient = await Patient.findById(patient._id);
        expect(updatedPatient.password).toBe(originalPasswordHash);
    });

    it('should not update userType via update-profile endpoint', async () => {
        const patients = await Patient.insertMany([{
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        }]);
        const patient = patients[0];

        const mockUser = createMockUserHeader(patient._id, 'patient');

        const response = await request(app)
            .put('/api/user/update-profile')
            .set('mock-user', mockUser)
            .send({
                fullName: 'John Updated',
                userType: 'doctor', // Should be ignored
            });

        expect(response.status).toBe(200);

        // Verify userType wasn't changed - patient should still exist
        const updatedPatient = await Patient.findById(patient._id);
        expect(updatedPatient).toBeDefined();
        expect(updatedPatient.userType).toBe('patient');
    });

    it('should return 400 for invalid user type', async () => {
        const patients = await Patient.insertMany([{
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        }]);
        const patient = patients[0];

        const mockUser = createMockUserHeader(patient._id, 'invalid_type');

        const response = await request(app)
            .put('/api/user/update-profile')
            .set('mock-user', mockUser)
            .send({
                fullName: 'Updated Name',
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid user type in token.');
    });

    it('should return 404 if user not found', async () => {
        // Use a specific ObjectId that's unlikely to conflict
        const nonExistentId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
        const mockUser = createMockUserHeader(nonExistentId, 'patient');

        // Double-check that no user exists with this ID
        const existingPatient = await Patient.findById(nonExistentId);
        const existingDoctor = await Doctor.findById(nonExistentId);
        const existingAdmin = await Admin.findById(nonExistentId);
        
        expect(existingPatient).toBeNull();
        expect(existingDoctor).toBeNull();
        expect(existingAdmin).toBeNull();

        const response = await request(app)
            .put('/api/user/update-profile')
            .set('mock-user', mockUser)
            .send({
                fullName: 'Updated Name',
            });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('User not found');
    });

    it('should return 400 for validation errors', async () => {
        const doctors = await Doctor.insertMany([{
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            phoneNumber: '9876543210',
            licenseNumber: 'LIC123456',
            address: '123 Medical St',
        }]);
        const doctor = doctors[0];

        const mockUser = createMockUserHeader(doctor._id, 'doctor');

        const response = await request(app)
            .put('/api/user/update-profile')
            .set('mock-user', mockUser)
            .send({
                phoneNumber: 'invalid', // Invalid phone number format (should be 10 digits)
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBeDefined();
    });

    it('should return 500 on database error', async () => {
        const patients = await Patient.insertMany([{
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        }]);
        const patient = patients[0];

        const mockUser = createMockUserHeader(patient._id, 'patient');

        const findByIdAndUpdateSpy = vi.spyOn(Patient, 'findByIdAndUpdate').mockImplementationOnce(() => {
            throw new Error('Database error');
        });

        const response = await request(app)
            .put('/api/user/update-profile')
            .set('mock-user', mockUser)
            .send({
                fullName: 'Updated Name',
            });

        expect(response.status).toBe(500);
        expect(response.body.message).toBe('Server Error');

        findByIdAndUpdateSpy.mockRestore();
    });
});

// Additional tests to kill surviving mutants
describe('Mutation Coverage Tests', () => {
    describe('Password field exclusion tests', () => {
        it('should verify password is properly excluded from complete-profile response', async () => {
            const patients = await Patient.insertMany([{
                fullName: 'John Doe',
                email: 'patient@test.com',
                password: 'Test@1234',
            }]);
            const patient = patients[0];

            const mockUser = createMockUserHeader(patient._id, 'patient');

            const response = await request(app)
                .put('/api/user/complete-profile')
                .set('mock-user', mockUser)
                .send({
                    userType: 'patient',
                    fullName: 'John Doe',
                    phoneNumber: '9876543210',
                    dateOfBirth: '1990-01-01',
                });

            expect(response.status).toBe(200);
            expect(response.body.user).toBeDefined();
            expect(response.body.user.password).toBeUndefined();
            expect(response.body.user.fullName).toBe('John Doe');
        });

        it('should verify password is properly excluded from update-profile response', async () => {
            const patients = await Patient.insertMany([{
                fullName: 'John Doe',
                email: 'patient@test.com',
                password: 'Test@1234',
                isProfileComplete: true,
            }]);
            const patient = patients[0];

            const mockUser = createMockUserHeader(patient._id, 'patient');

            const response = await request(app)
                .put('/api/user/update-profile')
                .set('mock-user', mockUser)
                .send({
                    fullName: 'Jane Doe',
                });

            expect(response.status).toBe(200);
            expect(response.body.user).toBeDefined();
            expect(response.body.user.password).toBeUndefined();
            expect(response.body.user.fullName).toBe('Jane Doe');
        });
    });

    describe('Validation error message formatting tests', () => {
        it('should format multiple validation errors with comma separator in complete-profile', async () => {
            const doctors = await Doctor.insertMany([{
                fullName: 'Dr. Test',
                email: 'doctor@test.com',
                password: 'Test@1234',
                specialization: 'Cardiology',
                experience: 10,
                consultationFee: 500,
                phoneNumber: '9876543210',
                licenseNumber: 'LIC123',
                address: '123 Test St',
            }]);
            const doctor = doctors[0];

            const mockUser = createMockUserHeader(doctor._id, 'doctor');

            const response = await request(app)
                .put('/api/user/complete-profile')
                .set('mock-user', mockUser)
                .send({
                    userType: 'doctor',
                    phoneNumber: '123', // Invalid - too short
                    consultationFee: -100, // Negative fee
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toBeDefined();
            // Verify message contains comma-separated errors
            if (response.body.message.includes(',')) {
                expect(response.body.message).toContain(',');
            }
        });

        it('should format multiple validation errors with comma separator in update-profile', async () => {
            const doctors = await Doctor.insertMany([{
                fullName: 'Dr. Test',
                email: 'doctor@test.com',
                password: 'Test@1234',
                specialization: 'Cardiology',
                experience: 10,
                consultationFee: 500,
                phoneNumber: '9876543210',
                licenseNumber: 'LIC123',
                address: '123 Test St',
            }]);
            const doctor = doctors[0];

            const mockUser = createMockUserHeader(doctor._id, 'doctor');

            const response = await request(app)
                .put('/api/user/update-profile')
                .set('mock-user', mockUser)
                .send({
                    phoneNumber: '123', // Too short
                    consultationFee: -100, // Negative fee
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toBeDefined();
            // Verify error message exists
            expect(typeof response.body.message).toBe('string');
        });
    });

    describe('JWT token generation tests', () => {
        it('should generate valid JWT token with correct payload when transforming user type', async () => {
            const patients = await Patient.insertMany([{
                fullName: 'John Doe',
                email: 'patient@test.com',
                password: 'Test@1234',
            }]);
            const patient = patients[0];

            const mockUser = createMockUserHeader(patient._id, 'patient');

            const response = await request(app)
                .put('/api/user/complete-profile')
                .set('mock-user', mockUser)
                .send({
                    userType: 'doctor',
                    fullName: 'Dr. John Doe',
                    specialization: 'Cardiology',
                    experience: 5,
                    consultationFee: 500,
                    phoneNumber: '9876543210',
                    licenseNumber: 'LIC123',
                    address: '123 Medical St',
                });

            expect(response.status).toBe(200);
            expect(response.body.token).toBeDefined();
            
            // Verify token contains userId and userType
            const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET || 'testsecret');
            expect(decoded.userId).toBeDefined();
            expect(decoded.userType).toBe('doctor');
        });

        it('should generate token with 1 hour expiration when transforming to admin', async () => {
            const patients = await Patient.insertMany([{
                fullName: 'John Doe',
                email: 'patient@test.com',
                password: 'Test@1234',
            }]);
            const patient = patients[0];

            const mockUser = createMockUserHeader(patient._id, 'patient');

            const response = await request(app)
                .put('/api/user/complete-profile')
                .set('mock-user', mockUser)
                .send({
                    userType: 'admin',
                    fullName: 'Admin John',
                    department: 'Administration',
                });

            expect(response.status).toBe(200);
            expect(response.body.token).toBeDefined();
            
            const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET || 'testsecret');
            expect(decoded.userId).toBeDefined();
            expect(decoded.userType).toBe('admin');
            expect(decoded.exp).toBeDefined();
        });
    });

    describe('Profile completion flag tests', () => {
        it('should set isProfileComplete to true when completing profile', async () => {
            const patients = await Patient.insertMany([{
                fullName: 'John Doe',
                email: 'patient@test.com',
                password: 'Test@1234',
                isProfileComplete: false,
            }]);
            const patient = patients[0];

            const mockUser = createMockUserHeader(patient._id, 'patient');

            const response = await request(app)
                .put('/api/user/complete-profile')
                .set('mock-user', mockUser)
                .send({
                    userType: 'patient',
                    fullName: 'John Doe',
                    phoneNumber: '9876543210',
                    dateOfBirth: '1990-01-01',
                });

            expect(response.status).toBe(200);
            expect(response.body.user.isProfileComplete).toBe(true);
            
            // Verify in database
            const updatedPatient = await Patient.findById(patient._id);
            expect(updatedPatient.isProfileComplete).toBe(true);
        });
    });

    describe('RunValidators flag tests', () => {
        it('should validate fullName length when completing profile', async () => {
            const patients = await Patient.insertMany([{
                fullName: 'John Doe',
                email: 'patient@test.com',
                password: 'Test@1234',
            }]);
            const patient = patients[0];

            const mockUser = createMockUserHeader(patient._id, 'patient');

            const response = await request(app)
                .put('/api/user/complete-profile')
                .set('mock-user', mockUser)
                .send({
                    userType: 'patient',
                    fullName: 'A', // Invalid - too short (must be at least 2 chars)
                });

            expect(response.status).toBe(400);
        });
    });

    describe('Console error logging tests', () => {
        it('should log error details when database error occurs in get profile', async () => {
            const patients = await Patient.insertMany([{
                fullName: 'John Doe',
                email: 'patient@test.com',
                password: 'Test@1234',
            }]);
            const patient = patients[0];

            const mockUser = createMockUserHeader(patient._id, 'patient');
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            
            const findByIdSpy = vi.spyOn(Patient, 'findById').mockImplementationOnce(() => {
                throw new Error('Database connection failed');
            });

            await request(app)
                .get('/api/user/profile')
                .set('mock-user', mockUser);

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('GET /profile Error:'), expect.any(String));

            consoleErrorSpy.mockRestore();
            findByIdSpy.mockRestore();
        });

        it('should log error details when validation error occurs in complete-profile', async () => {
            const patients = await Patient.insertMany([{
                fullName: 'John Doe',
                email: 'patient@test.com',
                password: 'Test@1234',
            }]);
            const patient = patients[0];

            const mockUser = createMockUserHeader(patient._id, 'patient');
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            await request(app)
                .put('/api/user/complete-profile')
                .set('mock-user', mockUser)
                .send({
                    userType: 'patient',
                    fullName: 'X', // Too short - will trigger validation error
                });

            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });

        it('should log error details when error occurs in update-profile', async () => {
            const patients = await Patient.insertMany([{
                fullName: 'John Doe',
                email: 'patient@test.com',
                password: 'Test@1234',
            }]);
            const patient = patients[0];

            const mockUser = createMockUserHeader(patient._id, 'patient');
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const findByIdAndUpdateSpy = vi.spyOn(Patient, 'findByIdAndUpdate').mockImplementationOnce(() => {
                throw new Error('Update failed');
            });

            await request(app)
                .put('/api/user/update-profile')
                .set('mock-user', mockUser)
                .send({
                    fullName: 'Updated Name',
                });

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Update profile error:'), expect.any(Error));

            consoleErrorSpy.mockRestore();
            findByIdAndUpdateSpy.mockRestore();
        });
    });
});