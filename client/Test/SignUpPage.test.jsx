import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import SignupPage from '@/pages/SignupPage';

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
    Link: ({ children, to, className }) => <a href={to} className={className}>{children}</a>,
  };
});

// 3. Mock Lucide Icons
vi.mock('lucide-react', () => ({
  Eye: () => <span data-testid="icon-eye" />,
  EyeOff: () => <span data-testid="icon-eye-off" />,
}));

// 4. Mock UI Components (Shadcn)
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, type, className }) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      type={type} 
      className={`${className} ${variant}`}
      data-testid="ui-button"
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardTitle: ({ children }) => <h2>{children}</h2>,
  CardDescription: ({ children }) => <p>{children}</p>,
  CardContent: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ id, name, type, placeholder, value, onChange, required }) => (
    <input
      id={id}
      name={name}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      data-testid={`input-${name || id}`}
    />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ htmlFor, children }) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }) => (
    <div data-testid="select-wrapper">
      <select
        data-testid="select-role" // simplified for testing value change
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      >
        {/* We need to render children to access options in some test setups, 
            but SelectContent usually handles options. 
            For simplicity in this mock, we'll render a hidden select structure 
            or rely on the SelectContent mock to render options if structured correctly.
            However, pure Select component usage often implies context.
            Let's try a direct approach: render children so we can inspect them?
            Actually, shadcn Select is complex. Let's mock it to just expose the change handler via a standard select.
        */}
        <option value="">Select...</option>
        <option value="patient">Patient</option>
        <option value="doctor">Doctor</option>
        <option value="Cardiology">Cardiology</option>
        <option value="Dermatology">Dermatology</option>
      </select>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }) => <div>{children}</div>,
  SelectValue: () => <span>Select Value</span>,
  SelectContent: ({ children }) => <div>{children}</div>,
  SelectItem: ({ value, children }) => <option value={value}>{children}</option>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ id, name, placeholder, value, onChange }) => (
    <textarea
      id={id}
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      data-testid={`textarea-${name || id}`}
    />
  ),
}));

