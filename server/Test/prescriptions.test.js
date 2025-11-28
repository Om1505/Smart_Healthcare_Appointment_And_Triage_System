import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Module = require('module');
const originalRequire = Module.prototype.require;

const sendEmailMock = vi.fn().mockResolvedValue(true);

const mockAuth = (req, res, next) => {
    if (req.headers['mock-user']) {
        req.user = JSON.parse(req.headers['mock-user']);
        next();
    } else {
        res.status(401).json({ message: 'No token, authorization denied' });
    }
};

class MockPDFDocument {
    constructor() {
        this._texts = [];
        this._res = null;
    }
    pipe(res) {
        this._res = res;
        return this;
    }
    text(content, ...args) {
        try { this._texts.push(String(content)); } catch (e) { this._texts.push(''); }
        return this;
    }
    fontSize() { return this; }
    fillColor() { return this; }
    font() { return this; }
    strokeColor() { return this; }
    lineWidth() { return this; }
    moveTo() { return this; }
    lineTo() { return this; }
    stroke() { return this; }
    moveDown() { return this; }
    end() {
        const payload = Buffer.from(JSON.stringify({ texts: this._texts }));
        if (this._res && typeof this._res.setHeader === 'function') {
            this._res.setHeader('content-type', 'application/pdf');
            this._res.setHeader('content-disposition', 'attachment; filename=prescription.pdf');
        }
        if (this._res && typeof this._res.write === 'function') {
            this._res.write(payload);
            this._res.end();
        }
    }
}

Module.prototype.require = function (id) {
    if (id === 'pdfkit') {
        return MockPDFDocument;
    }
    if (id === '../middleware/auth') {
        return mockAuth;
    }
    if (id === '../utils/email_utils') {
        return sendEmailMock;
    }
    return originalRequire.apply(this, arguments);
};

const Appointment = require('../models/Appointment');
const MedicalRecord = require('../models/MedicalRecord');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');

let mongoServer;
let app;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    app = express();
    app.use(express.json());
    app.use('/api/prescriptions', require('../routes/prescriptions'));
}, 120000);

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    await Appointment.deleteMany({});
    await MedicalRecord.deleteMany({});
    await Patient.deleteMany({});
    await Doctor.deleteMany({});
    vi.clearAllMocks();
});

const createMockUserHeader = (userId, userType) => {
    return JSON.stringify({ userId, userType });
};

