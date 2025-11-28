import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Mock email utils before importing routes
const mockSendEmail = vi.fn().mockResolvedValue(true);

// Mock middlewares using Module.prototype.require override
const mockAuth = (req, res, next) => {
    if (req.headers['mock-user']) {
        req.user = JSON.parse(req.headers['mock-user']);
        next();
    } else {
        res.status(401).json({ message: 'No token, authorization denied' });
    }
};

const mockAdmin = (req, res, next) => {
    if (req.user && req.user.userType === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admin only.' });
    }
};

// Override require for middlewares and email utils
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
    if (id === '../middleware/auth') {
        return mockAuth;
    }
    if (id === '../middleware/admin') {
        return mockAdmin;
    }
    if (id === '../utils/email_utils') {
        return mockSendEmail;
    }
    return originalRequire.apply(this, arguments);
};

// Import routes and models
const adminRoutes = require('../routes/admin'); 
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

let mongoServer;
const mockAdminUser = JSON.stringify({ userId: 'admin123', userType: 'admin' });

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
}, 120000); 

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
});

describe('Admin Routes (Vitest)', () => {

    // --- 1. GET /api/admin/users ---
    describe('GET /api/admin/users', () => {
        it('should return all doctors and patients', async () => {
            // Use insertMany to potentially bypass pre-save hooks causing issues
            await Doctor.insertMany([{ 
                fullName: 'Dr. Who', 
                email: 'who@test.com', 
                password: 'Secret@123',
                specialization: 'Cardiology',
                experience: 10,
                licenseNumber: 'LIC001',
                address: '123 Main St',
                consultationFee: 500
            }]);
            await Patient.insertMany([{ 
                fullName: 'Patient Zero', 
                email: 'zero@test.com', 
                password: 'Secret@123' 
            }]);

            const res = await request(app)
                .get('/api/admin/users')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.doctors.length).toBe(1);
            expect(res.body.patients.length).toBe(1);
            expect(res.body.doctors[0].fullName).toBe('Dr. Who');
        });

        it('should filter doctors by name', async () => {
            await Doctor.insertMany([
                { 
                    fullName: 'Dr. Strange', 
                    email: 's@test.com', 
                    password: 'Secret@123',
                    specialization: 'Neurology',
                    experience: 15,
                    licenseNumber: 'LIC002',
                    address: '456 Elm St',
                    consultationFee: 600
                },
                { 
                    fullName: 'Dr. House', 
                    email: 'h@test.com', 
                    password: 'Secret@456',
                    specialization: 'Diagnostic',
                    experience: 20,
                    licenseNumber: 'LIC003',
                    address: '789 Oak St',
                    consultationFee: 700
                }
            ]);

            const res = await request(app)
                .get('/api/admin/users?name=Dr. S')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.doctors.length).toBe(1);
            expect(res.body.doctors[0].fullName).toBe('Dr. Strange');
        });

        it('should filter patients by email', async () => {
            await Patient.insertMany([
                { 
                    fullName: 'Patient A', 
                    email: 'match@test.com', 
                    password: 'Secret@123' 
                },
                { 
                    fullName: 'Patient B', 
                    email: 'other@test.com', 
                    password: 'Secret@456' 
                }
            ]);

            const res = await request(app)
                .get('/api/admin/users?patientEmail=match')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.patients.length).toBe(1);
            expect(res.body.patients[0].email).toBe('match@test.com');
        });

        it('should filter doctors by email', async () => {
            await Doctor.insertMany([{ 
                fullName: 'Dr. Email', 
                email: 'specific@test.com', 
                password: 'Secret@123',
                specialization: 'Cardiology',
                experience: 5,
                licenseNumber: 'LIC004',
                address: '111 Maple St',
                consultationFee: 400
            }]);

            const res = await request(app)
                .get('/api/admin/users?email=specific')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.doctors.length).toBe(1);
            expect(res.body.doctors[0].email).toBe('specific@test.com');
        });

        it('should filter doctors by license number', async () => {
            await Doctor.insertMany([{ 
                fullName: 'Dr. License', 
                email: 'lic@test.com', 
                password: 'Secret@123',
                specialization: 'Cardiology',
                experience: 5,
                licenseNumber: 'LIC999',
                address: '222 Cedar St',
                consultationFee: 450
            }]);

            const res = await request(app)
                .get('/api/admin/users?license=LIC999')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.doctors.length).toBe(1);
            expect(res.body.doctors[0].licenseNumber).toBe('LIC999');
        });

        it('should filter doctors by specialization', async () => {
            await Doctor.insertMany([
                { 
                    fullName: 'Dr. Cardio', 
                    email: 'cardio@test.com', 
                    password: 'Secret@123',
                    specialization: 'Cardiology',
                    experience: 10,
                    licenseNumber: 'LIC005',
                    address: '333 Birch St',
                    consultationFee: 550
                },
                { 
                    fullName: 'Dr. Neuro', 
                    email: 'neuro@test.com', 
                    password: 'Secret@456',
                    specialization: 'Neurology',
                    experience: 12,
                    licenseNumber: 'LIC006',
                    address: '444 Pine St',
                    consultationFee: 600
                }
            ]);

            const res = await request(app)
                .get('/api/admin/users?specialization=Cardiology')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.doctors.length).toBe(1);
            expect(res.body.doctors[0].specialization).toBe('Cardiology');
        });

        it('should not filter when specialization is "all"', async () => {
            await Doctor.insertMany([
                { 
                    fullName: 'Dr. One', 
                    email: 'one@test.com', 
                    password: 'Secret@123',
                    specialization: 'Cardiology',
                    experience: 5,
                    licenseNumber: 'LIC007',
                    address: '555 Ash St',
                    consultationFee: 400
                },
                { 
                    fullName: 'Dr. Two', 
                    email: 'two@test.com', 
                    password: 'Secret@456',
                    specialization: 'Neurology',
                    experience: 7,
                    licenseNumber: 'LIC008',
                    address: '666 Elm St',
                    consultationFee: 500
                }
            ]);

            const res = await request(app)
                .get('/api/admin/users?specialization=all')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.doctors.length).toBe(2);
        });

        it('should filter doctors by verification status', async () => {
            await Doctor.insertMany([
                { 
                    fullName: 'Dr. Verified', 
                    email: 'verified@test.com', 
                    password: 'Secret@123',
                    specialization: 'Cardiology',
                    experience: 5,
                    licenseNumber: 'LIC009',
                    address: '777 Oak St',
                    consultationFee: 400,
                    isVerified: true
                },
                { 
                    fullName: 'Dr. NotVerified', 
                    email: 'notverified@test.com', 
                    password: 'Secret@456',
                    specialization: 'Neurology',
                    experience: 7,
                    licenseNumber: 'LIC010',
                    address: '888 Main St',
                    consultationFee: 500,
                    isVerified: false
                }
            ]);

            const res = await request(app)
                .get('/api/admin/users?status=verified')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.doctors.length).toBe(1);
            expect(res.body.doctors[0].isVerified).toBe(true);
        });

        it('should not filter when status is "all"', async () => {
            await Doctor.insertMany([
                { 
                    fullName: 'Dr. A', 
                    email: 'a@test.com', 
                    password: 'Secret@123',
                    specialization: 'Cardiology',
                    experience: 5,
                    licenseNumber: 'LIC011',
                    address: '999 Cedar St',
                    consultationFee: 400,
                    isVerified: true
                },
                { 
                    fullName: 'Dr. B', 
                    email: 'b@test.com', 
                    password: 'Secret@456',
                    specialization: 'Neurology',
                    experience: 7,
                    licenseNumber: 'LIC012',
                    address: '1010 Birch St',
                    consultationFee: 500,
                    isVerified: false
                }
            ]);

            const res = await request(app)
                .get('/api/admin/users?status=all')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.doctors.length).toBe(2);
        });

        it('should filter patients by name', async () => {
            await Patient.insertMany([
                { 
                    fullName: 'John Doe', 
                    email: 'john@test.com', 
                    password: 'Secret@123' 
                },
                { 
                    fullName: 'Jane Smith', 
                    email: 'jane@test.com', 
                    password: 'Secret@456' 
                }
            ]);

            const res = await request(app)
                .get('/api/admin/users?patientName=John')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.patients.length).toBe(1);
            expect(res.body.patients[0].fullName).toBe('John Doe');
        });

        it('should filter patients by date range', async () => {
            const oldDate = new Date('2020-01-01');
            const recentDate = new Date('2024-01-01');

            // InsertMany might bypass timestamp generation if schema has timestamps: true
            // but we can force createdAt if we provide it.
            await Patient.insertMany([
                { 
                    fullName: 'Old Patient', 
                    email: 'old@test.com', 
                    password: 'Secret@123',
                    createdAt: oldDate
                },
                { 
                    fullName: 'Recent Patient', 
                    email: 'recent@test.com', 
                    password: 'Secret@456',
                    createdAt: recentDate
                }
            ]);

            const res = await request(app)
                .get('/api/admin/users?patientDateFrom=2023-01-01&patientDateTo=2024-12-31')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.patients.length).toBe(1);
            expect(res.body.patients[0].fullName).toBe('Recent Patient');
        });

        it('should handle server errors', async () => {
            vi.spyOn(Doctor, 'find').mockImplementationOnce(() => {
                throw new Error('Database error');
            });

            const res = await request(app)
                .get('/api/admin/users')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(500);
            expect(res.text).toBe('Server Error');
        });
    });

    // --- 2. GET /api/admin/appointments ---
    describe('GET /api/admin/appointments', () => {
        it('should return all appointments with populated fields', async () => {
            // Use insertMany
            const doctors = await Doctor.insertMany([{
                fullName: 'Dr. Test',
                email: 'doc@test.com',
                password: 'Secret@123',
                specialization: 'Cardiology',
                experience: 10,
                licenseNumber: 'LIC013',
                address: '123 Test St',
                consultationFee: 500
            }]);
            const doctor = doctors[0];

            const patients = await Patient.insertMany([{
                fullName: 'Patient Test',
                email: 'patient@test.com',
                password: 'Secret@123'
            }]);
            const patient = patients[0];

            await Appointment.insertMany([{
                patient: patient._id,
                doctor: doctor._id,
                date: new Date(),
                time: '10:00 AM',
                consultationFeeAtBooking: 500,
                status: 'upcoming',
                patientNameForVisit: 'Patient Test'
            }]);

            const res = await request(app)
                .get('/api/admin/appointments')
                .set('mock-user', mockAdminUser);

            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBe(1);
            expect(res.body[0].patient).toBeDefined();
            expect(res.body[0].doctor).toBeDefined();
        });

        it('should handle server errors', async () => {
            vi.spyOn(Appointment, 'find').mockImplementationOnce(() => ({
                populate: vi.fn().mockImplementationOnce(() => ({
                    populate: vi.fn().mockImplementationOnce(() => ({
                        sort: vi.fn().mockImplementationOnce(() => {
                            throw new Error('Database error');
                        })
                    }))
                }))
            }));

            const res = await request(app)
                .get('/api/admin/appointments')
                .set('mock-user', mockAdminUser);

            expect(res.statusCode).toBe(500);
            expect(res.text).toBe('Server Error');
        });
    });

    // --- 3. PUT /api/admin/verify-doctor/:id ---
    describe('PUT /api/admin/verify-doctor/:id', () => {
        it('should verify a doctor and send email', async () => {
            const docs = await Doctor.insertMany([{ 
                fullName: 'Dr. Pending', 
                email: 'pending@test.com', 
                password: 'Secret@123',
                specialization: 'Cardiology',
                experience: 8,
                licenseNumber: 'LIC014',
                address: '456 Pending St',
                consultationFee: 450,
                isVerified: false 
            }]);
            const doctor = docs[0];

            const res = await request(app)
                .put(`/api/admin/verify-doctor/${doctor._id}`)
                .set('mock-user', mockAdminUser);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Doctor verified successfully');
            
            // Check DB update
            const updatedDoc = await Doctor.findById(doctor._id);
            expect(updatedDoc.isVerified).toBe(true);

            // Check Email
            expect(mockSendEmail).toHaveBeenCalledTimes(1);
            expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
                email: 'pending@test.com',
                subject: expect.stringContaining('Verification Complete')
            }));
        });

        it('should verify doctor even if email fails', async () => {
            mockSendEmail.mockRejectedValueOnce(new Error('Email service down'));

            const docs = await Doctor.insertMany([{ 
                fullName: 'Dr. EmailFail', 
                email: 'emailfail@test.com', 
                password: 'Secret@123',
                specialization: 'Cardiology',
                experience: 8,
                licenseNumber: 'LIC_EMAIL1',
                address: '456 Email St',
                consultationFee: 450,
                isVerified: false 
            }]);
            const doctor = docs[0];

            const res = await request(app)
                .put(`/api/admin/verify-doctor/${doctor._id}`)
                .set('mock-user', mockAdminUser);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Doctor verified successfully');
            
            // Check DB update still happened
            const updatedDoc = await Doctor.findById(doctor._id);
            expect(updatedDoc.isVerified).toBe(true);
        });

        it('should return 404 if doctor not found', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .put(`/api/admin/verify-doctor/${fakeId}`)
                .set('mock-user', mockAdminUser);
            expect(res.statusCode).toBe(404);
        });

        it('should handle server errors', async () => {
            vi.spyOn(Doctor, 'findById').mockImplementationOnce(() => {
                throw new Error('Database error');
            });

            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .put(`/api/admin/verify-doctor/${fakeId}`)
                .set('mock-user', mockAdminUser);

            expect(res.statusCode).toBe(500);
            expect(res.text).toBe('Server Error');
        });
    });

    // --- 4. PUT /api/admin/suspend-doctor/:id ---
    describe('PUT /api/admin/suspend-doctor/:id', () => {
        it('should suspend a doctor, cancel appointments, and send email', async () => {
            const docs = await Doctor.insertMany([{ 
                fullName: 'Dr. Active', 
                email: 'active@test.com', 
                password: 'Secret@123',
                specialization: 'Neurology',
                experience: 12,
                licenseNumber: 'LIC015',
                address: '789 Active St',
                consultationFee: 600,
                isVerified: true 
            }]);
            const doctor = docs[0];

            const pats = await Patient.insertMany([{
                fullName: 'Test Patient',
                email: 'testpatient@test.com',
                password: 'Secret@123'
            }]);
            const patient = pats[0];

            // Create an upcoming appointment
            await Appointment.insertMany([{
                doctor: doctor._id,
                patient: patient._id,
                status: 'upcoming',
                date: new Date(),
                time: '10:00 AM',
                consultationFeeAtBooking: 600,
                patientNameForVisit: 'Test Patient'
            }]);

            const res = await request(app)
                .put(`/api/admin/suspend-doctor/${doctor._id}`)
                .set('mock-user', mockAdminUser);

            expect(res.statusCode).toBe(200);
            
            // Check DB update (suspended)
            const updatedDoc = await Doctor.findById(doctor._id);
            expect(updatedDoc.isVerified).toBe(false);

            // Check Appointment Cancellation
            const cancelledApt = await Appointment.findOne({ doctor: doctor._id });
            expect(cancelledApt.status).toBe('cancelled');

            // Check Email
            expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
                email: 'active@test.com',
                subject: expect.stringContaining('Account Suspended')
            }));
        });

        it('should suspend doctor even if email fails', async () => {
            mockSendEmail.mockRejectedValueOnce(new Error('Email service down'));

            const docs = await Doctor.insertMany([{ 
                fullName: 'Dr. SuspendEmailFail', 
                email: 'suspendfail@test.com', 
                password: 'Secret@123',
                specialization: 'Neurology',
                experience: 12,
                licenseNumber: 'LIC_EMAIL2',
                address: '789 Suspend St',
                consultationFee: 600,
                isVerified: true 
            }]);
            const doctor = docs[0];

            const res = await request(app)
                .put(`/api/admin/suspend-doctor/${doctor._id}`)
                .set('mock-user', mockAdminUser);

            expect(res.statusCode).toBe(200);
            
            // Check DB update still happened
            const updatedDoc = await Doctor.findById(doctor._id);
            expect(updatedDoc.isVerified).toBe(false);
        });

        it('should return 404 if doctor not found', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .put(`/api/admin/suspend-doctor/${fakeId}`)
                .set('mock-user', mockAdminUser);
            expect(res.statusCode).toBe(404);
        });

        it('should handle server errors', async () => {
            vi.spyOn(Doctor, 'findById').mockImplementationOnce(() => {
                throw new Error('Database error');
            });

            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .put(`/api/admin/suspend-doctor/${fakeId}`)
                .set('mock-user', mockAdminUser);

            expect(res.statusCode).toBe(500);
            expect(res.text).toBe('Server Error');
        });
    });

    // --- 5. DELETE /api/admin/reject-doctor/:id ---
    describe('DELETE /api/admin/reject-doctor/:id', () => {
        it('should delete doctor and send rejection email', async () => {
            const docs = await Doctor.insertMany([{ 
                fullName: 'Dr. Reject', 
                email: 'reject@test.com', 
                password: 'Secret@123',
                specialization: 'Dermatology',
                experience: 5,
                licenseNumber: 'LIC016',
                address: '321 Reject St',
                consultationFee: 350
            }]);
            const doctor = docs[0];

            const res = await request(app)
                .delete(`/api/admin/reject-doctor/${doctor._id}`)
                .set('mock-user', mockAdminUser);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Doctor rejected and removed successfully');

            // Check DB (should be gone)
            const deletedDoc = await Doctor.findById(doctor._id);
            expect(deletedDoc).toBeNull();

            // Check Email
            expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
                subject: expect.stringContaining('Application Status')
            }));
        });

        it('should delete doctor even if email fails', async () => {
            mockSendEmail.mockRejectedValueOnce(new Error('Email service down'));

            const docs = await Doctor.insertMany([{ 
                fullName: 'Dr. RejectEmailFail', 
                email: 'rejectfail@test.com', 
                password: 'Secret@123',
                specialization: 'Dermatology',
                experience: 5,
                licenseNumber: 'LIC_EMAIL3',
                address: '321 Reject St',
                consultationFee: 350
            }]);
            const doctor = docs[0];

            const res = await request(app)
                .delete(`/api/admin/reject-doctor/${doctor._id}`)
                .set('mock-user', mockAdminUser);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Doctor rejected and removed successfully');

            // Check DB (should be gone)
            const deletedDoc = await Doctor.findById(doctor._id);
            expect(deletedDoc).toBeNull();
        });

        it('should return 404 if doctor not found', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .delete(`/api/admin/reject-doctor/${fakeId}`)
                .set('mock-user', mockAdminUser);
            expect(res.statusCode).toBe(404);
        });

        it('should handle server errors', async () => {
            vi.spyOn(Doctor, 'findById').mockImplementationOnce(() => {
                throw new Error('Database error');
            });

            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .delete(`/api/admin/reject-doctor/${fakeId}`)
                .set('mock-user', mockAdminUser);

            expect(res.statusCode).toBe(500);
            expect(res.text).toBe('Server Error');
        });
    });

    // --- 6. PUT /api/admin/verify-patient/:id ---
    describe('PUT /api/admin/verify-patient/:id', () => {
        it('should reactivate a patient and send email', async () => {
            const patient = await Patient.create({ 
                fullName: 'Patient Suspended', 
                email: 'p_sus@test.com', 
                password: 'Secret@123', 
                isVerified: false 
            });

            const res = await request(app)
                .put(`/api/admin/verify-patient/${patient._id}`)
                .set('mock-user', mockAdminUser);

            expect(res.statusCode).toBe(200);
            
            // Check DB
            const updatedPat = await Patient.findById(patient._id);
            expect(updatedPat.isVerified).toBe(true);

            // Check Email
            expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
                subject: expect.stringContaining('Account Reactivated')
            }));
        });

        it('should verify patient even if email fails', async () => {
            mockSendEmail.mockRejectedValueOnce(new Error('Email service down'));

            const patient = await Patient.create({ 
                fullName: 'Patient EmailFail', 
                email: 'patient_emailfail@test.com', 
                password: 'Secret@123', 
                isVerified: false 
            });

            const res = await request(app)
                .put(`/api/admin/verify-patient/${patient._id}`)
                .set('mock-user', mockAdminUser);

            expect(res.statusCode).toBe(200);
            
            // Check DB update still happened
            const updatedPat = await Patient.findById(patient._id);
            expect(updatedPat.isVerified).toBe(true);
        });

        it('should return 404 if patient not found', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .put(`/api/admin/verify-patient/${fakeId}`)
                .set('mock-user', mockAdminUser);
            expect(res.statusCode).toBe(404);
        });

        it('should handle server errors', async () => {
            vi.spyOn(Patient, 'findById').mockImplementationOnce(() => {
                throw new Error('Database error');
            });

            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .put(`/api/admin/verify-patient/${fakeId}`)
                .set('mock-user', mockAdminUser);

            expect(res.statusCode).toBe(500);
            expect(res.text).toBe('Server Error');
        });
    });

    // --- 7. PUT /api/admin/suspend-patient/:id ---
    describe('PUT /api/admin/suspend-patient/:id', () => {
        it('should suspend a patient and cancel appointments', async () => {
            const patient = await Patient.create({ 
                fullName: 'Patient Active', 
                email: 'p_act@test.com', 
                password: 'Secret@123', 
                isVerified: true 
            });

            const doctor = await Doctor.create({
                fullName: 'Dr. Test',
                email: 'drtest@test.com',
                password: 'Secret@123',
                specialization: 'Cardiology',
                experience: 10,
                licenseNumber: 'LIC017',
                address: '111 Test St',
                consultationFee: 500
            });

            await Appointment.create({
                patient: patient._id,
                doctor: doctor._id,
                status: 'upcoming',
                date: new Date(),
                time: '11:00 AM',
                consultationFeeAtBooking: 500,
                patientNameForVisit: 'Patient Active'
            });

            const res = await request(app)
                .put(`/api/admin/suspend-patient/${patient._id}`)
                .set('mock-user', mockAdminUser);

            expect(res.statusCode).toBe(200);
            
            // Check DB
            const updatedPat = await Patient.findById(patient._id);
            expect(updatedPat.isVerified).toBe(false);

            // Check Appointment Cancellation
            const cancelledApt = await Appointment.findOne({ patient: patient._id });
            expect(cancelledApt.status).toBe('cancelled');
        });

        it('should suspend patient even if email fails', async () => {
            mockSendEmail.mockRejectedValueOnce(new Error('Email service down'));

            const patient = await Patient.create({ 
                fullName: 'Patient EmailSuspendFail', 
                email: 'p_emailsuspendfail@test.com', 
                password: 'Secret@123', 
                isVerified: true 
            });

            const res = await request(app)
                .put(`/api/admin/suspend-patient/${patient._id}`)
                .set('mock-user', mockAdminUser);

            expect(res.statusCode).toBe(200);
            
            // Check DB update still happened
            const updatedPat = await Patient.findById(patient._id);
            expect(updatedPat.isVerified).toBe(false);
        });

        it('should return 404 if patient not found', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .put(`/api/admin/suspend-patient/${fakeId}`)
                .set('mock-user', mockAdminUser);
            expect(res.statusCode).toBe(404);
        });

        it('should handle server errors', async () => {
            vi.spyOn(Patient, 'findById').mockImplementationOnce(() => {
                throw new Error('Database error');
            });

            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .put(`/api/admin/suspend-patient/${fakeId}`)
                .set('mock-user', mockAdminUser);

            expect(res.statusCode).toBe(500);
            expect(res.text).toBe('Server Error');
        });
    });

    // --- 8. GET /api/admin/user/:id ---
    describe('GET /api/admin/user/:id', () => {
        it('should return a doctor details by ID', async () => {
            const docs = await Doctor.insertMany([{ 
                fullName: 'Dr. Details', 
                email: 'd@test.com', 
                password: 'Secret@123',
                specialization: 'Cardiology',
                experience: 10,
                licenseNumber: 'LIC018',
                address: '222 Details St',
                consultationFee: 500
            }]);
            const doctor = docs[0];

            const res = await request(app)
                .get(`/api/admin/user/${doctor._id}`)
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.fullName).toBe('Dr. Details');
        });

        it('should return a patient details by ID', async () => {
            const pats = await Patient.insertMany([{ 
                fullName: 'Patient Details', 
                email: 'p@test.com', 
                password: 'Secret@123' 
            }]);
            const patient = pats[0];

            const res = await request(app)
                .get(`/api/admin/user/${patient._id}`)
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.fullName).toBe('Patient Details');
        });

        it('should return 404 if user not found in either collection', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .get(`/api/admin/user/${fakeId}`)
                .set('mock-user', mockAdminUser);
            expect(res.statusCode).toBe(404);
        });

        it('should handle server errors', async () => {
            vi.spyOn(Doctor, 'findById').mockImplementationOnce(() => {
                throw new Error('Database error');
            });

            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .get(`/api/admin/user/${fakeId}`)
                .set('mock-user', mockAdminUser);

            expect(res.statusCode).toBe(500);
            expect(res.body.message).toBe('Server error while fetching user details');
        });
    });

});

