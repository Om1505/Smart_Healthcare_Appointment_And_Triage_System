import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import axios from 'axios';
// Fix: Removed the .jsx extension, which can sometimes confuse bundlers
import AdminDoctorProfilePage from '../pages/AdminDoctorProfilePage';

// --- Mocks ---

// 1. Mock axios to prevent real API calls
vi.mock('axios');

// 2. Mock lucide-react icons to simplify the DOM and make tests faster
vi.mock('lucide-react', () => ({
  Stethoscope: () => <span data-testid="icon-stethoscope">Stethoscope Icon</span>,
  Clock: () => <span data-testid="icon-clock">Clock Icon</span>,
  MapPin: () => <span data-testid="icon-mappin">MapPin Icon</span>,
  IndianRupee: () => <span data-testid="icon-rupee">IndianRupee Icon</span>,
  Mail: () => <span data-testid="icon-mail">Mail Icon</span>,
  Phone: () => <span data-testid="icon-phone">Phone Icon</span>,
  Shield: () => <span data-testid="icon-shield">Shield Icon</span>,
  ArrowLeft: () => <span data-testid="icon-arrowleft">ArrowLeft Icon</span>,
}));

// 3. Mock react-router-dom to spy on 'useNavigate'
// We keep the original implementations of the router components
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal(); // Import original module
  return {
    ...actual, // Spread all original exports
    useNavigate: () => mockNavigate, // Override just useNavigate
    Link: ({ children, to }) => <a href={to}>{children}</a> // Simplify Link
  };
});

// 4. Mock the UI components
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

// --- End of Mocks ---

