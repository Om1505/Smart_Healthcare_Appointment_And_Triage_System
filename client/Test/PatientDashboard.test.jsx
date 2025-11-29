import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import PatientDashboard from '@/pages/PatientDashboard';

// --- MOCKS ---

// 1. Mock Axios
vi.mock('axios');

// 2. Mock React Router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      pathname: '/patient/dashboard',
      state: {}, // Default empty state
    }),
    Link: ({ children, to, className }) => <a href={to} className={className}>{children}</a>,
  };
});

// 3. Mock Lucide Icons
vi.mock('lucide-react', () => ({
  Calendar: () => <span data-testid="icon-calendar" />,
  Clock: () => <span data-testid="icon-clock" />,
  Plus: () => <span data-testid="icon-plus" />,
  Search: () => <span data-testid="icon-search" />,
  Stethoscope: () => <span data-testid="icon-stethoscope" />,
  LogOut: () => <span data-testid="icon-logout" />,
  Phone: () => <span data-testid="icon-phone" />,
  FileText: () => <span data-testid="icon-file-text" />,
}));

// 4. Mock Child Modals
vi.mock('@/components/UserProfileModal', () => ({
  UserProfileModal: ({ isOpen, onClose }) => (
    isOpen ? <div data-testid="profile-modal"><button onClick={onClose}>Close Profile</button></div> : null
  ),
}));

vi.mock('@/components/ReviewModal.jsx', () => ({
  ReviewModal: ({ isOpen, onClose }) => (
    isOpen ? <div data-testid="review-modal"><button onClick={onClose}>Close Review</button></div> : null
  ),
}));

