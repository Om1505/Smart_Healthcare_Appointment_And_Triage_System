import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import AdminDoctorProfilePage from '../src/pages/AdminDoctorProfilePage';

// --- Mocks ---
vi.mock('axios');

// 1. Mock React's useState to allow interception for the "unreachable code" test
vi.mock('react', async () => {
    const actual = await vi.importActual('react');
    return {
        ...actual,
        useState: vi.fn((initial) => actual.useState(initial)),
    };
});

// 2. Mock Lucide Icons
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

// 3. Mock Navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  };
});

// 4. Mock UI Components (CRITICAL UPDATE: Passing props through to DOM)
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>
}));
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }) => <h2 data-testid="card-title">{children}</h2>,
}));

// Updated Avatar Mock: Passes className and src through
vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }) => <div data-testid="avatar" className={className}>{children}</div>,
  AvatarImage: ({ src, alt }) => <img src={src} alt={alt} data-testid="avatar-image" />,
  AvatarFallback: ({ children, className }) => <span data-testid="avatar-fallback" className={className}>{children}</span>,
}));

// Updated Badge Mock: Passes className and variant through
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, variant }) => (
    <span data-testid="badge" className={className} data-variant={variant}>{children}</span>
  )
}));

const BASE_URL = 'https://smart-healthcare-appointment-and-triage.onrender.com';

const renderComponent = (doctorId) => {
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

describe('AdminDoctorProfilePage', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    axios.get.mockReset();
  });
  
  afterEach(() => {
    vi.restoreAllMocks(); 
  });

  // --- 1. Happy Path & Styling Mutants ---
  it('fetches and displays doctor profile with correct formatting and styling', async () => {
    localStorage.setItem('token', 'fake-token');
    const mockDoctor = {
      id: '123',
      fullName: 'Dr. Jane Doe', 
      email: 'jane.doe@example.com',
      phone: '123-456-7890',
      licenseNumber: 'ABC12345',
      specialization: 'Cardiology',
      isVerified: true, // Should trigger Green Badge
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

    // 1. Kill API URL/Header Mutants (Strict check)
    expect(axios.get).toHaveBeenCalledWith(
        `${BASE_URL}/api/admin/user/123`, 
        { headers: { Authorization: 'Bearer fake-token' } }
    );

    // 2. Kill Initials Mutant
    const fallback = screen.getByTestId('avatar-fallback');
    expect(fallback).toHaveTextContent('DJD');

    // 3. Kill Name Slicing Mutant
    expect(screen.getByText('About Dr. Doe')).toBeInTheDocument();

    // 4. Kill Styling Mutant (Verified Badge Color)
    // Because we updated the mock, the class is now visible in the DOM
    const verifiedBadge = screen.getByText('Verified Doctor');
    expect(verifiedBadge).toHaveClass('bg-green-600');
    expect(verifiedBadge).not.toHaveClass('bg-amber-600');
    expect(verifiedBadge).toHaveAttribute('data-variant', 'default');

    // 5. Verify Data Formatting
    expect(screen.getByText('10 years')).toBeInTheDocument();
    expect(screen.getByText('₹1500')).toBeInTheDocument();
  });

  // --- 2. Fallback & Logic Mutants ---
  it('handles null/undefined values and unverified status gracefully', async () => {
    localStorage.setItem('token', 'fake-token');
    const mockDoctor = {
      id: '124',
      fullName: 'Dr. No Bio',
      email: 'nobio@example.com',
      userType: 'doctor',
      isVerified: false, // Should trigger Amber Badge
      createdAt: '2023-01-15T00:00:00.000Z',
      phone: null,
      licenseNumber: undefined,
      specialization: null,
      bio: null,
      experience: null,
      address: null,
      consultationFee: null,
      profilePicture: null // Should trigger default avatar
    };
    axios.get.mockResolvedValue({ data: mockDoctor });

    renderComponent('124');

    await waitFor(() => {
      expect(screen.queryByText('Loading admin view...')).not.toBeInTheDocument();
    });

    // 1. Kill Unverified Badge Mutant (Color and Variant)
    const pendingBadge = screen.getByText('Pending Verification');
    expect(pendingBadge).toHaveClass('bg-amber-600');
    expect(pendingBadge).toHaveAttribute('data-variant', 'destructive');

    // 2. Kill Image Fallback Mutant
    // Verify the image src defaults to /default-avatar.jpg
    const img = screen.getByTestId('avatar-image');
    expect(img).toHaveAttribute('src', '/default-avatar.jpg');

    // 3. Kill Fallback Mutants (|| 'N/A')
    const phoneHeader = screen.getByText('Phone');
    expect(phoneHeader.nextSibling).toHaveTextContent('N/A');

    const licenseHeader = screen.getByText('License No.');
    expect(licenseHeader.nextSibling).toHaveTextContent('N/A');

    // 4. Kill "Not specified" Mutants
    const expHeader = screen.getByText('Experience');
    expect(expHeader.nextSibling).toHaveTextContent('Not specified');

    const addrHeader = screen.getByText('Clinic Address');
    expect(addrHeader.nextSibling).toHaveTextContent('Not specified');

    const feeHeader = screen.getByText('Consultation Fee');
    expect(feeHeader.nextSibling).toHaveTextContent('Not set');
    
    // 5. Kill Bio Fallback
    expect(screen.getByText('No biography provided by this doctor.')).toBeInTheDocument();
    
    // 6. Kill Specialization Fallback
    expect(screen.getByText('General')).toBeInTheDocument();
  });

  // --- 3. Auth & Error Mutants ---
  it('redirects to /login if no token is found', () => {
    renderComponent('123');
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('shows loading state initially', () => {
    localStorage.setItem('token', 'fake-token');
    axios.get.mockImplementation(() => new Promise(() => {})); 
    renderComponent('123');
    expect(screen.getByText('Loading admin view...')).toBeInTheDocument();
  });

  it('does not fetch profile if ID is missing', async () => {
    localStorage.setItem('token', 'fake-token');
    renderComponent(null);
    await waitFor(() => expect(screen.getByText('Loading admin view...')).toBeInTheDocument());
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

  it('navigates to dashboard when "Return to Dashboard" is clicked in error state', async () => {
    localStorage.setItem('token', 'fake-token');
    axios.get.mockRejectedValue(new Error('Error'));
    renderComponent('123');

    const returnBtn = await screen.findByText('Return to Dashboard');
    fireEvent.click(returnBtn);
    
    expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
  });

  it('navigates to dashboard when header "Back to Dashboard" link is clicked', async () => {
    localStorage.setItem('token', 'fake-token');
    const mockDoctor = {
        id: '123',
        fullName: 'Dr. Test',
        email: 'test@test.com',
        userType: 'doctor',
        createdAt: new Date().toISOString()
    };
    axios.get.mockResolvedValue({ data: mockDoctor });

    renderComponent('123');
    await waitFor(() => expect(screen.queryByText('Loading admin view...')).not.toBeInTheDocument());

    const backLink = screen.getByText(/Back to Dashboard/i);
    expect(backLink.closest('a')).toHaveAttribute('href', '/admin/dashboard');
  });

  it('renders null when loading is false but no doctor data exists (Covering unreachable code)', () => {
    vi.mocked(useState).mockImplementation((initial) => {
        if (initial === true) return [false, vi.fn()];
        if (initial === null) return [null, vi.fn()];
        return [initial, vi.fn()];
    });

    const { container } = render(
      <MemoryRouter>
        <AdminDoctorProfilePage />
      </MemoryRouter>
    );

    expect(container).toBeEmptyDOMElement();
  });

});