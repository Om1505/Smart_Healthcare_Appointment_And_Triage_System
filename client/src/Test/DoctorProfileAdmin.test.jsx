import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import DoctorProfilePage from '../src/pages/DoctorProfileAdmin'; // Adjust path if needed

// Mock axios
vi.mock('axios');

// Mock UI components to avoid issues with shadcn/radix dependencies during testing
vi.mock('@/components/ui/card', () => ({
    Card: ({ children, className }) => <div className={className} data-testid="card">{children}</div>,
    CardContent: ({ children, className }) => <div className={className}>{children}</div>,
    CardHeader: ({ children, className }) => <div className={className}>{children}</div>,
    CardTitle: ({ children, className }) => <h2 className={className}>{children}</h2>,
}));

vi.mock('@/components/ui/avatar', () => ({
    Avatar: ({ children, className }) => <div className={className}>{children}</div>,
    AvatarImage: ({ src, alt }) => <img src={src} alt={alt} />,
    AvatarFallback: ({ children }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/badge', () => ({
    Badge: ({ children, className }) => <span className={className}>{children}</span>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
    Stethoscope: () => <span>Icon-Stethoscope</span>,
    Clock: () => <span>Icon-Clock</span>,
    MapPin: () => <span>Icon-MapPin</span>,
    IndianRupee: () => <span>Icon-Rupee</span>,
    ArrowLeft: () => <span>Icon-ArrowLeft</span>,
}));

describe('DoctorProfilePage', () => {
    const mockDoctor = {
        _id: '123',
        fullName: 'Dr. John Doe',
        specialization: 'Cardiologist',
        experience: 10,
        address: '123 Health St, Wellness City',
        consultationFee: 500,
        licenseNumber: 'LIC-98765',
    };

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('shows loading state initially', () => {
        // Mock a pending promise to keep it in loading state
        axios.get.mockReturnValue(new Promise(() => { }));

        render(
            <MemoryRouter initialEntries={['/admin/doctor/123']}>
                <Routes>
                    <Route path="/admin/doctor/:id" element={<DoctorProfilePage />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Loading profile...')).toBeInTheDocument();
    });

    it('fetches and displays doctor details successfully', async () => {
        axios.get.mockResolvedValue({ data: mockDoctor });

        render(
            <MemoryRouter initialEntries={['/admin/doctor/123']}>
                <Routes>
                    <Route path="/admin/doctor/:id" element={<DoctorProfilePage />} />
                </Routes>
            </MemoryRouter>
        );

        // Wait for the loading to finish and data to appear
        await waitFor(() => {
            expect(screen.getByText('Dr. John Doe')).toBeInTheDocument();
        });

        // Check if specific details are rendered
        expect(screen.getByText('Cardiologist')).toBeInTheDocument();
        expect(screen.getByText('10 years')).toBeInTheDocument();
        expect(screen.getByText('123 Health St, Wellness City')).toBeInTheDocument();
        expect(screen.getByText('₹500')).toBeInTheDocument();
        expect(screen.getByText('LIC-98765')).toBeInTheDocument();

        // Check if API was called with correct ID
        expect(axios.get).toHaveBeenCalledWith('https://smart-healthcare-appointment-and-triage.onrender.com/api/doctors/123');
    });

    it('displays error message when API call fails', async () => {
        axios.get.mockRejectedValue(new Error('API Error'));

        render(
            <MemoryRouter initialEntries={['/admin/doctor/123']}>
                <Routes>
                    <Route path="/admin/doctor/:id" element={<DoctorProfilePage />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Could not fetch doctor profile.')).toBeInTheDocument();
        });
    });

    it('displays "Doctor not found" when API returns null data', async () => {
        // Case where API call succeeds but returns null/empty data
        axios.get.mockResolvedValue({ data: null });

        render(
            <MemoryRouter initialEntries={['/admin/doctor/123']}>
                <Routes>
                    <Route path="/admin/doctor/:id" element={<DoctorProfilePage />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Doctor not found.')).toBeInTheDocument();
        });
    });

    it('renders back link correctly', async () => {
        axios.get.mockResolvedValue({ data: mockDoctor });

        render(
            <MemoryRouter initialEntries={['/admin/doctor/123']}>
                <Routes>
                    <Route path="/admin/doctor/:id" element={<DoctorProfilePage />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
        });

        const backLink = screen.getByRole('link', { name: /back to dashboard/i });
        expect(backLink).toHaveAttribute('href', '/admin/dashboard');
    });

    it('renders avatar fallback correctly', async () => {
        axios.get.mockResolvedValue({ data: mockDoctor }); // Dr. John Doe

        render(
            <MemoryRouter initialEntries={['/admin/doctor/123']}>
                <Routes>
                    <Route path="/admin/doctor/:id" element={<DoctorProfilePage />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            // "DJD" are the initials for "Dr. John Doe"
            expect(screen.getByText('DJD')).toBeInTheDocument();
        });
    });
});