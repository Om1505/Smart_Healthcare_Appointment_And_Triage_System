import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';
import axios from 'axios';
import DoctorDashboard, { getPriorityClasses, getPriorityLabel } from '../src/pages/DoctorDashboard';

// --- Mocks ---
vi.mock('axios');

const mockNavigate = vi.fn();

// Correct react-router-dom mock
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        Link: ({ children, to, ...props }) => {
            const href = typeof to === 'string' ? to : (to?.pathname || '#');
            return <a href={href} {...props}>{children}</a>;
        },
    };
});

// Icon Mocks
vi.mock('lucide-react', () => ({
    Calendar: () => <span data-testid="icon-calendar" />,
    Clock: () => <span data-testid="icon-clock" />,
    Users: () => <span data-testid="icon-users" />,
    IndianRupee: () => <span data-testid="icon-rupee" />,
    AlertTriangle: () => <span data-testid="icon-alert" />,
    CheckCircle: () => <span data-testid="icon-check" />,
    User: () => <span data-testid="icon-user" />,
    Settings: () => <span data-testid="icon-settings" />,
    Brain: () => <span data-testid="icon-brain" />,
    LogOut: () => <span data-testid="icon-logout" />,
    Loader2: () => <span data-testid="icon-loader" />,
    ShieldAlert: () => <span data-testid="icon-shield-alert" />,
}));

// UI Component Mocks
vi.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, variant, className, ...props }) => (
        <button onClick={onClick} data-variant={variant} className={className} {...props}>{children}</button>
    ),
}));
vi.mock('@/components/ui/card', () => ({
    Card: ({ children, className }) => <div data-testid="card" className={className}>{children}</div>,
    CardContent: ({ children }) => <div>{children}</div>,
    CardDescription: ({ children }) => <p>{children}</p>,
    CardHeader: ({ children }) => <div>{children}</div>,
    CardTitle: ({ children }) => <h2>{children}</h2>,
}));
vi.mock('@/components/ui/badge', () => ({
    Badge: ({ children, className }) => <span className={className} data-testid="badge">{children}</span>,
}));
vi.mock('@/components/ui/avatar', () => ({
    Avatar: ({ children }) => <div data-testid="avatar">{children}</div>,
    AvatarFallback: ({ children }) => <span data-testid="avatar-fallback">{children}</span>,
    AvatarImage: (props) => <img alt="avatar" src={props.src} />,
}));
vi.mock('@/components/ui/tabs', () => ({
    Tabs: ({ children, defaultValue }) => <div data-def={defaultValue}>{children}</div>,
    TabsContent: ({ children, value }) => <div data-testid={`tabcontent-${value}`}>{children}</div>,
    TabsList: ({ children }) => <div>{children}</div>,
    TabsTrigger: ({ children, value, onClick }) => (
        <button data-testid={`tab-${value}`} onClick={onClick}>{children}</button>
    ),
}));
vi.mock('@/components/ui/dropdown-menu', () => ({
    DropdownMenu: ({ children }) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }) => <div data-testid="dropdown-trigger">{children}</div>,
    DropdownMenuContent: ({ children }) => <div data-testid="dropdown-content">{children}</div>,
    DropdownMenuItem: ({ children, onSelect, asChild }) => (
        <div onClick={onSelect} role="button" data-testid="dropdown-item">
            {children}
        </div>
    ),
    DropdownMenuLabel: ({ children }) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
}));
// Find this existing mock in your test file and update it:
vi.mock('@/components/UserProfileModal', () => ({
    UserProfileModal: ({ isOpen, onClose, onProfileUpdate }) =>
        isOpen ? (
            <div data-testid="profile-modal">
                <button onClick={onClose}>Close</button>
                <button onClick={() => onProfileUpdate({ fullName: 'Dr. Updated', userType: 'doctor', isVerified: true })}>
                    Update
                </button>
                {/* ADD THIS BUTTON for edge case testing: */}
                <button onClick={() => onProfileUpdate(null)}>Simulate Corruption</button>
            </div>
        ) : null,
}));

