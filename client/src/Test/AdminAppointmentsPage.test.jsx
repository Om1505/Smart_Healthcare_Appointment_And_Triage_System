import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import axios from 'axios';
import AdminAppointmentsPage from '../pages/AdminAppointmentsPage';

// --- Mocks ---

// 1. Mock axios
vi.mock('axios');

// 2. Mock lucide-react icons
vi.mock('lucide-react', () => ({
    Loader2: () => <span data-testid="icon-loader" />,
    AlertCircle: () => <span data-testid="icon-alert" />,
    Calendar: () => <span data-testid="icon-calendar" />,
    ArrowLeft: () => <span data-testid="icon-arrowleft" />,
    CheckCircle: () => <span data-testid="icon-check" />,
    XCircle: () => <span data-testid="icon-x" />,
}));

// 3. Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        Link: ({ children, to }) => <a href={to}>{children}</a>,
    };
});

// 4. Mock shadcn/ui components
vi.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, ...props }) => (
        <button onClick={onClick} {...props}>{children}</button>
    ),
}));
vi.mock('@/components/ui/card', () => ({
    Card: ({ children }) => <div data-testid="card">{children}</div>,
    CardContent: ({ children }) => <div data-testid="card-content">{children}</div>,
    CardDescription: ({ children }) => <p>{children}</p>,
    CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
    CardTitle: ({ children }) => <h2 data-testid="card-title">{children}</h2>,
}));
vi.mock('@/components/ui/table', () => ({
    Table: ({ children }) => <table data-testid="table">{children}</table>,
    TableBody: ({ children }) => <tbody>{children}</tbody>,
    TableCell: ({ children, ...props }) => <td {...props}>{children}</td>,
    TableHead: ({ children }) => <th>{children}</th>,
    TableHeader: ({ children }) => <thead>{children}</thead>,
    TableRow: ({ children }) => <tr>{children}</tr>,
}));
vi.mock('@/components/ui/badge', () => ({
    Badge: ({ children, variant, ...props }) => (
        <span data-testid="badge" data-variant={variant} {...props}>{children}</span>
    ),
}));

// --- End Mocks ---

// --- Mock Data ---
const mockAppointments = [
    // For sorting test: upcoming2 (Nov 17) should appear before upcoming1 (Nov 18)
    {
        _id: 'a1',
        patient: { fullName: 'Alice Smith' },
        doctor: { fullName: 'Dr. John Doe', specialization: 'Cardiology' },
        date: '2025-11-18T10:00:00Z',
        time: '10:00 AM',
        status: 'upcoming',
    },
    {
        _id: 'a2',
        patient: { fullName: 'Bob Johnson' },
        doctor: { fullName: 'Dr. Jane Roe', specialization: 'Neurology' },
        date: '2025-11-17T14:00:00Z',
        time: '02:00 PM',
        status: 'upcoming',
    },
    {
        _id: 'a3',
        patient: { fullName: 'Charlie Brown' },
        doctor: { fullName: 'Dr. John Doe', specialization: 'Cardiology' },
        date: '2025-11-15T09:00:00Z',
        time: '09:00 AM',
        status: 'completed',
    },
    {
        _id: 'a4',
        patient: { fullName: 'David Lee' },
        doctor: { fullName: 'Dr. Emily White', specialization: 'Pediatrics' },
        date: '2025-11-14T11:00:00Z',
        time: '11:00 AM',
        status: 'cancelled',
    },
];

// --- Helper ---
const renderComponent = () => {
    render(
        <MemoryRouter initialEntries={['/admin/appointments']}>
            <Routes>
                <Route path="/admin/appointments" element={<AdminAppointmentsPage />} />
                <Route path="/login" element={<div>Login Page</div>} />
                <Route path="/admin/dashboard" element={<div>Admin Dashboard</div>} />
            </Routes>
        </MemoryRouter>
    );
};