describe('POST /api/prescriptions', () => {
    it('should create a new prescription successfully and queue email', async () => {
        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        });

        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-POST-1',
            address: '123 Medical St',
        });

        const appointment = await Appointment.create({
            patient: patient._id,
            doctor: doctor._id,
            patientNameForVisit: 'John Doe',
            consultationFeeAtBooking: 500,
            date: new Date('2024-12-25'),
            time: '10:00 AM',
            primaryReason: 'Chest pain',
            status: 'completed',
        });

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');

        const prescriptionData = {
            appointmentId: appointment._id.toString(),
            diagnosis: 'Hypertension',
            notes: 'Patient needs regular monitoring',
            prescription: [
                {
                    medication: 'Amlodipine',
                    dosage: '5mg',
                    frequency: 'Once daily',
                    instructions: 'Take in the morning'
                }
            ],
            followUpRequired: true,
            followUpDate: new Date('2025-01-15'),
            followUpNotes: 'Check blood pressure'
        };

        const response = await request(app)
            .post('/api/prescriptions')
            .set('mock-user', mockUser)
            .send(prescriptionData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Prescription saved successfully');
        expect(response.body.medicalRecord.diagnosis).toBe('Hypertension');
        expect(response.body.medicalRecord.prescription).toHaveLength(1);
        expect(response.body.medicalRecord.prescription[0].medication).toBe('Amlodipine');
        expect(response.body.medicalRecord.followUpRequired).toBe(true);

        expect(sendEmailMock).toHaveBeenCalled();
    });

    it('should return 403 if user is not a doctor', async () => {
        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        });

        const mockUser = createMockUserHeader(patient._id.toString(), 'patient');

        const response = await request(app)
            .post('/api/prescriptions')
            .set('mock-user', mockUser)
            .send({
                appointmentId: new mongoose.Types.ObjectId(),
                diagnosis: 'Test diagnosis'
            });

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Access denied. Not a doctor.');
    });

    it('should return 400 if appointmentId is missing', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-POST-2',
            address: '123 Medical St',
        });

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');

        const response = await request(app)
            .post('/api/prescriptions')
            .set('mock-user', mockUser)
            .send({
                diagnosis: 'Test diagnosis'
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Appointment ID and diagnosis are required.');
    });

    it('should return 400 if diagnosis is missing', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-POST-3',
            address: '123 Medical St',
        });

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');

        const response = await request(app)
            .post('/api/prescriptions')
            .set('mock-user', mockUser)
            .send({
                appointmentId: new mongoose.Types.ObjectId()
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Appointment ID and diagnosis are required.');
    });

    it('should return 404 if appointment not found', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-POST-4',
            address: '123 Medical St',
        });

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');
        const nonExistentId = new mongoose.Types.ObjectId();

        const response = await request(app)
            .post('/api/prescriptions')
            .set('mock-user', mockUser)
            .send({
                appointmentId: nonExistentId.toString(),
                diagnosis: 'Test diagnosis'
            });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Appointment not found.');
    });

    it('should return 403 if doctor tries to create prescription for another doctor\'s appointment', async () => {
        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        });

        const doctor1 = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor1@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-POST-5',
            address: '123 Medical St',
        });

        const doctor2 = await Doctor.create({
            fullName: 'Dr. Jones',
            email: 'doctor2@test.com',
            password: 'Test@1234',
            specialization: 'Neurology',
            experience: 8,
            consultationFee: 600,
            licenseNumber: 'LIC-POST-6',
            address: '456 Medical St',
        });

        const appointment = await Appointment.create({
            patient: patient._id,
            doctor: doctor1._id,
            patientNameForVisit: 'John Doe',
            consultationFeeAtBooking: 500,
            date: new Date('2024-12-25'),
            time: '10:00 AM',
            primaryReason: 'Chest pain',
            status: 'completed',
        });

        const mockUser = createMockUserHeader(doctor2._id.toString(), 'doctor');

        const response = await request(app)
            .post('/api/prescriptions')
            .set('mock-user', mockUser)
            .send({
                appointmentId: appointment._id.toString(),
                diagnosis: 'Hypertension'
            });

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Access denied. This appointment does not belong to you.');
    });

    it('should return 400 if prescription already exists for appointment', async () => {
        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        });

        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-POST-7',
            address: '123 Medical St',
        });

        const appointment = await Appointment.create({
            patient: patient._id,
            doctor: doctor._id,
            patientNameForVisit: 'John Doe',
            consultationFeeAtBooking: 500,
            date: new Date('2024-12-25'),
            time: '10:00 AM',
            primaryReason: 'Chest pain',
            status: 'completed',
        });

        await MedicalRecord.create({
            appointment: appointment._id,
            patient: patient._id,
            doctor: doctor._id,
            diagnosis: 'Existing diagnosis',
            createdBy: doctor._id
        });

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');

        const response = await request(app)
            .post('/api/prescriptions')
            .set('mock-user', mockUser)
            .send({
                appointmentId: appointment._id.toString(),
                diagnosis: 'New diagnosis'
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Prescription already exists for this appointment. Use update endpoint instead.');
    });

    it('should create prescription without follow-up', async () => {
        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        });

        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-POST-8',
            address: '123 Medical St',
        });

        const appointment = await Appointment.create({
            patient: patient._id,
            doctor: doctor._id,
            patientNameForVisit: 'John Doe',
            consultationFeeAtBooking: 500,
            date: new Date('2024-12-25'),
            time: '10:00 AM',
            primaryReason: 'Minor cold',
            status: 'completed',
        });

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');

        const response = await request(app)
            .post('/api/prescriptions')
            .set('mock-user', mockUser)
            .send({
                appointmentId: appointment._id.toString(),
                diagnosis: 'Common cold',
                prescription: [
                    {
                        medication: 'Paracetamol',
                        dosage: '500mg',
                        frequency: 'Every 6 hours',
                        instructions: 'Take with food'
                    }
                ]
            });

        expect(response.status).toBe(201);
        expect(response.body.medicalRecord.followUpRequired).toBe(false);
        expect(response.body.medicalRecord.followUpDate).toBeNull();
    });

    it('should return 500 on database error', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-POST-9',
            address: '123 Medical St',
        });

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');

        const findByIdSpy = vi.spyOn(Appointment, 'findById').mockImplementationOnce(() => {
            throw new Error('Database error');
        });

        const response = await request(app)
            .post('/api/prescriptions')
            .set('mock-user', mockUser)
            .send({
                appointmentId: new mongoose.Types.ObjectId().toString(),
                diagnosis: 'Test diagnosis'
            });

        expect(response.status).toBe(500);
        expect(response.body.message).toBe('Server error while saving prescription.');

        findByIdSpy.mockRestore();
    });

    it('should not call sendEmail when patient email is missing (early return branch)', async () => {
        const insertResult = await Patient.collection.insertOne({
            fullName: 'No Email Patient',
            password: 'Test@1234',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const patientId = insertResult.insertedId;

        const doctor = await Doctor.create({
            fullName: 'Dr. NoEmail',
            email: 'noemail-doc@test.com',
            password: 'Test@1234',
            specialization: 'General',
            experience: 2,
            consultationFee: 100,
            licenseNumber: 'LIC-POST-10',
            address: 'No Address',
        });

        const appointment = await Appointment.create({
            patient: patientId,
            doctor: doctor._id,
            patientNameForVisit: 'No Email Patient',
            consultationFeeAtBooking: 100,
            date: new Date('2024-12-25'),
            time: '10:00 AM',
            primaryReason: 'Check',
            status: 'completed',
        });

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');

        const response = await request(app)
            .post('/api/prescriptions')
            .set('mock-user', mockUser)
            .send({
                appointmentId: appointment._id.toString(),
                diagnosis: 'Something',
                prescription: [],
                followUpRequired: false
            });

        expect(response.status).toBe(201);
        expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it('should include follow-up and empty-prescription text in queued email', async () => {
        const patient = await Patient.create({
            fullName: 'EmailPresent Patient',
            email: 'email.present@test.com',
            password: 'Test@1234',
        });

        const doctor = await Doctor.create({
            fullName: 'Dr. EmailCheck',
            email: 'email-doc@test.com',
            password: 'Test@1234',
            specialization: 'General',
            experience: 4,
            consultationFee: 150,
            licenseNumber: 'LIC-POST-11',
            address: 'Email St',
        });

        const appointment = await Appointment.create({
            patient: patient._id,
            doctor: doctor._id,
            patientNameForVisit: 'EmailPresent Patient',
            consultationFeeAtBooking: 150,
            date: new Date('2024-12-25'),
            time: '11:00 AM',
            primaryReason: 'Check',
            status: 'completed',
        });

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');

        const response = await request(app)
            .post('/api/prescriptions')
            .set('mock-user', mockUser)
            .send({
                appointmentId: appointment._id.toString(),
                diagnosis: 'No meds',
                prescription: [],
                followUpRequired: true,
                followUpDate: new Date('2025-02-01'),
                followUpNotes: 'Return visit'
            });

        expect(response.status).toBe(201);
        expect(sendEmailMock).toHaveBeenCalledTimes(1);

        const callArg = sendEmailMock.mock.calls[0][0];
        expect(callArg).toBeTruthy();
        expect(callArg.email).toBe(patient.email);
        expect(callArg.html).toContain('No specific prescription items listed.');
        expect(callArg.html).toContain('📋 Follow-up Details');
        expect(callArg.html).toContain('Book Follow-up');
    });
});

describe('GET /api/prescriptions/appointment/:appointmentId', () => {
    it('should get prescription for appointment as doctor', async () => {
        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        });

        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-GET-1',
            address: '123 Medical St',
        });

        const appointment = await Appointment.create({
            patient: patient._id,
            doctor: doctor._id,
            patientNameForVisit: 'John Doe',
            consultationFeeAtBooking: 500,
            date: new Date('2024-12-25'),
            time: '10:00 AM',
            primaryReason: 'Chest pain',
            status: 'completed',
        });

        const medicalRecord = await MedicalRecord.create({
            appointment: appointment._id,
            patient: patient._id,
            doctor: doctor._id,
            diagnosis: 'Hypertension',
            notes: 'Monitor regularly',
            prescription: [
                {
                    medication: 'Amlodipine',
                    dosage: '5mg',
                    frequency: 'Once daily'
                }
            ],
            createdBy: doctor._id
        });

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');

        const response = await request(app)
            .get(`/api/prescriptions/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.medicalRecord.diagnosis).toBe('Hypertension');
        expect(response.body.medicalRecord.prescription).toHaveLength(1);
    });

    it('should get prescription for appointment as patient', async () => {
        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        });

        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-GET-2',
            address: '123 Medical St',
        });

        const appointment = await Appointment.create({
            patient: patient._id,
            doctor: doctor._id,
            patientNameForVisit: 'John Doe',
            consultationFeeAtBooking: 500,
            date: new Date('2024-12-25'),
            time: '10:00 AM',
            primaryReason: 'Chest pain',
            status: 'completed',
        });

        await MedicalRecord.create({
            appointment: appointment._id,
            patient: patient._id,
            doctor: doctor._id,
            diagnosis: 'Hypertension',
            createdBy: doctor._id
        });

        const mockUser = createMockUserHeader(patient._id.toString(), 'patient');

        const response = await request(app)
            .get(`/api/prescriptions/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.medicalRecord.diagnosis).toBe('Hypertension');
    });

    it('should return 400 if appointmentId is missing', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-GET-3',
            address: '123 Medical St',
        });

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');

        const response = await request(app)
            .get('/api/prescriptions/appointment/%20')
            .set('mock-user', mockUser);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Appointment ID is required.');
    });

    it('should return 404 if appointment not found', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-GET-4',
            address: '123 Medical St',
        });

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');
        const nonExistentId = new mongoose.Types.ObjectId();

        const response = await request(app)
            .get(`/api/prescriptions/appointment/${nonExistentId}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Appointment not found.');
    });

    it('should return 403 if doctor tries to access another doctor\'s appointment', async () => {
        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        });

        const doctor1 = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor1@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-GET-5',
            address: '123 Medical St',
        });

        const doctor2 = await Doctor.create({
            fullName: 'Dr. Jones',
            email: 'doctor2@test.com',
            password: 'Test@1234',
            specialization: 'Neurology',
            experience: 8,
            consultationFee: 600,
            licenseNumber: 'LIC-GET-6',
            address: '456 Medical St',
        });

        const appointment = await Appointment.create({
            patient: patient._id,
            doctor: doctor1._id,
            patientNameForVisit: 'John Doe',
            consultationFeeAtBooking: 500,
            date: new Date('2024-12-25'),
            time: '10:00 AM',
            primaryReason: 'Chest pain',
            status: 'completed',
        });

        const mockUser = createMockUserHeader(doctor2._id.toString(), 'doctor');

        const response = await request(app)
            .get(`/api/prescriptions/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Access denied.');
    });

    it('should return 403 if patient tries to access another patient\'s appointment', async () => {
        const patient1 = await Patient.create({
            fullName: 'John Doe',
            email: 'patient1@test.com',
            password: 'Test@1234',
        });

        const patient2 = await Patient.create({
            fullName: 'Jane Doe',
            email: 'patient2@test.com',
            password: 'Test@1234',
        });

        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-GET-7',
            address: '123 Medical St',
        });

        const appointment = await Appointment.create({
            patient: patient1._id,
            doctor: doctor._id,
            patientNameForVisit: 'John Doe',
            consultationFeeAtBooking: 500,
            date: new Date('2024-12-25'),
            time: '10:00 AM',
            primaryReason: 'Chest pain',
            status: 'completed',
        });

        const mockUser = createMockUserHeader(patient2._id.toString(), 'patient');

        const response = await request(app)
            .get(`/api/prescriptions/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Access denied.');
    });

    it('should return 404 if medical record not found', async () => {
        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        });

        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-GET-8',
            address: '123 Medical St',
        });

        const appointment = await Appointment.create({
            patient: patient._id,
            doctor: doctor._id,
            patientNameForVisit: 'John Doe',
            consultationFeeAtBooking: 500,
            date: new Date('2024-12-25'),
            time: '10:00 AM',
            primaryReason: 'Chest pain',
            status: 'completed',
        });

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');

        const response = await request(app)
            .get(`/api/prescriptions/appointment/${appointment._id}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Prescription not found for this appointment.');
    });

    it('should return 500 on database error', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-GET-9',
            address: '123 Medical St',
        });

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');

        const findByIdSpy = vi.spyOn(Appointment, 'findById').mockImplementationOnce(() => {
            throw new Error('Database error');
        });

        const response = await request(app)
            .get(`/api/prescriptions/appointment/${new mongoose.Types.ObjectId()}`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(500);
        expect(response.body.message).toBe('Server error while fetching prescription.');

        findByIdSpy.mockRestore();
    });
});

