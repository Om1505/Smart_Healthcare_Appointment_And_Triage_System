import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, beforeEach, it, expect, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import AdminAppointmentsPage from '../src/pages/AdminAppointmentsPage';

// --- Mocks ---
vi.mock('axios');

vi.mock('lucide-react', () => ({
    Loader2: () => <span data-testid="icon-loader" />,
    AlertCircle: () => <span data-testid="icon-alert" />,
    Calendar: () => <span data-testid="icon-calendar" />,
    ArrowLeft: () => <span data-testid="icon-arrowleft" />,
    CheckCircle: () => <span data-testid="icon-check" />,
    XCircle: () => <span data-testid="icon-x" />,
    LogOut: () => <span data-testid="icon-logout" />,
    User: () => <span data-testid="icon-user" />,
    Mail: () => <span data-testid="icon-mail" />,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        Link: ({ children, to }) => <a href={to}>{children}</a>,
    };
});

// UI Component mocks
vi.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, ...props }) => <button onClick={onClick} {...props}>{children}</button>,
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
    Badge: ({ children, variant, className, ...props }) => (
        <span data-testid="badge" data-variant={variant} className={className} {...props}>{children}</span>
    ),
}));

// --- Constants ---
const BASE_URL = 'https://smart-healthcare-appointment-and-triage.onrender.com';

// --- Mock Data ---
const mockAdminProfile = {
    fullName: 'Super Admin',
    email: 'admin@example.com',
    userType: 'admin'
};

const mockAppointments = [
    {
        _id: 'a1',
        patientNameForVisit: 'Alice Smith',
        doctor: { fullName: 'Dr. John Doe', specialization: 'Cardiology' },
        date: '2025-11-18T10:00:00Z',
        time: '10:00 AM',
        status: 'upcoming',
    },
    {
        _id: 'a2',
        patientNameForVisit: 'Bob Johnson',
        doctor: { fullName: 'Dr. Jane Roe', specialization: 'Neurology' },
        date: '2025-11-17T14:00:00Z',
        time: '02:00 PM',
        status: 'upcoming',
    },
];

// --- Helper ---
const setupAxiosSuccess = (appointmentsData = mockAppointments, profileData = mockAdminProfile) => {
    axios.get.mockImplementation((url) => {
        if (url.includes('/users/profile')) {
            return Promise.resolve({ data: profileData });
        }
        if (url.includes('/admin/appointments')) {
            return Promise.resolve({ data: appointmentsData });
        }
        return Promise.reject(new Error('Unknown URL'));
    });
};