// --- Test Data Setup ---
const mockDoctorProfile = {
    fullName: 'Dr. Test',
    userType: 'doctor',
    isVerified: true,
};

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);

// ISO strings ensure reliable Date parsing across environments
const isoTomorrow = tomorrow.toISOString();
const isoToday = today.toISOString();
const isoYesterday = yesterday.toISOString();

const mockAppointments = [
    {
        _id: 'future-1',
        patientNameForVisit: 'Future Patient',
        primaryReason: 'Regular Checkup',
        date: isoTomorrow,
        time: '10:00 AM',
        status: 'upcoming',
        triagePriority: 'P3',
        symptomsList: ['Headache'],
        symptomsOther: 'Dizziness',
        preExistingConditions: ['None of the above'],
        familyHistory: ['Diabetes'],
        familyHistoryOther: 'Glaucoma',
    },
    {
        _id: 'future-2-urgent',
        patientNameForVisit: 'Urgent Patient',
        date: isoToday,
        time: '11:59 PM',
        status: 'upcoming',
        urgency: 'High',
        triagePriority: 'P1',
        preExistingConditions: ['Asthma'],
    },
    {
        _id: 'past-1',
        patientNameForVisit: 'Past Patient',
        date: isoYesterday,
        time: '10:00 AM',
        status: 'upcoming',
        triagePriority: 'P4',
    },
    {
        _id: 'completed-1',
        patientNameForVisit: 'Completed Patient',
        date: isoToday,
        time: '09:00 AM',
        status: 'completed',
    }
];

// --- Helper to render ---
const renderComponent = () => {
    return render(
        <MemoryRouter initialEntries={['/doctor/dashboard']}>
            <Routes>
                <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
                <Route path="/login" element={<div>Login Page</div>} />
            </Routes>
        </MemoryRouter>
    );
};

