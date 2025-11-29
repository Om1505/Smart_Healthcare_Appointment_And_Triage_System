import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import AdminDoctorProfilePage from '@/pages/AdminDoctorProfilePage';

// --- Mocks ---
vi.mock('axios');

// Mock Lucide Icons (Empty spans to avoid text clashes)
vi.mock('lucide-react', () => ({
  Stethoscope: () => <span data-testid="icon-stethoscope" />,
  Clock: () => <span data-testid="icon-clock" />,
  MapPin: () => <span data-testid="icon-mappin" />,
  IndianRupee: () => <span data-testid="icon-rupee" />,
  Mail: () => <span data-testid="icon-mail" />,
  Phone: () => <span data-testid="icon-phone" />,
  Shield: () => <span data-testid="icon-shield" />,
  ArrowLeft: () => <span data-testid="icon-arrowleft" />,
}));

// Mock Navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  };
});

// Mock UI Components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>
}));
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }) => <h2 data-testid="card-title">{children}</h2>,
}));
vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }) => <div data-testid="avatar">{children}</div>,
  AvatarImage: (props) => <img alt={props.alt} src={props.src} data-testid="avatar-image" />,
  AvatarFallback: ({ children }) => <span data-testid="avatar-fallback">{children}</span>,
}));
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }) => <span data-testid="badge" data-variant={variant}>{children}</span>
}));

// --- Constants ---
const BASE_URL = 'https://smart-healthcare-appointment-and-triage.onrender.com';

