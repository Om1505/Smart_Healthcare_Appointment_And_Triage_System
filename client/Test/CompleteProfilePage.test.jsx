import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';
import axios from 'axios';
import CompleteProfilePage from '@/pages/CompleteProfilePage';

// --- Mocks ---
vi.mock('axios');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        Link: ({ children, to }) => <a href={to}>{children}</a>,
    };
});

vi.mock('lucide-react', () => ({
    Stethoscope: () => <span data-testid="icon-stethoscope" />,
}));

vi.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, disabled, type }) => (
        <button onClick={onClick} disabled={disabled} type={type}>{children}</button>
    ),
}));
vi.mock('@/components/ui/card', () => ({
    Card: ({ children }) => <div data-testid="card">{children}</div>,
    CardContent: ({ children }) => <div>{children}</div>,
    CardDescription: ({ children }) => <p>{children}</p>,
    CardHeader: ({ children }) => <div>{children}</div>,
    CardTitle: ({ children }) => <h2>{children}</h2>,
}));
vi.mock('@/components/ui/input', () => ({
    Input: ({ value, onChange, id, name, ...props }) => (
        <input
            value={value || ''}
            onChange={onChange}
            id={id}
            name={name}
            data-testid={id}
            {...props}
        />
    ),
}));
vi.mock('@/components/ui/label', () => ({
    Label: ({ children, htmlFor }) => <label htmlFor={htmlFor}>{children}</label>,
}));
vi.mock('@/components/ui/textarea', () => ({
    Textarea: ({ value, onChange, id, name }) => (
        <textarea
            value={value || ''}
            onChange={onChange}
            id={id}
            name={name}
            data-testid={id}
        />
    ),
}));

vi.mock('@/components/ui/select', () => ({
    Select: ({ children, onValueChange, value }) => (
        <select
            data-testid="select"
            value={value || ''}
            onChange={(e) => onValueChange(e.target.value)}
        >
            {children}
            <option value="alien">Alien</option>
        </select>
    ),
    SelectContent: ({ children }) => <>{children}</>,
    SelectItem: ({ children, value }) => <option value={value}>{children}</option>,
    SelectTrigger: ({ children }) => <>{children}</>, // Render children without wrapper
    SelectValue: ({ placeholder }) => <option value="" disabled>{placeholder}</option>,
}));

window.alert = vi.fn();

// --- Constants ---
const BASE_URL = 'https://smart-healthcare-appointment-and-triage.onrender.com';

// --- Mock Data ---
const mockProfile = {
    fullName: 'Test User',
    email: 'test@example.com',
};

// --- Helper Functions ---
const renderComponent = () => {
    render(
        <MemoryRouter initialEntries={['/complete-profile']}>
            <Routes>
                <Route path="/complete-profile" element={<CompleteProfilePage />} />
                <Route path="/login" element={<div>Login Page</div>} />
                <Route path="/patient/dashboard" element={<div>Patient Dashboard</div>} />
                <Route path="/doctor/dashboard" element={<div>Doctor Dashboard</div>} />
                <Route path="/admin/dashboard" element={<div>Admin Dashboard</div>} />
                <Route path="/" element={<div>Home Page</div>} />
            </Routes>
        </MemoryRouter>
    );
};

