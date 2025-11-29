import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import DoctorProfilePage from '@/pages/DoctorProfileAdmin';

vi.mock('axios');

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
        profilePicture: 'http://example.com/pic.jpg'
    };

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('shows loading state initially', () => {
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

        await waitFor(() => {
            expect(screen.getByText('Dr. John Doe')).toBeInTheDocument();
        });

        expect(screen.getByText('Cardiologist')).toBeInTheDocument();
        expect(screen.getByText('10 years')).toBeInTheDocument();
        expect(screen.getByText('123 Health St, Wellness City')).toBeInTheDocument();
        expect(screen.getByText('₹500')).toBeInTheDocument();
        expect(screen.getByText('LIC-98765')).toBeInTheDocument();

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
            const backLink = screen.getByRole('link', { name: /back to dashboard/i });
            expect(backLink).toHaveAttribute('href', '/admin/dashboard');
        });
    });

    it('renders avatar fallback correctly', async () => {
        axios.get.mockResolvedValue({ data: mockDoctor });

        render(
            <MemoryRouter initialEntries={['/admin/doctor/123']}>
                <Routes>
                    <Route path="/admin/doctor/:id" element={<DoctorProfilePage />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('DJD')).toBeInTheDocument();
        });
    });

    it('handles missing ID correctly (skips API call)', async () => {
        render(
            <MemoryRouter initialEntries={['/admin/doctor']}>
                <Routes>
                    <Route path="/admin/doctor" element={<DoctorProfilePage />} />
                </Routes>
            </MemoryRouter>
        );

        expect(axios.get).not.toHaveBeenCalled();

        await waitFor(() => {
            expect(screen.getByText('No doctor ID provided.')).toBeInTheDocument();
        });
    });
});