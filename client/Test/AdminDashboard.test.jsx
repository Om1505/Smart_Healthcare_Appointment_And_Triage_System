import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import AdminDashboard from '../src/pages/AdminDashboard';

// --- 1. MOCK EXTERNAL DEPENDENCIES ---
vi.mock('axios');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom'); 
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  };
});

// --- 2. DEFINE MOCK DATA ---
const BASE_URL = 'https://smart-healthcare-appointment-and-triage.onrender.com';

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
    isVerified: false, // Shows Verify/Reject
  },
  {
    _id: 'd2',
    fullName: 'Dr. Jane Smith',
    email: 'jane@doc.com',
    specialization: 'Neurology',
    licenseNumber: '67890',
    isVerified: true, // Shows Suspend
  },
];

const mockPatients = [
  {
    _id: 'p1',
    fullName: 'Alice Johnson',
    email: 'alice@pat.com',
    createdAt: '2023-01-01T10:00:00Z',
    isVerified: true, // Shows Suspend
  },
  {
    _id: 'p2',
    fullName: 'Bob Suspended',
    email: 'bob@pat.com',
    createdAt: '2023-02-01T10:00:00Z',
    isVerified: false, // Shows Verify
  },
];

// --- 3. THE TEST SUITE ---

describe('AdminDashboard Component', () => {

  beforeEach(() => {
    vi.resetAllMocks();
    
    // Default mocks
    Storage.prototype.getItem = vi.fn((key) => (key === 'token' ? 'fake-token' : null));
    Storage.prototype.removeItem = vi.fn();
    window.confirm = vi.fn(() => true);
    window.alert = vi.fn(); 
    Element.prototype.scrollIntoView = vi.fn();

    // Default API Mocks (Happy Path)
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) return Promise.resolve({ data: mockAdminProfile });
      if (url.includes('/api/admin/users')) return Promise.resolve({ data: { doctors: mockDoctors, patients: mockPatients } });
      return Promise.reject(new Error('Not mocked'));
    });
    axios.put.mockResolvedValue({ data: {} });
    axios.delete.mockResolvedValue({ data: {} });
  });

  const renderComponent = () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );
  };

  // --- GROUP 1: INITIAL LOADING & AUTH ---

  it('should show loading spinner initially', () => {
    axios.get.mockReturnValue(new Promise(() => {})); // Hang pending
    renderComponent();
    expect(screen.getByText(/Loading Dashboard.../i)).toBeInTheDocument();
  });

  it('should show an error message if fetching admin profile fails', async () => {
    axios.get.mockRejectedValue(new Error('Failed to fetch admin profile.'));
    renderComponent();
    expect(await screen.findByText(/Error: Failed to fetch admin profile./i)).toBeInTheDocument();
  });

  it('should redirect to login if user is not an admin', async () => {
    axios.get.mockResolvedValue({ data: { ...mockAdminProfile, userType: 'patient' } });
    renderComponent();
    expect(await screen.findByText(/Error: Access Denied. You are not an admin./i)).toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should redirect to login immediately if no token is found', async () => {
    Storage.prototype.getItem = vi.fn(() => null);

    renderComponent();

    // 2. Verify navigation happens
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    // 3. Verify the 'return' statement executed by ensuring the API was NEVER called
    expect(axios.get).not.toHaveBeenCalled();
  });

  // --- GROUP 2: DATA RENDERING ---

  it('should render doctors and patients tables', async () => {
    renderComponent();
    expect(await screen.findByText('Dr. John Doe')).toBeInTheDocument();
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
  });

  it('should show "no data" messages when API returns empty arrays', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) return Promise.resolve({ data: mockAdminProfile });
      if (url.includes('/api/admin/users')) return Promise.resolve({ data: { doctors: [], patients: [] } });
      return Promise.reject(new Error('Not mocked'));
    });
    
    renderComponent();
    expect(await screen.findByText(/No doctors match/i)).toBeInTheDocument();
    expect(await screen.findByText(/No patients match/i)).toBeInTheDocument();
  });

  // --- GROUP 3: DOCTOR ACTIONS ---

  it('should call verify API when Verify button is clicked (Doctor)', async () => {
    // Isolate the pending doctor D1 so the button is definitely "Verify"
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) return Promise.resolve({ data: mockAdminProfile });
      if (url.includes('/api/admin/users')) return Promise.resolve({ data: { doctors: [mockDoctors[0]], patients: [] } });
      return Promise.reject(new Error('Not mocked'));
    });
    
    renderComponent();
    const verifyButton = await screen.findByRole('button', { name: /verify/i });
    fireEvent.click(verifyButton);

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        `${BASE_URL}/api/admin/verify-doctor/d1`,
        {},
        expect.any(Object)
      );
    });
  });

  it('should call reject API when Reject button is clicked', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) return Promise.resolve({ data: mockAdminProfile });
      if (url.includes('/api/admin/users')) return Promise.resolve({ data: { doctors: [mockDoctors[0]], patients: [] } });
      return Promise.reject(new Error('Not mocked'));
    });

    renderComponent();
    const rejectButton = await screen.findByRole('button', { name: /reject/i });
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(
        `${BASE_URL}/api/admin/reject-doctor/d1`,
        expect.any(Object)
      );
    });
  });

  it('should call suspend API when Suspend button is clicked (Doctor)', async () => {
    // Isolate verified doctor D2 so button is "Suspend"
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) return Promise.resolve({ data: mockAdminProfile });
      if (url.includes('/api/admin/users')) return Promise.resolve({ data: { doctors: [mockDoctors[1]], patients: [] } });
      return Promise.reject(new Error('Not mocked'));
    });

    renderComponent();
    const suspendButton = await screen.findByRole('button', { name: /suspend/i });
    fireEvent.click(suspendButton);

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        `${BASE_URL}/api/admin/suspend-doctor/d2`,
        {},
        expect.any(Object)
      );
    });
  });

  it('should not reject a doctor if admin cancels confirmation', async () => {
    window.confirm = vi.fn(() => false);
    // Use D1 (Pending)
    axios.get.mockImplementation((url) => {
        if (url.includes('/api/users/profile')) return Promise.resolve({ data: mockAdminProfile });
        if (url.includes('/api/admin/users')) return Promise.resolve({ data: { doctors: [mockDoctors[0]], patients: [] } });
        return Promise.reject(new Error('Not mocked'));
      });

    renderComponent();
    const rejectButton = await screen.findByRole('button', { name: /reject/i });
    fireEvent.click(rejectButton);
    expect(window.confirm).toHaveBeenCalled();
    expect(axios.delete).not.toHaveBeenCalled();
  });

  it('should suspend a specific doctor and verify others remain unchanged', async () => {
    // 1. Setup
    const localDocs = [
      { _id: 'd1', fullName: 'Target Doc', isVerified: true, specialization: 'A' },
      { _id: 'd2', fullName: 'Other Doc', isVerified: true, specialization: 'B' }
    ];

    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) return Promise.resolve({ data: mockAdminProfile });
      if (url.includes('/api/admin/users')) return Promise.resolve({ data: { doctors: localDocs, patients: [] } });
      return Promise.reject(new Error('Not mocked'));
    });

    renderComponent();

    // 2. WAIT for the element to appear (Handles loading state)
    const targetName = await screen.findByText('Target Doc'); 
    const targetRow = targetName.closest('tr');
    
    // Now interact with the button inside that row
    const suspendBtn = within(targetRow).getByRole('button', { name: /suspend/i });
    fireEvent.click(suspendBtn);

    // 3. Wait for API call
    await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(expect.stringContaining('suspend-doctor/d1'), {}, expect.any(Object));
    });

    // 4. Verify 'Other Doc' is still untouched
    const otherName = await screen.findByText('Other Doc');
    const otherRow = otherName.closest('tr');
    expect(within(otherRow).getByRole('button', { name: /suspend/i })).toBeInTheDocument();
  });

  // --- GROUP 4: PATIENT ACTIONS ---

  it('should successfully suspend a patient', async () => {
    // Use P1 (Active)
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) return Promise.resolve({ data: mockAdminProfile });
      if (url.includes('/api/admin/users')) return Promise.resolve({ data: { doctors: [], patients: [mockPatients[0]] } });
      return Promise.reject(new Error('Not mocked'));
    });
    
    renderComponent();
    const suspendButton = await screen.findByRole('button', { name: /suspend/i });
    fireEvent.click(suspendButton);

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        `${BASE_URL}/api/admin/suspend-patient/p1`,
        {},
        expect.any(Object)
      );
    });
  });

  it('should successfully verify (reactivate) a patient', async () => {
    // Use P2 (Suspended)
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) return Promise.resolve({ data: mockAdminProfile });
      if (url.includes('/api/admin/users')) return Promise.resolve({ data: { doctors: [], patients: [mockPatients[1]] } });
      return Promise.reject(new Error('Not mocked'));
    });
    
    renderComponent();
    const verifyButton = await screen.findByRole('button', { name: /verify/i });
    fireEvent.click(verifyButton);

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        `${BASE_URL}/api/admin/verify-patient/p2`,
        {},
        expect.any(Object)
      );
    });
  });

  it('should not suspend patient if cancelled', async () => {
    window.confirm = vi.fn(() => false);
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) return Promise.resolve({ data: mockAdminProfile });
      if (url.includes('/api/admin/users')) return Promise.resolve({ data: { doctors: [], patients: [mockPatients[0]] } });
      return Promise.reject(new Error('Not mocked'));
    });

    renderComponent();
    const suspendButton = await screen.findByRole('button', { name: /suspend/i });
    fireEvent.click(suspendButton);
    expect(window.confirm).toHaveBeenCalled();
    expect(axios.put).not.toHaveBeenCalled();
  });

  it('should verify a specific patient and verify others remain unchanged', async () => {
    // 1. Setup
    const localPatients = [
      { _id: 'p1', fullName: 'Target Patient', isVerified: false, email: 'p1@test.com' },
      { _id: 'p2', fullName: 'Other Patient', isVerified: false, email: 'p2@test.com' }
    ];

    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) return Promise.resolve({ data: mockAdminProfile });
      if (url.includes('/api/admin/users')) return Promise.resolve({ data: { doctors: [], patients: localPatients } });
      return Promise.reject(new Error('Not mocked'));
    });

    renderComponent();

    // 2. WAIT for the element to appear
    const targetName = await screen.findByText('Target Patient');
    const targetRow = targetName.closest('tr');

    // Click Verify
    const verifyBtn = within(targetRow).getByRole('button', { name: /verify/i });
    fireEvent.click(verifyBtn);

    // 3. Wait for API call
    await waitFor(() => expect(axios.put).toHaveBeenCalled());

    // 4. Verify 'Other Patient' is untouched
    const otherName = await screen.findByText('Other Patient');
    const otherRow = otherName.closest('tr');
    expect(within(otherRow).getByRole('button', { name: /verify/i })).toBeInTheDocument();
  });

  it('should abort patient suspension if admin cancels the confirmation', async () => {
    // 1. Mock window.confirm to return FALSE
    window.confirm = vi.fn(() => false);

    // 2. Setup: One active patient so the "Suspend" button renders
    const activePatient = [{ _id: 'p1', fullName: 'Active Pat', isVerified: true }];

    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) return Promise.resolve({ data: mockAdminProfile });
      if (url.includes('/api/admin/users')) return Promise.resolve({ data: { doctors: [], patients: activePatient } });
      return Promise.reject(new Error('Not mocked'));
    });

    renderComponent();

    // 3. Click Suspend
    const suspendBtn = await screen.findByRole('button', { name: /suspend/i });
    fireEvent.click(suspendBtn);

    // 4. Verify no API call happened (Covers the 'return' statement)
    expect(window.confirm).toHaveBeenCalled();
    expect(axios.put).not.toHaveBeenCalled();
  });

  it('should suspend a specific patient and verify others remain unchanged', async () => {
    // 1. Setup: Two ACTIVE patients (so they have "Suspend" buttons)
    const localPatients = [
      { _id: 'p1', fullName: 'Target Patient', isVerified: true, email: 'p1@test.com' },
      { _id: 'p2', fullName: 'Other Patient', isVerified: true, email: 'p2@test.com' }
    ];

    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) return Promise.resolve({ data: mockAdminProfile });
      if (url.includes('/api/admin/users')) return Promise.resolve({ data: { doctors: [], patients: localPatients } });
      return Promise.reject(new Error('Not mocked'));
    });

    renderComponent();

    // 2. WAIT for rendering
    const targetName = await screen.findByText('Target Patient');
    const targetRow = targetName.closest('tr');
    
    // 3. Click Suspend on Target
    const suspendBtn = within(targetRow).getByRole('button', { name: /suspend/i });
    fireEvent.click(suspendBtn);

    // 4. Wait for API call
    await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(expect.stringContaining('suspend-patient/p1'), {}, expect.any(Object));
    });

    // 5. Verify 'Other Patient' is untouched (Still has Suspend button, meaning isVerified is still true)
    const otherName = await screen.findByText('Other Patient');
    const otherRow = otherName.closest('tr');
    expect(within(otherRow).getByRole('button', { name: /suspend/i })).toBeInTheDocument();
  });

  // --- GROUP 5: FILTERS ---

  it('should refetch users when a name filter is changed', async () => {
    renderComponent();
    expect(await screen.findByText('Dr. John Doe')).toBeInTheDocument();

    const doctorsCard = screen.getByText('Doctors').closest('div[class*="rounded-xl border"]');
    const nameFilterInput = within(doctorsCard).getByLabelText('Name');
    
    // Simulate API response for search
    axios.get.mockResolvedValue({ data: { doctors: [mockDoctors[1]], patients: [] } }); 
    
    fireEvent.change(nameFilterInput, { target: { value: 'Jane' } });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('?name=Jane'),
        expect.any(Object)
      );
    }, { timeout: 1500 });
  });

  it('should refetch users when all filters are changed', async () => {
    renderComponent();
    expect(await screen.findByText('Dr. John Doe')).toBeInTheDocument();
    
    const doctorsCard = screen.getByText('Doctors').closest('div[class*="rounded-xl border"]');
    const patientsCard = screen.getByText('Patients').closest('div[class*="rounded-xl border"]');

    fireEvent.change(within(doctorsCard).getByLabelText('Name'), { target: { value: 'test' } });
    fireEvent.change(within(doctorsCard).getByLabelText('Email'), { target: { value: 'test@email' } });
    fireEvent.change(within(doctorsCard).getByLabelText('License'), { target: { value: '123' } });
    
    fireEvent.change(within(patientsCard).getByLabelText('Name'), { target: { value: 'patient' } });
    fireEvent.change(within(patientsCard).getByLabelText('Email'), { target: { value: 'patient@email' } });
    fireEvent.change(within(patientsCard).getByLabelText('Joined From'), { target: { value: '2023-01-01' } });
    fireEvent.change(within(patientsCard).getByLabelText('Joined To'), { target: { value: '2023-01-31' } });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('name=test&email=test%40email&license=123&patientName=patient&patientEmail=patient%40email&patientDateFrom=2023-01-01&patientDateTo=2023-01-31'),
        expect.any(Object)
      );
    }, { timeout: 1500 });
  });

  it('should test status and specialization filters', async () => {
    renderComponent();
    expect(await screen.findByText('Dr. John Doe')).toBeInTheDocument();

    const doctorsCard = screen.getByText('Doctors').closest('div[class*="rounded-xl border"]');

    // Test Status filter
    fireEvent.click(within(doctorsCard).getByText('All Statuses'));
    const pendingOption = await screen.findByRole('option', { name: /pending/i });
    fireEvent.click(pendingOption);
    
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('status=pending'),
        expect.any(Object)
      );
    }, { timeout: 1500 });

    // Test Specialization filter
    fireEvent.click(within(doctorsCard).getByText('All Specializations'));
    const cardiologyOption = await screen.findByRole('option', { name: /cardiology/i });
    fireEvent.click(cardiologyOption);

    await waitFor(() => {
      const lastCallArgs = axios.get.mock.lastCall;
      const lastUrl = lastCallArgs[0];
      expect(lastUrl).toContain('status=pending');
      expect(lastUrl).toContain('specialization=Cardiology');
    }, { timeout: 1500 });
  });

  // --- GROUP 6: EDGE CASES & ERRORS (100% COVERAGE) ---

  it('should handle missing token for ALL action buttons', async () => {
    renderComponent();
    await screen.findByText('Dr. John Doe');

    // Remove token mid-test
    Storage.prototype.getItem = vi.fn(() => null);

    // Find buttons
    const verifyDocBtn = screen.getAllByRole('button', { name: /verify/i })[0]; 
    const suspendDocBtn = screen.getAllByRole('button', { name: /suspend/i })[0];
    const rejectDocBtn = screen.getByRole('button', { name: /reject/i });
    const p1Row = screen.getByText('Alice Johnson').closest('tr');
    const suspendPatBtn = within(p1Row).getByRole('button', { name: /suspend/i });
    const p2Row = screen.getByText('Bob Suspended').closest('tr');
    const verifyPatBtn = within(p2Row).getByRole('button', { name: /verify/i });

    // Click everything
    fireEvent.click(verifyDocBtn);
    fireEvent.click(suspendDocBtn);
    fireEvent.click(rejectDocBtn);
    fireEvent.click(suspendPatBtn);
    fireEvent.click(verifyPatBtn);

    // Ensure no calls made
    expect(axios.put).not.toHaveBeenCalled();
    expect(axios.delete).not.toHaveBeenCalled();
  });

  it('should handle generic network errors (no response message) for ALL actions', async () => {
    renderComponent();
    await screen.findByText('Dr. John Doe');

    const genericError = new Error('Network Error');
    axios.put.mockRejectedValue(genericError);
    axios.delete.mockRejectedValue(genericError);

    // Verify Doc Fail
    fireEvent.click(screen.getAllByRole('button', { name: /verify/i })[0]);
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Error: Failed to verify doctor.'));

    // Reject Doc Fail
    fireEvent.click(screen.getByRole('button', { name: /reject/i }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Error: Failed to reject doctor.'));

    // Suspend Doc Fail
    fireEvent.click(screen.getAllByRole('button', { name: /suspend/i })[0]);
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Error: Failed to suspend doctor.'));

    // Suspend Patient Fail
    const p1Row = screen.getByText('Alice Johnson').closest('tr');
    fireEvent.click(within(p1Row).getByRole('button', { name: /suspend/i }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Error: Failed to suspend patient.'));

    // Verify Patient Fail
    const p2Row = screen.getByText('Bob Suspended').closest('tr');
    fireEvent.click(within(p2Row).getByRole('button', { name: /verify/i }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Error: Failed to verify patient.'));
  });

  it('should show specific API errors for verification', async () => {
    renderComponent();
    await screen.findByText('Dr. John Doe');

    const specificError = { response: { data: { message: 'Backend says no' } } };
    axios.put.mockRejectedValue(specificError);

    const verifyButton = screen.getAllByRole('button', { name: /verify/i })[0];
    fireEvent.click(verifyButton);

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Error: Backend says no'));
  });

  it('should show an error if fetching users fails', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) return Promise.resolve({ data: mockAdminProfile });
      if (url.includes('/api/admin/users')) return Promise.reject(new Error('Failed to load users'));
      return Promise.reject(new Error('Not mocked'));
    });
    
    renderComponent();
    expect(await screen.findByText(/Failed to load user data/i)).toBeInTheDocument();
  });

  it('should click the "Try Again" button on global error', async () => {
    const originalLocation = window.location;
    delete window.location;
    window.location = { reload: vi.fn() };

    axios.get.mockRejectedValueOnce(new Error('Global Fetch Failed'));
    renderComponent();

    const tryAgain = await screen.findByText('Try Again');
    fireEvent.click(tryAgain);
    expect(window.location.reload).toHaveBeenCalled();

    window.location = originalLocation;
  });

  

  // --- GROUP 7: UI INTERACTIONS ---

  it('should navigate to all appointments page when button is clicked', async () => {
    renderComponent();
    const appointmentsButton = await screen.findByRole('button', { name: /view all appointments/i });
    fireEvent.click(appointmentsButton);
    expect(mockNavigate).toHaveBeenCalledWith('/admin/appointments');
  });

  it('should close profile dropdown when clicking outside', async () => {
    renderComponent();
    const profileIcon = await screen.findByText('AD');
    fireEvent.click(profileIcon);
    expect(screen.getByText('Logout')).toBeInTheDocument();
    
    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByText('Logout')).not.toBeInTheDocument();
    });
  });

  it('should not close profile dropdown when clicking inside it', async () => {
    renderComponent();
    const profileIcon = await screen.findByText('AD');
    fireEvent.click(profileIcon);
    const logoutButton = await screen.findByRole('button', { name: /logout/i });
    fireEvent.mouseDown(logoutButton); 
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('should show and hide the profile modal', async () => {
    renderComponent();
    const profileIcon = await screen.findByText('AD');
    fireEvent.click(profileIcon);
    fireEvent.click(screen.getByText('View Profile'));

    expect(await screen.findByText('Your Profile')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Close'));
    await waitFor(() => expect(screen.queryByText('Your Profile')).not.toBeInTheDocument());
  });

  it('should log out correctly', async () => {
    renderComponent();
    fireEvent.click(await screen.findByText('AD'));
    fireEvent.click(screen.getByText('Logout'));
    expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should navigate to doctor profile when name is clicked', async () => {
    renderComponent();
    const doctorNameButton = await screen.findByRole('button', { name: 'Dr. John Doe' });
    fireEvent.click(doctorNameButton);
    expect(mockNavigate).toHaveBeenCalledWith('/admin/doctor-profile/d1');
  });

  it('should verify a specific doctor and leave others unchanged', async () => {
    // 1. Setup: Two doctors, both unverified initially
    const localDocs = [
      { _id: 'd1', fullName: 'Target Doc', isVerified: false, specialization: 'A' },
      { _id: 'd2', fullName: 'Other Doc', isVerified: false, specialization: 'B' }
    ];

    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) return Promise.resolve({ data: mockAdminProfile });
      if (url.includes('/api/admin/users')) return Promise.resolve({ data: { doctors: localDocs, patients: [] } });
      return Promise.reject(new Error('Not mocked'));
    });

    renderComponent();

    // 2. Find and click Verify on the FIRST doctor (Target Doc)
    const verifyButtons = await screen.findAllByRole('button', { name: /verify/i });
    fireEvent.click(verifyButtons[0]);

    // 3. Wait for the update
    await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
            expect.stringContaining('verify-doctor/d1'), 
            {}, 
            expect.any(Object)
        );
    });

    // 4. CRITICAL ASSERTION: Check that D2 (Other Doc) is still visible and still has "Verify" button
    // This proves the mapping function returned ": doc" for the non-matching ID
    expect(screen.getByText('Other Doc')).toBeInTheDocument();
    
    // We check that "Other Doc" row still has a verify button (meaning it wasn't accidentally changed to verified)
    const otherDocRow = screen.getByText('Other Doc').closest('tr');
    expect(within(otherDocRow).getByRole('button', { name: /verify/i })).toBeInTheDocument();
  });

  it('should abort suspension if admin cancels the confirmation', async () => {
    // 1. Mock window.confirm to return FALSE (User clicks Cancel)
    window.confirm = vi.fn(() => false);

    // 2. Use a verified doctor so the "Suspend" button appears
    const verifiedDocs = [{ _id: 'd1', fullName: 'Doc', isVerified: true, specialization: 'A' }];
    
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) return Promise.resolve({ data: mockAdminProfile });
      if (url.includes('/api/admin/users')) return Promise.resolve({ data: { doctors: verifiedDocs, patients: [] } });
      return Promise.reject(new Error('Not mocked'));
    });

    renderComponent();

    // 3. Click Suspend
    const suspendButton = await screen.findByRole('button', { name: /suspend/i });
    fireEvent.click(suspendButton);

    // 4. Verify confirmation was asked
    expect(window.confirm).toHaveBeenCalled();

    // 5. Verify API was NOT called (Hitting the 'return' statement)
    expect(axios.put).not.toHaveBeenCalled();
  });

  it('should render fallback "Admin" name and empty email when profile fields are empty', async () => {
    // 1. Mock a profile with valid userType but EMPTY strings for details
    const emptyProfile = { 
      userType: 'admin', 
      fullName: '', 
      email: '' 
    };

    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) return Promise.resolve({ data: emptyProfile });
      if (url.includes('/api/admin/users')) return Promise.resolve({ data: { doctors: [], patients: [] } });
      return Promise.reject(new Error('Not mocked'));
    });

    renderComponent();
    // This ensures the DOM has updated and the avatar actually exists.
    await waitFor(() => {
        expect(screen.queryByText(/Loading Dashboard/i)).not.toBeInTheDocument();
    });
    // --- FIX END ---

    // 3. Find the profile avatar by its class (since it contains no text)
    const profileAvatar = document.querySelector('.rounded-full.bg-cyan-200');
    expect(profileAvatar).toBeInTheDocument();
    
    // 4. Click it to open dropdown
    fireEvent.click(profileAvatar);

    // 5. Verify the Fallbacks
    // Expect "Admin" to be displayed (fallback for empty fullName)
    expect(await screen.findByText('Admin')).toBeInTheDocument();
    
    // Expect the email paragraph to be empty (fallback for empty email)
    const emailParagraph = document.querySelector('.text-xs.text-gray-500.truncate');
    expect(emailParagraph).toBeInTheDocument();
    expect(emailParagraph.textContent).toBe(''); 
  });

  it('should show "Loading..." placeholders in Profile Modal if profile details are missing', async () => {
    // 1. Mock Profile with empty strings to trigger the || 'Loading...' fallback
    const incompleteProfile = { 
      userType: 'admin', 
      fullName: '', 
      email: '' 
    };

    axios.get.mockImplementation((url) => {
      if (url.includes('/api/users/profile')) return Promise.resolve({ data: incompleteProfile });
      if (url.includes('/api/admin/users')) return Promise.resolve({ data: { doctors: [], patients: [] } });
      return Promise.reject(new Error('Not mocked'));
    });

    renderComponent();

    // 2. Wait for loading to finish
    await waitFor(() => {
        expect(screen.queryByText(/Loading Dashboard/i)).not.toBeInTheDocument();
    });

    // 3. Open Dropdown (Click the avatar)
    // We use the class selector because the avatar text is empty/fallback logic
    const profileAvatar = document.querySelector('.rounded-full.bg-cyan-200');
    fireEvent.click(profileAvatar);

    // 4. Open Modal (Click "View Profile")
    fireEvent.click(screen.getByText('View Profile'));

    // 5. Verify the "Loading..." text appears
    const loadingTexts = screen.getAllByText('Loading...');
    expect(loadingTexts.length).toBeGreaterThanOrEqual(2);
    
    // Confirm we are actually in the modal
    expect(screen.getByText('Your Profile')).toBeInTheDocument();
  });

});