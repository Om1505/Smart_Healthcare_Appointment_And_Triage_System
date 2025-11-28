import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const crypto = require('crypto');

// Mock email utils
const mockSendEmail = vi.fn().mockResolvedValue(true);

// Mock passport
const mockPassport = {
    authenticate: vi.fn((strategy, options) => {
        return (req, res, next) => {
            if (strategy === 'google') {
                // Simulate successful authentication for testing
                if (req.headers['mock-google-user']) {
                    req.user = JSON.parse(req.headers['mock-google-user']);
                    next();
                } else {
                    res.redirect(options.failureRedirect || '/login?error=google_failed');
                }
            } else {
                next();
            }
        };
    })
};

// Override require for modules
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
    if (id === '../utils/email_utils.js' || id === '../utils/email_utils') {
        return mockSendEmail;
    }
    if (id === 'passport') {
        return mockPassport;
    }
    return originalRequire.apply(this, arguments);
};

// Set environment variables
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing';

// Import routes and models AFTER mocks are set up
const authRoutes = require('../routes/auth');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

let mongoServer;

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
    await Patient.deleteMany({});
    await Doctor.deleteMany({});
    await Admin.deleteMany({});
    mockSendEmail.mockClear();
});

describe('Auth Routes', () => {

    // --- 1. POST /api/auth/signup ---
    describe('POST /signup', () => {
        it('should register a new patient successfully', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({
                    userType: 'patient',
                    fullName: 'John Doe',
                    email: 'john@test.com',
                    password: 'Password@123'
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.message).toContain('Registration successful');
            expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
                email: 'john@test.com',
                subject: 'IntelliConsult - Email Verification'
            }));

            const patient = await Patient.findOne({ email: 'john@test.com' });
            expect(patient).toBeTruthy();
            expect(patient.isEmailVerified).toBe(false);
            expect(patient.emailVerificationToken).toBeTruthy();
        });

        it('should register a new doctor successfully', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({
                    userType: 'doctor',
                    fullName: 'Dr. Smith',
                    email: 'smith@test.com',
                    password: 'Doctor@123',
                    specialization: 'Cardiology',
                    experience: 5,
                    licenseNumber: 'LIC123',
                    address: '123 Medical St',
                    consultationFee: 100
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.message).toContain('Registration successful');
            expect(mockSendEmail).toHaveBeenCalled();

            const doctor = await Doctor.findOne({ email: 'smith@test.com' });
            expect(doctor).toBeTruthy();
            expect(doctor.isEmailVerified).toBe(false);
        });

        it('should return 400 if invalid user type', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({
                    userType: 'invalid',
                    fullName: 'Test User',
                    email: 'test@test.com',
                    password: 'Password@123'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Invalid user type specified.');
        });

        it('should return 400 if email already exists', async () => {
            await Patient.create({
                fullName: 'Existing User',
                email: 'existing@test.com',
                password: 'Password@123'
            });

            const res = await request(app)
                .post('/api/auth/signup')
                .send({
                    userType: 'patient',
                    fullName: 'New User',
                    email: 'existing@test.com',
                    password: 'Password@123'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('User with this email already exists.');
        });

        it('should return 400 if validation fails', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({
                    userType: 'patient',
                    fullName: 'Test',
                    email: 'test@test.com',
                    password: 'weak' // Weak password
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toContain('Password must be at least 8 characters');
        });

        it('should return 500 if email sending fails', async () => {
            mockSendEmail.mockRejectedValueOnce(new Error('Email service down'));

            const res = await request(app)
                .post('/api/auth/signup')
                .send({
                    userType: 'patient',
                    fullName: 'Email Fail',
                    email: 'emailfail@test.com',
                    password: 'Password@123'
                });

            expect(res.statusCode).toBe(500);
            expect(res.body.message).toBe('Failed to send verification email. Please try signing up again.');

            // User should be deleted if email fails
            const patient = await Patient.findOne({ email: 'emailfail@test.com' });
            expect(patient).toBeNull();
        });

        it('should handle server errors during signup', async () => {
            vi.spyOn(Patient, 'findOne').mockImplementationOnce(() => {
                throw new Error('Database error');
            });

            const res = await request(app)
                .post('/api/auth/signup')
                .send({
                    userType: 'patient',
                    fullName: 'Server Error',
                    email: 'error@test.com',
                    password: 'Password@123'
                });

            expect(res.statusCode).toBe(500);
            expect(res.body.message).toContain('Server error during signup');
        });
    });

    // --- 2. GET /api/auth/verify-email/:token ---
    describe('GET /verify-email/:token', () => {
        it('should verify email with valid token', async () => {
            const patient = new Patient({
                fullName: 'Verify User',
                email: 'verify@test.com',
                password: 'Password@123'
            });

            const token = patient.createEmailVerificationToken();
            await patient.save();

            const res = await request(app)
                .get(`/api/auth/verify-email/${token}`);

            expect(res.statusCode).toBe(302); // Redirect
            expect(res.headers.location).toContain('verified=true');

            const updatedPatient = await Patient.findOne({ email: 'verify@test.com' });
            expect(updatedPatient.isEmailVerified).toBe(true);
            expect(updatedPatient.emailVerificationToken).toBeUndefined();
        });

        it('should redirect with error for invalid token', async () => {
            const res = await request(app)
                .get('/api/auth/verify-email/invalidtoken123');

            expect(res.statusCode).toBe(302);
            expect(res.headers.location).toContain('verified=false');
        });

        it('should redirect with error for expired token', async () => {
            const patient = new Patient({
                fullName: 'Expired Token',
                email: 'expired@test.com',
                password: 'Password@123'
            });

            const token = patient.createEmailVerificationToken();
            patient.emailVerificationTokenExpires = Date.now() - 1000; // Expired
            await patient.save();

            const res = await request(app)
                .get(`/api/auth/verify-email/${token}`);

            expect(res.statusCode).toBe(302);
            expect(res.headers.location).toContain('verified=false');
        });

        it('should handle server errors during verification', async () => {
            const patient = new Patient({
                fullName: 'Error User',
                email: 'error@test.com',
                password: 'Password@123'
            });

            const token = patient.createEmailVerificationToken();
            await patient.save();

            // Mock save to throw error
            vi.spyOn(Patient.prototype, 'save').mockImplementationOnce(() => {
                throw new Error('Database error');
            });

            const res = await request(app)
                .get(`/api/auth/verify-email/${token}`);

            expect(res.statusCode).toBe(302);
            expect(res.headers.location).toContain('verified=false');
        });
    });

    // --- 3. POST /api/auth/forgot-password ---
    describe('POST /forgot-password', () => {
        it('should send reset email for valid patient', async () => {
            await Patient.create({
                fullName: 'Reset User',
                email: 'reset@test.com',
                password: 'Password@123',
                isEmailVerified: true
            });

            const res = await request(app)
                .post('/api/auth/forgot-password')
                .send({
                    email: 'reset@test.com',
                    userType: 'patient'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toContain('password reset link has been sent');
            expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
                email: 'reset@test.com',
                subject: 'IntelliConsult - Password Reset'
            }));

            const patient = await Patient.findOne({ email: 'reset@test.com' });
            expect(patient.passwordResetToken).toBeTruthy();
        });

        it('should return 400 for invalid user type', async () => {
            const res = await request(app)
                .post('/api/auth/forgot-password')
                .send({
                    email: 'test@test.com',
                    userType: 'invalid'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Invalid user type specified.');
        });

        it('should return generic message for non-existent user', async () => {
            const res = await request(app)
                .post('/api/auth/forgot-password')
                .send({
                    email: 'nonexistent@test.com',
                    userType: 'patient'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toContain('password reset link has been sent');
            expect(mockSendEmail).not.toHaveBeenCalled();
        });

        it('should handle Google-only accounts', async () => {
            await Patient.create({
                fullName: 'Google User',
                email: 'google@test.com',
                googleId: 'google123',
                isEmailVerified: true,
                isProfileComplete: true
            });

            const res = await request(app)
                .post('/api/auth/forgot-password')
                .send({
                    email: 'google@test.com',
                    userType: 'patient'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toContain('registered with Google');
        });

        it('should handle errors gracefully', async () => {
            await Patient.create({
                fullName: 'Error User',
                email: 'error@test.com',
                password: 'Password@123',
                isEmailVerified: true
            });

            vi.spyOn(Patient.prototype, 'save').mockImplementationOnce(() => {
                throw new Error('Database error');
            });

            const res = await request(app)
                .post('/api/auth/forgot-password')
                .send({
                    email: 'error@test.com',
                    userType: 'patient'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toContain('password reset link has been sent');
        });
    });

    // --- 4. PUT /api/auth/reset-password/:token ---
    describe('PUT /reset-password/:token', () => {
        it('should reset password with valid token', async () => {
            const patient = new Patient({
                fullName: 'Reset User',
                email: 'reset@test.com',
                password: 'OldPassword@123',
                isEmailVerified: true
            });

            const token = patient.createPasswordResetToken();
            await patient.save();

            const res = await request(app)
                .put(`/api/auth/reset-password/${token}`)
                .send({
                    password: 'NewPassword@123',
                    confirmPassword: 'NewPassword@123'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Password reset successful! You can now log in.');

            const updatedPatient = await Patient.findOne({ email: 'reset@test.com' });
            expect(updatedPatient.passwordResetToken).toBeUndefined();
            expect(updatedPatient.isEmailVerified).toBe(true);
        });

        it('should return 400 if passwords do not match', async () => {
            const patient = new Patient({
                fullName: 'Mismatch User',
                email: 'mismatch@test.com',
                password: 'OldPassword@123'
            });

            const token = patient.createPasswordResetToken();
            await patient.save();

            const res = await request(app)
                .put(`/api/auth/reset-password/${token}`)
                .send({
                    password: 'NewPassword@123',
                    confirmPassword: 'DifferentPassword@123'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Passwords do not match.');
        });

        it('should return 400 for invalid token', async () => {
            const res = await request(app)
                .put('/api/auth/reset-password/invalidtoken')
                .send({
                    password: 'NewPassword@123',
                    confirmPassword: 'NewPassword@123'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Token is invalid or has expired.');
        });

        it('should return 400 for expired token', async () => {
            const patient = new Patient({
                fullName: 'Expired User',
                email: 'expired@test.com',
                password: 'OldPassword@123'
            });

            const token = patient.createPasswordResetToken();
            patient.passwordResetTokenExpires = Date.now() - 1000; // Expired
            await patient.save();

            const res = await request(app)
                .put(`/api/auth/reset-password/${token}`)
                .send({
                    password: 'NewPassword@123',
                    confirmPassword: 'NewPassword@123'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Token is invalid or has expired.');
        });

        it('should return 400 for validation errors', async () => {
            const patient = new Patient({
                fullName: 'Weak Password',
                email: 'weak@test.com',
                password: 'OldPassword@123'
            });

            const token = patient.createPasswordResetToken();
            await patient.save();

            const res = await request(app)
                .put(`/api/auth/reset-password/${token}`)
                .send({
                    password: 'weak',
                    confirmPassword: 'weak'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toContain('Password must be at least 8 characters');
        });

        it('should handle server errors', async () => {
            const patient = new Patient({
                fullName: 'Error User',
                email: 'error@test.com',
                password: 'OldPassword@123'
            });

            const token = patient.createPasswordResetToken();
            await patient.save();

            vi.spyOn(Patient.prototype, 'save').mockImplementationOnce(() => {
                throw new Error('Database error');
            });

            const res = await request(app)
                .put(`/api/auth/reset-password/${token}`)
                .send({
                    password: 'NewPassword@123',
                    confirmPassword: 'NewPassword@123'
                });

            expect(res.statusCode).toBe(500);
            expect(res.body.message).toBe('An error occurred while resetting your password.');
        });
    });

    // --- 5. POST /api/auth/login ---
    describe('POST /login', () => {
        it('should login patient successfully', async () => {
            await Patient.create({
                fullName: 'Login User',
                email: 'login@test.com',
                password: 'Password@123',
                isEmailVerified: true,
                isVerified: true,
                isProfileComplete: true
            });

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@test.com',
                    password: 'Password@123',
                    userType: 'patient'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.token).toBeTruthy();
            expect(res.body.profileComplete).toBe(true);
            expect(res.body.message).toBe('Logged in successfully!');
        });

        it('should return token with profileComplete false for incomplete profile', async () => {
            const patient = await Patient.create({
                fullName: 'Incomplete User',
                email: 'incomplete@test.com',
                password: 'Password@123',
                isEmailVerified: true,
                isVerified: true
            });

            // Manually set isProfileComplete to false after creation
            patient.isProfileComplete = false;
            await patient.save();

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'incomplete@test.com',
                    password: 'Password@123',
                    userType: 'patient'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.token).toBeTruthy();
            expect(res.body.profileComplete).toBe(false);
            expect(res.body.message).toContain('complete your profile');
        });

        it('should return 400 for invalid user type', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@test.com',
                    password: 'Password@123',
                    userType: 'invalid'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Invalid user type specified.');
        });

        it('should return 400 for non-existent user', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@test.com',
                    password: 'Password@123',
                    userType: 'patient'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Invalid credentials or user role.');
        });

        it('should return 400 for Google-only accounts', async () => {
            await Patient.create({
                fullName: 'Google User',
                email: 'google@test.com',
                googleId: 'google123',
                isEmailVerified: true,
                isProfileComplete: true
            });

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'google@test.com',
                    password: 'Password@123',
                    userType: 'patient'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toContain('registered with Google');
        });

        it('should return 400 for account with no password', async () => {
            const patient = new Patient({
                fullName: 'No Password',
                email: 'nopassword@test.com',
                googleId: 'temp_google_id',
                isEmailVerified: true,
                isProfileComplete: true
            });

            // Remove googleId after creation to simulate account with no password
            patient.googleId = undefined;
            await patient.save({ validateBeforeSave: false });

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nopassword@test.com',
                    password: 'Password@123',
                    userType: 'patient'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Invalid account. No password set.');
        });

        it('should return 400 for incorrect password', async () => {
            await Patient.create({
                fullName: 'Wrong Pass',
                email: 'wrongpass@test.com',
                password: 'CorrectPassword@123',
                isEmailVerified: true,
                isVerified: true
            });

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'wrongpass@test.com',
                    password: 'WrongPassword@123',
                    userType: 'patient'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Invalid credentials.');
        });

        it('should return 403 for suspended account', async () => {
            await Patient.create({
                fullName: 'Suspended User',
                email: 'suspended@test.com',
                password: 'Password@123',
                isEmailVerified: true,
                isVerified: false
            });

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'suspended@test.com',
                    password: 'Password@123',
                    userType: 'patient'
                });

            expect(res.statusCode).toBe(403);
            expect(res.body.message).toContain('suspended');
        });

        it('should return 401 for unverified email', async () => {
            await Patient.create({
                fullName: 'Unverified User',
                email: 'unverified@test.com',
                password: 'Password@123',
                isEmailVerified: false,
                isVerified: true
            });

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'unverified@test.com',
                    password: 'Password@123',
                    userType: 'patient'
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.message).toContain('email is not verified');
        });

        it('should handle server errors during login', async () => {
            vi.spyOn(Patient, 'findOne').mockImplementationOnce(() => {
                throw new Error('Database error');
            });

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'error@test.com',
                    password: 'Password@123',
                    userType: 'patient'
                });

            expect(res.statusCode).toBe(500);
            expect(res.body.message).toContain('Server error during login');
        });
    });

    // --- 6. GET /api/auth/google ---
    describe('GET /google', () => {
        it('should redirect to Google authentication', async () => {
            const res = await request(app)
                .get('/api/auth/google');

            // With mocked passport, it should pass through or redirect
            expect([200, 302]).toContain(res.statusCode);
        });
    });

    // --- 7. GET /api/auth/google/callback ---
    describe('GET /google/callback', () => {
        it('should handle Google callback with complete profile', async () => {
            const mockUser = {
                id: 'google123',
                userType: 'patient',
                isProfileComplete: true
            };

            const res = await request(app)
                .get('/api/auth/google/callback')
                .set('mock-google-user', JSON.stringify(mockUser));

            expect(res.statusCode).toBe(302);
            expect(res.headers.location).toContain('token=');
            expect(res.headers.location).toContain('userType=patient');
            expect(res.headers.location).toContain('next=');
            expect(res.headers.location).toContain('dashboard');
        });

        it('should redirect to complete profile for incomplete user', async () => {
            const mockUser = {
                id: 'google456',
                userType: 'doctor',
                isProfileComplete: false
            };

            const res = await request(app)
                .get('/api/auth/google/callback')
                .set('mock-google-user', JSON.stringify(mockUser));

            expect(res.statusCode).toBe(302);
            expect(res.headers.location).toContain('complete-profile');
        });

        it('should handle Google authentication failure', async () => {
            const res = await request(app)
                .get('/api/auth/google/callback');

            expect(res.statusCode).toBe(302);
            expect(res.headers.location).toContain('error=google_failed');
        });
    });
});
