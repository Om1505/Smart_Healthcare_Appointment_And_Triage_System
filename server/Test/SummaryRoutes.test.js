import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { randomUUID } from 'crypto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');

const mockGroqCreate = vi.fn();
const mockGroq = {
    chat: {
        completions: {
            create: mockGroqCreate,
        },
    },
};

vi.mock('groq-sdk', () => {
    return function GroqMock() {
        return mockGroq;
    };
});

process.env.JWT_SECRET = 'summary-routes-secret';
process.env.GROQ_API_KEY = 'fake-key-for-tests';

const requiredAppointmentFields = {
    phoneNumber: '9999999999',
    email: 'summary@test.com',
    birthDate: new Date('1990-01-01'),
    sex: 'other',
    primaryLanguage: 'English',
    symptomsBegin: '2023-01-01',
};

const withRequiredAppointmentFields = (data = {}) => ({
    ...requiredAppointmentFields,
    ...data,
});

const buildAppointmentPayload = (patientId, doctorId, overrides = {}) =>
    withRequiredAppointmentFields({
        patient: patientId,
        doctor: doctorId,
        patientNameForVisit: 'Test Patient',
        date: new Date('2024-01-15'),
        time: '10:00 AM',
        status: 'upcoming',
        consultationFeeAtBooking: 500,
        paymentStatus: 'paid',
        ...overrides,
    });

const uniqueDoctorData = () => ({
    fullName: 'Dr. Test',
    email: `doctor-${randomUUID()}@test.com`,
    password: 'Test@1234',
    specialization: 'Cardiology',
    experience: 10,
    qualifications: ['MBBS', 'MD'],
    consultationFee: 500,
    phoneNumber: '1234567890',
    licenseNumber: `LIC-${randomUUID()}`,
    address: '123 Medical St',
    isProfileComplete: true,
    emailVerified: true,
});

const uniquePatientData = () => ({
    fullName: 'Patient Test',
    email: `patient-${randomUUID()}@test.com`,
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

const createDoctorAndPatient = async () => {
    const [doctor] = await Doctor.insertMany([uniqueDoctorData()]);
    const [patient] = await Patient.insertMany([uniquePatientData()]);
    return { doctor, patient };
};

const buildAuthHeader = (userId, userType = 'doctor') => {
    const token = jwt.sign({ userId, userType }, process.env.JWT_SECRET);
    return `Bearer ${token}`;
};

let mongoServer;
let app;

let router;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    router = require('../routes/SummaryRoutes');
    if (typeof router.__setGroqClient === 'function') {
        router.__setGroqClient(mockGroq);
    }

    app = express();
    app.use(express.json());
    app.use('/api/summary', router);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    if (typeof router?.__resetGroqClient === 'function') {
        router.__resetGroqClient();
    }
});

afterEach(async () => {
    await Appointment.deleteMany({});
    await Doctor.deleteMany({});
    await Patient.deleteMany({});
    vi.clearAllMocks();
    vi.useRealTimers();
});

