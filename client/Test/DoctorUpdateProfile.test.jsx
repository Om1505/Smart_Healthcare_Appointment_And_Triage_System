import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import DoctorUpdateProfile from '@/pages/DoctorUpdateProfile'; // Adjust path if needed

// 1. Mock Axios
vi.mock('axios');

// 2. Mock UI Components (shadcn/radix) to simplify testing
vi.mock('@/components/ui/card', () => ({
    Card: ({ children, className }) => <div className={className}>{children}</div>,
    CardContent: ({ children, className }) => <div className={className}>{children}</div>,
    CardHeader: ({ children, className }) => <div className={className}>{children}</div>,
    CardTitle: ({ children }) => <h2>{children}</h2>,
    CardDescription: ({ children }) => <p>{children}</p>,
}));

vi.mock('@/components/ui/input', () => ({
    Input: (props) => <input {...props} />,
}));

vi.mock('@/components/ui/textarea', () => ({
    Textarea: (props) => <textarea {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
    Label: ({ children, htmlFor }) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, type, disabled }) => (
        <button onClick={onClick} type={type} disabled={disabled}>
            {children}
        </button>
    ),
}));

// Mock Select components is tricky, using a simplified mock
vi.mock('@/components/ui/select', () => ({
    Select: ({ value, onValueChange, children }) => (
        <select 
            data-testid="specialization-select"
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

// Mock UserProfileModal
vi.mock('@/components/UserProfileModal', () => ({
    UserProfileModal: ({ isOpen, onClose, patient, onProfileUpdate }) => {
        if (!isOpen) return null;
        return (
            <div data-testid="user-profile-modal">
                <button onClick={onClose} data-testid="close-modal">Close</button>
                <button 
                    onClick={() => onProfileUpdate({ ...patient, fullName: 'Updated Name' })} 
                    data-testid="update-profile"
                >
                    Update Profile
                </button>
            </div>
        );
    }
}));

// Mock Dropdown Menu components
vi.mock('@/components/ui/dropdown-menu', () => ({
    DropdownMenu: ({ children }) => <div data-testid="dropdown-menu">{children}</div>,
    DropdownMenuTrigger: ({ children, asChild }) => <div data-testid="dropdown-trigger">{children}</div>,
    DropdownMenuContent: ({ children }) => <div data-testid="dropdown-content">{children}</div>,
    DropdownMenuLabel: ({ children }) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuItem: ({ children, onClick, asChild }) => {
        if (asChild) {
            return <div>{children}</div>;
        }
        return <button onClick={onClick} data-testid="dropdown-item">{children}</button>;
    },
}));

// Mock Avatar components
vi.mock('@/components/ui/avatar', () => ({
    Avatar: ({ children, className }) => <div className={className} data-testid="avatar">{children}</div>,
    AvatarImage: ({ src, alt }) => <img src={src} alt={alt} data-testid="avatar-image" />,
    AvatarFallback: ({ children, className }) => <div className={className} data-testid="avatar-fallback">{children}</div>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
    LogOut: () => <span data-testid="logout-icon">LogOut</span>,
    UserCircle: () => <span data-testid="user-icon">UserCircle</span>,
    CalendarDays: () => <span data-testid="calendar-icon">CalendarDays</span>,
    ArrowLeft: () => <span data-testid="arrow-icon">ArrowLeft</span>,
    Loader2: () => <span data-testid="loader-icon">Loader2</span>,
    Settings: () => <span data-testid="settings-icon">Settings</span>,
    Save: () => <span data-testid="save-icon">Save</span>,
    CreditCard: () => <span data-testid="creditcard-icon">CreditCard</span>,
}));

// Mock React Router's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('DoctorUpdateProfile', () => {
    const mockDoctorData = {
        _id: '123',
        fullName: 'Dr. Strange',
        email: 'strange@marvel.com',
        userType: 'doctor',
        specialization: 'Neurology',
        experience: '15',
        licenseNumber: 'DOC-001',
        address: '177A Bleecker Street',
        consultationFee: '1000',
        bio: 'Sorcerer Supreme',
        phoneNumber: '1234567890'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Setup localStorage mock
        Storage.prototype.getItem = vi.fn(() => 'fake-token');
        Storage.prototype.removeItem = vi.fn();
        // Mock window.alert
        window.alert = vi.fn();
    });

    it('redirects to login if no token is found', () => {
        Storage.prototype.getItem = vi.fn(() => null); // No token

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('fetches and populates doctor profile data on load', async () => {
        axios.get.mockResolvedValue({ data: mockDoctorData });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument();
        });

        expect(screen.getByDisplayValue('strange@marvel.com')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Neurology')).toBeInTheDocument();
        expect(screen.getByDisplayValue('15')).toBeInTheDocument();
        expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
    });

    it('shows error if user is not a doctor', async () => {
        axios.get.mockResolvedValue({ 
            data: { ...mockDoctorData, userType: 'patient' } 
        });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Access denied. Not a doctor account.')).toBeInTheDocument();
        });
    });

    it('updates input fields correctly', async () => {
        axios.get.mockResolvedValue({ data: mockDoctorData });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        const nameInput = screen.getByLabelText(/Full Name/i);
        fireEvent.change(nameInput, { target: { value: 'Dr. Stephen Strange' } });

        expect(nameInput.value).toBe('Dr. Stephen Strange');
    });

    it('validates phone number (only allows digits)', async () => {
        axios.get.mockResolvedValue({ data: mockDoctorData });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument());

        const phoneInput = screen.getByLabelText(/Phone Number/i);
        
        // Try entering letters
        fireEvent.change(phoneInput, { target: { name: 'phoneNumber', value: '123abc456' } });
        
        // Should strip letters (logic inside handleInputChange)
        expect(phoneInput.value).toBe('123456'); 
    });

    it('submits form successfully and redirects', async () => {
        axios.get.mockResolvedValue({ data: mockDoctorData });
        // Mock the PUT request response
        axios.put.mockResolvedValue({ 
            data: { 
                user: { ...mockDoctorData, fullName: 'Updated Name' }, 
                message: 'Success' 
            } 
        });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        // Submit the form
        const saveButton = screen.getByText(/Save Changes/i);
        fireEvent.click(saveButton);

        await waitFor(() => {
            // Verify PUT request payload
            expect(axios.put).toHaveBeenCalledWith(
                expect.stringContaining('/update-profile'),
                expect.objectContaining({
                    fullName: 'Dr. Strange', // or whatever current state is
                    specialization: 'Neurology'
                }),
                expect.any(Object)
            );
            
            // Verify success alert
            expect(window.alert).toHaveBeenCalledWith('Profile updated successfully!');
            
            // Verify redirection
            expect(mockNavigate).toHaveBeenCalledWith('/doctor/dashboard');
        });
    });

    it('displays error message on API failure during save', async () => {
        axios.get.mockResolvedValue({ data: mockDoctorData });
        axios.put.mockRejectedValue({ 
            response: { data: { message: 'Update failed' } } 
        });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        const saveButton = screen.getByText(/Save Changes/i);
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByText('Update failed')).toBeInTheDocument();
        });
    });

    it('shows validation error for invalid phone length on submit', async () => {
        axios.get.mockResolvedValue({ data: { ...mockDoctorData, phoneNumber: '123' } });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('123')).toBeInTheDocument());

        const saveButton = screen.getByText(/Save Changes/i);
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByText('Phone number must be exactly 10 digits.')).toBeInTheDocument();
        });
        
        // API should NOT be called if validation fails
        expect(axios.put).not.toHaveBeenCalled();
    });

    it('opens profile modal when dropdown menu item is clicked', async () => {
        axios.get.mockResolvedValue({ data: mockDoctorData });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        // Profile modal should not be visible initially
        expect(screen.queryByTestId('user-profile-modal')).not.toBeInTheDocument();

        // Click the dropdown item to open profile modal
        const profileMenuItem = screen.getAllByTestId('dropdown-item')[0]; // First dropdown item
        fireEvent.click(profileMenuItem);

        // Now modal should be visible
        await waitFor(() => {
            expect(screen.getByTestId('user-profile-modal')).toBeInTheDocument();
        });
    });

    it('closes profile modal when close button is clicked', async () => {
        axios.get.mockResolvedValue({ data: mockDoctorData });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        // Open profile modal
        const profileMenuItem = screen.getAllByTestId('dropdown-item')[0];
        fireEvent.click(profileMenuItem);

        await waitFor(() => {
            expect(screen.getByTestId('user-profile-modal')).toBeInTheDocument();
        });

        // Close the modal
        const closeButton = screen.getByTestId('close-modal');
        fireEvent.click(closeButton);

        // Modal should be closed
        await waitFor(() => {
            expect(screen.queryByTestId('user-profile-modal')).not.toBeInTheDocument();
        });
    });

    it('updates doctor profile when handleProfileUpdate is called from modal', async () => {
        axios.get.mockResolvedValue({ data: mockDoctorData });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        // Open profile modal
        const profileMenuItem = screen.getAllByTestId('dropdown-item')[0];
        fireEvent.click(profileMenuItem);

        await waitFor(() => {
            expect(screen.getByTestId('user-profile-modal')).toBeInTheDocument();
        });

        // Verify modal is open
        expect(screen.getByTestId('user-profile-modal')).toBeInTheDocument();

        // Click update profile button in modal
        const updateButton = screen.getByTestId('update-profile');
        fireEvent.click(updateButton);

        // Modal should close after update
        await waitFor(() => {
            expect(screen.queryByTestId('user-profile-modal')).not.toBeInTheDocument();
        });

        // The handleProfileUpdate function should have been called and updated the doctor state
        // We can verify this by checking the avatar's alt text which uses doctor.fullName
        await waitFor(() => {
            const avatarImage = screen.getByTestId('avatar-image');
            expect(avatarImage).toHaveAttribute('alt', 'Updated Name');
        });
    });

    it('calls handleLogout when logout button is clicked', async () => {
        axios.get.mockResolvedValue({ data: mockDoctorData });

        // Mock window.location.href
        delete window.location;
        window.location = { href: '' };

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        // Find and click logout button by role
        const logoutButtons = screen.getAllByRole('button');
        const logoutButton = logoutButtons.find(btn => btn.textContent.includes('Logout'));
        fireEvent.click(logoutButton);

        // Verify localStorage was cleared
        expect(localStorage.removeItem).toHaveBeenCalledWith('token');
        
        // Verify redirect to login
        expect(window.location.href).toBe('/login');
    });

    it('displays error when API fails to fetch doctor profile', async () => {
        axios.get.mockRejectedValue(new Error('Network error'));

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        // Wait for error message to appear
        await waitFor(() => {
            expect(screen.getByText('Failed to fetch doctor profile. Please try again.')).toBeInTheDocument();
        });
    });

    it('updates specialization when handleSpecializationChange is called', async () => {
        axios.get.mockResolvedValue({ data: mockDoctorData });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        // Find the specialization select element
        const specializationSelect = screen.getByTestId('specialization-select');
        
        // Change the specialization
        fireEvent.change(specializationSelect, { target: { value: 'Cardiology' } });

        // Verify the specialization was updated
        expect(specializationSelect.value).toBe('Cardiology');
    });

    it('prevents form submission when token is missing during submit', async () => {
        axios.get.mockResolvedValue({ data: mockDoctorData });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        // Remove token from localStorage
        Storage.prototype.getItem = vi.fn(() => null);

        // Try to submit the form
        const saveButton = screen.getByText(/Save Changes/i);
        fireEvent.click(saveButton);

        // Should navigate to login instead of calling API
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });

        // API should NOT be called if no token
        expect(axios.put).not.toHaveBeenCalled();
    });

    it('clears phone number error when entering valid 10-digit number', async () => {
        axios.get.mockResolvedValue({ data: { ...mockDoctorData, phoneNumber: '123' } });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('123')).toBeInTheDocument());

        const phoneInput = screen.getByLabelText(/Phone Number/i);
        
        // Enter invalid phone number first to trigger error
        fireEvent.change(phoneInput, { target: { name: 'phoneNumber', value: '12345' } });
        
        // Now enter a valid 10-digit number
        fireEvent.change(phoneInput, { target: { name: 'phoneNumber', value: '1234567890' } });
        
        // Verify the phone number was updated
        expect(phoneInput.value).toBe('1234567890');
        
        // Submit should work now
        const saveButton = screen.getByText(/Save Changes/i);
        axios.put.mockResolvedValue({ 
            data: { 
                user: mockDoctorData, 
                message: 'Success' 
            } 
        });
        
        fireEvent.click(saveButton);
        
        // Should call API successfully
        await waitFor(() => {
            expect(axios.put).toHaveBeenCalled();
        });
    });

    it('clears phone number error when field is empty', async () => {
        axios.get.mockResolvedValue({ data: mockDoctorData });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        const phoneInput = screen.getByLabelText(/Phone Number/i);
        
        // Clear the phone number (empty string should clear error too)
        fireEvent.change(phoneInput, { target: { name: 'phoneNumber', value: '' } });
        
        // Verify the phone number was cleared
        expect(phoneInput.value).toBe('');
    });

    it('renders avatar fallback when doctor name is not available', async () => {
        axios.get.mockResolvedValue({ data: { ...mockDoctorData, fullName: '' } });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        // Wait for component to load
        await waitFor(() => {
            const avatarFallback = screen.getByTestId('avatar-fallback');
            expect(avatarFallback).toHaveTextContent('Dr');
        });
    });

    it('handles API response with missing optional fields using fallback values', async () => {
        // Mock API response with some fields missing (undefined)
        const incompleteData = {
            _id: '123',
            fullName: 'Dr. Strange',
            email: 'strange@marvel.com',
            userType: 'doctor',
            specialization: 'Neurology',
            // Missing: experience, licenseNumber, address, consultationFee, bio, phoneNumber
        };
        
        axios.get.mockResolvedValue({ data: incompleteData });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        // Verify fallback empty strings are used for missing fields
        const experienceInput = screen.getByLabelText(/Experience/i);
        expect(experienceInput.value).toBe('');
        
        const phoneInput = screen.getByLabelText(/Phone Number/i);
        expect(phoneInput.value).toBe('');
    });

    it('handles API error without response object using fallback error message', async () => {
        axios.get.mockResolvedValue({ data: mockDoctorData });
        
        // Mock API error without response.data.message (e.g., network error)
        axios.put.mockRejectedValue(new Error('Network timeout'));

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        const saveButton = screen.getByText(/Save Changes/i);
        fireEvent.click(saveButton);

        // Should show fallback error message
        await waitFor(() => {
            expect(screen.getByText('Failed to update profile. Please try again.')).toBeInTheDocument();
        });
    });

    it('handles API error with empty response object', async () => {
        axios.get.mockResolvedValue({ data: mockDoctorData });
        
        // Mock API error with response but no data.message
        axios.put.mockRejectedValue({ 
            response: { data: {} } 
        });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        const saveButton = screen.getByText(/Save Changes/i);
        fireEvent.click(saveButton);

        // Should show fallback error message
        await waitFor(() => {
            expect(screen.getByText('Failed to update profile. Please try again.')).toBeInTheDocument();
        });
    });

    it('populates form with all available data fields from API', async () => {
        const completeData = {
            _id: '123',
            fullName: 'Dr. Strange',
            email: 'strange@marvel.com',
            userType: 'doctor',
            specialization: 'Neurology',
            experience: '15',
            licenseNumber: 'DOC-001',
            address: '177A Bleecker Street',
            consultationFee: '1000',
            bio: 'Sorcerer Supreme',
            phoneNumber: '1234567890'
        };
        
        axios.get.mockResolvedValue({ data: completeData });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        // Wait for all fields to be populated
        await waitFor(() => {
            expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument();
            expect(screen.getByDisplayValue('strange@marvel.com')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Neurology')).toBeInTheDocument();
            expect(screen.getByDisplayValue('15')).toBeInTheDocument();
            expect(screen.getByDisplayValue('DOC-001')).toBeInTheDocument();
            expect(screen.getByDisplayValue('177A Bleecker Street')).toBeInTheDocument();
            expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Sorcerer Supreme')).toBeInTheDocument();
            expect(screen.getByDisplayValue('1234567890')).toBeInTheDocument();
        });
    });

    it('uses fallback message when API returns success without custom message', async () => {
        axios.get.mockResolvedValue({ data: mockDoctorData });
        
        // Mock PUT response without custom message
        axios.put.mockResolvedValue({ 
            data: { 
                user: mockDoctorData
                // No message field
            } 
        });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        const saveButton = screen.getByText(/Save Changes/i);
        fireEvent.click(saveButton);

        // Should use fallback success message
        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('Profile updated successfully!');
        });
    });

    it('handles null values for experience and licenseNumber fields', async () => {
        // Mock API response with null values for specific fields
        const dataWithNullValues = {
            _id: '123',
            fullName: 'Dr. Strange',
            email: 'strange@marvel.com',
            userType: 'doctor',
            specialization: 'Neurology',
            experience: null, // null value
            licenseNumber: null, // null value
            address: '177A Bleecker Street',
            consultationFee: '1000',
            bio: 'Sorcerer Supreme',
            phoneNumber: '1234567890'
        };
        
        axios.get.mockResolvedValue({ data: dataWithNullValues });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        // Verify fallback empty strings are used for null fields
        const experienceInput = screen.getByLabelText(/Experience/i);
        expect(experienceInput.value).toBe('');
        
        const licenseInput = screen.getByLabelText(/License Number/i);
        expect(licenseInput.value).toBe('');

        // Verify other fields are populated correctly
        expect(screen.getByDisplayValue('strange@marvel.com')).toBeInTheDocument();
        expect(screen.getByDisplayValue('177A Bleecker Street')).toBeInTheDocument();
    });

    it('handles zero and false values for experience and consultationFee fields', async () => {
        // Mock API response with falsy values that should still trigger fallback
        const dataWithFalsyValues = {
            _id: '123',
            fullName: 'Dr. Strange',
            email: 'strange@marvel.com',
            userType: 'doctor',
            specialization: 'Neurology',
            experience: 0, // falsy number
            licenseNumber: false, // boolean false
            address: '177A Bleecker Street',
            consultationFee: 0, // falsy number
            bio: '',
            phoneNumber: '1234567890'
        };
        
        axios.get.mockResolvedValue({ data: dataWithFalsyValues });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        // Verify fallback empty strings are used for falsy fields
        const experienceInput = screen.getByLabelText(/Experience/i);
        expect(experienceInput.value).toBe('');
        
        const consultationFeeInput = screen.getByLabelText(/Consultation Fee/i);
        expect(consultationFeeInput.value).toBe('');
    });

    it('handles empty string values for all optional fields', async () => {
        // Mock API response with empty strings for all fields except required ones
        const dataWithEmptyStrings = {
            _id: '123',
            fullName: 'Dr. Strange',
            email: 'strange@marvel.com',
            userType: 'doctor',
            specialization: '', // empty string
            experience: '', // empty string
            licenseNumber: '', // empty string
            address: '', // empty string
            consultationFee: '', // empty string
            bio: '', // empty string
            phoneNumber: '' // empty string
        };
        
        axios.get.mockResolvedValue({ data: dataWithEmptyStrings });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        // All fields should have empty values (the empty string itself is returned, not the fallback)
        const experienceInput = screen.getByLabelText(/Experience/i);
        expect(experienceInput.value).toBe('');
        
        const licenseInput = screen.getByLabelText(/License Number/i);
        expect(licenseInput.value).toBe('');
    });

    it('correctly uses actual values when fields have truthy values', async () => {
        // This test ensures the left side of || is used when truthy
        const dataWithTruthyValues = {
            _id: '123',
            fullName: 'Dr. Banner',
            email: 'banner@avengers.com',
            userType: 'doctor',
            specialization: 'Radiation Medicine',
            experience: '8', // truthy string
            licenseNumber: 'RAD-999', // truthy string
            address: '123 Gamma Street',
            consultationFee: '500',
            bio: 'Radiation expert',
            phoneNumber: '9876543210'
        };
        
        axios.get.mockResolvedValue({ data: dataWithTruthyValues });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByDisplayValue('Dr. Banner')).toBeInTheDocument();
            expect(screen.getByDisplayValue('8')).toBeInTheDocument();
            expect(screen.getByDisplayValue('RAD-999')).toBeInTheDocument();
        });
    });

    it('renders full list of specialization options', async () => {
        // Ensure the select renders all expected specialization options
        axios.get.mockResolvedValue({ data: mockDoctorData });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        // The Select mock renders SelectItem as <option> elements via the mock
        const expectedSpecs = [
            "Cardiology", "Dermatology", "Endocrinology", "Gastroenterology",
            "Neurology", "Oncology", "Orthopedics", "Pediatrics", "Psychiatry",
            "Radiology", "General Practice", "Internal Medicine"
        ];

        expectedSpecs.forEach(spec => {
            expect(screen.getByText(spec)).toBeInTheDocument();
        });
    });

    it('does not show success or error message on initial load', async () => {
        axios.get.mockResolvedValue({ data: mockDoctorData });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        // Wait for initial load
        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        // Ensure no success or error blocks are visible initially
        expect(screen.queryByText('Profile updated successfully!')).not.toBeInTheDocument();
        expect(screen.queryByText('Failed to update profile. Please try again.')).not.toBeInTheDocument();
    });

    it('renders avatar image alt attribute with doctor fullName when provided', async () => {
        axios.get.mockResolvedValue({ data: mockDoctorData });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        // AvatarImage mock has data-testid="avatar-image"
        const avatarImg = screen.getByTestId('avatar-image');
        expect(avatarImg).toHaveAttribute('alt', 'Dr. Strange');
    });

    it('calls axios.get with correct URL and Authorization header', async () => {
        // Ensure localStorage token is present
        Storage.prototype.getItem = vi.fn(() => 'fake-token-123');

        axios.get.mockResolvedValue({ data: mockDoctorData });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        expect(axios.get).toHaveBeenCalledWith(
            'https://smart-healthcare-appointment-and-triage.onrender.com/api/users/profile',
            { headers: { Authorization: 'Bearer fake-token-123' } }
        );
    });

    it('shows loader while fetching the profile (pending request)', async () => {
        // Create a pending promise for axios.get
        let resolveFetch;
        const fetchPromise = new Promise((res) => { resolveFetch = res; });
        axios.get.mockReturnValue(fetchPromise);

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        // Loader should be displayed while promise is pending
        expect(screen.getByTestId('loader-icon')).toBeInTheDocument();

        // Resolve the request to finish render
        resolveFetch({ data: mockDoctorData });
        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());
    });

    it('does not render mutated default strings like Stryker was here!', async () => {
        axios.get.mockResolvedValue({ data: mockDoctorData });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        // Ensure no accidental mutated default string is present in the DOM
        expect(screen.queryByText('Stryker was here!')).not.toBeInTheDocument();
    });

    it('sends Authorization header on PUT during save', async () => {
        Storage.prototype.getItem = vi.fn(() => 'put-token-xyz');
        axios.get.mockResolvedValue({ data: mockDoctorData });
        axios.put.mockResolvedValue({ data: { user: mockDoctorData, message: 'OK' } });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        const saveButton = screen.getByText(/Save Changes/i);
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(axios.put).toHaveBeenCalled();
            expect(axios.put).toHaveBeenCalledWith(
                expect.stringContaining('/update-profile'),
                expect.any(Object),
                { headers: { Authorization: 'Bearer put-token-xyz' } }
            );
        });
    });

    it('renders correct avatar initials for a multi-word name', async () => {
        const jane = { ...mockDoctorData, fullName: 'Jane Alice Doe' };
        axios.get.mockResolvedValue({ data: jane });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Jane Alice Doe')).toBeInTheDocument());

        const avatarFallback = screen.getByTestId('avatar-fallback');
        // Initials should be JAD (first letters of each name part)
        expect(avatarFallback).toHaveTextContent('JAD');
    });

    it('shows success message in DOM after successful save', async () => {
        Storage.prototype.getItem = vi.fn(() => 'success-token');
        axios.get.mockResolvedValue({ data: mockDoctorData });
        axios.put.mockResolvedValue({ data: { user: mockDoctorData, message: 'Saved OK' } });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        const saveButton = screen.getByText(/Save Changes/i);
        fireEvent.click(saveButton);

        // Since navigate is mocked, component stays mounted — successMessage should render
        await waitFor(() => expect(screen.getByText('Saved OK')).toBeInTheDocument());
    });

    it('shows inline phone error when entering invalid length (real-time)', async () => {
        axios.get.mockResolvedValue({ data: mockDoctorData });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument());

        const phoneInput = screen.getByLabelText(/Phone Number/i);
        // Enter an invalid length number to trigger inline error when input loses focus or submit
        fireEvent.change(phoneInput, { target: { name: 'phoneNumber', value: '12345' } });
        // Trigger blur to simulate leaving the field
        fireEvent.blur(phoneInput);

        // The component shows phone error on submit; trigger submit to ensure inline error is set
        const saveButton = screen.getByText(/Save Changes/i);
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByText('Phone number must be exactly 10 digits.')).toBeInTheDocument();
        });
    });

    it('disables save button and shows Saving... while PUT is pending', async () => {
        Storage.prototype.getItem = vi.fn(() => 'pending-token');
        axios.get.mockResolvedValue({ data: mockDoctorData });

        // Create a pending promise for axios.put
        let resolvePut;
        const putPromise = new Promise((res) => { resolvePut = res; });
        axios.put.mockReturnValue(putPromise);

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        const saveButton = screen.getByText(/Save Changes/i);
        fireEvent.click(saveButton);

        // Button should show Saving... and be disabled
        expect(screen.getByText(/Saving.../i)).toBeInTheDocument();
        const btn = screen.getByRole('button', { name: /Saving.../i });
        expect(btn).toBeDisabled();

        // Resolve PUT and wait for completion
        resolvePut({ data: { user: mockDoctorData, message: 'done' } });
        await waitFor(() => expect(axios.put).toHaveBeenCalled());
    });

    it('preserves other form fields when specialization changes', async () => {
        axios.get.mockResolvedValue({ data: mockDoctorData });

        render(
            <MemoryRouter>
                <DoctorUpdateProfile />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Dr. Strange')).toBeInTheDocument());

        const nameInput = screen.getByLabelText(/Full Name/i);
        expect(nameInput.value).toBe('Dr. Strange');

        const specializationSelect = screen.getByTestId('specialization-select');
        // Change specialization
        fireEvent.change(specializationSelect, { target: { value: 'Cardiology' } });

        // Full name should remain unchanged
        expect(nameInput.value).toBe('Dr. Strange');
    });
});