// === MUTATION COVERAGE TESTS FOR admin.js ===
describe('Mutation Coverage Tests for admin.js', () => {

    describe('Regex search pattern mutations', () => {
        it('should search doctors by name with exact regex prefix (not empty string)', async () => {
            await Doctor.insertMany([
                { fullName: 'Dr. Smith', email: 'smith@test.com', password: 'Secret@123',
                  specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_S1',
                  address: '123 St', consultationFee: 500 },
                { fullName: 'Another Dr. Smith', email: 'another@test.com', password: 'Secret@123',
                  specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_S2',
                  address: '456 St', consultationFee: 500 }
            ]);

            const res = await request(app)
                .get('/api/admin/users?name=Dr. S')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            // Should only match names starting with "Dr. S", not those containing it
            expect(res.body.doctors.length).toBe(1);
            expect(res.body.doctors[0].fullName).toBe('Dr. Smith');
        });

        it('should verify regex options for name search are case-insensitive', async () => {
            await Doctor.insertMany([
                { fullName: 'dr. jones', email: 'jones@test.com', password: 'Secret@123',
                  specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_J1',
                  address: '789 St', consultationFee: 500 }
            ]);

            const res = await request(app)
                .get('/api/admin/users?name=DR. J')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.doctors.length).toBe(1);
            expect(res.body.doctors[0].fullName).toBe('dr. jones');
        });

        it('should search doctors by email with exact regex prefix', async () => {
            await Doctor.insertMany([
                { fullName: 'Dr. Email1', email: 'test123@example.com', password: 'Secret@123',
                  specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_E1',
                  address: '321 St', consultationFee: 500 },
                { fullName: 'Dr. Email2', email: 'other@example.com', password: 'Secret@123',
                  specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_E2',
                  address: '654 St', consultationFee: 500 }
            ]);

            const res = await request(app)
                .get('/api/admin/users?email=test')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.doctors.length).toBe(1);
            expect(res.body.doctors[0].email).toBe('test123@example.com');
        });

        it('should verify regex options for email search are case-insensitive', async () => {
            await Doctor.insertMany([
                { fullName: 'Dr. CaseSensitive', email: 'UPPER@test.com', password: 'Secret@123',
                  specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_C1',
                  address: '987 St', consultationFee: 500 }
            ]);

            const res = await request(app)
                .get('/api/admin/users?email=upper')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.doctors.length).toBe(1);
        });

        it('should search doctors by license with exact regex prefix', async () => {
            await Doctor.insertMany([
                { fullName: 'Dr. Lic1', email: 'lic1@test.com', password: 'Secret@123',
                  specialization: 'Cardiology', experience: 10, licenseNumber: 'ABC123',
                  address: '111 St', consultationFee: 500 },
                { fullName: 'Dr. Lic2', email: 'lic2@test.com', password: 'Secret@123',
                  specialization: 'Cardiology', experience: 10, licenseNumber: 'XYZ456',
                  address: '222 St', consultationFee: 500 }
            ]);

            const res = await request(app)
                .get('/api/admin/users?license=ABC')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.doctors.length).toBe(1);
            expect(res.body.doctors[0].licenseNumber).toBe('ABC123');
        });

        it('should verify regex options for license search are case-insensitive', async () => {
            await Doctor.insertMany([
                { fullName: 'Dr. LicCase', email: 'liccase@test.com', password: 'Secret@123',
                  specialization: 'Cardiology', experience: 10, licenseNumber: 'def789',
                  address: '333 St', consultationFee: 500 }
            ]);

            const res = await request(app)
                .get('/api/admin/users?license=DEF')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.doctors.length).toBe(1);
        });

        it('should search patients by name with exact regex prefix', async () => {
            await Patient.insertMany([
                { fullName: 'Alice Johnson', email: 'alice@test.com', password: 'Secret@123' },
                { fullName: 'Bob Alice', email: 'bob@test.com', password: 'Secret@123' }
            ]);

            const res = await request(app)
                .get('/api/admin/users?patientName=Alice')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.patients.length).toBe(1);
            expect(res.body.patients[0].fullName).toBe('Alice Johnson');
        });

        it('should verify regex options for patient name search are case-insensitive', async () => {
            await Patient.insertMany([
                { fullName: 'charlie brown', email: 'charlie@test.com', password: 'Secret@123' }
            ]);

            const res = await request(app)
                .get('/api/admin/users?patientName=CHARLIE')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.patients.length).toBe(1);
        });

        it('should search patients by email with exact regex prefix', async () => {
            await Patient.insertMany([
                { fullName: 'Patient Email1', email: 'patient123@test.com', password: 'Secret@123' },
                { fullName: 'Patient Email2', email: 'other@test.com', password: 'Secret@123' }
            ]);

            const res = await request(app)
                .get('/api/admin/users?patientEmail=patient')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.patients.length).toBe(1);
            expect(res.body.patients[0].email).toBe('patient123@test.com');
        });

        it('should verify regex options for patient email search are case-insensitive', async () => {
            await Patient.insertMany([
                { fullName: 'Patient Case', email: 'PATIENTEMAIL@test.com', password: 'Secret@123' }
            ]);

            const res = await request(app)
                .get('/api/admin/users?patientEmail=patientemail')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.patients.length).toBe(1);
        });
    });

    describe('Sorting mutations', () => {
        it('should sort patients by createdAt descending (newest first)', async () => {
            await Patient.insertMany([
                { fullName: 'Old Patient', email: 'old@test.com', password: 'Secret@123',
                  createdAt: new Date('2020-01-01') },
                { fullName: 'New Patient', email: 'new@test.com', password: 'Secret@123',
                  createdAt: new Date('2024-01-01') }
            ]);

            const res = await request(app)
                .get('/api/admin/users')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.patients.length).toBe(2);
            expect(res.body.patients[0].fullName).toBe('New Patient');
            expect(res.body.patients[1].fullName).toBe('Old Patient');
        });

        it('should sort doctors by createdAt descending (newest first)', async () => {
            await Doctor.insertMany([
                { fullName: 'Dr. Old', email: 'old@test.com', password: 'Secret@123',
                  specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_OLD',
                  address: '123 St', consultationFee: 500, createdAt: new Date('2020-01-01') },
                { fullName: 'Dr. New', email: 'new@test.com', password: 'Secret@123',
                  specialization: 'Neurology', experience: 5, licenseNumber: 'LIC_NEW',
                  address: '456 St', consultationFee: 600, createdAt: new Date('2024-01-01') }
            ]);

            const res = await request(app)
                .get('/api/admin/users')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.doctors.length).toBe(2);
            expect(res.body.doctors[0].fullName).toBe('Dr. New');
            expect(res.body.doctors[1].fullName).toBe('Dr. Old');
        });

        it('should sort appointments by date descending (newest first)', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. Sort', email: 'sort@test.com', password: 'Secret@123',
                specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_SORT',
                address: '789 St', consultationFee: 500
            });

            const patient = await Patient.create({
                fullName: 'Patient Sort', email: 'patsort@test.com', password: 'Secret@123'
            });

            await Appointment.insertMany([
                { doctor: doctor._id, patient: patient._id, date: new Date('2020-01-01'),
                  time: '10:00 AM', consultationFeeAtBooking: 500, status: 'completed',
                  patientNameForVisit: 'Patient Sort' },
                { doctor: doctor._id, patient: patient._id, date: new Date('2024-01-01'),
                  time: '11:00 AM', consultationFeeAtBooking: 500, status: 'upcoming',
                  patientNameForVisit: 'Patient Sort' }
            ]);

            const res = await request(app)
                .get('/api/admin/appointments')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBe(2);
            const dates = res.body.map(apt => new Date(apt.date));
            expect(dates[0].getTime()).toBeGreaterThan(dates[1].getTime());
        });
    });

    describe('Password exclusion mutations', () => {
        it('should not return password field for patients', async () => {
            await Patient.create({
                fullName: 'Patient NoPass', email: 'nopass@test.com', password: 'Secret@123'
            });

            const res = await request(app)
                .get('/api/admin/users')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.patients[0]).not.toHaveProperty('password');
        });

        it('should not return password field for doctors', async () => {
            await Doctor.create({
                fullName: 'Dr. NoPass', email: 'drnopass@test.com', password: 'Secret@123',
                specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_NOPASS',
                address: '999 St', consultationFee: 500
            });

            const res = await request(app)
                .get('/api/admin/users')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.doctors[0]).not.toHaveProperty('password');
        });

        it('should not return password field when getting user by ID (doctor)', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. PassExclude', email: 'passexclude@test.com', password: 'Secret@123',
                specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_PEXCL',
                address: '888 St', consultationFee: 500
            });

            const res = await request(app)
                .get(`/api/admin/user/${doctor._id}`)
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body).not.toHaveProperty('password');
        });

        it('should not return password field when getting user by ID (patient)', async () => {
            const patient = await Patient.create({
                fullName: 'Patient PassExclude', email: 'patpassexcl@test.com', password: 'Secret@123'
            });

            const res = await request(app)
                .get(`/api/admin/user/${patient._id}`)
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body).not.toHaveProperty('password');
        });
    });

    describe('Populate field mutations', () => {
        it('should populate patient fullName and email in appointments', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. Populate', email: 'pop@test.com', password: 'Secret@123',
                specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_POP',
                address: '777 St', consultationFee: 500
            });

            const patient = await Patient.create({
                fullName: 'Patient Populate', email: 'patpop@test.com', password: 'Secret@123'
            });

            await Appointment.create({
                doctor: doctor._id, patient: patient._id, date: new Date(),
                time: '12:00 PM', consultationFeeAtBooking: 500, status: 'upcoming',
                patientNameForVisit: 'Patient Populate'
            });

            const res = await request(app)
                .get('/api/admin/appointments')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body[0].patient).toBeDefined();
            expect(res.body[0].patient.fullName).toBe('Patient Populate');
            expect(res.body[0].patient.email).toBe('patpop@test.com');
        });

        it('should populate doctor fullName, email, and specialization in appointments', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. PopulateDoc', email: 'popdoc@test.com', password: 'Secret@123',
                specialization: 'Neurology', experience: 15, licenseNumber: 'LIC_POPDOC',
                address: '666 St', consultationFee: 600
            });

            const patient = await Patient.create({
                fullName: 'Patient PopulateDoc', email: 'patpopdoc@test.com', password: 'Secret@123'
            });

            await Appointment.create({
                doctor: doctor._id, patient: patient._id, date: new Date(),
                time: '1:00 PM', consultationFeeAtBooking: 600, status: 'upcoming',
                patientNameForVisit: 'Patient PopulateDoc'
            });

            const res = await request(app)
                .get('/api/admin/appointments')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body[0].doctor).toBeDefined();
            expect(res.body[0].doctor.fullName).toBe('Dr. PopulateDoc');
            expect(res.body[0].doctor.email).toBe('popdoc@test.com');
            expect(res.body[0].doctor.specialization).toBe('Neurology');
        });
    });

    describe('Error message mutations', () => {
        it('should return specific error message "Doctor not found" when verifying non-existent doctor', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .put(`/api/admin/verify-doctor/${fakeId}`)
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe('Doctor not found');
        });

        it('should return specific error message "Doctor not found" when suspending non-existent doctor', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .put(`/api/admin/suspend-doctor/${fakeId}`)
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe('Doctor not found');
        });

        it('should return specific error message "Doctor not found" when rejecting non-existent doctor', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .delete(`/api/admin/reject-doctor/${fakeId}`)
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe('Doctor not found');
        });

        it('should return specific error message "Patient not found" when verifying non-existent patient', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .put(`/api/admin/verify-patient/${fakeId}`)
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe('Patient not found');
        });

        it('should return specific error message "Patient not found" when suspending non-existent patient', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .put(`/api/admin/suspend-patient/${fakeId}`)
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe('Patient not found');
        });

        it('should return specific error message "User not found" when getting non-existent user', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .get(`/api/admin/user/${fakeId}`)
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe('User not found');
        });
    });

    describe('Success message mutations', () => {
        it('should return specific success message when verifying doctor', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. SuccessMsg', email: 'successmsg@test.com', password: 'Secret@123',
                specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_SMSG',
                address: '555 St', consultationFee: 500, isVerified: false
            });

            const res = await request(app)
                .put(`/api/admin/verify-doctor/${doctor._id}`)
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Doctor verified successfully');
        });

        it('should return specific success message when suspending doctor', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. SuspendMsg', email: 'suspendmsg@test.com', password: 'Secret@123',
                specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_SUSMSG',
                address: '444 St', consultationFee: 500, isVerified: true
            });

            const res = await request(app)
                .put(`/api/admin/suspend-doctor/${doctor._id}`)
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Doctor suspended and appointments cancelled successfully');
        });

        it('should return specific success message when rejecting doctor', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. RejectMsg', email: 'rejectmsg@test.com', password: 'Secret@123',
                specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_REJMSG',
                address: '333 St', consultationFee: 500
            });

            const res = await request(app)
                .delete(`/api/admin/reject-doctor/${doctor._id}`)
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Doctor rejected and removed successfully');
        });

        it('should return specific success message when verifying patient', async () => {
            const patient = await Patient.create({
                fullName: 'Patient VerifyMsg', email: 'patverifymsg@test.com', password: 'Secret@123',
                isVerified: false
            });

            const res = await request(app)
                .put(`/api/admin/verify-patient/${patient._id}`)
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Patient verified successfully');
        });

        it('should return specific success message when suspending patient', async () => {
            const patient = await Patient.create({
                fullName: 'Patient SuspendMsg', email: 'patsuspendmsg@test.com', password: 'Secret@123',
                isVerified: true
            });

            const res = await request(app)
                .put(`/api/admin/suspend-patient/${patient._id}`)
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Patient suspended and appointments cancelled successfully');
        });
    });

    describe('Email subject line mutations', () => {
        it('should send email with correct subject when verifying doctor', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. EmailSubject', email: 'emailsubj@test.com', password: 'Secret@123',
                specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_ESUBJ',
                address: '222 St', consultationFee: 500, isVerified: false
            });

            await request(app)
                .put(`/api/admin/verify-doctor/${doctor._id}`)
                .set('mock-user', mockAdminUser);
            
            expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
                subject: expect.stringMatching(/Verification Complete/i)
            }));
        });

        it('should send email with correct subject when suspending doctor', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. SuspendSubject', email: 'suspsubj@test.com', password: 'Secret@123',
                specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_SSUBJ',
                address: '111 St', consultationFee: 500, isVerified: true
            });

            await request(app)
                .put(`/api/admin/suspend-doctor/${doctor._id}`)
                .set('mock-user', mockAdminUser);
            
            expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
                subject: expect.stringMatching(/Account Suspended/i)
            }));
        });

        it('should send email with correct subject when rejecting doctor', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. RejectSubject', email: 'rejsubj@test.com', password: 'Secret@123',
                specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_RSUBJ',
                address: '1212 St', consultationFee: 500
            });

            await request(app)
                .delete(`/api/admin/reject-doctor/${doctor._id}`)
                .set('mock-user', mockAdminUser);
            
            expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
                subject: expect.stringMatching(/Application Status/i)
            }));
        });

        it('should send email with correct subject when verifying patient', async () => {
            const patient = await Patient.create({
                fullName: 'Patient EmailSubject', email: 'patemailsubj@test.com', password: 'Secret@123',
                isVerified: false
            });

            await request(app)
                .put(`/api/admin/verify-patient/${patient._id}`)
                .set('mock-user', mockAdminUser);
            
            expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
                subject: expect.stringMatching(/Account Reactivated/i)
            }));
        });

        it('should send email with correct subject when suspending patient', async () => {
            const patient = await Patient.create({
                fullName: 'Patient SuspendSubject', email: 'patsuspsubj@test.com', password: 'Secret@123',
                isVerified: true
            });

            await request(app)
                .put(`/api/admin/suspend-patient/${patient._id}`)
                .set('mock-user', mockAdminUser);
            
            expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
                subject: expect.stringMatching(/Account Suspended/i)
            }));
        });
    });

    describe('Email content mutations', () => {
        it('should send verification email with doctor name in HTML content', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. EmailContent', email: 'emailcontent@test.com', password: 'Secret@123',
                specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_ECONT',
                address: '100 St', consultationFee: 500, isVerified: false
            });

            await request(app)
                .put(`/api/admin/verify-doctor/${doctor._id}`)
                .set('mock-user', mockAdminUser);
            
            const emailCall = mockSendEmail.mock.calls[0][0];
            expect(emailCall.html).toContain('Dr. EmailContent');
            expect(emailCall.html).toContain('Congratulations');
        });

        it('should send suspension email with doctor name in HTML content', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. SuspendContent', email: 'suspcontent@test.com', password: 'Secret@123',
                specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_SCONT',
                address: '200 St', consultationFee: 500, isVerified: true
            });

            await request(app)
                .put(`/api/admin/suspend-doctor/${doctor._id}`)
                .set('mock-user', mockAdminUser);
            
            const emailCall = mockSendEmail.mock.calls[0][0];
            expect(emailCall.html).toContain('Dr. SuspendContent');
            expect(emailCall.html).toContain('suspended');
        });

        it('should send rejection email with doctor name in HTML content', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. RejectContent', email: 'rejcontent@test.com', password: 'Secret@123',
                specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_RCONT',
                address: '300 St', consultationFee: 500
            });

            await request(app)
                .delete(`/api/admin/reject-doctor/${doctor._id}`)
                .set('mock-user', mockAdminUser);
            
            const emailCall = mockSendEmail.mock.calls[0][0];
            expect(emailCall.html).toContain('Dr. RejectContent');
            expect(emailCall.html).toContain('unable to approve');
        });

        it('should send verification email with patient name in HTML content', async () => {
            const patient = await Patient.create({
                fullName: 'Patient EmailContent', email: 'patemailcont@test.com', password: 'Secret@123',
                isVerified: false
            });

            await request(app)
                .put(`/api/admin/verify-patient/${patient._id}`)
                .set('mock-user', mockAdminUser);
            
            const emailCall = mockSendEmail.mock.calls[0][0];
            expect(emailCall.html).toContain('Patient EmailContent');
            expect(emailCall.html).toContain('reactivated');
        });

        it('should send suspension email with patient name in HTML content', async () => {
            const patient = await Patient.create({
                fullName: 'Patient SuspendContent', email: 'patsuspcont@test.com', password: 'Secret@123',
                isVerified: true
            });

            await request(app)
                .put(`/api/admin/suspend-patient/${patient._id}`)
                .set('mock-user', mockAdminUser);
            
            const emailCall = mockSendEmail.mock.calls[0][0];
            expect(emailCall.html).toContain('Patient SuspendContent');
            expect(emailCall.html).toContain('suspended');
        });
    });

    describe('Query filter conditional mutations', () => {
        it('should filter by status "pending" (not verified)', async () => {
            await Doctor.insertMany([
                { fullName: 'Dr. Pending1', email: 'pend1@test.com', password: 'Secret@123',
                  specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_P1',
                  address: '400 St', consultationFee: 500, isVerified: false },
                { fullName: 'Dr. Verified1', email: 'ver1@test.com', password: 'Secret@123',
                  specialization: 'Neurology', experience: 5, licenseNumber: 'LIC_V1',
                  address: '500 St', consultationFee: 600, isVerified: true }
            ]);

            const res = await request(app)
                .get('/api/admin/users?status=pending')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.doctors.length).toBe(1);
            expect(res.body.doctors[0].isVerified).toBe(false);
        });

        it('should apply date filter with T23:59:59 suffix for patientDateTo', async () => {
            await Patient.create({
                fullName: 'Patient DateFilter', email: 'patdate@test.com', password: 'Secret@123',
                createdAt: new Date('2024-06-15T20:00:00')
            });

            const res = await request(app)
                .get('/api/admin/users?patientDateFrom=2024-06-01&patientDateTo=2024-06-30')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.patients.length).toBe(1);
        });

        it('should filter only patients when patientDateFrom is provided', async () => {
            await Patient.create({
                fullName: 'Recent Patient', email: 'recent@test.com', password: 'Secret@123',
                createdAt: new Date('2024-01-15')
            });

            await Patient.create({
                fullName: 'Old Patient Filter', email: 'oldfilter@test.com', password: 'Secret@123',
                createdAt: new Date('2020-01-15')
            });

            const res = await request(app)
                .get('/api/admin/users?patientDateFrom=2024-01-01')
                .set('mock-user', mockAdminUser);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.patients.length).toBe(1);
            expect(res.body.patients[0].fullName).toBe('Recent Patient');
        });
    });

    describe('Appointment cancellation mutations', () => {
        it('should cancel appointments with status "upcoming" when suspending doctor', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. CancelTest', email: 'canceltest@test.com', password: 'Secret@123',
                specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_CTEST',
                address: '600 St', consultationFee: 500, isVerified: true
            });

            const patient = await Patient.create({
                fullName: 'Patient Cancel', email: 'patcancel@test.com', password: 'Secret@123'
            });

            await Appointment.insertMany([
                { doctor: doctor._id, patient: patient._id, status: 'upcoming',
                  date: new Date(), time: '2:00 PM', consultationFeeAtBooking: 500,
                  patientNameForVisit: 'Patient Cancel' },
                { doctor: doctor._id, patient: patient._id, status: 'completed',
                  date: new Date(), time: '3:00 PM', consultationFeeAtBooking: 500,
                  patientNameForVisit: 'Patient Cancel' }
            ]);

            await request(app)
                .put(`/api/admin/suspend-doctor/${doctor._id}`)
                .set('mock-user', mockAdminUser);
            
            const upcomingApt = await Appointment.findOne({ 
                doctor: doctor._id, 
                time: '2:00 PM' 
            });
            const completedApt = await Appointment.findOne({ 
                doctor: doctor._id, 
                time: '3:00 PM' 
            });

            expect(upcomingApt.status).toBe('cancelled');
            expect(completedApt.status).toBe('completed'); // Should not change
        });

        it('should cancel appointments with status "upcoming" when suspending patient', async () => {
            const doctor = await Doctor.create({
                fullName: 'Dr. PatCancel', email: 'drpatcancel@test.com', password: 'Secret@123',
                specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_PCANC',
                address: '700 St', consultationFee: 500
            });

            const patient = await Patient.create({
                fullName: 'Patient CancelTest', email: 'patcanceltest@test.com', password: 'Secret@123',
                isVerified: true
            });

            await Appointment.insertMany([
                { doctor: doctor._id, patient: patient._id, status: 'upcoming',
                  date: new Date(), time: '4:00 PM', consultationFeeAtBooking: 500,
                  patientNameForVisit: 'Patient CancelTest' },
                { doctor: doctor._id, patient: patient._id, status: 'completed',
                  date: new Date(), time: '5:00 PM', consultationFeeAtBooking: 500,
                  patientNameForVisit: 'Patient CancelTest' }
            ]);

            await request(app)
                .put(`/api/admin/suspend-patient/${patient._id}`)
                .set('mock-user', mockAdminUser);
            
            const upcomingApt = await Appointment.findOne({ 
                patient: patient._id, 
                time: '4:00 PM' 
            });
            const completedApt = await Appointment.findOne({ 
                patient: patient._id, 
                time: '5:00 PM' 
            });

            expect(upcomingApt.status).toBe('cancelled');
            expect(completedApt.status).toBe('completed'); // Should not change
        });
    });

    describe('Console log mutations', () => {
        it('should log cancelled appointment count when suspending doctor', async () => {
            const consoleSpy = vi.spyOn(console, 'log');
            
            const doctor = await Doctor.create({
                fullName: 'Dr. LogTest', email: 'logtest@test.com', password: 'Secret@123',
                specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_LOG',
                address: '800 St', consultationFee: 500, isVerified: true
            });

            const patient = await Patient.create({
                fullName: 'Patient LogTest', email: 'patlogtest@test.com', password: 'Secret@123'
            });

            await Appointment.create({
                doctor: doctor._id, patient: patient._id, status: 'upcoming',
                date: new Date(), time: '6:00 PM', consultationFeeAtBooking: 500,
                patientNameForVisit: 'Patient LogTest'
            });

            await request(app)
                .put(`/api/admin/suspend-doctor/${doctor._id}`)
                .set('mock-user', mockAdminUser);
            
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/Cancelled.*appointments/));
            consoleSpy.mockRestore();
        });

        it('should log cancelled appointment count when suspending patient', async () => {
            const consoleSpy = vi.spyOn(console, 'log');
            
            const doctor = await Doctor.create({
                fullName: 'Dr. PatLogTest', email: 'patlogtest@test.com', password: 'Secret@123',
                specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_PLOG',
                address: '900 St', consultationFee: 500
            });

            const patient = await Patient.create({
                fullName: 'Patient PatLogTest', email: 'patpatlog@test.com', password: 'Secret@123',
                isVerified: true
            });

            await Appointment.create({
                doctor: doctor._id, patient: patient._id, status: 'upcoming',
                date: new Date(), time: '7:00 PM', consultationFeeAtBooking: 500,
                patientNameForVisit: 'Patient PatLogTest'
            });

            await request(app)
                .put(`/api/admin/suspend-patient/${patient._id}`)
                .set('mock-user', mockAdminUser);
            
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/Cancelled.*appointments/));
            consoleSpy.mockRestore();
        });
    });

    describe('Console error mutations', () => {
        it('should log error with specific message when email fails during doctor verification', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error');
            mockSendEmail.mockRejectedValueOnce(new Error('Email failed'));
            
            const doctor = await Doctor.create({
                fullName: 'Dr. ErrorLog', email: 'errorlog@test.com', password: 'Secret@123',
                specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_ELOG',
                address: '1000 St', consultationFee: 500, isVerified: false
            });

            await request(app)
                .put(`/api/admin/verify-doctor/${doctor._id}`)
                .set('mock-user', mockAdminUser);
            
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringMatching(/Error sending verification email/),
                expect.any(Error)
            );
            consoleErrorSpy.mockRestore();
        });

        it('should log error with specific message when email fails during doctor suspension', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error');
            mockSendEmail.mockRejectedValueOnce(new Error('Email failed'));
            
            const doctor = await Doctor.create({
                fullName: 'Dr. SuspErrorLog', email: 'susperrorlog@test.com', password: 'Secret@123',
                specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_SELOG',
                address: '1100 St', consultationFee: 500, isVerified: true
            });

            await request(app)
                .put(`/api/admin/suspend-doctor/${doctor._id}`)
                .set('mock-user', mockAdminUser);
            
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringMatching(/Failed to send suspension email/),
                expect.any(Error)
            );
            consoleErrorSpy.mockRestore();
        });

        it('should log error with specific message when email fails during doctor rejection', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error');
            mockSendEmail.mockRejectedValueOnce(new Error('Email failed'));
            
            const doctor = await Doctor.create({
                fullName: 'Dr. RejErrorLog', email: 'rejerrorlog@test.com', password: 'Secret@123',
                specialization: 'Cardiology', experience: 10, licenseNumber: 'LIC_RELOG',
                address: '1200 St', consultationFee: 500
            });

            await request(app)
                .delete(`/api/admin/reject-doctor/${doctor._id}`)
                .set('mock-user', mockAdminUser);
            
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringMatching(/Failed to send rejection email/),
                expect.any(Error)
            );
            consoleErrorSpy.mockRestore();
        });

        it('should log error with specific message when email fails during patient verification', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error');
            mockSendEmail.mockRejectedValueOnce(new Error('Email failed'));
            
            const patient = await Patient.create({
                fullName: 'Patient ErrorLog', email: 'paterrorlog@test.com', password: 'Secret@123',
                isVerified: false
            });

            await request(app)
                .put(`/api/admin/verify-patient/${patient._id}`)
                .set('mock-user', mockAdminUser);
            
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringMatching(/Error sending patient verification email/),
                expect.any(Error)
            );
            consoleErrorSpy.mockRestore();
        });

        it('should log error with specific message when email fails during patient suspension', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error');
            mockSendEmail.mockRejectedValueOnce(new Error('Email failed'));
            
            const patient = await Patient.create({
                fullName: 'Patient SuspErrorLog', email: 'patsusperrorlog@test.com', password: 'Secret@123',
                isVerified: true
            });

            await request(app)
                .put(`/api/admin/suspend-patient/${patient._id}`)
                .set('mock-user', mockAdminUser);
            
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringMatching(/Failed to send suspension email/),
                expect.any(Error)
            );
            consoleErrorSpy.mockRestore();
        });

        it('should log error with specific message when database error occurs in get user', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error');
            vi.spyOn(Doctor, 'findById').mockImplementationOnce(() => {
                throw new Error('DB error');
            });
            
            const fakeId = new mongoose.Types.ObjectId();
            await request(app)
                .get(`/api/admin/user/${fakeId}`)
                .set('mock-user', mockAdminUser);
            
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringMatching(/Error fetching user details for admin/),
                expect.any(Error)
            );
            consoleErrorSpy.mockRestore();
        });
    });

});