describe('GET /api/summary/appointment/:appointmentId', () => {
    it('returns 401 when Authorization header missing', async () => {
        const response = await request(app).get('/api/summary/appointment/123');
        expect(response.status).toBe(401);
        expect(response.body.message).toBe('No token, authorization denied');
    });

    it('returns 404 when appointment does not exist', async () => {
        const { doctor } = await createDoctorAndPatient();
        const response = await request(app)
            .get(`/api/summary/appointment/${new mongoose.Types.ObjectId()}`)
            .set('Authorization', buildAuthHeader(doctor._id));

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Appointment not found');
    });

    it('generates and caches AI summary for rich clinical data', async () => {
        const { doctor, patient } = await createDoctorAndPatient();

        const appointment = await Appointment.create(
            buildAppointmentPayload(patient._id, doctor._id, {
                patientNameForVisit: 'John Doe',
                primaryReason: 'Chest pain',
                reasonForVisit: 'Shortness of breath',
                symptomsList: ['Chest pain', 'Shortness of breath'],
                symptomsOther: 'Light headedness',
                severeSymptomsCheck: ['Loss of consciousness'],
                preExistingConditions: ['Diabetes'],
                preExistingConditionsOther: 'Thyroid disorder',
                familyHistory: ['Heart Disease'],
                familyHistoryOther: 'Stroke',
                medications: 'Aspirin',
                allergies: 'Penicillin',
                pastSurgeries: 'Appendectomy',
            })
        );

        mockGroqCreate.mockResolvedValue({
            choices: [{ message: { content: 'AI summary output' } }],
        });

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('Authorization', buildAuthHeader(doctor._id));

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.cached).toBe(false);
        expect(mockGroqCreate).toHaveBeenCalledTimes(1);

        const prompt = mockGroqCreate.mock.calls[0][0].messages[0].content;
        expect(prompt).toContain('Chest pain');
        expect(prompt).toContain('- Light headedness');
        expect(prompt).toContain('- Loss of consciousness');
        expect(prompt).toContain('- Thyroid disorder');
        expect(prompt).toContain('- Stroke');

        const refreshed = await Appointment.findById(appointment._id);
        expect(refreshed.doctorSummary).toBe('AI summary output');
        expect(refreshed.summaryGeneratedAt).toBeInstanceOf(Date);
    });

    it('returns cached summary and skips Groq call when already stored', async () => {
        const { doctor, patient } = await createDoctorAndPatient();
        const appointment = await Appointment.create(
            buildAppointmentPayload(patient._id, doctor._id, {
                primaryReason: 'Follow-up',
                doctorSummary: 'Cached summary',
                summaryGeneratedAt: new Date(),
            })
        );

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('Authorization', buildAuthHeader(doctor._id));

        expect(response.status).toBe(200);
        expect(response.body.cached).toBe(true);
        expect(response.body.summary).toBe('Cached summary');
        expect(mockGroqCreate).not.toHaveBeenCalled();
    });

    it('applies fallback text for empty lists and legacy symptom string', async () => {
        const { doctor, patient } = await createDoctorAndPatient();
        const appointment = await Appointment.create(
            buildAppointmentPayload(patient._id, doctor._id, {
                primaryReason: 'Comparison visit',
                symptomsList: [],
                preExistingConditions: [],
                familyHistory: [],
            })
        );

        await Appointment.updateOne(
            { _id: appointment._id },
            { $set: { symptoms: ['Legacy legacy array symptom'], sex: '' } }
        );

        mockGroqCreate.mockResolvedValue({ choices: [{ message: { content: 'Summary generated' } }] });

        await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('Authorization', buildAuthHeader(doctor._id));

        const prompt = mockGroqCreate.mock.calls[0][0].messages[0].content;
        expect(prompt).toContain('- Legacy legacy array symptom');
        expect(prompt).toContain('CURRENT SYMPTOMS');
        expect(prompt).toContain('- None');
        expect(prompt).toContain('- Sex: Not provided');
    });

    it('falls back to default summary text when Groq returns no choices', async () => {
        const { doctor, patient } = await createDoctorAndPatient();
        const appointment = await Appointment.create(
            buildAppointmentPayload(patient._id, doctor._id, {
                primaryReason: 'Follow-up for diabetes',
            })
        );

        mockGroqCreate.mockResolvedValue({ choices: [] });

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('Authorization', buildAuthHeader(doctor._id));

        expect(response.status).toBe(200);
        expect(response.body.summary).toBe('Unable to generate summary');
        expect(response.body.cached).toBe(false);

        const refreshed = await Appointment.findById(appointment._id);
        expect(refreshed.doctorSummary).toBe('Unable to generate summary');
    });

    it('preserves error message when Groq throws validation issue', async () => {
        const { doctor, patient } = await createDoctorAndPatient();
        const appointment = await Appointment.create(
            buildAppointmentPayload(patient._id, doctor._id, {
                primaryReason: 'Migraine check',
            })
        );

        const error = new Error('Invalid prompt');
        mockGroqCreate.mockRejectedValue(error);

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('Authorization', buildAuthHeader(doctor._id));

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Failed to generate summary');
        expect(response.body.error).toBe('Invalid prompt');
    });

    it('returns 500 and does not cache when Groq throws', async () => {
        const { doctor, patient } = await createDoctorAndPatient();
        const appointment = await Appointment.create(
            buildAppointmentPayload(patient._id, doctor._id, {
                primaryReason: 'Severe headache',
            })
        );

        mockGroqCreate.mockRejectedValue(new Error('Groq down')); 

        const response = await request(app)
            .get(`/api/summary/appointment/${appointment._id}`)
            .set('Authorization', buildAuthHeader(doctor._id));

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Failed to generate summary');

        const refreshed = await Appointment.findById(appointment._id);
        expect(refreshed.doctorSummary).toBeUndefined();
    });
});
