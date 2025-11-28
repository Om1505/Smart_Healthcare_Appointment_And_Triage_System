import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import DoctorUpdateProfile from '@/pages/DoctorUpdateProfile'; // Adjust path if needed

// 1. Mock Axios
vi.mock('axios');

// 2. Mock UI Components (shadcn/radix) to simplify testing
vi.mock('@/components/ui/card', () => ({
    Card: ({ children, className }) => <div className={className}>{children}</div>,
    CardContent: ({ children, className }) => <div className={className}>{children}</div>,
    CardHeader: ({ children, className }) => <div className={className}>{children}</div>,
    CardTitle: ({ children, className }) => <h2>{children}</h2>,
    CardDescription: ({ children }) => <p>{children}</p>,
}));

vi.mock('@/components/ui/input', () => ({
    Input: (props) => <input {...props} />,
}));

vi.mock('@/components/ui/textarea', () => ({
    Textarea: (props) => <textarea {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
    Label: ({ children, htmlFor }) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, type, disabled }) => (
        <button onClick={onClick} type={type} disabled={disabled}>
            {children}
        </button>
    ),
}));

// Mock Select components is tricky, using a simplified mock
vi.mock('@/components/ui/select', () => ({
    Select: ({ value, onValueChange, children }) => (
        <select 
            data-testid="specialization-select"
            value={value} 
            onChange={(e) => onValueChange(e.target.value)}
        >
            {children}
        </select>
    ),
    SelectTrigger: ({ children }) => <div>{children}</div>,
    SelectValue: () => null,
    SelectContent: ({ children }) => <>{children}</>,
    SelectItem: ({ value, children }) => <option value={value}>{children}</option>,
}));

// Mock UserProfileModal
vi.mock('@/components/UserProfileModal', () => ({
    UserProfileModal: () => <div data-testid="user-profile-modal"></div>
}));

// Mock React Router's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('DoctorUpdateProfile', () => {
    const mockDoctorData = {
        _id: '123',
        fullName: 'Dr. Strange',
        email: 'strange@marvel.com',
        userType: 'doctor',
        specialization: 'Neurology',
        experience: '15',
        licenseNumber: 'DOC-001',
        address: '177A Bleecker Street',
        consultationFee: '1000',
        bio: 'Sorcerer Supreme',
        phoneNumber: '1234567890'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Setup localStorage mock
        Storage.prototype.getItem = vi.fn(() => 'fake-token');
        // Mock window.alert
        window.alert = vi.fn();
    });

    it('redirects to login if no token is found', () => {
        Storage.prototype.getItem = vi.fn(() => null); // No token

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('fetches and populates doctor profile data on load', async () => {
        axios.get.mockResolvedValue({ data: mockDoctorData });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument();
        });

        expect(screen.getByDisplayValue('strange@marvel.com')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Neurology')).toBeInTheDocument();
        expect(screen.getByDisplayValue('15')).toBeInTheDocument();
        expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
    });

    it('shows error if user is not a doctor', async () => {
        axios.get.mockResolvedValue({ 
            data: { ...mockDoctorData, userType: 'patient' } 
        });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Access denied. Not a doctor account.')).toBeInTheDocument();
        });
    });

    it('updates input fields correctly', async () => {
        axios.get.mockResolvedValue({ data: mockDoctorData });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        const nameInput = screen.getByLabelText(/Full Name/i);
        fireEvent.change(nameInput, { target: { value: 'Dr. Stephen Strange' } });

        expect(nameInput.value).toBe('Dr. Stephen Strange');
    });

    it('validates phone number (only allows digits)', async () => {
        axios.get.mockResolvedValue({ data: mockDoctorData });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument());

        const phoneInput = screen.getByLabelText(/Phone Number/i);
        
        // Try entering letters
        fireEvent.change(phoneInput, { target: { name: 'phoneNumber', value: '123abc456' } });
        
        // Should strip letters (logic inside handleInputChange)
        expect(phoneInput.value).toBe('123456'); 
    });

    it('submits form successfully and redirects', async () => {
        axios.get.mockResolvedValue({ data: mockDoctorData });
        // Mock the PUT request response
        axios.put.mockResolvedValue({ 
            data: { 
                user: { ...mockDoctorData, fullName: 'Updated Name' }, 
                message: 'Success' 
            } 
        });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        // Submit the form
        const saveButton = screen.getByText(/Save Changes/i);
        fireEvent.click(saveButton);

        await waitFor(() => {
            // Verify PUT request payload
            expect(axios.put).toHaveBeenCalledWith(
                expect.stringContaining('/update-profile'),
                expect.objectContaining({
                    fullName: 'Dr. Strange', // or whatever current state is
                    specialization: 'Neurology'
                }),
                expect.any(Object)
            );
            
            // Verify success alert
            expect(window.alert).toHaveBeenCalledWith('Profile updated successfully!');
            
            // Verify redirection
            expect(mockNavigate).toHaveBeenCalledWith('/doctor/dashboard');
        });
    });

    it('displays error message on API failure during save', async () => {
        axios.get.mockResolvedValue({ data: mockDoctorData });
        axios.put.mockRejectedValue({ 
            response: { data: { message: 'Update failed' } } 
        });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        const saveButton = screen.getByText(/Save Changes/i);
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByText('Update failed')).toBeInTheDocument();
        });
    });

    it('shows validation error for invalid phone length on submit', async () => {
        axios.get.mockResolvedValue({ data: { ...mockDoctorData, phoneNumber: '123' } });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('123')).toBeInTheDocument());

        const saveButton = screen.getByText(/Save Changes/i);
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByText('Phone number must be exactly 10 digits.')).toBeInTheDocument();
        });
        
        // API should NOT be called if validation fails
        expect(axios.put).not.toHaveBeenCalled();
    });
});