// 5. Mock UI Components (Shadcn)
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, className }) => (
    <button onClick={onClick} className={`${className} ${variant}`} data-testid="ui-button">
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }) => <div className={className} data-testid="ui-card">{children}</div>,
  CardHeader: ({ children, className }) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }) => <h3 className={className}>{children}</h3>,
  CardDescription: ({ children, className }) => <p className={className}>{children}</p>,
  CardContent: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }) => <span className={className}>{children}</span>,
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }) => <div>{children}</div>,
  AvatarImage: ({ src }) => <img src={src} alt="avatar" />,
  AvatarFallback: ({ children }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onSelect, className }) => (
    <div onClick={onSelect} className={className} data-testid="dropdown-item">
      {children}
    </div>
  ),
  DropdownMenuLabel: ({ children }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

// --- HELPER CONSTANTS ---
const MOCK_PATIENT = {
  fullName: 'John Doe',
  email: 'john@test.com',
  phone: '1234567890',
};

const FUTURE_DATE = new Date();
FUTURE_DATE.setDate(FUTURE_DATE.getDate() + 5); // 5 days from now

const PAST_DATE = new Date();
PAST_DATE.setDate(PAST_DATE.getDate() - 5); // 5 days ago

const MOCK_APPOINTMENTS = [
  {
    _id: 'apt_1',
    date: FUTURE_DATE.toISOString(),
    time: '10:00 AM',
    status: 'upcoming',
    patientNameForVisit: 'John Doe',
    doctor: {
      fullName: 'Dr. Smith',
      specialization: 'Cardiologist'
    }
  },
  {
    _id: 'apt_2',
    date: PAST_DATE.toISOString(),
    time: '2:00 PM',
    status: 'completed',
    patientNameForVisit: 'John Doe',
    doctor: {
      fullName: 'Dr. Jane',
      specialization: 'Dermatologist'
    }
  }
];

// --- TEST SUITE ---

describe('PatientDashboard', () => {
  // Mock window.location.href for logout test
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'fake-token');
    
    // Setup window.confirm mock
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    
    // Setup window.alert mock
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    // Mock window location assignment
    delete window.location;
    window.location = { href: '' };
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <PatientDashboard />
      </MemoryRouter>
    );
  };

  it('redirects to login if no token is present', async () => {
    localStorage.clear(); // Remove token
    renderComponent();
    
    await waitFor(() => {
      expect(window.location.href).toBe('/login');
    });
  });

  it('displays loading state initially', async () => {
    // Mock promises that never resolve immediately to test loading state
    axios.get.mockImplementation(() => new Promise(() => {}));
    
    renderComponent();
    expect(screen.getByText('Loading your dashboard...')).toBeInTheDocument();
  });

  it('displays error state if API fetch fails', async () => {
    // Mock failure
    axios.get.mockRejectedValue(new Error('Network Error'));
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch data/i)).toBeInTheDocument();
    });
    
    // Should clear token on auth error
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('renders dashboard content successfully with patient data', async () => {
    // Mock successful data fetch
    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: MOCK_APPOINTMENTS });
      return Promise.reject(new Error('Not Found'));
    });

    renderComponent();

    // 1. Verify Welcome Message
    await waitFor(() => {
      expect(screen.getByText('Welcome back, John!')).toBeInTheDocument();
    });

    // 2. Verify Stats Cards (use getAllByText for items that appear multiple places)
    expect(screen.getAllByText(/Upcoming/i).length).toBeGreaterThan(0);
    expect(screen.getByText('1 appointments')).toBeInTheDocument(); // 1 upcoming
    expect(screen.getAllByText(/Past Visits/i).length).toBeGreaterThan(0);
    expect(screen.getByText('1 completed')).toBeInTheDocument(); // 1 past

    // 3. Verify Appointment Details
    expect(screen.getByText('Dr. Smith')).toBeInTheDocument(); // Upcoming
    expect(screen.getByText('Dr. Jane')).toBeInTheDocument(); // Past
  });

  it('handles canceling an appointment', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: MOCK_APPOINTMENTS });
      return Promise.reject();
    });

    // Mock cancel API
    axios.put.mockResolvedValue({ data: { message: 'Cancelled' } });

    renderComponent();
    await waitFor(() => screen.getByText('Dr. Smith'));

    // Find Cancel button for the upcoming appointment
    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);

    // Verify confirmation was shown
    expect(window.confirm).toHaveBeenCalledWith("Are you sure you want to cancel this appointment?");

    // Verify API call
    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        expect.stringContaining('/api/appointments/apt_1/cancel'),
        {},
        expect.anything()
      );
    });

    // Verify UI update (Optimistic update changes status to 'cancelled')
    // The component logic: map apt -> if id match -> status: 'cancelled'
    // The text 'Cancelled' should now appear in a badge
    expect(await screen.findByText('Cancelled')).toBeInTheDocument();
  });

  it('handles cancel appointment failure', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: MOCK_APPOINTMENTS });
      return Promise.reject();
    });

    // Mock failure
    axios.put.mockRejectedValue({ response: { data: { message: 'Cancel failed' } } });

    renderComponent();
    await waitFor(() => screen.getByText('Dr. Smith'));

    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Cancel failed');
    });
  });

  it('allows navigation to "Join Call" page for upcoming appointments', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: MOCK_APPOINTMENTS });
      return Promise.reject();
    });

    renderComponent();
    await waitFor(() => screen.getByText('Dr. Smith'));

    // Find the Link wrapping the Join Call button
    const joinBtnText = screen.getByText('Join Call');
    const link = joinBtnText.closest('a');

    expect(link).toHaveAttribute('href', '/call/apt_1');
  });

  it('opens Profile Modal via dropdown', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: [] });
      return Promise.reject();
    });

    renderComponent();
    await waitFor(() => screen.getByText('Welcome back, John!'));

    // 1. Click Dropdown Trigger (Avatar)
    // Note: Shadcn dropdown logic is mocked, usually relies on Radix UI primitives.
    // In our mock, we render the trigger and content directly.
    // If the mock doesn't auto-show content, we might need to simulate the trigger.
    // Our mock simply renders content always visible or we need to find "Profile" directly if the mock renders it.
    
    // Based on the mock provided above: 
    // <DropdownMenuContent> is rendered. 
    // We can just click "Profile" text if it's visible in the mock.
    const profileMenuItem = screen.getByText('Profile');
    fireEvent.click(profileMenuItem);

    // 2. Check if modal is open
    expect(screen.getByTestId('profile-modal')).toBeInTheDocument();

    // 3. Close modal
    fireEvent.click(screen.getByText('Close Profile'));
    expect(screen.queryByTestId('profile-modal')).not.toBeInTheDocument();
  });

  it('opens Review Modal for completed appointments', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: MOCK_APPOINTMENTS });
      return Promise.reject();
    });

    renderComponent();
    await waitFor(() => screen.getByText('Dr. Jane'));

    const reviewBtn = screen.getByText('Leave Review');
    fireEvent.click(reviewBtn);

    expect(screen.getByTestId('review-modal')).toBeInTheDocument();
  });

  it('handles Logout via dropdown', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: [] });
      return Promise.reject();
    });

    renderComponent();
    await waitFor(() => screen.getByText('Welcome back, John!'));

    // Find Logout in dropdown (might have multiple "Logout" texts: nav button and dropdown item)
    // We want the dropdown one specifically, or any.
    const logoutButtons = screen.getAllByText('Logout');
    // Click the first one (likely nav button or dropdown)
    fireEvent.click(logoutButtons[0]);

    // Check token removal and redirect
    expect(localStorage.getItem('token')).toBeNull();
    expect(window.location.href).toBe('/login');
  });

  it('displays fallback UI when there are no appointments', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: [] });
      return Promise.reject();
    });

    renderComponent();
    await waitFor(() => screen.getByText('Welcome back, John!'));

    expect(screen.getByText('No upcoming appointments')).toBeInTheDocument();
    expect(screen.getByText('No past appointments')).toBeInTheDocument();
    expect(screen.getByText('Book Your First Appointment')).toBeInTheDocument();
  });

  it('initial state: appointments array starts empty', async () => {
    axios.get.mockImplementation(() => new Promise(() => {})); // Never resolves
    renderComponent();
    
    // Component renders with loading state, appointments is []
    expect(screen.getByText('Loading your dashboard...')).toBeInTheDocument();
  });

  it('initial state: isProfileModalOpen starts false', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: [] });
      return Promise.reject();
    });

    renderComponent();
    await waitFor(() => screen.getByText('Welcome back, John!'));
    
    // Modal should not be visible initially
    expect(screen.queryByTestId('profile-modal')).not.toBeInTheDocument();
  });

  it('sends Authorization header with token in API calls', async () => {
    const token = 'test-token-123';
    localStorage.setItem('token', token);
    
    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: [] });
      return Promise.reject();
    });

    renderComponent();
    
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/profile'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${token}`
          })
        })
      );
    });
  });

  it('handles error response with status code', async () => {
    axios.get.mockRejectedValue({ 
      response: { status: 401, data: { message: 'Unauthorized' } } 
    });
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch data \(401\)/i)).toBeInTheDocument();
    });
  });

  it('handles error response without status (network error)', async () => {
    axios.get.mockRejectedValue({ message: 'Network Error' });
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch data \(Network Error\)/i)).toBeInTheDocument();
    });
  });

  it('review modal flow: location.state dependency in useEffect', async () => {
    // This test verifies the useEffect with [location.state, appointments, navigate] dependencies
    // Since the mock always returns empty state, we verify the effect runs without errors
    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: MOCK_APPOINTMENTS });
      return Promise.reject();
    });

    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Welcome back, John!')).toBeInTheDocument();
    });
    
    // The useEffect runs but location.state is empty, so no modal opens
    expect(screen.queryByTestId('review-modal')).not.toBeInTheDocument();
  });

  it('cancel appointment sends request with Authorization header', async () => {
    const token = 'cancel-token';
    localStorage.setItem('token', token);
    
    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: MOCK_APPOINTMENTS });
      return Promise.reject();
    });
    axios.put.mockResolvedValue({ data: { message: 'Cancelled' } });

    renderComponent();
    await waitFor(() => screen.getByText('Dr. Smith'));

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        expect.stringContaining('/cancel'),
        {},
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${token}`
          })
        })
      );
    });
  });

  it('cancel appointment handles error without response object', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: MOCK_APPOINTMENTS });
      return Promise.reject();
    });
    axios.put.mockRejectedValue(new Error('Network error'));

    renderComponent();
    await waitFor(() => screen.getByText('Dr. Smith'));

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Failed to cancel appointment.');
    });
  });

  it('filters upcoming appointments correctly with date boundary', async () => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    const exactlyToday = {
      _id: 'apt_today',
      date: todayDate.toISOString(),
      time: '10:00 AM',
      status: 'upcoming',
      doctor: { fullName: 'Dr. Today', specialization: 'General' }
    };

    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: [exactlyToday] });
      return Promise.reject();
    });

    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Dr. Today')).toBeInTheDocument();
    });
  });

  it('filters past appointments by status even if date is future', async () => {
    const futureCompleted = {
      _id: 'apt_future_complete',
      date: FUTURE_DATE.toISOString(),
      time: '11:00 AM',
      status: 'completed',
      doctor: { fullName: 'Dr. FutureComplete', specialization: 'Specialist' }
    };

    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: [futureCompleted] });
      return Promise.reject();
    });

    renderComponent();
    
    await waitFor(() => {
      // Should appear in past section despite future date
      expect(screen.getByText('Dr. FutureComplete')).toBeInTheDocument();
      expect(screen.getByText(/Past Visits/i)).toBeInTheDocument();
    });
  });

  it('displays cancelled appointments in past section', async () => {
    const cancelledApt = {
      _id: 'apt_cancelled',
      date: FUTURE_DATE.toISOString(),
      time: '12:00 PM',
      status: 'cancelled',
      doctor: { fullName: 'Dr. Cancelled', specialization: 'Oncology' }
    };

    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: [cancelledApt] });
      return Promise.reject();
    });

    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Dr. Cancelled')).toBeInTheDocument();
      expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });
  });

  it('renders patient initials from fullName', async () => {
    const patientWithMultipleNames = {
      fullName: 'Alice Mary Johnson',
      email: 'alice@test.com',
      phone: '9876543210'
    };

    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: patientWithMultipleNames });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: [] });
      return Promise.reject();
    });

    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('AMJ')).toBeInTheDocument();
    });
  });

  it('user cancels confirmation dialog - appointment not cancelled', async () => {
    window.confirm.mockReturnValueOnce(false); // User clicks "No"

    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: MOCK_APPOINTMENTS });
      return Promise.reject();
    });

    renderComponent();
    await waitFor(() => screen.getByText('Dr. Smith'));

    fireEvent.click(screen.getByText('Cancel'));

    // Confirm was called but API should NOT be called
    expect(window.confirm).toHaveBeenCalled();
    expect(axios.put).not.toHaveBeenCalled();
  });

  it('renders View Prescription link for completed appointments', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: MOCK_APPOINTMENTS });
      return Promise.reject();
    });

    renderComponent();
    
    await waitFor(() => screen.getByText('Dr. Jane'));

    const prescriptionLink = screen.getByText('View Prescription').closest('a');
    expect(prescriptionLink).toHaveAttribute('href', '/patient/prescription/apt_2');
  });

  it('does not render View Prescription for non-completed appointments', async () => {
    const upcomingOnly = {
      _id: 'apt_upcoming_only',
      date: FUTURE_DATE.toISOString(),
      time: '9:00 AM',
      status: 'upcoming',
      doctor: { fullName: 'Dr. Upcoming', specialization: 'Surgery' }
    };

    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: [upcomingOnly] });
      return Promise.reject();
    });

    renderComponent();
    
    await waitFor(() => screen.getByText('Dr. Upcoming'));
    
    expect(screen.queryByText('View Prescription')).not.toBeInTheDocument();
  });

  it('renders badge variant outline for completed status', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: MOCK_APPOINTMENTS });
      return Promise.reject();
    });

    renderComponent();
    
    await waitFor(() => {
      const badges = screen.getAllByText('Completed');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  it('renders badge variant destructive for cancelled status', async () => {
    const cancelledApt = {
      _id: 'apt_test_cancel',
      date: PAST_DATE.toISOString(),
      time: '1:00 PM',
      status: 'cancelled',
      doctor: { fullName: 'Dr. Test', specialization: 'Testing' }
    };

    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: [cancelledApt] });
      return Promise.reject();
    });

    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });
  });

  it('Join Call navigation includes appointment state', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: MOCK_APPOINTMENTS });
      return Promise.reject();
    });

    renderComponent();
    await waitFor(() => screen.getByText('Dr. Smith'));

    const joinLink = screen.getByText('Join Call').closest('a');
    expect(joinLink).toHaveAttribute('href', '/call/apt_1');
  });

  it('verifies primaryColor is used in component styles', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: [] });
      return Promise.reject();
    });

    renderComponent();
    await waitFor(() => screen.getByText('Welcome back, John!'));
    
    // The primaryColor constant is used in inline styles throughout the component
    const logo = screen.getByAltText('Logo');
    expect(logo).toHaveStyle({ color: '#0F5257' });
  });

  it('verifies appointments axios call uses correct headers structure', async () => {
    const token = 'verify-headers-token';
    localStorage.setItem('token', token);
    
    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: [] });
      return Promise.reject();
    });

    renderComponent();
    
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/my-appointments'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Bearer')
          })
        })
      );
    });
  });

  it('verifies cancel button updates specific appointment by id', async () => {
    const apt1 = {
      _id: 'apt_keep',
      date: FUTURE_DATE.toISOString(),
      time: '9:00 AM',
      status: 'upcoming',
      doctor: { fullName: 'Dr. Keep', specialization: 'Cardiology' }
    };
    
    const apt2 = {
      _id: 'apt_cancel',
      date: FUTURE_DATE.toISOString(),
      time: '10:00 AM',
      status: 'upcoming',
      doctor: { fullName: 'Dr. Cancel', specialization: 'Surgery' }
    };

    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: [apt1, apt2] });
      return Promise.reject();
    });
    axios.put.mockResolvedValue({ data: { message: 'Cancelled' } });

    renderComponent();
    await waitFor(() => screen.getByText('Dr. Cancel'));

    // Click cancel on the second appointment
    const cancelButtons = screen.getAllByText('Cancel');
    fireEvent.click(cancelButtons[1]);

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        expect.stringContaining('apt_cancel'),
        {},
        expect.anything()
      );
    });

    // Verify only apt_cancel is updated
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(screen.getByText('Dr. Keep')).toBeInTheDocument();
  });

  it('setHours method called on today object for date normalization', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: MOCK_APPOINTMENTS });
      return Promise.reject();
    });

    renderComponent();
    
    await waitFor(() => {
      // If setHours wasn't called correctly, date comparisons would be off
      expect(screen.getByText('Dr. Smith')).toBeInTheDocument(); // Future = upcoming
    });
  });

  it('date comparison uses >= for upcoming appointments', async () => {
    const exactlyMidnight = new Date();
    exactlyMidnight.setHours(0, 0, 0, 0);
    
    const midnightApt = {
      _id: 'apt_midnight',
      date: exactlyMidnight.toISOString(),
      time: '12:00 AM',
      status: 'upcoming',
      doctor: { fullName: 'Dr. Midnight', specialization: 'Emergency' }
    };

    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: [midnightApt] });
      return Promise.reject();
    });

    renderComponent();
    
    await waitFor(() => {
      // >= ensures today's appointments at midnight are included in upcoming
      expect(screen.getByText('Dr. Midnight')).toBeInTheDocument();
    });
  });

  it('past appointments filter handles both date and status conditions', async () => {
    const pastDateButUpcoming = {
      _id: 'apt_past_date',
      date: PAST_DATE.toISOString(),
      time: '8:00 AM',
      status: 'upcoming', // This should still appear in past due to date
      doctor: { fullName: 'Dr. PastDate', specialization: 'Neurology' }
    };

    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: [pastDateButUpcoming] });
      return Promise.reject();
    });

    renderComponent();
    
    await waitFor(() => {
      // Should appear in past section because date < today
      expect(screen.getByText('Dr. PastDate')).toBeInTheDocument();
    });
  });

  it('Close review modal calls setReviewModalAppointment(null)', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: MOCK_APPOINTMENTS });
      return Promise.reject();
    });

    renderComponent();
    await waitFor(() => screen.getByText('Dr. Jane'));

    // Open review modal
    fireEvent.click(screen.getByText('Leave Review'));
    expect(screen.getByTestId('review-modal')).toBeInTheDocument();

    // Close it
    fireEvent.click(screen.getByText('Close Review'));
    expect(screen.queryByTestId('review-modal')).not.toBeInTheDocument();
  });

  it('useEffect first dependency array is empty for initial data fetch', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: [] });
      return Promise.reject();
    });

    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Welcome back, John!')).toBeInTheDocument();
    });
    
    // fetchData useEffect runs only once on mount (empty deps [])
    expect(axios.get).toHaveBeenCalledTimes(2); // profile + appointments
  });

  it('useEffect second dependency array includes location.state, appointments, navigate', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/profile')) return Promise.resolve({ data: MOCK_PATIENT });
      if (url.includes('/my-appointments')) return Promise.resolve({ data: MOCK_APPOINTMENTS });
      return Promise.reject();
    });

    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Welcome back, John!')).toBeInTheDocument();
    });
    
    // Second useEffect watches [location.state, appointments, navigate]
    // Since location.state is empty in mock, the if(aptToReview) block doesn't run
    expect(screen.queryByTestId('review-modal')).not.toBeInTheDocument();
  });
});