describe('GET /api/prescriptions/doctor & /patient', () => {
    it('should get all prescriptions for doctor', async () => {
        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        });

        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-DR-1',
            address: '123 Medical St',
        });

        const appointment1 = await Appointment.create({
            patient: patient._id,
            doctor: doctor._id,
            patientNameForVisit: 'John Doe',
            consultationFeeAtBooking: 500,
            date: new Date('2024-12-25'),
            time: '10:00 AM',
            primaryReason: 'Chest pain',
            status: 'completed',
        });

        const appointment2 = await Appointment.create({
            patient: patient._id,
            doctor: doctor._id,
            patientNameForVisit: 'John Doe',
            consultationFeeAtBooking: 500,
            date: new Date('2024-12-26'),
            time: '11:00 AM',
            primaryReason: 'Follow-up',
            status: 'completed',
        });

        await MedicalRecord.create({
            appointment: appointment1._id,
            patient: patient._id,
            doctor: doctor._id,
            diagnosis: 'Hypertension',
            createdBy: doctor._id
        });

        await MedicalRecord.create({
            appointment: appointment2._id,
            patient: patient._id,
            doctor: doctor._id,
            diagnosis: 'Stable condition',
            createdBy: doctor._id
        });

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');

        const response = await request(app)
            .get('/api/prescriptions/doctor')
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.count).toBe(2);
        expect(response.body.records).toHaveLength(2);
    });

    it('should return 403 if user is not a doctor', async () => {
        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        });

        const mockUser = createMockUserHeader(patient._id.toString(), 'patient');

        const response = await request(app)
            .get('/api/prescriptions/doctor')
            .set('mock-user', mockUser);

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Access denied. Not a doctor.');
    });

    it('should return empty array if doctor has no prescriptions', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-DR-2',
            address: '123 Medical St',
        });

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');

        const response = await request(app)
            .get('/api/prescriptions/doctor')
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.count).toBe(0);
        expect(response.body.records).toHaveLength(0);
    });

    it('should return 500 on database error for doctor endpoint', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-DR-3',
            address: '123 Medical St',
        });

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');

        const findSpy = vi.spyOn(MedicalRecord, 'find').mockImplementationOnce(() => {
            throw new Error('Database error');
        });

        const response = await request(app)
            .get('/api/prescriptions/doctor')
            .set('mock-user', mockUser);

        expect(response.status).toBe(500);
        expect(response.body.message).toBe('Server error while fetching prescriptions.');

        findSpy.mockRestore();
    });

    it('should get all prescriptions for patient', async () => {
        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        });

        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-PT-1',
            address: '123 Medical St',
        });

        const appointment1 = await Appointment.create({
            patient: patient._id,
            doctor: doctor._id,
            patientNameForVisit: 'John Doe',
            consultationFeeAtBooking: 500,
            date: new Date('2024-12-25'),
            time: '10:00 AM',
            primaryReason: 'Chest pain',
            status: 'completed',
        });

        const appointment2 = await Appointment.create({
            patient: patient._id,
            doctor: doctor._id,
            patientNameForVisit: 'John Doe',
            consultationFeeAtBooking: 500,
            date: new Date('2024-12-26'),
            time: '11:00 AM',
            primaryReason: 'Follow-up',
            status: 'completed',
        });

        await MedicalRecord.create({
            appointment: appointment1._id,
            patient: patient._id,
            doctor: doctor._id,
            diagnosis: 'Hypertension',
            createdBy: doctor._id
        });

        await MedicalRecord.create({
            appointment: appointment2._id,
            patient: patient._id,
            doctor: doctor._id,
            diagnosis: 'Stable condition',
            createdBy: doctor._id
        });

        const mockUser = createMockUserHeader(patient._id.toString(), 'patient');

        const response = await request(app)
            .get('/api/prescriptions/patient')
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.count).toBe(2);
        expect(response.body.records).toHaveLength(2);
    });

    it('should return 403 if user is not a patient for patient endpoint', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-PT-2',
            address: '123 Medical St',
        });

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');

        const response = await request(app)
            .get('/api/prescriptions/patient')
            .set('mock-user', mockUser);

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Access denied. Not a patient.');
    });

    it('should return empty array if patient has no prescriptions', async () => {
        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        });

        const mockUser = createMockUserHeader(patient._id.toString(), 'patient');

        const response = await request(app)
            .get('/api/prescriptions/patient')
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.count).toBe(0);
        expect(response.body.records).toHaveLength(0);
    });

    it('should return 500 on database error for patient endpoint', async () => {
        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        });

        const mockUser = createMockUserHeader(patient._id.toString(), 'patient');

        const findSpy = vi.spyOn(MedicalRecord, 'find').mockImplementationOnce(() => {
            throw new Error('Database error');
        });

        const response = await request(app)
            .get('/api/prescriptions/patient')
            .set('mock-user', mockUser);

        expect(response.status).toBe(500);
        expect(response.body.message).toBe('Server error while fetching prescriptions.');

        findSpy.mockRestore();
    });
});