const renderComponent = () => {
    return render(
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

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // --- 1. BASIC RENDER & LOADING ---

    it('shows loading state initially', () => {
        localStorage.setItem('token', 'fake-token');
        axios.get.mockImplementation(() => new Promise(() => { }));
        renderComponent();
        expect(screen.getByText('Loading Appointments...')).toBeInTheDocument();
    });

    // --- 2. AUTHENTICATION & SECURITY (Strict Checks) ---

    it('redirects to /login and does not fetch data if no token is found', async () => {
        renderComponent();
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });
        expect(axios.get).not.toHaveBeenCalled();
    });

    it('redirects to login if user is not an admin', async () => {
        localStorage.setItem('token', 'fake-token');
        const patientProfile = { ...mockAdminProfile, userType: 'patient' };

        setupAxiosSuccess([], patientProfile);

        renderComponent();

        const errorMsg = await screen.findByText('Error: Access Denied. You are not an admin.');
        expect(errorMsg).toBeInTheDocument();

        expect(localStorage.getItem('token')).toBeNull();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    // --- 3. ERROR HANDLING (Strict Checks) ---

    it('logs error and shows generic message if API call fails', async () => {
        localStorage.setItem('token', 'fake-token');
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        axios.get.mockRejectedValue(new Error('Network Error'));

        renderComponent();

        const errorMsg = await screen.findByText(/Error: (Failed to fetch admin profile\.|An error occurred while fetching data\.)/);
        expect(errorMsg).toBeInTheDocument();
        
        // Kill mutant: Removing console.error
        expect(consoleSpy).toHaveBeenCalled();
    });

    it('shows default error message when backend response is empty', async () => {
        localStorage.setItem('token', 'fake-token');
        setupAxiosSuccess();
        
        // Mock appointment fetch failure without a response message
        axios.get.mockImplementation((url) => {
            if (url.includes('/users/profile')) return Promise.resolve({ data: mockAdminProfile });
            if (url.includes('/admin/appointments')) return Promise.reject({ response: {} }); // No message
            return Promise.reject(new Error('Unknown URL'));
        });

        renderComponent();

        await waitFor(() => {
            expect(screen.getByText(/Error: An error occurred while fetching data./)).toBeInTheDocument();
        });
    });

    // --- 4. DATA FETCHING & SORTING (Strict Checks) ---

    it('calls API with correct URL and Headers', async () => {
        // Kill mutant: Changing URL or removing Authorization header
        localStorage.setItem('token', 'fake-token');
        setupAxiosSuccess();
        renderComponent();
    
        await waitFor(() => expect(screen.queryByText('Loading Appointments...')).not.toBeInTheDocument());
    
        expect(axios.get).toHaveBeenCalledWith(
            'https://smart-healthcare-appointment-and-triage.onrender.com/api/admin/appointments',
            { headers: { 'Authorization': 'Bearer fake-token' } }
        );
    });

    it('correctly filters "rescheduled" into upcoming and sorts by date', async () => {
        localStorage.setItem('token', 'fake-token');
        
        const mixedAppointments = [
            {
                _id: 'a1',
                patientNameForVisit: 'Later Date',
                doctor: { fullName: 'Dr. A' },
                date: '2025-12-01T10:00:00Z', 
                time: '10:00 AM',
                status: 'upcoming',
            },
            {
                _id: 'a2',
                patientNameForVisit: 'Earlier Date',
                doctor: { fullName: 'Dr. B' },
                date: '2025-11-01T10:00:00Z', 
                time: '10:00 AM',
                status: 'rescheduled', // Mutant killer: Must appear in Upcoming
            }
        ];

        setupAxiosSuccess(mixedAppointments);
        renderComponent();

        await waitFor(() => {
            expect(screen.queryByText('Loading Appointments...')).not.toBeInTheDocument();
        });

        const upcomingTable = screen.getByText('Upcoming Appointments').closest('[data-testid="card"]');
        
        // Assert Filter
        expect(within(upcomingTable).getByText('Earlier Date')).toBeInTheDocument();
        expect(within(upcomingTable).getByText('rescheduled')).toBeInTheDocument();

        const rowText = within(upcomingTable).getAllByRole('row').map(r => r.textContent).join(' ');
        expect(rowText.indexOf('Earlier Date')).toBeLessThan(rowText.indexOf('Later Date'));
    });

    it('shows "no appointments" message for all empty categories', async () => {
        localStorage.setItem('token', 'fake-token');
        setupAxiosSuccess([]);
        renderComponent();

        await waitFor(() => {
            expect(screen.queryByText('Loading Appointments...')).not.toBeInTheDocument();
        });

        const emptyMessages = await screen.findAllByText('No appointments found in this category.');
        expect(emptyMessages).toHaveLength(3);
    });

    // --- 5. DATA INTEGRITY & FALLBACKS (Strict Checks) ---

    it('handles null/undefined and partial data by rendering N/A', async () => {
        // Kill mutant: Removing `|| 'N/A'`
        localStorage.setItem('token', 'fake-token');

        const incompleteAppt = [{
            _id: 'missing-data',
            patientNameForVisit: null, 
            doctor: { fullName: null, specialization: null },
            date: '2025-11-20T10:00:00Z',
            time: '10:00 AM',
            status: 'upcoming',
        }];

        setupAxiosSuccess(incompleteAppt);
        renderComponent();

        await waitFor(() => {
            expect(screen.queryByText('Loading Appointments...')).not.toBeInTheDocument();
        });

        const upcomingTable = screen.getByText('Upcoming Appointments').closest('[data-testid="card"]');
        
        // Strict assertion: cells must contain "N/A" text explicitly
        const naElements = within(upcomingTable).getAllByText('N/A');
        expect(naElements.length).toBeGreaterThanOrEqual(3);
    });

    // --- 6. VISUAL STYLING (CSS Mutants) ---

    it('renders correct badge styles for different statuses', async () => {
        localStorage.setItem('token', 'fake-token');
        const styledAppointments = [
            { _id: '1', status: 'upcoming', date: '2025-01-01', doctor: {} },
            { _id: '2', status: 'completed', date: '2025-01-01', doctor: {} },
            { _id: '3', status: 'cancelled', date: '2025-01-01', doctor: {} },
        ];
        setupAxiosSuccess(styledAppointments);
        renderComponent();

        await waitFor(() => {
            expect(screen.queryByText('Loading Appointments...')).not.toBeInTheDocument();
        });

        const upcomingBadge = screen.getByText('Upcoming');
        expect(upcomingBadge).toHaveClass('bg-blue-100');

        const completedBadge = screen.getByText('Completed');
        expect(completedBadge).toHaveClass('bg-green-100');

        const cancelledBadge = screen.getByText('Cancelled');
        expect(cancelledBadge).toHaveAttribute('data-variant', 'destructive');
    });

    // --- 7. CLEANUP & EVENT LISTENERS (Strict Checks) ---

    it('removes event listener on unmount', async () => {
        localStorage.setItem('token', 'fake-token');
        setupAxiosSuccess([]);
        
        const removeSpy = vi.spyOn(document, 'removeEventListener');
        const { unmount } = renderComponent();
        
        await waitFor(() => expect(screen.queryByText('Loading Appointments...')).not.toBeInTheDocument());
        
        unmount();
        
        expect(removeSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
    });

    // --- 8. INTERACTIONS & NAVIGATION ---

    it('handles profile dropdown interactions: toggle, view profile, and logout', async () => {
        const user = userEvent.setup();
        localStorage.setItem('token', 'fake-token');
        setupAxiosSuccess([]);
        renderComponent();

        await waitFor(() => expect(screen.queryByText('Loading Appointments...')).not.toBeInTheDocument());

        const avatar = await screen.findByText('SU');
        
        // Open Dropdown
        await user.click(avatar);
        expect(screen.getByText('View Profile')).toBeInTheDocument();

        // View Profile Modal
        await user.click(screen.getByText('View Profile'));
        expect(screen.getByText('Your Profile')).toBeInTheDocument();

        // Close Modal
        const closeBtn = screen.getByRole('button', { name: /Close/i });
        await user.click(closeBtn);
        expect(screen.queryByText('Your Profile')).not.toBeInTheDocument();

        // Logout
        await user.click(avatar); // Reopen dropdown
        await user.click(screen.getByText('Logout'));

        expect(localStorage.getItem('token')).toBeNull();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('closes profile dropdown when clicking outside', async () => {
        const user = userEvent.setup();
        localStorage.setItem('token', 'fake-token');
        setupAxiosSuccess([]);
        renderComponent();

        await waitFor(() => expect(screen.queryByText('Loading Appointments...')).not.toBeInTheDocument());

        const avatar = await screen.findByText('SU');
        await user.click(avatar);
        expect(screen.getByText('Logout')).toBeInTheDocument();

        await user.click(screen.getByText('All Appointments'));
        expect(screen.queryByText('Logout')).not.toBeInTheDocument();
    });

    it('navigates to dashboard when main back button is clicked', async () => {
        localStorage.setItem('token', 'fake-token');
        setupAxiosSuccess([]);
        renderComponent();

        await waitFor(() => expect(screen.queryByText('Loading Appointments...')).not.toBeInTheDocument());

        const backButton = await screen.findByRole('button', { name: /Back to Dashboard/i });
        fireEvent.click(backButton);
        expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
    });

    it('navigates to dashboard when clicking the header back button', async () => {
        const user = userEvent.setup();
        localStorage.setItem('token', 'fake-token');
        setupAxiosSuccess();
        renderComponent();

        await waitFor(() => expect(screen.queryByText('Loading Appointments...')).not.toBeInTheDocument());

        const backButton = screen.getByRole('button', { name: /Back/i });
        await user.click(backButton);

        expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
    });

    it('navigates to dashboard when clicking the back button on the error screen', async () => {
        const user = userEvent.setup();
        localStorage.setItem('token', 'fake-token');
        axios.get.mockRejectedValue(new Error('Critical Failure'));
        renderComponent();

        await screen.findByText(/Error:/);

        const errorBackButton = screen.getByRole('button', { name: /Back to Dashboard/i });
        await user.click(errorBackButton);

        expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
    });

    it('displays default avatar "AD" and placeholders when profile data is incomplete', async () => {
        // Kill mutants: removing `|| "Admin"` or `|| ""`
        const user = userEvent.setup();
        localStorage.setItem('token', 'fake-token');
        
        // Mock profile with missing fields
        const incompleteProfile = { userType: 'admin', fullName: '', email: '' };

        axios.get.mockImplementation((url) => {
            if (url.includes('/admin/appointments')) return Promise.resolve({ data: [] });
            if (url.includes('/users/profile')) return Promise.resolve({ data: incompleteProfile });
            return Promise.reject(new Error('Unknown URL'));
        });

        renderComponent();

        await waitFor(() => expect(screen.queryByText('Loading Appointments...')).not.toBeInTheDocument());

        const avatar = document.querySelector('.rounded-full.bg-cyan-200');
        expect(avatar).toBeInTheDocument();

        // Check for Name and Email Fallbacks
        await user.click(avatar);
        expect(screen.getByText('Admin')).toBeInTheDocument(); 
        
        const dropdownHeader = screen.getByText('Admin').parentElement;
        expect(dropdownHeader.innerHTML).toContain('truncate"></p>');
    });

    it('shows "Loading..." in the profile modal when profile data is missing', async () => {
        const user = userEvent.setup();
        localStorage.setItem('token', 'fake-token');

        axios.get.mockImplementation((url) => {
            if (url.includes('/admin/appointments')) return Promise.resolve({ data: [] });
            if (url.includes('/users/profile')) return new Promise(() => { }); // Never resolves
            return Promise.reject(new Error('Unknown URL'));
        });

        renderComponent();

        await waitFor(() => expect(screen.queryByText('Loading Appointments...')).not.toBeInTheDocument());

        const avatar = screen.getByText('AD');
        await user.click(avatar);

        const viewProfileBtn = screen.getByText('View Profile');
        await user.click(viewProfileBtn);

        const loadingTexts = screen.getAllByText('Loading...');
        expect(loadingTexts.length).toBeGreaterThanOrEqual(2);
    });
});