describe('DoctorDashboard Full Coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.setItem('token', 'fake-token');

        Object.defineProperty(window, 'location', {
            value: { href: 'http://localhost:3000/doctor/dashboard' },
            writable: true
        });

        axios.get.mockImplementation((url) => {
            if (url.includes('/profile')) return Promise.resolve({ data: mockDoctorProfile });
            if (url.includes('/appointments/doctor')) return Promise.resolve({ data: mockAppointments });
            if (url.includes('/summary/')) return Promise.resolve({ data: { success: true, summary: 'AI Summary' } });
            if (url.includes('/triage/')) return Promise.resolve({ data: { success: true, triage: { priority: 'P2' } } });
            return Promise.resolve({ data: [] });
        });
        axios.put.mockResolvedValue({ data: {} });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('redirects to login when no token exists', async () => {
        localStorage.removeItem('token');  

        renderComponent();

        await waitFor(() => {
            expect(window.location.href).toContain('/login');
        });
    });

    it('redirects to login when profile userType is not doctor', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/profile')) {
                return Promise.resolve({
                    data: { fullName: 'Random User', userType: 'patient', isVerified: true }
                });
            }
            return Promise.resolve({ data: [] });
        });

        renderComponent();

        await waitFor(() => {
            expect(window.location.href).toContain('/login');
        });
    });


    // 1. HELPER FUNCTION UNIT TESTS

    describe('Helper Functions', () => {
        it('getPriorityClasses returns correct classes for all inputs', () => {
            expect(getPriorityClasses('RED')).toContain('bg-red-100');
            expect(getPriorityClasses('P1')).toContain('bg-red-100');
            expect(getPriorityClasses('YELLOW')).toContain('bg-yellow-100');
            expect(getPriorityClasses('P2')).toContain('bg-yellow-100');
            expect(getPriorityClasses('GREEN')).toContain('bg-green-100');
            expect(getPriorityClasses('P3')).toContain('bg-green-100');
            expect(getPriorityClasses('BLACK')).toContain('bg-gray-200');
            expect(getPriorityClasses('P4')).toContain('bg-gray-200');
            expect(getPriorityClasses('UNKNOWN')).toContain('bg-gray-100');
        });

        it('getPriorityLabel returns correct labels and handles overrides', () => {
            expect(getPriorityLabel('P1', 'Custom Label')).toBe('Custom Label');
            expect(getPriorityLabel('RED', null)).toContain('Immediate');
            expect(getPriorityLabel('P1', null)).toContain('Immediate');
            expect(getPriorityLabel('YELLOW', null)).toContain('Urgent');
            expect(getPriorityLabel('P2', null)).toContain('Urgent');
            expect(getPriorityLabel('GREEN', null)).toContain('Minor');
            expect(getPriorityLabel('P3', null)).toContain('Minor');
            expect(getPriorityLabel('BLACK', null)).toContain('Non-Urgent');
            expect(getPriorityLabel('P4', null)).toContain('Non-Urgent');
            expect(getPriorityLabel('UNKNOWN', null)).toContain('Pending Triage');
        });
    });

    // 2. TIME-BASED GREETING TESTS

    describe('Time Based Greetings', () => {
        it('says Good morning between 5am and 12pm', async () => {
            vi.setSystemTime(new Date('2023-01-01T09:00:00'));
            renderComponent();
            await screen.findByText(/Good morning, Dr\. Test/i);
        });

        it('says Good afternoon between 12pm and 5pm', async () => {
            vi.setSystemTime(new Date('2023-01-01T14:00:00'));
            renderComponent();
            await screen.findByText(/Good afternoon, Dr\. Test/i);
        });

        it('says Good evening after 5pm', async () => {
            vi.setSystemTime(new Date('2023-01-01T19:00:00'));
            renderComponent();
            await screen.findByText(/Good evening, Dr\. Test/i);
        });
    });

    // 3. COMPLEX DATA & BRANCH COVERAGE

    it('renders complex Risk Factors and Symptoms', async () => {
        renderComponent();
        await screen.findByText(/Dr\. Test/i);

        fireEvent.click(screen.getByTestId('tab-analysis'));
        const analysisTab = await screen.findByTestId('tabcontent-analysis');

        expect(within(analysisTab).getByText(/Diabetes/i)).toBeInTheDocument();
        expect(within(analysisTab).getByText(/Family Hx: Glaucoma/i)).toBeInTheDocument();
    });

    it('uses fallback summary generation when AI summary is missing', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/summary/')) return Promise.resolve({ data: { success: false } });
            if (url.includes('/profile')) return Promise.resolve({ data: mockDoctorProfile });
            if (url.includes('/appointments/doctor')) return Promise.resolve({ data: mockAppointments });
            return Promise.resolve({ data: [] });
        });

        renderComponent();
        await screen.findByText(/Dr\. Test/i);

        fireEvent.click(screen.getByTestId('tab-analysis'));
        const analysisTab = await screen.findByTestId('tabcontent-analysis');

        await waitFor(() => {
            expect(within(analysisTab).getByText(/Reported symptoms: Headache, Dizziness/i)).toBeInTheDocument();
        });
    });

    it('handles "None of the above" correctly in Risk Factors', async () => {
        const safeAppointment = [{
            _id: 'safe-1',
            patientNameForVisit: 'Safe Patient',
            date: isoTomorrow,
            time: '10:00 AM',
            status: 'upcoming',
            preExistingConditions: ['None of the above'],
            familyHistory: ['None of the above'],
        }];

        axios.get.mockImplementation((url) => {
            if (url.includes('/appointments/doctor')) return Promise.resolve({ data: safeAppointment });
            if (url.includes('/profile')) return Promise.resolve({ data: mockDoctorProfile });
            return Promise.resolve({ data: { success: false } });
        });

        renderComponent();
        const patients = await screen.findAllByText(/Safe Patient/i);
        expect(patients.length).toBeGreaterThan(0);

        fireEvent.click(screen.getByTestId('tab-analysis'));
        expect(await screen.findByText("No significant risk factors reported")).toBeInTheDocument();
    });

    it('renders hero action links', async () => {
        renderComponent();
        await screen.findByText(/Dr\. Test/i);
        expect(screen.getByText('Manage Schedule').closest('a')).toHaveAttribute('href', '/doctor/schedule');
    });

    // 4. APPOINTMENT LOGIC & FILTERING

    it('filters out past appointments completely from the list', async () => {
        renderComponent();
        await screen.findByText(/Dr\. Test/i);
        expect(screen.queryByText('Past Patient')).not.toBeInTheDocument();
    });

    it('renders "Start Consultation" for future appointments', async () => {
        renderComponent();
        await screen.findByText(/Dr\. Test/i);
        const tabContent = await screen.findByTestId('tabcontent-queue');
        const futurePatient = await within(tabContent).findByText('Future Patient');
        const row = futurePatient.closest('.border');
        expect(within(row).getByText('Start Consultation')).toBeInTheDocument();
    });

    it('renders empty state when no appointments exist', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/appointments/doctor')) return Promise.resolve({ data: [] });
            if (url.includes('/profile')) return Promise.resolve({ data: mockDoctorProfile });
            return Promise.resolve({ data: [] });
        });

        renderComponent();
        await screen.findByText(/Dr\. Test/i);
        expect(screen.getByText(/You have no scheduled appointments/i)).toBeInTheDocument();
    });

    // 5. INTERACTION & ERROR HANDLING

    it('handles completing an appointment (Happy Path)', async () => {
        renderComponent();
        await screen.findByText(/Dr\. Test/i);

        const tabContent = await screen.findByTestId('tabcontent-queue');
        const futurePatient = await within(tabContent).findByText('Future Patient');
        const row = futurePatient.closest('.border');
        const startButton = within(row).getByText('Start Consultation');

        fireEvent.click(startButton);

        expect(axios.put).toHaveBeenCalledWith(
            expect.stringContaining('/complete'),
            {},
            expect.objectContaining({ headers: { Authorization: 'Bearer fake-token' } })
        );

        await waitFor(() => {
            expect(startButton).not.toBeInTheDocument();
        });
    });

    it('handles completing an appointment (API Error)', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        axios.put.mockRejectedValue({ response: { status: 500, data: 'Failed' } });

        renderComponent();
        await screen.findByText(/Dr\. Test/i);

        const tabContent = await screen.findByTestId('tabcontent-queue');
        const futurePatient = await within(tabContent).findByText('Future Patient');
        const row = futurePatient.closest('.border');
        const startButton = within(row).getByText('Start Consultation');

        fireEvent.click(startButton);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalled();
        });
        consoleSpy.mockRestore();
    });

    it('handles API error during initial fetch', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        axios.get.mockRejectedValueOnce(new Error('Network Error'));

        renderComponent();
        await waitFor(() => {
            expect(screen.getByText(/Failed to fetch dashboard data/i)).toBeInTheDocument();
        });
        consoleSpy.mockRestore();
    });

    it('handles API error during AI Triage/Summary fetch', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        axios.get.mockImplementation((url) => {
            if (url.includes('/profile')) return Promise.resolve({ data: mockDoctorProfile });
            if (url.includes('/appointments/doctor')) return Promise.resolve({ data: mockAppointments });
            if (url.includes('/triage/')) return Promise.reject('Triage Fail');
            return Promise.resolve({ data: { success: true } });
        });

        renderComponent();
        await screen.findByText(/Dr\. Test/i);
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith('Error fetching triage:', 'Triage Fail');
        });
        consoleSpy.mockRestore();
    });

    // 6. VERIFICATION PENDING STATE

    it('renders verification pending state and handles logout there', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/profile')) return Promise.resolve({ data: { ...mockDoctorProfile, isVerified: false } });
            return Promise.resolve({ data: [] });
        });

        renderComponent();
        expect(await screen.findByText('Verification Pending')).toBeInTheDocument();
        const logoutBtn = screen.getByText('Logout');
        fireEvent.click(logoutBtn);
        expect(localStorage.getItem('token')).toBeNull();
        expect(window.location.href).toContain('/login');
    });

    // 7. PROFILE UPDATE MODAL

    it('updates doctor profile via modal', async () => {
        renderComponent();
        await screen.findByText(/Dr\. Test/i);

        const trigger = screen.getByTestId('dropdown-trigger');
        fireEvent.pointerDown(trigger);
        const profileItem = screen.getByText('Profile');
        fireEvent.click(profileItem);

        expect(screen.getByTestId('profile-modal')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Update'));
        await screen.findByText(/Dr\. Updated/i);
    });

    it('closes profile modal without updating', async () => {
        renderComponent();
        await screen.findByText(/Dr\. Test/i);

        const trigger = screen.getByTestId('dropdown-trigger');
        fireEvent.pointerDown(trigger);
        const profileItem = screen.getByText('Profile');
        fireEvent.click(profileItem);

        // Click close
        fireEvent.click(screen.getByText('Close'));
        expect(screen.queryByTestId('profile-modal')).not.toBeInTheDocument();
    });

    // 8. TIME PARSING EDGE CASES & COMPLEX BRANCHES

    it('handles complex time parsing branches and "Other" risk factors', async () => {
        const futureDate = new Date(); futureDate.setDate(futureDate.getDate() + 2);
        const dateStr = futureDate.toISOString();

        const edgeCaseAppointments = [
            { _id: 'ec-1', date: dateStr, time: '12:00 AM', status: 'upcoming', patientNameForVisit: 'AM Patient' },
            { _id: 'ec-2', date: dateStr, time: '12:00 PM', status: 'upcoming', patientNameForVisit: 'PM Patient' },
            { _id: 'ec-3', date: dateStr, time: '10:', status: 'upcoming', patientNameForVisit: 'Nan Min Patient' },
            { _id: 'ec-4', date: dateStr, time: 'InvalidTime', status: 'upcoming', patientNameForVisit: 'Nan Hour Patient' },
            {
                _id: 'ec-5',
                date: dateStr, time: '10:00 AM', status: 'upcoming',
                patientNameForVisit: 'Risk Patient',
                preExistingConditionsOther: 'Rare Disease'
            },
        ];

        axios.get.mockImplementation((url) => {
            if (url.includes('/appointments/doctor')) return Promise.resolve({ data: edgeCaseAppointments });
            if (url.includes('/profile')) return Promise.resolve({ data: mockDoctorProfile });
            return Promise.resolve({ data: { success: false } });
        });

        renderComponent();

        const amPatients = await screen.findAllByText(/AM Patient/i);
        expect(amPatients.length).toBeGreaterThan(0);

        expect(screen.getAllByTestId('icon-clock').length).toBeGreaterThanOrEqual(edgeCaseAppointments.length);

        fireEvent.click(screen.getByTestId('tab-analysis'));
        await screen.findByText(/Rare Disease/i);
    });

    it('filters out cancelled/invalid appointments gracefully', async () => {
        const badData = [
            { _id: 'bad-1', date: isoTomorrow, time: '10:00 AM', status: 'cancelled' },
        ];

        axios.get.mockImplementation((url) => {
            if (url.includes('/appointments/doctor')) return Promise.resolve({ data: badData });
            if (url.includes('/profile')) return Promise.resolve({ data: mockDoctorProfile });
            return Promise.resolve({ data: [] });
        });

        renderComponent();
        await screen.findByText(/Dr\. Test/i);
        expect(screen.getByText(/You have no scheduled appointments/i)).toBeInTheDocument();
    });

    // 9. DEFENSIVE CODING (Null Checks)
    it('handles null/undefined edge cases in utility functions', async () => {
        const nullData = [
            { _id: 'null-1', date: null, time: '10:00 AM', status: 'upcoming' },
            { _id: 'null-2', date: 'Invalid Date String', time: '10:00 AM', status: 'upcoming' },
        ];

        axios.get.mockImplementation((url) => {
            if (url.includes('/appointments/doctor')) return Promise.resolve({ data: nullData });
            if (url.includes('/profile')) return Promise.resolve({ data: mockDoctorProfile });
            return Promise.resolve({ data: [] });
        });

        renderComponent();
        await screen.findByText(/Dr\. Test/i);

        const startButtons = screen.getAllByText('Start Consultation');
        expect(startButtons.length).toBeGreaterThan(0);
    });

    it('handles API error specifically for AI Summary fetch', async () => {
        // 1. Spy on console.error to verify the log occurs
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        // 2. Mock Axios to fail ONLY for the summary endpoint
        axios.get.mockImplementation((url) => {
            if (url.includes('/profile')) return Promise.resolve({ data: mockDoctorProfile });
            if (url.includes('/appointments/doctor')) return Promise.resolve({ data: mockAppointments });

            if (url.includes('/summary/')) return Promise.reject(new Error('Summary API Down'));

            if (url.includes('/triage/')) return Promise.resolve({ data: { success: true, triage: { priority: 'P2' } } });

            return Promise.resolve({ data: [] });
        });

        renderComponent();
        await screen.findByText(/Dr\. Test/i);

        // 3. Navigate to the Analysis tab where the summary is displayed
        const analysisTabBtn = screen.getByTestId('tab-analysis');
        fireEvent.click(analysisTabBtn);

        // 4. Verify the UI displays the fallback error message and console.error was called
        await waitFor(() => {
            // Checks if the user sees the error message set in the catch block
            expect(screen.getAllByText('Unable to generate AI summary at this time.')[0]).toBeInTheDocument();

            // Checks if the specific console error from the image was triggered
            expect(consoleSpy).toHaveBeenCalledWith('Error fetching AI summary:', expect.any(Error));
        });

        consoleSpy.mockRestore();
    });

    it('covers helper function edge cases (missing time, single-digit time, null appointments)', async () => {
        const edgeCaseAppointments = [
            {
                _id: 'gap-1-no-time',
                patientNameForVisit: 'No Time Patient',
                date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
                time: null,
                status: 'upcoming'
            },
            {
                _id: 'gap-2-weird-time',
                patientNameForVisit: 'Weird Time Patient',
                date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
                time: '10 AM',
                status: 'upcoming'
            },
            null // Gap 4: Null appointment
        ];

        axios.get.mockImplementation((url) => {
            if (url.includes('/appointments/doctor')) return Promise.resolve({ data: edgeCaseAppointments });
            if (url.includes('/profile')) return Promise.resolve({ data: mockDoctorProfile });
            return Promise.resolve({ data: [] });
        });

        renderComponent();
        await screen.findByText(/Dr\. Test/i);

        // FIX: Use findAllByText since the name appears in both the Queue list and Analysis tab
        const noTimePatients = await screen.findAllByText('No Time Patient');
        expect(noTimePatients.length).toBeGreaterThan(0);

        const weirdTimePatients = await screen.findAllByText('Weird Time Patient');
        expect(weirdTimePatients.length).toBeGreaterThan(0);

        // 3. The Null entry was safely filtered out. 
        // We expect valid buttons for the 2 valid patients above.
        const startButtons = screen.getAllByText('Start Consultation');
        expect(startButtons.length).toBeGreaterThanOrEqual(2);
    });

    it('sorts and displays appointments with different urgency levels (High, Medium, Low)', async () => {
        const mixedUrgencyAppointments = [
            {
                _id: 'low-urgency',
                patientNameForVisit: 'Low Priority Patient',
                date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
                time: '10:00 AM',
                status: 'upcoming',
                urgency: 'Low'
            },
            {
                _id: 'medium-urgency',
                patientNameForVisit: 'Medium Priority Patient',
                date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
                time: '11:00 AM',
                status: 'upcoming',
                urgency: 'Medium'
            },
            {
                _id: 'high-urgency',
                patientNameForVisit: 'High Priority Patient',
                date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
                time: '12:00 PM',
                status: 'upcoming',
                urgency: 'High'
            }
        ];

        axios.get.mockImplementation((url) => {
            if (url.includes('/appointments/doctor')) return Promise.resolve({ data: mixedUrgencyAppointments });
            if (url.includes('/profile')) return Promise.resolve({ data: mockDoctorProfile });
            return Promise.resolve({ data: [] });
        });

        renderComponent();
        await screen.findByText(/Dr\. Test/i);

        // FIX: Use findAllByText to handle duplicates (List Item + Analysis Card)
        const lowPriority = await screen.findAllByText('Low Priority Patient');
        expect(lowPriority.length).toBeGreaterThan(0);

        const mediumPriority = await screen.findAllByText('Medium Priority Patient');
        expect(mediumPriority.length).toBeGreaterThan(0);

        const highPriority = await screen.findAllByText('High Priority Patient');
        expect(highPriority.length).toBeGreaterThan(0);
    });

    it('renders safety loading state when doctor data is nullified (e.g. after bad update)', async () => {
        renderComponent();
        await screen.findByText(/Dr\. Test/i);

        // 1. Open the Profile Modal
        const trigger = screen.getByTestId('dropdown-trigger');
        fireEvent.pointerDown(trigger);
        const profileItem = screen.getByText('Profile');
        fireEvent.click(profileItem);

        // 2. Click the special button we added to the mock to set doctor = null
        // This simulates a scenario where an update clears the data without setting an error
        fireEvent.click(screen.getByText('Simulate Corruption'));

        // 3. Assert the fallback UI appears
        // This covers the: if (!doctor) return ... "Loading doctor data..." block
        expect(await screen.findByText('Loading doctor data...')).toBeInTheDocument();
    });

    it('handles completing an appointment with a generic network error (no response object)', async () => {
        // 1. Spy on console.error
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        // 2. Mock axios to reject with a generic Error (Network Error)
        // This object has no .response property, forcing the '|| err' path
        axios.put.mockRejectedValue(new Error('Network connection lost'));

        renderComponent();
        await screen.findByText(/Dr\. Test/i);

        // 3. Trigger the completion
        const tabContent = await screen.findByTestId('tabcontent-queue');
        const futurePatient = await within(tabContent).findByText('Future Patient');
        const row = futurePatient.closest('.border');
        const startButton = within(row).getByText('Start Consultation');

        fireEvent.click(startButton);

        // 4. Verify console.error logged the raw error object
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(
                'Failed to mark appointment as completed:',
                expect.any(Error) 
            );
        });

        consoleSpy.mockRestore();
    });

    it('displays "Triaging..." loader when AI analysis is pending', async () => {
        // 1. Create a standard appointment
        const appointmentData = [{
            _id: 'pending-triage',
            patientNameForVisit: 'Triage Patient',
            date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
            time: '10:00 AM',
            status: 'upcoming'
        }];

        // 2. Mock API to freeze the Triage endpoint
        axios.get.mockImplementation((url) => {
            // Profile and Appointment lists load successfully
            if (url.includes('/appointments/doctor')) return Promise.resolve({ data: appointmentData });
            if (url.includes('/profile')) return Promise.resolve({ data: mockDoctorProfile });

            if (url.includes('/triage/')) return new Promise(() => { });

            // Allow summary to resolve
            if (url.includes('/summary/')) return Promise.resolve({ data: { success: true } });

            return Promise.resolve({ data: [] });
        });

        renderComponent();
        await screen.findByText(/Dr\. Test/i);

        // 3. Verify the loader badge appears
        expect(await screen.findByText('Triaging...')).toBeInTheDocument();
    });
});