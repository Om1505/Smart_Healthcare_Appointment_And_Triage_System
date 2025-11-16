import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import AdminDashboard from '../pages/AdminDashboard';

// --- 1. MOCK EXTERNAL DEPENDENCIES ---

// Mock axios
vi.mock('axios');

// Mock react-router-dom's useNavigate hook
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom'); // Import actual router parts
  return {
    ...actual, // Spread all actual exports (like <Link> and <MemoryRouter>)
    useNavigate: () => mockNavigate, // Provide a mock function for useNavigate
  };
});

// --- 2. DEFINE MOCK DATA ---
const mockAdminProfile = {
  fullName: 'Admin User',
  email: 'admin@test.com',
  userType: 'admin',
};

const mockDoctors = [
  {
    _id: 'd1',
    fullName: 'Dr. John Doe',
    email: 'john@doc.com',
    specialization: 'Cardiology',
    licenseNumber: '12345',
    isVerified: false,
  },
  {
    _id: 'd2',
    fullName: 'Dr. Jane Smith',
    email: 'jane@doc.com',
    specialization: 'Neurology',
    licenseNumber: '67890',
    isVerified: true,
  },
];

const mockPatients = [
  {
    _id: 'p1',
    fullName: 'Alice Johnson',
    email: 'alice@pat.com',
    createdAt: '2023-01-01T10:00:00Z',
  },
];

// --- 3. THE TEST SUITE ---