// --- Helper ---
const renderComponent = (doctorId) => {
  // If doctorId is passed, use it in the route. If null, simulate a route with no ID params (though Router usually requires one matching the pattern)
  // To simulate "undefined ID", we render the component OUTSIDE a path that provides the param, or provide an empty one.
  const initialEntries = doctorId ? [`/admin/doctor-profile/${doctorId}`] : ['/admin/doctor-profile'];

  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/admin/doctor-profile/:id?" element={<AdminDoctorProfilePage />} />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/admin/dashboard" element={<div>Admin Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
};

// --- Test Suite ---
describe('AdminDoctorProfilePage', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    axios.get.mockReset();
  });

  it('redirects to /login if no token is found', () => {
    renderComponent('123');
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('shows loading state initially', () => {
    localStorage.setItem('token', 'fake-token');
    axios.get.mockImplementation(() => new Promise(() => { }));
    renderComponent('123');
    expect(screen.getByText('Loading admin view...')).toBeInTheDocument();
  });

  // --- NEW TEST: Covers Line 46 (Missing ID) ---
  it('does not fetch profile if ID is missing', async () => {
    localStorage.setItem('token', 'fake-token');

    // Render without an ID
    renderComponent(null);

    // Wait a tick to ensure useEffect would have run
    await waitFor(() => expect(screen.getByText('Loading admin view...')).toBeInTheDocument());

    // Assert axios was NEVER called because logic blocked it
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('shows error message if API call fails', async () => {
    localStorage.setItem('token', 'fake-token');
    axios.get.mockRejectedValue(new Error('Network Error'));
    renderComponent('123');
    expect(await screen.findByText(/Could not fetch doctor profile/i)).toBeInTheDocument();
  });

  it('shows specific error if the user is not a doctor', async () => {
    localStorage.setItem('token', 'fake-token');
    axios.get.mockResolvedValue({
      data: { id: '123', fullName: 'Test Pat', userType: 'patient' }
    });
    renderComponent('123');
    expect(await screen.findByText('This user is not a doctor.')).toBeInTheDocument();
  });

  it('fetches and displays doctor profile on success', async () => {
    localStorage.setItem('token', 'fake-token');
    const mockDoctor = {
      id: '123',
      fullName: 'Dr. Jane Doe',
      email: 'jane.doe@example.com',
      phone: '123-456-7890',
      licenseNumber: 'ABC12345',
      specialization: 'Cardiology',
      isVerified: true,
      bio: 'A highly skilled cardiologist.',
      experience: 10,
      address: '123 Health St',
      consultationFee: 1500,
      createdAt: '2023-01-15T00:00:00.000Z',
      profilePicture: 'image.png',
      userType: 'doctor'
    };
    axios.get.mockResolvedValue({ data: mockDoctor });

    renderComponent('123');

    await waitFor(() => {
      expect(screen.queryByText('Loading admin view...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Dr. Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('Cardiology')).toBeInTheDocument();

    expect(axios.get).toHaveBeenCalledWith(
      `${BASE_URL}/api/admin/user/123`,
      { headers: { Authorization: 'Bearer fake-token' } }
    );
  });

  it('navigates to dashboard when "Return to Dashboard" is clicked in error state', async () => {
    localStorage.setItem('token', 'fake-token');
    axios.get.mockRejectedValue(new Error('Error'));
    renderComponent('123');

    const returnBtn = await screen.findByText('Return to Dashboard');
    fireEvent.click(returnBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
  });

  it('handles null/undefined values from API gracefully', async () => {
    localStorage.setItem('token', 'fake-token');
    const mockDoctor = {
      id: '124',
      fullName: 'Dr. No Bio',
      email: 'nobio@example.com',
      userType: 'doctor',
      isVerified: false,
      createdAt: '2023-01-15T00:00:00.000Z',
      phone: null,
      licenseNumber: undefined,
      specialization: null,
      bio: null,
      experience: null,
      address: null,
      consultationFee: null,
    };
    axios.get.mockResolvedValue({ data: mockDoctor });

    renderComponent('124');

    await waitFor(() => {
      expect(screen.queryByText('Loading admin view...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Dr. No Bio')).toBeInTheDocument();

    // FIX: Check for N/A values using getAllByText to handle multiple occurrences safely
    const nA_Elements = screen.getAllByText('N/A');
    expect(nA_Elements.length).toBeGreaterThan(0);

    const notSpecified = screen.getAllByText('Not specified');
    expect(notSpecified.length).toBeGreaterThan(0);

    const notSet = screen.getAllByText('Not set');
    expect(notSet.length).toBeGreaterThan(0);

    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Pending Verification')).toBeInTheDocument();
  });

  it('renders avatar initials correctly from full name', async () => {
    localStorage.setItem('token', 'fake-token');
    const mockDoctor = {
      id: '125',
      fullName: 'Alice Bob Cooper',
      email: 'abc@example.com',
      userType: 'doctor',
      isVerified: true,
      specialization: 'Neurology',
      createdAt: '2023-01-01T00:00:00.000Z',
    };
    axios.get.mockResolvedValue({ data: mockDoctor });

    renderComponent('125');

    await waitFor(() => {
      expect(screen.queryByText('Loading admin view...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('ABC')).toBeInTheDocument();
  });

  it('displays default avatar when profilePicture is missing', async () => {
    localStorage.setItem('token', 'fake-token');
    const mockDoctor = {
      id: '126',
      fullName: 'Test Doctor',
      email: 'test@example.com',
      userType: 'doctor',
      isVerified: true,
      specialization: 'General',
      createdAt: '2023-01-01T00:00:00.000Z',
      profilePicture: null,
    };
    axios.get.mockResolvedValue({ data: mockDoctor });

    renderComponent('126');

    await waitFor(() => {
      expect(screen.getByText('Test Doctor')).toBeInTheDocument();
    });

    expect(screen.getByText('TD')).toBeInTheDocument();
  });

  it('displays verified badge with correct variant', async () => {
    localStorage.setItem('token', 'fake-token');
    const mockDoctor = {
      id: '127',
      fullName: 'Verified Doc',
      email: 'verified@example.com',
      userType: 'doctor',
      isVerified: true,
      specialization: 'Surgery',
      createdAt: '2023-01-01T00:00:00.000Z',
    };
    axios.get.mockResolvedValue({ data: mockDoctor });

    renderComponent('127');

    await waitFor(() => {
      expect(screen.getByText('Verified Doctor')).toBeInTheDocument();
    });

    const badge = screen.getByText('Verified Doctor');
    expect(badge).toHaveAttribute('data-variant', 'default');
  });

  it('displays pending verification badge correctly', async () => {
    localStorage.setItem('token', 'fake-token');
    const mockDoctor = {
      id: '128',
      fullName: 'Pending Doc',
      email: 'pending@example.com',
      userType: 'doctor',
      isVerified: false,
      specialization: 'Dermatology',
      createdAt: '2023-01-01T00:00:00.000Z',
    };
    axios.get.mockResolvedValue({ data: mockDoctor });

    renderComponent('128');

    await waitFor(() => {
      expect(screen.getByText('Pending Verification')).toBeInTheDocument();
    });

    const badge = screen.getByText('Pending Verification');
    expect(badge).toHaveAttribute('data-variant', 'destructive');
  });

  it('displays phone number when provided', async () => {
    localStorage.setItem('token', 'fake-token');
    const mockDoctor = {
      id: '129',
      fullName: 'Dr. With Phone',
      email: 'phone@example.com',
      userType: 'doctor',
      isVerified: true,
      specialization: 'Pediatrics',
      phone: '9876543210',
      createdAt: '2023-01-01T00:00:00.000Z',
    };
    axios.get.mockResolvedValue({ data: mockDoctor });

    renderComponent('129');

    await waitFor(() => {
      expect(screen.getByText('9876543210')).toBeInTheDocument();
    });
  });

  it('displays license number when provided', async () => {
    localStorage.setItem('token', 'fake-token');
    const mockDoctor = {
      id: '130',
      fullName: 'Dr. With License',
      email: 'license@example.com',
      userType: 'doctor',
      isVerified: true,
      specialization: 'Orthopedics',
      licenseNumber: 'LIC12345',
      createdAt: '2023-01-01T00:00:00.000Z',
    };
    axios.get.mockResolvedValue({ data: mockDoctor });

    renderComponent('130');

    await waitFor(() => {
      expect(screen.getByText('LIC12345')).toBeInTheDocument();
    });
  });

  it('displays doctor last name in About section', async () => {
    localStorage.setItem('token', 'fake-token');
    const mockDoctor = {
      id: '131',
      fullName: 'John Smith',
      email: 'smith@example.com',
      userType: 'doctor',
      isVerified: true,
      specialization: 'General',
      createdAt: '2023-01-01T00:00:00.000Z',
    };
    axios.get.mockResolvedValue({ data: mockDoctor });

    renderComponent('131');

    await waitFor(() => {
      expect(screen.getByText(/About Dr. Smith/i)).toBeInTheDocument();
    });
  });

  it('displays bio when provided', async () => {
    localStorage.setItem('token', 'fake-token');
    const mockDoctor = {
      id: '132',
      fullName: 'Dr. Bio Test',
      email: 'bio@example.com',
      userType: 'doctor',
      isVerified: true,
      specialization: 'General',
      bio: 'Experienced doctor with 15 years of practice.',
      createdAt: '2023-01-01T00:00:00.000Z',
    };
    axios.get.mockResolvedValue({ data: mockDoctor });

    renderComponent('132');

    await waitFor(() => {
      expect(screen.getByText('Experienced doctor with 15 years of practice.')).toBeInTheDocument();
    });
  });

  it('displays experience in years format when provided', async () => {
    localStorage.setItem('token', 'fake-token');
    const mockDoctor = {
      id: '133',
      fullName: 'Dr. Experienced',
      email: 'exp@example.com',
      userType: 'doctor',
      isVerified: true,
      specialization: 'General',
      experience: 20,
      createdAt: '2023-01-01T00:00:00.000Z',
    };
    axios.get.mockResolvedValue({ data: mockDoctor });

    renderComponent('133');

    await waitFor(() => {
      expect(screen.getByText('20 years')).toBeInTheDocument();
    });
  });

  it('displays address when provided', async () => {
    localStorage.setItem('token', 'fake-token');
    const mockDoctor = {
      id: '134',
      fullName: 'Dr. Located',
      email: 'addr@example.com',
      userType: 'doctor',
      isVerified: true,
      specialization: 'General',
      address: '123 Main St, City, State 12345',
      createdAt: '2023-01-01T00:00:00.000Z',
    };
    axios.get.mockResolvedValue({ data: mockDoctor });

    renderComponent('134');

    await waitFor(() => {
      expect(screen.getByText('123 Main St, City, State 12345')).toBeInTheDocument();
    });
  });

  it('displays consultation fee in rupees when provided', async () => {
    localStorage.setItem('token', 'fake-token');
    const mockDoctor = {
      id: '135',
      fullName: 'Dr. Fee Test',
      email: 'fee@example.com',
      userType: 'doctor',
      isVerified: true,
      specialization: 'General',
      consultationFee: 500,
      createdAt: '2023-01-01T00:00:00.000Z',
    };
    axios.get.mockResolvedValue({ data: mockDoctor });

    renderComponent('135');

    await waitFor(() => {
      expect(screen.getByText('₹500')).toBeInTheDocument();
    });
  });

  it('verifies API endpoint and Authorization header are used', async () => {
    localStorage.setItem('token', 'test-token-123');
    const mockDoctor = {
      id: '136',
      fullName: 'Dr. API Test',
      email: 'api@example.com',
      userType: 'doctor',
      isVerified: true,
      specialization: 'General',
      createdAt: '2023-01-01T00:00:00.000Z',
    };
    axios.get.mockResolvedValue({ data: mockDoctor });

    renderComponent('136');

    await waitFor(() => {
      expect(screen.getByText('Dr. API Test')).toBeInTheDocument();
    });

    expect(axios.get).toHaveBeenCalledWith(
      `${BASE_URL}/api/admin/user/136`,
      { headers: { Authorization: 'Bearer test-token-123' } }
    );
  });

  it('returns null when doctor is not set after loading', async () => {
    localStorage.setItem('token', 'fake-token');
    axios.get.mockResolvedValue({ data: { userType: 'patient' } });

    const { container } = render(
      <MemoryRouter initialEntries={['/admin/doctor-profile/137']}>
        <Routes>
          <Route path="/admin/doctor-profile/:id?" element={<AdminDoctorProfilePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading admin view...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('This user is not a doctor.')).toBeInTheDocument();
  });
});