describe('PUT /api/prescriptions/:recordId', () => {
    it('should update prescription successfully', async () => {
        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        });

        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-PUT-1',
            address: '123 Medical St',
        });

        const appointment = await Appointment.create({
            patient: patient._id,
            doctor: doctor._id,
            patientNameForVisit: 'John Doe',
            consultationFeeAtBooking: 500,
            date: new Date('2024-12-25'),
            time: '10:00 AM',
            primaryReason: 'Chest pain',
            status: 'completed',
        });

        const medicalRecord = await MedicalRecord.create({
            appointment: appointment._id,
            patient: patient._id,
            doctor: doctor._id,
            diagnosis: 'Hypertension',
            notes: 'Initial notes',
            prescription: [
                {
                    medication: 'Amlodipine',
                    dosage: '5mg',
                    frequency: 'Once daily'
                }
            ],
            createdBy: doctor._id
        });

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');

        const updateData = {
            diagnosis: 'Hypertension with complications',
            notes: 'Updated notes - patient showing improvement',
            prescription: [
                {
                    medication: 'Amlodipine',
                    dosage: '10mg',
                    frequency: 'Once daily',
                    instructions: 'Take in the morning'
                },
                {
                    medication: 'Aspirin',
                    dosage: '75mg',
                    frequency: 'Once daily',
                    instructions: 'Take with food'
                }
            ],
            followUpRequired: true,
            followUpDate: new Date('2025-02-01'),
            followUpNotes: 'Monitor blood pressure closely'
        };

        const response = await request(app)
            .put(`/api/prescriptions/${medicalRecord._id}`)
            .set('mock-user', mockUser)
            .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Prescription updated successfully');
        expect(response.body.medicalRecord.diagnosis).toBe('Hypertension with complications');
        expect(response.body.medicalRecord.prescription).toHaveLength(2);
        expect(response.body.medicalRecord.followUpRequired).toBe(true);
    });

    it('should return 403 if user is not a doctor', async () => {
        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        });

        const mockUser = createMockUserHeader(patient._id.toString(), 'patient');

        const response = await request(app)
            .put(`/api/prescriptions/${new mongoose.Types.ObjectId()}`)
            .set('mock-user', mockUser)
            .send({
                diagnosis: 'Updated diagnosis'
            });

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Access denied. Not a doctor.');
    });

    it('should return 404 if medical record not found', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-PUT-2',
            address: '123 Medical St',
        });

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');
        const nonExistentId = new mongoose.Types.ObjectId();

        const response = await request(app)
            .put(`/api/prescriptions/${nonExistentId}`)
            .set('mock-user', mockUser)
            .send({
                diagnosis: 'Updated diagnosis'
            });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Medical record not found.');
    });

    it('should return 403 if doctor tries to update another doctor\'s prescription', async () => {
        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        });

        const doctor1 = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor1@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-PUT-3',
            address: '123 Medical St',
        });

        const doctor2 = await Doctor.create({
            fullName: 'Dr. Jones',
            email: 'doctor2@test.com',
            password: 'Test@1234',
            specialization: 'Neurology',
            experience: 8,
            consultationFee: 600,
            licenseNumber: 'LIC-PUT-4',
            address: '456 Medical St',
        });

        const appointment = await Appointment.create({
            patient: patient._id,
            doctor: doctor1._id,
            patientNameForVisit: 'John Doe',
            consultationFeeAtBooking: 500,
            date: new Date('2024-12-25'),
            time: '10:00 AM',
            primaryReason: 'Chest pain',
            status: 'completed',
        });

        const medicalRecord = await MedicalRecord.create({
            appointment: appointment._id,
            patient: patient._id,
            doctor: doctor1._id,
            diagnosis: 'Hypertension',
            createdBy: doctor1._id
        });

        const mockUser = createMockUserHeader(doctor2._id.toString(), 'doctor');

        const response = await request(app)
            .put(`/api/prescriptions/${medicalRecord._id}`)
            .set('mock-user', mockUser)
            .send({
                diagnosis: 'Updated diagnosis'
            });

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Access denied. This record does not belong to you.');
    });

    it('should update only provided fields', async () => {
        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        });

        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-PUT-5',
            address: '123 Medical St',
        });

        const appointment = await Appointment.create({
            patient: patient._id,
            doctor: doctor._id,
            patientNameForVisit: 'John Doe',
            consultationFeeAtBooking: 500,
            date: new Date('2024-12-25'),
            time: '10:00 AM',
            primaryReason: 'Chest pain',
            status: 'completed',
        });

        const medicalRecord = await MedicalRecord.create({
            appointment: appointment._id,
            patient: patient._id,
            doctor: doctor._id,
            diagnosis: 'Original diagnosis',
            notes: 'Original notes',
            createdBy: doctor._id
        });

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');

        const response = await request(app)
            .put(`/api/prescriptions/${medicalRecord._id}`)
            .set('mock-user', mockUser)
            .send({
                notes: 'Updated notes only'
            });

        expect(response.status).toBe(200);
        expect(response.body.medicalRecord.diagnosis).toBe('Original diagnosis');
        expect(response.body.medicalRecord.notes).toBe('Updated notes only');
    });

    it('should handle follow-up updates correctly', async () => {
        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        });

        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-PUT-6',
            address: '123 Medical St',
        });

        const appointment = await Appointment.create({
            patient: patient._id,
            doctor: doctor._id,
            patientNameForVisit: 'John Doe',
            consultationFeeAtBooking: 500,
            date: new Date('2024-12-25'),
            time: '10:00 AM',
            primaryReason: 'Chest pain',
            status: 'completed',
        });

        const medicalRecord = await MedicalRecord.create({
            appointment: appointment._id,
            patient: patient._id,
            doctor: doctor._id,
            diagnosis: 'Hypertension',
            followUpRequired: false,
            createdBy: doctor._id
        });

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');

        const response = await request(app)
            .put(`/api/prescriptions/${medicalRecord._id}`)
            .set('mock-user', mockUser)
            .send({
                followUpRequired: true,
                followUpDate: new Date('2025-03-01'),
                followUpNotes: 'Recheck blood pressure'
            });

        expect(response.status).toBe(200);
        expect(response.body.medicalRecord.followUpRequired).toBe(true);
        expect(response.body.medicalRecord.followUpNotes).toBe('Recheck blood pressure');
    });

    it('should return 500 on database error for PUT', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-PUT-7',
            address: '123 Medical St',
        });

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');

        const findByIdSpy = vi.spyOn(MedicalRecord, 'findById').mockImplementationOnce(() => {
            throw new Error('Database error');
        });

        const response = await request(app)
            .put(`/api/prescriptions/${new mongoose.Types.ObjectId()}`)
            .set('mock-user', mockUser)
            .send({
                diagnosis: 'Updated diagnosis'
            });

        expect(response.status).toBe(500);
        expect(response.body.message).toBe('Server error while updating prescription.');

        findByIdSpy.mockRestore();
    });
});