// --- Test Suite ---
describe('AdminAppointmentsPage', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        axios.get.mockReset();
    });

    it('redirects to /login if no token is found', async () => {
        renderComponent();
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });
        expect(screen.getByText('Error: Authorization token not found. Please log in.')).toBeInTheDocument();
    });

    it('shows loading state initially', () => {
        localStorage.setItem('token', 'fake-token');
        axios.get.mockImplementation(() => new Promise(() => { })); // Pending promise
        renderComponent();
        expect(screen.getByText('Loading Appointments...')).toBeInTheDocument();
    });

    it('shows a generic error message if API call fails', async () => {
        localStorage.setItem('token', 'fake-token');
        axios.get.mockRejectedValue(new Error('Network Error'));
        renderComponent();
        const errorMsg = await screen.findByText('Error: An error occurred while fetching data.');
        expect(errorMsg).toBeInTheDocument();
    });

    it('shows a specific error message from the API', async () => {
        localStorage.setItem('token', 'fake-token');
        const apiError = { response: { data: { message: 'Admin access required' } } };
        axios.get.mockRejectedValue(apiError);
        renderComponent();
        const errorMsg = await screen.findByText('Error: Admin access required');
        expect(errorMsg).toBeInTheDocument();
    });

    it('navigates to dashboard when error button is clicked', async () => {
        localStorage.setItem('token', 'fake-token');
        axios.get.mockRejectedValue(new Error('Network Error'));
        renderComponent();
        const errorButton = await screen.findByRole('button', { name: /Back to Dashboard/i });
        fireEvent.click(errorButton);
        expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
    });

    it('fetches, sorts, and displays appointments on success', async () => {
        localStorage.setItem('token', 'fake-token');
        axios.get.mockResolvedValue({ data: mockAppointments });
        renderComponent();

        // Wait for loading to finish
        await waitFor(() => {
            expect(screen.queryByText('Loading Appointments...')).not.toBeInTheDocument();
        });

        // Check Upcoming table
        const upcomingTable = screen.getByText('Upcoming Appointments').closest('[data-testid="card"]');
        expect(within(upcomingTable).getByText('Alice Smith')).toBeInTheDocument();
        expect(within(upcomingTable).getByText('Bob Johnson')).toBeInTheDocument();

        // Check sorting: Bob (Nov 17) should be before Alice (Nov 18)
        const upcomingRows = within(upcomingTable).getAllByRole('row');
        const rowText = upcomingRows.map(row => row.textContent).join(' ');
        expect(rowText.indexOf('Bob Johnson')).toBeLessThan(rowText.indexOf('Alice Smith'));

        // Check Cancelled table
        const cancelledTable = screen.getByText('Cancelled Appointments').closest('[data-testid="card"]');
        expect(within(cancelledTable).getByText('David Lee')).toBeInTheDocument();

        // Check Completed table
        const completedTable = screen.getByText('Completed Appointments').closest('[data-testid="card"]');
        expect(within(completedTable).getByText('Charlie Brown')).toBeInTheDocument();

        // Check API call
        expect(axios.get).toHaveBeenCalledWith(
            'http://localhost:5001/api/admin/appointments',
            { headers: { 'Authorization': 'Bearer fake-token' } }
        );
    });

    it('shows "no appointments" message for all empty categories', async () => {
        localStorage.setItem('token', 'fake-token');
        axios.get.mockResolvedValue({ data: [] }); // Return empty array
        renderComponent();

        // Wait for loading to finish
        await waitFor(() => {
            expect(screen.queryByText('Loading Appointments...')).not.toBeInTheDocument();
        });

        // Check for the "empty" message in all three tables
        const emptyMessages = await screen.findAllByText('No appointments found in this category.');
        expect(emptyMessages).toHaveLength(3);
    });

    it('handles null/undefined data in appointments gracefully', async () => {
        localStorage.setItem('token', 'fake-token');
        const mockNullAppt = {
            _id: 'a5',
            patient: null,
            doctor: null,
            date: '2025-11-20T10:00:00Z',
            time: '10:00 AM',
            status: 'upcoming',
        };
        axios.get.mockResolvedValue({ data: [mockNullAppt] });
        renderComponent();

        // Wait for loading to finish
        await waitFor(() => {
            expect(screen.queryByText('Loading Appointments...')).not.toBeInTheDocument();
        });

        const upcomingTable = screen.getByText('Upcoming Appointments').closest('[data-testid="card"]');

        // FIX: This assertion is now specific and correct
        const naCells = await within(upcomingTable).findAllByText('N/A');
        expect(naCells).toHaveLength(3); // patient.fullName, doctor.fullName, doctor.specialization
    });

    it('navigates to dashboard when main back button is clicked', async () => {
        localStorage.setItem('token', 'fake-token');
        axios.get.mockResolvedValue({ data: [] });
        renderComponent();

        // Wait for the button to be available (not in loading state)
        const backButton = await screen.findByRole('button', { name: /Back to Dashboard/i });
        fireEvent.click(backButton);
        expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
    });

    it('renders the default badge for an unknown status', async () => {
        localStorage.setItem('token', 'fake-token');
        const mockDefaultAppt = {
            _id: 'a6',
            patient: { fullName: 'Test Patient' },
            doctor: { fullName: 'Test Doctor', specialization: 'Test' },
            date: '2025-11-20T10:00:00Z',
            time: '10:00 AM',
            status: 'rescheduled', // An unknown status
        };
        axios.get.mockResolvedValue({ data: [mockDefaultAppt] });
        renderComponent();

        // Wait for loading to finish
        await waitFor(() => {
            expect(screen.queryByText('Loading Appointments...')).not.toBeInTheDocument();
        });

        // Now this test will pass because 'rescheduled' is in the 'upcoming' list
        const defaultBadge = await screen.findByText('rescheduled');

        expect(defaultBadge).toBeInTheDocument();
        expect(defaultBadge).toHaveAttribute('data-testid', 'badge');
        expect(defaultBadge).toHaveAttribute('data-variant', 'outline');
    });

});