// --- TEST SUITE ---

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>
    );
  };

  it('renders the signup form correctly', () => {
    renderComponent();

    expect(screen.getByText('Create an Account')).toBeInTheDocument();
    
    // Check Common Inputs
    expect(screen.getByTestId('input-fullName')).toBeInTheDocument();
    expect(screen.getByTestId('input-email')).toBeInTheDocument();
    expect(screen.getByTestId('input-password')).toBeInTheDocument();
    expect(screen.getByTestId('input-confirmPassword')).toBeInTheDocument();
    
    // Check Button
    expect(screen.getByText('Create Account')).toBeInTheDocument();
  });

  it('updates input fields correctly', () => {
    renderComponent();

    const nameInput = screen.getByTestId('input-fullName');
    const emailInput = screen.getByTestId('input-email');

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });

    expect(nameInput.value).toBe('John Doe');
    expect(emailInput.value).toBe('john@example.com');
  });

  it('shows doctor-specific fields when "Doctor" role is selected', () => {
    renderComponent();

    // Initially doctor fields should NOT be present
    expect(screen.queryByText('Specialization')).not.toBeInTheDocument();
    expect(screen.queryByTestId('input-licenseNumber')).not.toBeInTheDocument();

    // Select Doctor
    const roleSelect = screen.getByTestId('select-role');
    fireEvent.change(roleSelect, { target: { value: 'doctor' } });

    // Verify doctor fields appear
    expect(screen.getByText('Specialization')).toBeInTheDocument();
    expect(screen.getByTestId('input-experience')).toBeInTheDocument();
    expect(screen.getByTestId('input-licenseNumber')).toBeInTheDocument();
    expect(screen.getByTestId('textarea-address')).toBeInTheDocument();
    expect(screen.getByTestId('input-consultationFee')).toBeInTheDocument();
    expect(screen.getByTestId('textarea-bio')).toBeInTheDocument();
  });

  it('validates password mismatch', async () => {
    renderComponent();

    fireEvent.change(screen.getByTestId('input-fullName'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByTestId('input-email'), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByTestId('input-password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByTestId('input-confirmPassword'), { target: { value: 'password456' } });

    // Set role to avoid that error
    fireEvent.change(screen.getByTestId('select-role'), { target: { value: 'patient' } });

    fireEvent.click(screen.getByText('Create Account'));

    const err = await screen.findByTestId('error-message');
    expect(err).toBeInTheDocument();
    expect(err).toHaveTextContent(/Passwords do not match/i);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('validates missing user role', async () => {
    renderComponent();

    fireEvent.change(screen.getByTestId('input-fullName'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByTestId('input-email'), { target: { value: 'jane@test.com' } });
    fireEvent.change(screen.getByTestId('input-password'), { target: { value: 'pass' } });
    fireEvent.change(screen.getByTestId('input-confirmPassword'), { target: { value: 'pass' } });
    
    // Do NOT select role (it defaults to empty string in state)

    fireEvent.click(screen.getByText('Create Account'));

    expect(await screen.findByText('Please select a user role.')).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('handles successful patient signup', async () => {
    axios.post.mockResolvedValueOnce({
      data: { message: 'Signup successful! Please verify your email.' }
    });

    renderComponent();

    // Fill Form
    fireEvent.change(screen.getByTestId('input-fullName'), { target: { value: 'Patient Zero' } });
    fireEvent.change(screen.getByTestId('input-email'), { target: { value: 'patient@test.com' } });
    fireEvent.change(screen.getByTestId('select-role'), { target: { value: 'patient' } });
    fireEvent.change(screen.getByTestId('input-password'), { target: { value: 'password' } });
    fireEvent.change(screen.getByTestId('input-confirmPassword'), { target: { value: 'password' } });

    fireEvent.click(screen.getByText('Create Account'));

    expect(screen.getByText('Creating Account...')).toBeInTheDocument();

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'https://smart-healthcare-appointment-and-triage.onrender.com/api/auth/signup',
        expect.objectContaining({
          fullName: 'Patient Zero',
          email: 'patient@test.com',
          userType: 'patient',
          password: 'password'
        })
      );
      expect(screen.getByText('Signup successful! Please verify your email.')).toBeInTheDocument();
    });
  });

  it('handles successful doctor signup with all fields', async () => {
    axios.post.mockResolvedValueOnce({
      data: { message: 'Doctor registered successfully.' }
    });

    renderComponent();

    // Select Doctor first to reveal fields
    fireEvent.change(screen.getByTestId('select-role'), { target: { value: 'doctor' } });

    // Fill Common Fields
    fireEvent.change(screen.getByTestId('input-fullName'), { target: { value: 'Dr. House' } });
    fireEvent.change(screen.getByTestId('input-email'), { target: { value: 'house@test.com' } });
    fireEvent.change(screen.getByTestId('input-password'), { target: { value: 'vicodin' } });
    fireEvent.change(screen.getByTestId('input-confirmPassword'), { target: { value: 'vicodin' } });

    // Fill Doctor Fields
    // Since our mocked select renders all options in one dropdown for simplicity, we target the select again
    // In real usage, the specialization select is a separate component instance.
    // Our mock might need adjustment if there are multiple Selects.
    // The mock renders `select-role` testid for ALL instances. 
    // Let's assume `getAllByTestId('select-role')` returns role first, then specialization.
    const selects = screen.getAllByTestId('select-role');
    const specializationSelect = selects[1]; // 0 is role, 1 is specialization
    
    fireEvent.change(specializationSelect, { target: { value: 'Cardiology' } });
    fireEvent.change(screen.getByTestId('input-experience'), { target: { value: '20' } });
    fireEvent.change(screen.getByTestId('input-licenseNumber'), { target: { value: 'MD12345' } });
    fireEvent.change(screen.getByTestId('textarea-address'), { target: { value: 'Princeton' } });
    fireEvent.change(screen.getByTestId('input-consultationFee'), { target: { value: '500' } });
    fireEvent.change(screen.getByTestId('textarea-bio'), { target: { value: 'Genius but grumpy' } });

    fireEvent.click(screen.getByText('Create Account'));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          userType: 'doctor',
          specialization: 'Cardiology',
          experience: '20',
          licenseNumber: 'MD12345'
        })
      );
    });
  });

  it('displays error message on signup failure', async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { message: 'Email already exists.' } }
    });

    renderComponent();

    fireEvent.change(screen.getByTestId('input-fullName'), { target: { value: 'Duplicate User' } });
    fireEvent.change(screen.getByTestId('input-email'), { target: { value: 'dup@test.com' } });
    fireEvent.change(screen.getByTestId('select-role'), { target: { value: 'patient' } });
    fireEvent.change(screen.getByTestId('input-password'), { target: { value: 'pass' } });
    fireEvent.change(screen.getByTestId('input-confirmPassword'), { target: { value: 'pass' } });

    fireEvent.click(screen.getByText('Create Account'));

    expect(await screen.findByText('Email already exists.')).toBeInTheDocument();
  });

  it('displays generic error message on network failure', async () => {
    axios.post.mockRejectedValueOnce(new Error('Network Error'));

    renderComponent();

    fireEvent.change(screen.getByTestId('input-fullName'), { target: { value: 'Net Error' } });
    fireEvent.change(screen.getByTestId('input-email'), { target: { value: 'net@test.com' } });
    fireEvent.change(screen.getByTestId('select-role'), { target: { value: 'patient' } });
    fireEvent.change(screen.getByTestId('input-password'), { target: { value: 'pass' } });
    fireEvent.change(screen.getByTestId('input-confirmPassword'), { target: { value: 'pass' } });

    fireEvent.click(screen.getByText('Create Account'));

    expect(await screen.findByText('An error occurred during signup.')).toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    renderComponent();

    const passwordInput = screen.getByTestId('input-password');
    const confirmInput = screen.getByTestId('input-confirmPassword');

    // Initial state: hidden
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(confirmInput).toHaveAttribute('type', 'password');

    // Find toggle buttons (they contain the Eye icon)
    const eyeIcons = screen.getAllByTestId('icon-eye');
    const togglePass = eyeIcons[0].closest('button');
    const toggleConfirm = eyeIcons[1].closest('button');

    // Click toggle for main password
    fireEvent.click(togglePass);
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(confirmInput).toHaveAttribute('type', 'password'); // Confirm should stay hidden

    // Click toggle for confirm password
    fireEvent.click(toggleConfirm);
    expect(confirmInput).toHaveAttribute('type', 'text');
  });

  it('initial form fields start empty (kills initial string literal mutants)', () => {
    renderComponent();
    expect(screen.getByTestId('input-fullName').value).toBe('');
    expect(screen.getByTestId('input-email').value).toBe('');
    expect(screen.getByTestId('input-password').value).toBe('');
    expect(screen.getByTestId('input-confirmPassword').value).toBe('');
    // Role select initial value should be '' (Select mock exposes value)
    expect(screen.getByTestId('select-role').value).toBe('');
  });

  it('doctor specific fields start empty after selecting doctor', () => {
    renderComponent();
    fireEvent.change(screen.getByTestId('select-role'), { target: { value: 'doctor' } });
    expect(screen.getByTestId('input-experience').value).toBe('');
    expect(screen.getByTestId('input-licenseNumber').value).toBe('');
    expect(screen.getByTestId('textarea-address').value).toBe('');
    expect(screen.getByTestId('input-consultationFee').value).toBe('');
    expect(screen.getByTestId('textarea-bio').value).toBe('');
  });

  it('specialties list renders all expected options (kills specialties array mutants)', () => {
    renderComponent();
    fireEvent.change(screen.getByTestId('select-role'), { target: { value: 'doctor' } });
    // Second select wrapper contains specialization options rendered via children
    const allSelects = screen.getAllByTestId('select-wrapper');
    const specializationSelectWrapper = allSelects[1];
    const optionTexts = Array.from(specializationSelectWrapper.querySelectorAll('option')).map(o => o.textContent);
    // Ensure all five specialties from source array present
    ['Cardiology','Dermatology','Pediatrics','Neurology','Orthopedics'].forEach(spec => {
      expect(optionTexts).toContain(spec);
    });
  });

  it('success message block not rendered when success is empty (kills logical operator mutant)', () => {
    renderComponent();
    expect(screen.queryByTestId('success-message')).not.toBeInTheDocument();
  });

  it('clears previous error and success before new submit (kills setError/setSuccess mutants)', async () => {
    renderComponent();
    // First cause mismatch to set an error
    fireEvent.change(screen.getByTestId('input-fullName'), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByTestId('input-email'), { target: { value: 'jane@x.com' } });
    fireEvent.change(screen.getByTestId('input-password'), { target: { value: 'abc' } });
    fireEvent.change(screen.getByTestId('input-confirmPassword'), { target: { value: 'def' } });
    fireEvent.change(screen.getByTestId('select-role'), { target: { value: 'patient' } });
    fireEvent.click(screen.getByText('Create Account'));
    expect(await screen.findByTestId('error-message')).toBeInTheDocument();

    // Prepare successful submission
    axios.post.mockResolvedValueOnce({ data: { message: 'All good.' } });
    fireEvent.change(screen.getByTestId('input-confirmPassword'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByText('Create Account'));

    // After clearing, old error should disappear and success should show
    await waitFor(() => {
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
      expect(screen.getByText('All good.')).toBeInTheDocument();
    });
  });

  it('shows loading state then resets isLoading after request (kills finally/isLoading mutants)', async () => {
    axios.post.mockResolvedValueOnce({ data: { message: 'Done.' } });
    renderComponent();
    fireEvent.change(screen.getByTestId('input-fullName'), { target: { value: 'Load User' } });
    fireEvent.change(screen.getByTestId('input-email'), { target: { value: 'load@test.com' } });
    fireEvent.change(screen.getByTestId('select-role'), { target: { value: 'patient' } });
    fireEvent.change(screen.getByTestId('input-password'), { target: { value: 'pw' } });
    fireEvent.change(screen.getByTestId('input-confirmPassword'), { target: { value: 'pw' } });
    fireEvent.click(screen.getByText('Create Account'));
    expect(screen.getByText('Creating Account...')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Creating Account...')).not.toBeInTheDocument();
      expect(screen.getByText('Done.')).toBeInTheDocument();
    });
  });

  it('handles error response with missing data object (kills optional chaining mutant)', async () => {
    axios.post.mockRejectedValueOnce({ response: {} });
    renderComponent();
    fireEvent.change(screen.getByTestId('input-fullName'), { target: { value: 'Chain User' } });
    fireEvent.change(screen.getByTestId('input-email'), { target: { value: 'chain@test.com' } });
    fireEvent.change(screen.getByTestId('select-role'), { target: { value: 'patient' } });
    fireEvent.change(screen.getByTestId('input-password'), { target: { value: 'pw' } });
    fireEvent.change(screen.getByTestId('input-confirmPassword'), { target: { value: 'pw' } });
    fireEvent.click(screen.getByText('Create Account'));
    expect(await screen.findByText('An error occurred during signup.')).toBeInTheDocument();
  });
});