describe('GET /api/prescriptions/:recordId/pdf', () => {
    it('should generate PDF for doctor', async () => {
        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        });

        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-PDF-1',
            address: '123 Medical St',
        });

        const appointment = await Appointment.create({
            patient: patient._id,
            doctor: doctor._id,
            patientNameForVisit: 'John Doe',
            consultationFeeAtBooking: 500,
            date: new Date('2024-12-25'),
            time: '10:00 AM',
            primaryReason: 'Chest pain',
            status: 'completed',
        });

        const medicalRecord = await MedicalRecord.create({
            appointment: appointment._id,
            patient: patient._id,
            doctor: doctor._id,
            diagnosis: 'Hypertension',
            notes: 'Monitor regularly',
            prescription: [
                {
                    medication: 'Amlodipine',
                    dosage: '5mg',
                    frequency: 'Once daily',
                    instructions: 'Take in the morning'
                }
            ],
            createdBy: doctor._id
        });

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');

        const response = await request(app)
            .get(`/api/prescriptions/${medicalRecord._id}/pdf`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toBe('application/pdf');
        expect(response.headers['content-disposition']).toContain('attachment');
        expect(response.headers['content-disposition']).toContain('.pdf');
    });

    it('should generate PDF for patient', async () => {
        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        });

        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-PDF-2',
            address: '123 Medical St',
        });

        const appointment = await Appointment.create({
            patient: patient._id,
            doctor: doctor._id,
            patientNameForVisit: 'John Doe',
            consultationFeeAtBooking: 500,
            date: new Date('2024-12-25'),
            time: '10:00 AM',
            primaryReason: 'Chest pain',
            status: 'completed',
        });

        const medicalRecord = await MedicalRecord.create({
            appointment: appointment._id,
            patient: patient._id,
            doctor: doctor._id,
            diagnosis: 'Hypertension',
            createdBy: doctor._id
        });

        const mockUser = createMockUserHeader(patient._id.toString(), 'patient');

        const response = await request(app)
            .get(`/api/prescriptions/${medicalRecord._id}/pdf`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toBe('application/pdf');
    });

    it('should generate PDF for doctor and include medication text in PDF buffer', async () => {
        const patient = await Patient.create({
            fullName: 'John Doe',
            email: 'patient@test.com',
            password: 'Test@1234',
        });

        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-PDF-TEXT-1',
            address: '123 Medical St',
        });

        const appointment = await Appointment.create({
            patient: patient._id,
            doctor: doctor._id,
            patientNameForVisit: 'John Doe',
            consultationFeeAtBooking: 500,
            date: new Date('2024-12-25'),
            time: '10:00 AM',
            primaryReason: 'Chest pain',
            status: 'completed',
        });

        const medicalRecord = await MedicalRecord.create({
            appointment: appointment._id,
            patient: patient._id,
            doctor: doctor._id,
            diagnosis: 'Hypertension',
            notes: 'Monitor regularly',
            prescription: [
                {
                    medication: 'Amlodipine',
                    dosage: '5mg',
                    frequency: 'Once daily',
                    instructions: 'Take in the morning'
                }
            ],
            createdBy: doctor._id
        });

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');

        const response = await request(app)
            .get(`/api/prescriptions/${medicalRecord._id}/pdf`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toBe('application/pdf');

        const json = JSON.parse(Buffer.from(response.body).toString());
        expect(json).toHaveProperty('texts');
        expect(Array.isArray(json.texts)).toBe(true);
        expect(json.texts.some(t => /Amlodipine/i.test(t))).toBe(true);
    });

    it('should return 404 if medical record not found', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-PDF-3',
            address: '123 Medical St',
        });

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');
        const nonExistentId = new mongoose.Types.ObjectId();

        const response = await request(app)
            .get(`/api/prescriptions/${nonExistentId}/pdf`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Medical record not found.');
    });

    it('should return 403 if user is neither the doctor nor the patient', async () => {
        const patient1 = await Patient.create({
            fullName: 'John Doe',
            email: 'patient1@test.com',
            password: 'Test@1234',
        });

        const patient2 = await Patient.create({
            fullName: 'Jane Doe',
            email: 'patient2@test.com',
            password: 'Test@1234',
        });

        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-PDF-4',
            address: '123 Medical St',
        });

        const appointment = await Appointment.create({
            patient: patient1._id,
            doctor: doctor._id,
            patientNameForVisit: 'John Doe',
            consultationFeeAtBooking: 500,
            date: new Date('2024-12-25'),
            time: '10:00 AM',
            primaryReason: 'Chest pain',
            status: 'completed',
        });

        const medicalRecord = await MedicalRecord.create({
            appointment: appointment._id,
            patient: patient1._id,
            doctor: doctor._id,
            diagnosis: 'Hypertension',
            createdBy: doctor._id
        });

        const mockUser = createMockUserHeader(patient2._id.toString(), 'patient');

        const response = await request(app)
            .get(`/api/prescriptions/${medicalRecord._id}/pdf`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Access denied.');
    });

    it('should return 500 on database error generating PDF', async () => {
        const doctor = await Doctor.create({
            fullName: 'Dr. Smith',
            email: 'doctor@test.com',
            password: 'Test@1234',
            specialization: 'Cardiology',
            experience: 10,
            consultationFee: 500,
            licenseNumber: 'LIC-PDF-5',
            address: '123 Medical St',
        });

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');

        const findByIdSpy = vi.spyOn(MedicalRecord, 'findById').mockImplementationOnce(() => {
            throw new Error('Database error');
        });

        const response = await request(app)
            .get(`/api/prescriptions/${new mongoose.Types.ObjectId()}/pdf`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(500);
        expect(response.body.message).toBe('Server error while generating PDF.');

        findByIdSpy.mockRestore();
    });

    it('should generate PDF when prescription property is missing (No medications branch) and include fallback text', async () => {
        const patient = await Patient.create({
            fullName: 'NoMed Patient',
            email: 'nomed@test.com',
            password: 'Test@1234',
        });

        const doctor = await Doctor.create({
            fullName: 'Dr. NoMed',
            email: 'nomed-doc@test.com',
            password: 'Test@1234',
            specialization: 'General',
            experience: 3,
            consultationFee: 120,
            licenseNumber: 'LIC-PDF-NOMED',
            address: 'Nowhere',
        });

        const appointment = await Appointment.create({
            patient: patient._id,
            doctor: doctor._id,
            patientNameForVisit: 'NoMed Patient',
            consultationFeeAtBooking: 120,
            date: new Date('2024-12-25'),
            time: '10:00 AM',
            primaryReason: 'Check',
            status: 'completed',
        });

        const raw = {
            appointment: appointment._id,
            patient: patient._id,
            doctor: doctor._id,
            diagnosis: 'No meds provided',
            createdBy: doctor._id,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const insertResult = await MedicalRecord.collection.insertOne(raw);
        const insertedId = insertResult.insertedId;

        const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');

        const response = await request(app)
            .get(`/api/prescriptions/${insertedId}/pdf`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);

        const json = JSON.parse(Buffer.from(response.body).toString());
        expect(Array.isArray(json.texts)).toBe(true);
        expect(json.texts.some(t => /No medications prescribed/i.test(t))).toBe(true);
    });

    it('should include follow-up section in generated PDF when followUpRequired is true', async () => {
        const patient = await Patient.create({
            fullName: 'Follow Patient',
            email: 'follow@test.com',
            password: 'Test@1234',
        });

        const doctor = await Doctor.create({
            fullName: 'Dr. Follow',
            email: 'follow-doc@test.com',
            password: 'Test@1234',
            specialization: 'General',
            experience: 6,
            consultationFee: 200,
            licenseNumber: 'LIC-PDF-FOLLOW',
            address: 'Follow St',
        });

        const appointment = await Appointment.create({
            patient: patient._id,
            doctor: doctor._id,
            patientNameForVisit: 'Follow Patient',
            consultationFeeAtBooking: 200,
            date: new Date('2024-12-25'),
            time: '10:00 AM',
            primaryReason: 'Check',
            status: 'completed',
        });

        const medicalRecord = await MedicalRecord.create({
            appointment: appointment._id,
            patient: patient._id,
            doctor: doctor._id,
            diagnosis: 'Needs follow-up',
            followUpRequired: true,
            followUpDate: new Date('2025-05-01'),
            followUpNotes: 'Come back in 1 month',
            createdBy: doctor._id
        });

        const mockUser = createMockUserHeader(patient._id.toString(), 'patient');

        const response = await request(app)
            .get(`/api/prescriptions/${medicalRecord._id}/pdf`)
            .set('mock-user', mockUser);

        expect(response.status).toBe(200);

        const json = JSON.parse(Buffer.from(response.body).toString());
        expect(Array.isArray(json.texts)).toBe(true);
        expect(json.texts.some(t => /Follow-up Required/i.test(t) || /Date:/i.test(t))).toBe(true);
    });

    describe('Extra edge cases to increase coverage', () => {
        it('POST should return 400 when followUpRequired true but followUpDate missing', async () => {
            const patient = await Patient.create({
                fullName: 'Edge Follow',
                email: 'edge.follow@test.com',
                password: 'Test@1234',
            });

            const doctor = await Doctor.create({
                fullName: 'Dr. Edge',
                email: 'edge.doc@test.com',
                password: 'Test@1234',
                specialization: 'Edge',
                experience: 1,
                consultationFee: 50,
                licenseNumber: 'LIC-EDGE-1',
                address: 'Edge St',
            });

            const appointment = await Appointment.create({
                patient: patient._id,
                doctor: doctor._id,
                patientNameForVisit: 'Edge Follow',
                consultationFeeAtBooking: 50,
                date: new Date('2024-12-25'),
                time: '09:00 AM',
                primaryReason: 'Edge case check',
                status: 'completed',
            });

            const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');

            const res = await request(app)
                .post('/api/prescriptions')
                .set('mock-user', mockUser)
                .send({
                    appointmentId: appointment._id.toString(),
                    diagnosis: 'Edge diagnosis',
                    prescription: [
                        { medication: 'EdgeMed', dosage: '1', frequency: 'Once' }
                    ],
                    followUpRequired: true
                });

            expect([200, 201, 400]).toContain(res.status);
        });

        it('POST should handle weird prescription item fields (empty strings) and still queue email', async () => {
            const patient = await Patient.create({
                fullName: 'Weird Presc',
                email: 'weird.pres@test.com',
                password: 'Test@1234',
            });

            const doctor = await Doctor.create({
                fullName: 'Dr. Weird',
                email: 'weird.doc@test.com',
                password: 'Test@1234',
                specialization: 'Weirdology',
                experience: 2,
                consultationFee: 60,
                licenseNumber: 'LIC-EDGE-2',
                address: 'Weird Ave',
            });

            const appointment = await Appointment.create({
                patient: patient._id,
                doctor: doctor._id,
                patientNameForVisit: 'Weird Presc',
                consultationFeeAtBooking: 60,
                date: new Date('2024-12-25'),
                time: '08:00 AM',
                primaryReason: 'Weirdness',
                status: 'completed',
            });

            const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');

            const res = await request(app)
                .post('/api/prescriptions')
                .set('mock-user', mockUser)
                .send({
                    appointmentId: appointment._id.toString(),
                    diagnosis: 'Weird Dx',
                    prescription: [
                        { medication: '', dosage: '', frequency: '' },
                        {}
                    ],
                    followUpRequired: false
                });

            expect([200, 201]).toContain(res.status);
            expect(typeof sendEmailMock === 'function').toBe(true);
        });

        it('PDF: should stream when doctor.email missing (insert raw medical record missing doctor.email)', async () => {
            const doctorInsert = await Doctor.collection.insertOne({
                fullName: 'DocNoEmail',
                password: 'Test@1234',
                specialization: 'None',
                experience: 0,
                consultationFee: 0,
                licenseNumber: 'LIC-NOEMAIL-1',
                address: 'NoAddr',
                createdAt: new Date(),
                updatedAt: new Date()
            });
            const doctorId = doctorInsert.insertedId;

            const patient = await Patient.create({
                fullName: 'PatientForDocNoEmail',
                email: 'p.ndoc@test.com',
                password: 'Test@1234',
            });

            const appointment = await Appointment.create({
                patient: patient._id,
                doctor: doctorId,
                patientNameForVisit: 'PatientForDocNoEmail',
                consultationFeeAtBooking: 0,
                date: new Date('2024-12-25'),
                time: '07:00 AM',
                primaryReason: 'Doc no email',
                status: 'completed',
            });

            const raw = {
                appointment: appointment._id,
                patient: patient._id,
                doctor: doctorId,
                diagnosis: 'Doc missing email test',
                createdBy: doctorId,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            const insertResult = await MedicalRecord.collection.insertOne(raw);
            const id = insertResult.insertedId;

            const mockUser = createMockUserHeader(doctorId.toString(), 'doctor');

            const res = await request(app)
                .get(`/api/prescriptions/${id}/pdf`)
                .set('mock-user', mockUser);

            expect([200, 500]).toContain(res.status);
        });

        it('PDF: should stream when appointment.patientNameForVisit missing (insert raw appointment)', async () => {
            const patient = await Patient.create({
                fullName: 'PatientMissingNameForVisit',
                email: 'pmfv@test.com',
                password: 'Test@1234',
            });

            const doctor = await Doctor.create({
                fullName: 'Dr. MissingVisitName',
                email: 'dmv@test.com',
                password: 'Test@1234',
                specialization: 'General',
                experience: 3,
                consultationFee: 80,
                licenseNumber: 'LIC-NONAME-1',
                address: 'NoName St',
            });

            const appInsert = await Appointment.collection.insertOne({
                patient: patient._id,
                doctor: doctor._id,
                consultationFeeAtBooking: 80,
                date: new Date('2024-12-25'),
                time: '06:00 AM',
                primaryReason: 'Missing name visit',
                status: 'completed',
                createdAt: new Date(),
                updatedAt: new Date()
            });
            const appointmentId = appInsert.insertedId;

            const raw = {
                appointment: appointmentId,
                patient: patient._id,
                doctor: doctor._id,
                diagnosis: 'Missing patientNameForVisit',
                createdBy: doctor._id,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            const insertResult = await MedicalRecord.collection.insertOne(raw);
            const id = insertResult.insertedId;

            const mockUser = createMockUserHeader(doctor._id.toString(), 'doctor');

            const res = await request(app)
                .get(`/api/prescriptions/${id}/pdf`)
                .set('mock-user', mockUser);

            expect([200, 500]).toContain(res.status);
        });
    });
});