const fillDoctorForm = async () => {
    const roleSelect = await screen.findByTestId('select');
    fireEvent.change(roleSelect, { target: { value: 'doctor' } });

    // Find specialty select
    const specSelect = (await screen.findByText('Select your specialty')).closest('select');

    fireEvent.change(specSelect, { target: { value: 'Cardiology' } });
    fireEvent.change(screen.getByTestId('experience'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('consultationFee'), { target: { value: '1500' } });
    fireEvent.change(screen.getByTestId('licenseNumber'), { target: { value: 'DOC123' } });
    fireEvent.change(screen.getByTestId('address'), { target: { value: '123 Health St' } });
    fireEvent.change(screen.getByTestId('bio'), { target: { value: 'A test bio' } });
};

// --- Test Suite ---
describe('CompleteProfilePage', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        axios.get.mockResolvedValue({ data: mockProfile });
        axios.put.mockResolvedValue({ data: { message: 'Profile updated' } });
        localStorage.setItem('token', 'fake-token');
        vi.spyOn(Storage.prototype, 'setItem');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('redirects to /login if no token is found on mount', async () => {
        localStorage.removeItem('token');
        renderComponent();
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });
    });

    it('fetches and displays user info on mount', async () => {
        renderComponent();
        expect(await screen.findByText(/Welcome, Test User!/i)).toBeInTheDocument();
        expect(screen.getByText(/You signed in with Google \(test@example.com\)/i)).toBeInTheDocument();
        expect(axios.get).toHaveBeenCalledWith(`${BASE_URL}/api/users/profile`, expect.any(Object));
    });

    it('handles profile fetch failure', async () => {
        axios.get.mockRejectedValue(new Error('Failed to fetch'));
        renderComponent();
        expect(await screen.findByText(/Welcome, Loading.../i)).toBeInTheDocument();
    });

    it('shows error and redirects if no token on submit', async () => {
        renderComponent();
        await screen.findByText(/Welcome, Test User!/i);

        localStorage.removeItem('token');

        const submitButton = screen.getByRole('button', { name: /Complete Profile/i });
        fireEvent.click(submitButton);

        expect(await screen.findByText('Authentication error. Please log in again.')).toBeInTheDocument();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('shows alert if no role is selected', async () => {
        renderComponent();
        await screen.findByText(/Welcome, Test User!/i);

        const submitButton = screen.getByRole('button', { name: /Complete Profile/i });
        fireEvent.click(submitButton);

        expect(window.alert).toHaveBeenCalledWith('Please select your role.');
        expect(axios.put).not.toHaveBeenCalled();
    });

    it('submits as a Patient and navigates to patient dashboard', async () => {
        renderComponent();
        await screen.findByText(/Welcome, Test User!/i);

        const roleSelect = screen.getByTestId('select');
        fireEvent.change(roleSelect, { target: { value: 'patient' } });

        const submitButton = screen.getByRole('button', { name: /Complete Profile/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(axios.put).toHaveBeenCalledWith(
                `${BASE_URL}/api/users/complete-profile`,
                { userType: 'patient' },
                expect.any(Object)
            );
        });
        expect(mockNavigate).toHaveBeenCalledWith('/patient/dashboard');
    });

    it('submits as an Admin and navigates to admin dashboard', async () => {
        renderComponent();
        await screen.findByText(/Welcome, Test User!/i);

        const roleSelect = screen.getByTestId('select');
        fireEvent.change(roleSelect, { target: { value: 'admin' } });

        const submitButton = screen.getByRole('button', { name: /Complete Profile/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(axios.put).toHaveBeenCalledWith(
                `${BASE_URL}/api/users/complete-profile`,
                { userType: 'admin' },
                expect.any(Object)
            );
        });
        expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
    });

    it('shows doctor fields when "Doctor" is selected', async () => {
        renderComponent();
        await screen.findByText(/Welcome, Test User!/i);

        expect(screen.queryByText('Doctor Details')).not.toBeInTheDocument();

        const roleSelect = screen.getByTestId('select');
        fireEvent.change(roleSelect, { target: { value: 'doctor' } });

        expect(await screen.findByText('Doctor Details')).toBeInTheDocument();
        const specSelect = screen.getByText('Select your specialty');
        expect(specSelect).toBeInTheDocument();
        expect(screen.getByTestId('experience')).toBeInTheDocument();
    });

    it('submits as a Doctor with all fields and navigates to doctor dashboard', async () => {
        renderComponent();
        await screen.findByText(/Welcome, Test User!/i);

        await act(async () => {
            await fillDoctorForm();
        });

        const submitButton = screen.getByRole('button', { name: /Complete Profile/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(axios.put).toHaveBeenCalledWith(
                `${BASE_URL}/api/users/complete-profile`,
                expect.objectContaining({
                    userType: 'doctor',
                    specialization: 'Cardiology',
                    licenseNumber: 'DOC123',
                }),
                expect.any(Object)
            );
        });
        expect(mockNavigate).toHaveBeenCalledWith('/doctor/dashboard');
    });

    it('updates localStorage if a new token is returned', async () => {
        axios.put.mockResolvedValue({
            data: { message: 'Profile updated', token: 'new-fake-token' }
        });

        renderComponent();
        await screen.findByText(/Welcome, Test User!/i);

        const roleSelect = screen.getByTestId('select');
        fireEvent.change(roleSelect, { target: { value: 'patient' } });

        const submitButton = screen.getByRole('button', { name: /Complete Profile/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(localStorage.setItem).toHaveBeenCalledWith('token', 'new-fake-token');
        });
    });

    it('displays an error message if submission fails', async () => {
        axios.put.mockRejectedValue({
            response: { data: { message: 'License number already in use' } }
        });

        renderComponent();
        await screen.findByText(/Welcome, Test User!/i);

        const roleSelect = screen.getByTestId('select');
        fireEvent.change(roleSelect, { target: { value: 'patient' } });

        const submitButton = screen.getByRole('button', { name: /Complete Profile/i });
        fireEvent.click(submitButton);

        expect(await screen.findByText('License number already in use')).toBeInTheDocument();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('handles a generic network error on submit', async () => {
        axios.put.mockRejectedValue(new Error('Network failed'));
        const consoleErrorSpy = vi.spyOn(console, 'error');

        renderComponent();
        await screen.findByText(/Welcome, Test User!/i);

        const roleSelect = screen.getByTestId('select');
        fireEvent.change(roleSelect, { target: { value: 'patient' } });

        const submitButton = screen.getByRole('button', { name: /Complete Profile/i });
        fireEvent.click(submitButton);

        expect(await screen.findByText('An error occurred while completing your profile.')).toBeInTheDocument();
        expect(consoleErrorSpy).toHaveBeenCalledWith("Profile completion error:", expect.any(Error));
        consoleErrorSpy.mockRestore();
    });

    it('navigates to home if an unknown role is submitted', async () => {
        renderComponent();
        await screen.findByText(/Welcome, Test User!/i);

        const roleSelect = screen.getByTestId('select');
        
        // Manually trigger change with the "alien" value which we injected into the mock
        fireEvent.change(roleSelect, { target: { value: 'alien' } });

        const submitButton = screen.getByRole('button', { name: /Complete Profile/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(axios.put).toHaveBeenCalledWith(
                `${BASE_URL}/api/users/complete-profile`,
                { userType: 'alien' },
                expect.any(Object)
            );
        });
        
        expect(mockNavigate).toHaveBeenCalledWith('/');
    });
});