// Helper function to render the component within a router
const renderComponent = (doctorId) => {
  render(
    <MemoryRouter initialEntries={[`/admin/doctor-profile/${doctorId}`]}>
      <Routes>
        {/* The route we are testing */}
        <Route path="/admin/doctor-profile/:id" element={<AdminDoctorProfilePage />} />
        
        {/* Dummy routes for navigation assertions */}
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/admin/dashboard" element={<div>Admin Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
};

// --- Test Suite ---

describe('AdminDoctorProfilePage', () => {

  // Clear mocks and localStorage before each test
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // We must reset the mock implementation, otherwise a rejection will
    // "stick" for all subsequent tests
    axios.get.mockReset(); 
  });

  test('redirects to /login if no token is found', () => {
    // Arrange: localStorage is empty (handled by beforeEach)
    
    // Act
    renderComponent('123'); // Render with a test ID

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  test('shows loading state initially', () => {
    // Arrange
    localStorage.setItem('token', 'fake-token');
    // Mock a pending promise that never resolves
    axios.get.mockImplementation(() => new Promise(() => {}));

    // Act
    renderComponent('123');

    // Assert
    expect(screen.getByText('Loading admin view...')).toBeInTheDocument();
    expect(screen.getByTestId('icon-stethoscope')).toBeInTheDocument();
  });

  test('shows error message if API call fails', async () => {
    // Arrange
    localStorage.setItem('token', 'fake-token');
    axios.get.mockRejectedValue(new Error('Network Error'));

    // Act
    renderComponent('123');

    // Assert
    // We use `findByText` to wait for the component to re-render after the promise rejects
    const errorMessage = await screen.findByText('Could not fetch doctor profile. They might not exist or you lack permissions.');
    expect(errorMessage).toBeInTheDocument();
  });

  test('shows specific error if the user is not a doctor', async () => {
    // Arrange
    localStorage.setItem('token', 'fake-token');
    const mockPatient = {
      id: '123',
      fullName: 'Test Patient',
      userType: 'patient' // The critical part
    };
    axios.get.mockResolvedValue({ data: mockPatient });

    // Act
    renderComponent('123');

    // Assert
    const errorMessage = await screen.findByText('This user is not a doctor.');
    expect(errorMessage).toBeInTheDocument();
  });

  test('fetches and displays doctor profile on success', async () => {
    // Arrange
    // This is the line I fixed:
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
      address: '123 Health St, Medical City',
      consultationFee: 1500,
      createdAt: new Date(2023, 0, 15).toISOString(), // Use a fixed date
      profilePicture: 'image.png',
      userType: 'doctor' // Must be 'doctor'
    };
    axios.get.mockResolvedValue({ data: mockDoctor });

    // Act
    renderComponent('123');

    // Assert
    // Wait for the loading state to disappear
    await waitFor(() => {
      expect(screen.queryByText('Loading admin view...')).not.toBeInTheDocument();
    });

    // Check if the data is rendered
    expect(screen.getByText('Dr. Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('123-456-7890')).toBeInTheDocument();
    expect(screen.getByText('ABC12345')).toBeInTheDocument();
    expect(screen.getByText('A highly skilled cardiologist.')).toBeInTheDocument();
    expect(screen.getByText('10 years')).toBeInTheDocument();
    expect(screen.getByText('₹1500')).toBeInTheDocument();
    expect(screen.getByText('Cardiology')).toBeInTheDocument();
    expect(screen.getByText('Verified Doctor')).toBeInTheDocument();
    expect(screen.getByTestId('avatar-image')).toHaveAttribute('src', 'image.png');
    // Check fallback text for avatar
    expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('JD');
    // Check date formatting
    expect(screen.getByText(new Date(2023, 0, 15).toLocaleDateString())).toBeInTheDocument();


    // Check if axios was called with the correct URL and token
    expect(axios.get).toHaveBeenCalledWith(
      'http://localhost:5001/api/admin/user/123',
      {
        headers: { Authorization: 'Bearer fake-token' }
      }
    );
  });
  
  test('navigates to dashboard when "Return to Dashboard" button is clicked in error state', async () => {
    // Arrange
    localStorage.setItem('token', 'fake-token');
    axios.get.mockRejectedValue(new Error('Network Error'));

    // Act
    renderComponent('123');

    // Wait for the error UI to appear
    const errorButton = await screen.findByText('Return to Dashboard');
    
    // Simulate user click
    fireEvent.click(errorButton);

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
  });

  test('handles null/undefined values from API gracefully', async () => {
    // Arrange
    localStorage.setItem('token', 'fake-token');
    const mockDoctor = {
      id: '124',
      fullName: 'Dr. No Bio',
      email: 'nobio@example.com',
      userType: 'doctor',
      isVerified: false,
      createdAt: new Date(2023, 0, 15).toISOString(),
      // All other fields are null or undefined
      phone: null,
      licenseNumber: undefined,
      specialization: null,
      bio: null,
      experience: null,
      address: null,
      consultationFee: null,
    };
    axios.get.mockResolvedValue({ data: mockDoctor });

    // Act
    renderComponent('124');

    // Assert
    await waitFor(() => {
      expect(screen.queryByText('Loading admin view...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Dr. No Bio')).toBeInTheDocument();
    expect(screen.getByText('nobio@example.com')).toBeInTheDocument();
    
    // --- FIX: Use more specific queries ---
    // We find the label (e.g., "Phone") and check its sibling element
    expect(screen.getByText('Phone').nextElementSibling).toHaveTextContent('N/A');
    expect(screen.getByText('License No.').nextElementSibling).toHaveTextContent('N/A');
    expect(screen.getByText('No biography provided by this doctor.')).toBeInTheDocument();
    expect(screen.getByText('Experience').nextElementSibling).toHaveTextContent('Not specified');
    expect(screen.getByText('Clinic Address').nextElementSibling).toHaveTextContent('Not specified');
    expect(screen.getByText('Consultation Fee').nextElementSibling).toHaveTextContent('Not set');
    // --- END FIX ---
    
    expect(screen.getByText('General')).toBeInTheDocument(); // Specialization
    expect(screen.getByText('Pending Verification')).toBeInTheDocument();
  });
});