describe('AdminDashboard Component', () => {

  // This beforeEach hook runs before every single test
  beforeEach(() => {
    // Reset all mock function call counters
    vi.clearAllMocks();

    // Mock localStorage.getItem to return a fake token
    Storage.prototype.getItem = vi.fn((key) => (key === 'token' ? 'fake-token' : null));
    Storage.prototype.removeItem = vi.fn();
    
    // Mock window.confirm (used in reject/suspend) to always return 'true' (user clicked "OK")
    window.confirm = vi.fn(() => true);
    Element.prototype.scrollIntoView = vi.fn();

    // Default mock implementation for API calls
    // Individual tests can override this
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) {
        return Promise.resolve({ data: mockAdminProfile });
      }
      if (url.includes('/api/admin/users')) {
        return Promise.resolve({ data: { doctors: mockDoctors, patients: mockPatients } });
      }
      return Promise.reject(new Error('Not mocked'));
    });
    axios.put.mockResolvedValue({ data: {} });
    axios.delete.mockResolvedValue({ data: {} });
  });

  // Helper function to render the component inside MemoryRouter
  const renderComponent = () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );
  };

  // --- EXISTING TEST CASES (FIXED) ---

  it('should show loading spinner initially', () => {
    axios.get.mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(screen.getByText(/Loading Dashboard.../i)).toBeInTheDocument();
  });

  it('should show an error message if fetching admin profile fails', async () => {
    axios.get.mockRejectedValue(new Error('Failed to fetch admin profile.'));
    renderComponent();
    expect(await screen.findByText(/Error: Failed to fetch admin profile./i)).toBeInTheDocument();
  });

  it('should redirect to login if user is not an admin', async () => {
    axios.get.mockResolvedValue({
      data: { ...mockAdminProfile, userType: 'patient' },
    });
    renderComponent();
    expect(await screen.findByText(/Error: Access Denied. You are not an admin./i)).toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
    expect(localStorage.removeItem).toHaveBeenCalledWith('token');
  });

  it('should render doctors and patients tables after successful data fetch', async () => {
    renderComponent();
    expect(await screen.findByText('Dr. John Doe')).toBeInTheDocument();
    expect(screen.getByText('Dr. Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('should call verify API when "Verify" button is clicked', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) {
        return Promise.resolve({ data: mockAdminProfile });
      }
      if (url.includes('/api/admin/users')) {
        return Promise.resolve({ data: { doctors: [mockDoctors[0]], patients: [] } }); // Only the pending doctor
      }
      return Promise.reject(new Error('Not mocked'));
    });
    axios.put.mockResolvedValue({ data: { ...mockDoctors[0], isVerified: true } });

    renderComponent();
    const verifyButton = await screen.findByRole('button', { name: /verify/i });
    fireEvent.click(verifyButton);

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        'http://localhost:5001/api/admin/verify-doctor/d1',
        {},
        { headers: { Authorization: 'Bearer fake-token' } }
      );
    });
    expect(await screen.findByRole('button', { name: /suspend/i })).toBeInTheDocument();
  });

  it('should refetch users when a name filter is changed', async () => {
    renderComponent();
    expect(await screen.findByText('Dr. John Doe')).toBeInTheDocument();

    // Find the "Doctors" card and search within it
    const doctorsCard = screen.getByText('Doctors').closest('div[class*="rounded-xl border"]');
    const nameFilterInput = within(doctorsCard).getByLabelText('Name');
    
    axios.get.mockResolvedValue({ data: { doctors: [mockDoctors[1]], patients: [] } }); // Only Dr. Jane
    
    fireEvent.change(nameFilterInput, { target: { value: 'Jane' } });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('?name=Jane'),
        expect.any(Object)
      );
    }, { timeout: 1000 }); // Wait for debounce

    expect(await screen.findByText('Dr. Jane Smith')).toBeInTheDocument();
    expect(screen.queryByText('Dr. John Doe')).not.toBeInTheDocument();
  });

  it('should navigate to all appointments page when button is clicked', async () => {
    renderComponent();
    const appointmentsButton = await screen.findByRole('button', { name: /view all appointments/i });
    fireEvent.click(appointmentsButton);
    expect(mockNavigate).toHaveBeenCalledWith('/admin/appointments');
  });

  // --- 👇 NEW TEST CASES FOR 100% COVERAGE 👇 ---

  it('should show an error if fetching users fails', async () => {
    // Mock profile to succeed, but users to fail
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) {
        return Promise.resolve({ data: mockAdminProfile });
      }
      if (url.includes('/api/admin/users')) {
        return Promise.reject(new Error('Failed to load users'));
      }
      return Promise.reject(new Error('Not mocked'));
    });
    
    renderComponent();

    // Wait for the error message
    // Use a regular expression to find the text /Failed to load user data/
    expect(await screen.findByText(/Failed to load user data/i)).toBeInTheDocument();
  });

  it('should not reject a doctor if admin cancels confirmation', async () => {
    // Set window.confirm to return false
    window.confirm = vi.fn(() => false);
    
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) {
        return Promise.resolve({ data: mockAdminProfile });
      }
      if (url.includes('/api/admin/users')) {
        return Promise.resolve({ data: { doctors: [mockDoctors[0]], patients: [] } }); // Pending doctor
      }
      return Promise.reject(new Error('Not mocked'));
    });
    
    renderComponent();

    // Find and click the "Reject" button
    const rejectButton = await screen.findByRole('button', { name: /reject/i });
    fireEvent.click(rejectButton);

    // Assert that confirm was called, but the API was not
    expect(window.confirm).toHaveBeenCalled();
    expect(axios.delete).not.toHaveBeenCalled();
  });

  it('should not suspend a doctor if admin cancels confirmation', async () => {
    // Set window.confirm to return false
    window.confirm = vi.fn(() => false);
    
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) {
        return Promise.resolve({ data: mockAdminProfile });
      }
      if (url.includes('/api/admin/users')) {
        return Promise.resolve({ data: { doctors: [mockDoctors[1]], patients: [] } }); // Verified doctor
      }
      return Promise.reject(new Error('Not mocked'));
    });
    
    renderComponent();

    // Find and click the "Suspend" button
    const suspendButton = await screen.findByRole('button', { name: /suspend/i });
    fireEvent.click(suspendButton);

    // Assert that confirm was called, but the API was not
    expect(window.confirm).toHaveBeenCalled();
    expect(axios.put).not.toHaveBeenCalled();
  });

  it('should log out the user when logout button is clicked', async () => {
    renderComponent();
    
    // Find and click the profile icon
    const profileIcon = await screen.findByText('AD'); // Based on mockAdminProfile
    fireEvent.click(profileIcon);
    
    // Find and click the "Logout" button
    const logoutButton = await screen.findByRole('button', { name: /logout/i });
    fireEvent.click(logoutButton);

    // Assert that token was removed and user was navigated
    expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should show and hide the profile modal', async () => {
    renderComponent();

    // 1. Open profile dropdown
    const profileIcon = await screen.findByText('AD');
    fireEvent.click(profileIcon);

    // 2. Click "View Profile"
    const viewProfileButton = await screen.findByRole('button', { name: /view profile/i });
    fireEvent.click(viewProfileButton);

    // 3. Assert modal is visible and shows correct info
    expect(await screen.findByText('Your Profile')).toBeInTheDocument();
    expect(screen.getByText(mockAdminProfile.email)).toBeInTheDocument();
    expect(screen.getByText(mockAdminProfile.fullName)).toBeInTheDocument();

    // 4. Click "Close" button
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    // 5. Assert modal is hidden
    await waitFor(() => {
      expect(screen.queryByText('Your Profile')).not.toBeInTheDocument();
    });
  });

  it('should navigate to doctor profile when name is clicked', async () => {
    renderComponent();

    // Find the button with the doctor's name and click it
    const doctorNameButton = await screen.findByRole('button', { name: 'Dr. John Doe' });
    fireEvent.click(doctorNameButton);

    // Assert navigation was called correctly
    expect(mockNavigate).toHaveBeenCalledWith('/admin/doctor-profile/d1');
  });

  it('should show "no data" messages when API returns empty arrays', async () => {
    // Mock API to return empty arrays
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) {
        return Promise.resolve({ data: mockAdminProfile });
      }
      if (url.includes('/api/admin/users')) {
        return Promise.resolve({ data: { doctors: [], patients: [] } });
      }
      return Promise.reject(new Error('Not mocked'));
    });
    
    renderComponent();

    // Assert the "no data" messages appear
    expect(await screen.findByText(/No doctors match/i)).toBeInTheDocument();
    expect(await screen.findByText(/No patients match/i)).toBeInTheDocument();
  });
  
  it('should refetch users when all filters are changed', async () => {
    renderComponent();
    expect(await screen.findByText('Dr. John Doe')).toBeInTheDocument();
    
    // Find card sections
    const doctorsCard = screen.getByText('Doctors').closest('div[class*="rounded-xl border"]');
    const patientsCard = screen.getByText('Patients').closest('div[class*="rounded-xl border"]');

    // Test all doctor filters
    fireEvent.change(within(doctorsCard).getByLabelText('Name'), { target: { value: 'test' } });
    fireEvent.change(within(doctorsCard).getByLabelText('Email'), { target: { value: 'test@email' } });
    fireEvent.change(within(doctorsCard).getByLabelText('License'), { target: { value: '123' } });
    
    // Test patient filters
    fireEvent.change(within(patientsCard).getByLabelText('Name'), { target: { value: 'patient' } });
    fireEvent.change(within(patientsCard).getByLabelText('Email'), { target: { value: 'patient@email' } });
    fireEvent.change(within(patientsCard).getByLabelText('Joined From'), { target: { value: '2023-01-01' } });
    fireEvent.change(within(patientsCard).getByLabelText('Joined To'), { target: { value: '2023-01-31' } });

    // Wait for the final API call after debounce
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('name=test&email=test%40email&license=123&patientName=patient&patientEmail=patient%40email&patientDateFrom=2023-01-01&patientDateTo=2023-01-31'),
        expect.any(Object)
      );
    }, { timeout: 1000 });
  });

  // In src/pages/AdminDashboard.test.jsx

  it('should test status and specialization filters', async () => {
    renderComponent();
    expect(await screen.findByText('Dr. John Doe')).toBeInTheDocument();

    const doctorsCard = screen.getByText('Doctors').closest('div[class*="rounded-xl border"]');

    // --- Test Status filter ---
    // Click the dropdown trigger
    fireEvent.click(within(doctorsCard).getByText('All Statuses'));
    
    // Find by role="option" to specifically get the dropdown item
    const pendingOption = await screen.findByRole('option', { name: /pending/i });
    fireEvent.click(pendingOption);
    
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('status=pending'),
        expect.any(Object)
      );
    }, { timeout: 1000 });

    // --- Test Specialization filter ---
    // Click the dropdown trigger
    fireEvent.click(within(doctorsCard).getByText('All Specializations'));
    
    // Find by role="option" again
    const cardiologyOption = await screen.findByRole('option', { name: /cardiology/i });
    fireEvent.click(cardiologyOption);

    await waitFor(() => {
      // Get the URL from the very last API call
      const lastCallArgs = axios.get.mock.lastCall;
      const lastUrl = lastCallArgs[0];
      
      // Check that the URL contains both substrings, in any order
      expect(lastUrl).toContain('status=pending');
      expect(lastUrl).toContain('specialization=Cardiology');
    }, { timeout: 1000 });
  });

  // In src/pages/AdminDashboard.test.jsx

  // ... (paste these after your last test)

  // In src/pages/AdminDashboard.test.jsx

  it('should show an alert if handleReject fails', async () => {
    // 1. Mock the API to fail with a specific message
    const mockApiError = {
      response: { data: { message: 'Reject API error' } }
    };
    axios.delete.mockRejectedValue(mockApiError); // MODIFIED
    window.alert = vi.fn(); 
    
    // 2. Render with a pending doctor
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) {
        return Promise.resolve({ data: mockAdminProfile });
      }
      if (url.includes('/api/admin/users')) {
        return Promise.resolve({ data: { doctors: [mockDoctors[0]], patients: [] } });
      }
      return Promise.reject(new Error('Not mocked'));
    });

    renderComponent();

    // 3. Find and click "Reject"
    const rejectButton = await screen.findByRole('button', { name: /reject/i });
    fireEvent.click(rejectButton);

    // 4. Assert
    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalled();
    });
    // MODIFIED
    expect(window.alert).toHaveBeenCalledWith('Error: Reject API error');
  });

  it('should show an alert if handleSuspend fails', async () => {
    // 1. Mock the API to fail
    axios.put.mockRejectedValue(new Error('API Error'));
    window.alert = vi.fn(); // Mock the alert function
    
    // 2. Render with a verified doctor
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) {
        return Promise.resolve({ data: mockAdminProfile });
      }
      if (url.includes('/api/admin/users')) {
        return Promise.resolve({ data: { doctors: [mockDoctors[1]], patients: [] } });
      }
      return Promise.reject(new Error('Not mocked'));
    });

    renderComponent();

    // 3. Find and click "Suspend"
    const suspendButton = await screen.findByRole('button', { name: /suspend/i });
    fireEvent.click(suspendButton);

    // 4. Assert
    await waitFor(() => {
      expect(axios.put).toHaveBeenCalled(); // Check that the call was attempted
    });
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Failed to suspend doctor.'));
  });

  it('should not call API in handleReject if token is missing', async () => {
    // 1. Render component as normal
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) {
        return Promise.resolve({ data: mockAdminProfile });
      }
      if (url.includes('/api/admin/users')) {
        return Promise.resolve({ data: { doctors: [mockDoctors[0]], patients: [] } });
      }
      return Promise.reject(new Error('Not mocked'));
    });
    renderComponent();
    
    // 2. Wait for the button to appear
    const rejectButton = await screen.findByRole('button', { name: /reject/i });
    
    // 3. NOW, mock localStorage to return null
    Storage.prototype.getItem = vi.fn(() => null);

    // 4. Click the button
    fireEvent.click(rejectButton);

    // 5. Assert the API was never called
    expect(axios.delete).not.toHaveBeenCalled();
  });

  // In src/pages/AdminDashboard.test.jsx

  it('should show a specific alert if handleVerify fails with an API message', async () => {
    // 1. Mock the API to fail with a specific message
    const mockApiError = {
      response: { data: { message: 'Verification API is down' } }
    };
    axios.put.mockRejectedValue(mockApiError);
    window.alert = vi.fn(); // Mock the alert function

    // 2. Render with a pending doctor
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) {
        return Promise.resolve({ data: mockAdminProfile });
      }
      if (url.includes('/api/admin/users')) {
        return Promise.resolve({ data: { doctors: [mockDoctors[0]], patients: [] } });
      }
      return Promise.reject(new Error('Not mocked'));
    });

    renderComponent();

    // 3. Find and click "Verify"
    const verifyButton = await screen.findByRole('button', { name: /verify/i });
    fireEvent.click(verifyButton);

    // 4. Assert the specific error message was shown
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Error: Verification API is down');
    });
  });

  // In src/pages/AdminDashboard.test.jsx

  // In src/pages/AdminDashboard.test.jsx

  it('should close the profile dropdown when clicking outside', async () => {
    renderComponent();
    
    // 1. Open profile dropdown
    const profileIcon = await screen.findByText('AD');
    fireEvent.click(profileIcon);
    
    // 2. Assert it's open
    expect(await screen.findByRole('button', { name: /logout/i })).toBeInTheDocument();
    
    // 3. Fire a mousedown event on the document body
    // This is a more robust way to test "clicking outside"
    fireEvent.mouseDown(document.body);
    
    // 4. Assert it's closed
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /logout/i })).not.toBeInTheDocument();
    });
  });

  // In src/pages/AdminDashboard.test.jsx

  it('should successfully reject a doctor', async () => {
    // 1. Render with a pending doctor
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) {
        return Promise.resolve({ data: mockAdminProfile });
      }
      if (url.includes('/api/admin/users')) {
        return Promise.resolve({ data: { doctors: [mockDoctors[0]], patients: [] } });
      }
      return Promise.reject(new Error('Not mocked'));
    });
    // Mock the "happy path" for delete
    axios.delete.mockResolvedValue({});

    renderComponent();

    // 2. Find and click "Reject"
    const rejectButton = await screen.findByRole('button', { name: /reject/i });
    fireEvent.click(rejectButton);

    // 3. Assert API was called and the doctor is removed from the UI
    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(
        'http://localhost:5001/api/admin/reject-doctor/d1',
        expect.any(Object)
      );
    });
    expect(screen.queryByText('Dr. John Doe')).not.toBeInTheDocument();
  });

  it('should successfully suspend a doctor', async () => {
    // 1. Render with a verified doctor
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) {
        return Promise.resolve({ data: mockAdminProfile });
      }
      if (url.includes('/api/admin/users')) {
        return Promise.resolve({ data: { doctors: [mockDoctors[1]], patients: [] } });
      }
      return Promise.reject(new Error('Not mocked'));
    });
    // Mock the "happy path" for put
    axios.put.mockResolvedValue({ data: { ...mockDoctors[1], isVerified: false } });

    renderComponent();

    // 2. Find and click "Suspend"
    const suspendButton = await screen.findByRole('button', { name: /suspend/i });
    fireEvent.click(suspendButton);

    // 3. Assert API was called and the UI updated (Suspend button gone)
    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        'http://localhost:5001/api/admin/suspend-doctor/d2',
        {},
        expect.any(Object)
      );
    });
    // The "Suspend" button should be replaced by "Verify"
    expect(await screen.findByRole('button', { name: /verify/i })).toBeInTheDocument();
  });

  it('should click the "Try Again" button on the error page', async () => {
    // 1. Mock the reload function
    // We need to mock window.location
    const { location } = window;
    delete window.location;
    window.location = { reload: vi.fn() };

    // 2. Force the error state
    axios.get.mockRejectedValue(new Error('Failed to fetch admin profile.'));
    renderComponent();

    // 3. Find and click the "Try Again" button
    const tryAgainButton = await screen.findByRole('button', { name: /try again/i });
    fireEvent.click(tryAgainButton);

    // 4. Assert window.location.reload was called
    expect(window.location.reload).toHaveBeenCalled();

    // Restore window.location
    window.location = location;
  });

  it('should not close profile dropdown when clicking inside it', async () => {
    renderComponent();
    
    // 1. Open profile dropdown
    const profileIcon = await screen.findByText('AD');
    fireEvent.click(profileIcon);
    
    // 2. Assert it's open by finding the "Logout" button
    const logoutButton = await screen.findByRole('button', { name: /logout/i });
    expect(logoutButton).toBeInTheDocument();
    
    // 3. Click *inside* the menu (on the logout button itself)
    fireEvent.mouseDown(logoutButton);
    
    // 4. Assert it is *still* open
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

});