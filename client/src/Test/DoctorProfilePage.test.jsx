import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import DoctorProfilePage from '@/pages/DoctorProfilePage'; // Adjust path if necessary

// 1. Mock Axios
vi.mock('axios');

// 2. Mock UI Components to isolate page logic and avoid animation issues in jsdom
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

vi.mock('@/components/ui/button', () => ({
    Button: ({ children, className, ...props }) => <button className={className} {...props}>{children}</button>,
}));

// 3. Mock Lucide Icons
vi.mock('lucide-react', () => ({
    Stethoscope: () => <span>Icon-Stethoscope</span>,
    Clock: () => <span>Icon-Clock</span>,
    Star: () => <span>Icon-Star</span>,
    MapPin: () => <span>Icon-MapPin</span>,
    IndianRupee: () => <span>Icon-Rupee</span>,
}));

describe('DoctorProfilePage', () => {
    const mockDoctor = {
        _id: '555',
        fullName: 'Dr. Sarah Smith',
        specialization: 'Dermatologist',
        bio: 'Expert in skin care.',
        experience: 12,
        address: '45 Skin Lane, Derma City',
        consultationFee: 800,
    };

    afterEach(() => {
        vi.clearAllMocks();
    });

    // TEST CASE 1: Loading State
    it('shows loading state initially', () => {
        axios.get.mockReturnValue(new Promise(() => { })); // Pending promise

        render(
            <MemoryRouter initialEntries={['/patient/doctor/555']}>
                <Routes>
                    <Route path="/patient/doctor/:id" element={<DoctorProfilePage />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Loading profile...')).toBeInTheDocument();
    });

    // TEST CASE 2: Successful Data Fetch and Render
    it('fetches and displays doctor details successfully', async () => {
        axios.get.mockResolvedValue({ data: mockDoctor });

        render(
            <MemoryRouter initialEntries={['/patient/doctor/555']}>
                <Routes>
                    <Route path="/patient/doctor/:id" element={<DoctorProfilePage />} />
                </Routes>
            </MemoryRouter>
        );

        // Wait for data to load
        await waitFor(() => {
            expect(screen.getByText('Dr. Sarah Smith')).toBeInTheDocument();
        });

        // Check Logic: API Call
        expect(axios.get).toHaveBeenCalledWith('https://smart-healthcare-appointment-and-triage.onrender.com/api/doctors/555');

        // Check UI: Profile Details
        expect(screen.getByText('Dermatologist')).toBeInTheDocument();
        expect(screen.getByText('Expert in skin care.')).toBeInTheDocument();
        expect(screen.getByText('About Dr. Smith')).toBeInTheDocument(); // Checks split logic
        expect(screen.getByText('12 years')).toBeInTheDocument();
        expect(screen.getByText('45 Skin Lane, Derma City')).toBeInTheDocument();
        expect(screen.getByText('₹800')).toBeInTheDocument();
        expect(screen.getByText('Verified')).toBeInTheDocument();

        // Check UI: Initials Fallback (Dr. Sarah Smith -> DSS)
        expect(screen.getByText('DSS')).toBeInTheDocument();
    });

    // TEST CASE 3: Error Handling
    it('displays error message when API fails', async () => {
        axios.get.mockRejectedValue(new Error('Network Error'));

        render(
            <MemoryRouter initialEntries={['/patient/doctor/555']}>
                <Routes>
                    <Route path="/patient/doctor/:id" element={<DoctorProfilePage />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/Could not fetch doctor profile/i)).toBeInTheDocument();
        });
    });

    // TEST CASE 4: Doctor Not Found (null data)
    it('displays "Doctor not found" if API returns null', async () => {
        axios.get.mockResolvedValue({ data: null });

        render(
            <MemoryRouter initialEntries={['/patient/doctor/555']}>
                <Routes>
                    <Route path="/patient/doctor/:id" element={<DoctorProfilePage />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Doctor not found.')).toBeInTheDocument();
        });
    });

    // TEST CASE 5: Navigation Links
    it('renders correct navigation links', async () => {
        axios.get.mockResolvedValue({ data: mockDoctor });

        render(
            <MemoryRouter initialEntries={['/patient/doctor/555']}>
                <Routes>
                    <Route path="/patient/doctor/:id" element={<DoctorProfilePage />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Book an Appointment')).toBeInTheDocument();
        });

        // Check Book Appointment Link
        const bookLink = screen.getByRole('link', { name: /book an appointment/i });
        expect(bookLink).toHaveAttribute('href', '/patient/book/555');

        // Check Back Link
        const backLink = screen.getByRole('link', { name: /back to search results/i });
        expect(backLink).toHaveAttribute('href', '/patient/doctors');
    });

    // TEST CASE 6: Bio Fallback
    it('renders default bio if none provided', async () => {
        const doctorNoBio = { ...mockDoctor, bio: '' };
        axios.get.mockResolvedValue({ data: doctorNoBio });

        render(
            <MemoryRouter initialEntries={['/patient/doctor/555']}>
                <Routes>
                    <Route path="/patient/doctor/:id" element={<DoctorProfilePage />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('No biography available.')).toBeInTheDocument();
        });
    });

    // TEST CASE 7: Missing ID (Branch Coverage)
    it('does not fetch data if ID is missing', () => {
        render(
            <MemoryRouter initialEntries={['/patient/doctor']}>
                <Routes>
                    {/* Route without :id param */}
                    <Route path="/patient/doctor" element={<DoctorProfilePage />} />
                </Routes>
            </MemoryRouter>
        );

        expect(axios.get).not.toHaveBeenCalled();
        // It stays in loading state indefinitely based on current component logic
        expect(screen.getByText('Loading profile...')).toBeInTheDocument();
    });
});