import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import DoctorEarningsPage from '@/pages/EarningPage'; // Adjust path if needed

// 1. Mock Axios
vi.mock('axios');

// 2. Mock UI Components
vi.mock('@/components/ui/card', () => ({
    Card: ({ children, className }) => <div className={className}>{children}</div>,
    CardContent: ({ children, className }) => <div className={className}>{children}</div>,
    CardHeader: ({ children, className }) => <div className={className}>{children}</div>,
    CardTitle: ({ children, className }) => <h2>{children}</h2>,
    CardDescription: ({ children }) => <p>{children}</p>,
}));

vi.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, className }) => (
        <button onClick={onClick} className={className}>
            {children}
        </button>
    ),
}));

vi.mock('@/components/ui/avatar', () => ({
    Avatar: ({ children }) => <div>{children}</div>,
    AvatarImage: ({ src, alt }) => <img src={src} alt={alt} />,
    AvatarFallback: ({ children }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/badge', () => ({
    Badge: ({ children, className }) => <span className={className}>{children}</span>,
}));

// Mock Select for easier testing
vi.mock('@/components/ui/select', () => ({
    Select: ({ value, onValueChange, children }) => (
        <select 
            data-testid="status-filter"
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

// Mock DropdownMenu
vi.mock('@/components/ui/dropdown-menu', () => ({
    DropdownMenu: ({ children }) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }) => <button>{children}</button>,
    DropdownMenuContent: ({ children }) => <div>{children}</div>,
    DropdownMenuItem: ({ children, onClick }) => <div onClick={onClick}>{children}</div>,
    DropdownMenuLabel: ({ children }) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
}));

// Mock UserProfileModal
vi.mock('@/components/UserProfileModal', () => ({
    UserProfileModal: () => <div data-testid="user-profile-modal"></div>
}));

// Mock window.URL and document methods for file download test
window.URL.createObjectURL = vi.fn();
window.URL.revokeObjectURL = vi.fn();

describe('DoctorEarningsPage', () => {
    const mockEarningsData = {
        today: 5000,
        thisWeek: 25000,
        thisMonth: 100000,
        totalEarnings: 1200000,
        recentTransactions: [
            { id: '1', patientName: 'John Doe', status: 'completed', amount: 500, date: '2023-10-01', time: '10:00 AM' },
            { id: '2', patientName: 'Jane Smith', status: 'upcoming', amount: 800, date: '2023-10-02', time: '11:00 AM' },
        ],
        monthlyBreakdown: [
            { month: 'September', earnings: 90000, appointments: 45 },
            { month: 'October', earnings: 100000, appointments: 50 },
        ]
    };

    const mockDoctorProfile = {
        fullName: 'Dr. Stephen Strange',
        email: 'strange@marvel.com',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        Storage.prototype.getItem = vi.fn(() => 'fake-token');
        window.location = { href: '' }; // Mock window.location
    });

    it('shows loading state initially', () => {
        axios.get.mockReturnValue(new Promise(() => {})); // Pending promise

        render(
            <MemoryRouter>
                <DoctorEarningsPage />
            </MemoryRouter>
        );

        expect(screen.getByText('Loading Earnings Dashboard...')).toBeInTheDocument();
    });

    it('redirects to login if no token is found', () => {
        Storage.prototype.getItem = vi.fn(() => null);

        render(
            <MemoryRouter>
                <DoctorEarningsPage />
            </MemoryRouter>
        );

        expect(window.location.href).toBe('/login');
    });

    it('fetches and displays earnings data successfully', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/earnings/data')) return Promise.resolve({ data: mockEarningsData });
            if (url.includes('/profile')) return Promise.resolve({ data: mockDoctorProfile });
            return Promise.reject(new Error('not found'));
        });

        render(
            <MemoryRouter>
                <DoctorEarningsPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Earnings Dashboard')).toBeInTheDocument();
        });

        // Check Earnings Cards (formatted with commas)
        expect(screen.getByText('₹5,000')).toBeInTheDocument(); // Today
        expect(screen.getByText('₹25,000')).toBeInTheDocument(); // This Week
        expect(screen.getByText('₹1,00,000')).toBeInTheDocument(); // This Month
        expect(screen.getByText('₹12,00,000')).toBeInTheDocument(); // Total

        // Check Transactions
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();

        // Check Breakdown
        expect(screen.getByText('September')).toBeInTheDocument();
        expect(screen.getByText('October')).toBeInTheDocument();
    });

    it('filters transactions correctly', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/earnings/data')) return Promise.resolve({ data: mockEarningsData });
            if (url.includes('/profile')) return Promise.resolve({ data: mockDoctorProfile });
            return Promise.reject(new Error('not found'));
        });

        render(
            <MemoryRouter>
                <DoctorEarningsPage />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

        const filterSelect = screen.getByTestId('status-filter');
        
        // Filter by 'completed'
        fireEvent.change(filterSelect, { target: { value: 'completed' } });
        
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument(); // Should be hidden

        // Filter by 'upcoming'
        fireEvent.change(filterSelect, { target: { value: 'upcoming' } });
        
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument(); // Should be hidden
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('handles download report functionality', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/earnings/data')) return Promise.resolve({ data: mockEarningsData });
            if (url.includes('/profile')) return Promise.resolve({ data: mockDoctorProfile });
            if (url.includes('/download-report')) return Promise.resolve({ 
                data: new Blob(['csv data'], { type: 'text/csv' }),
                headers: { 'content-disposition': 'attachment; filename="report.csv"' }
            });
            return Promise.reject(new Error('not found'));
        });

        render(
            <MemoryRouter>
                <DoctorEarningsPage />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByText('Download Report')).toBeInTheDocument());

        const downloadBtn = screen.getByText('Download Report');
        fireEvent.click(downloadBtn);

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('/download-report'),
                expect.objectContaining({ responseType: 'blob' })
            );
        });
        
        // Verify URL object creation (part of download process)
        expect(window.URL.createObjectURL).toHaveBeenCalled();
    });

    it('displays error message on API failure', async () => {
        axios.get.mockRejectedValue(new Error('API Error'));

        render(
            <MemoryRouter>
                <DoctorEarningsPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/Failed to fetch earnings data/i)).toBeInTheDocument();
        });
    });

    it('logs out the user correctly', async () => {
        axios.get.mockResolvedValue({ data: mockEarningsData }); // Simple mock to pass loading

        render(
            <MemoryRouter>
                <DoctorEarningsPage />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByText('Logout')).toBeInTheDocument());

        const logoutBtn = screen.getByText('Logout');
        fireEvent.click(logoutBtn);

        expect(localStorage.getItem('token')).toBeNull(); // Or undefined depending on implementation
        expect(window.location.href).toBe('/login');
    });
});