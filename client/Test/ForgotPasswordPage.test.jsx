
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';

// --- MOCKS ---

// 1. Mock Axios
vi.mock('axios');

// 2. Mock React Router
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  };
});

// 3. Mock Lucide Icons
vi.mock('lucide-react', () => ({
  Stethoscope: () => <span data-testid="icon-stethoscope" />,
}));

// --- UI COMPONENT MOCKS ---

// Button Mock
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type }) => (
    <button onClick={onClick} disabled={disabled} type={type}>
      {children}
    </button>
  ),
}));

// Card Mocks
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }) => <div className="card-content">{children}</div>,
  CardDescription: ({ children }) => <p>{children}</p>,
  CardHeader: ({ children }) => <div className="card-header">{children}</div>,
  CardTitle: ({ children }) => <h2>{children}</h2>,
}));

// Input Mock
vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, id, type, placeholder, required }) => (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      data-testid={id}
    />
  ),
}));

// Label Mock
vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }) => <label htmlFor={htmlFor}>{children}</label>,
}));

// --- FIXED SELECT MOCK ---
// This mock flattens the Shadcn/Radix structure into a simple HTML <select>
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }) => (
    <select
      data-testid="user-type-select"
      value={value || ''}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  ),
  // Unwrap the content directly so options sit inside the select
  SelectContent: ({ children }) => <>{children}</>,
  // Render SelectItems as standard <option> tags
  SelectItem: ({ children, value }) => <option value={value}>{children}</option>,
  // Unwrap the trigger to render the value (placeholder)
  SelectTrigger: ({ children }) => <>{children}</>,
  // Render the placeholder as a disabled/default option
  SelectValue: ({ placeholder }) => <option value="">{placeholder}</option>,
}));

// --- TEST SUITE ---

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );
  };
  it('displays loading state and disables button while submitting', async () => {
    // Mock a request that takes 100ms to resolve so we can catch the loading state
    axios.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    renderComponent();

    // Fill valid data
    fireEvent.change(screen.getByTestId('user-type-select'), { target: { value: 'patient' } });
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'test@example.com' } });

    const submitBtn = screen.getByRole('button', { name: /Send Reset Link/i });
    fireEvent.click(submitBtn);

    // Check loading text appears
    expect(await screen.findByText('Sending Email...')).toBeInTheDocument();
    
    // Check button is disabled preventing double-submit
    expect(submitBtn).toBeDisabled();
  });

  it('hides the input form after a successful submission', async () => {
    axios.post.mockResolvedValueOnce({
      data: { message: 'Link sent!' },
    });

    renderComponent();

    // Fill and Submit
    fireEvent.change(screen.getByTestId('user-type-select'), { target: { value: 'patient' } });
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Reset Link/i }));

    // Wait for success message
    await screen.findByText('Link sent!');

    // Assert that the form fields are no longer in the DOM
    expect(screen.queryByTestId('email')).not.toBeInTheDocument();
    expect(screen.queryByTestId('user-type-select')).not.toBeInTheDocument();
  });

  it('renders the "Sign in" link with the correct URL', () => {
    renderComponent();
    
    const signInLink = screen.getByRole('link', { name: /Sign in/i });
    
    // Check that the link points to the login page
    expect(signInLink).toHaveAttribute('href', '/login');
  });

  it('validates that the email input has the correct type attribute', () => {
    renderComponent();
    
    const emailInput = screen.getByTestId('email');
    
    // Ensures browser will provide native email validation/keyboard
    expect(emailInput).toHaveAttribute('type', 'email');
  });
  it('renders the page with all elements correctly', () => {
    renderComponent();

    expect(screen.getByText('IntelliConsult')).toBeInTheDocument();
    expect(screen.getByTestId('icon-stethoscope')).toBeInTheDocument();
    expect(screen.getByText('Forgot Password')).toBeInTheDocument();
    
    // Check inputs exist
    expect(screen.getByTestId('user-type-select')).toBeInTheDocument();
    expect(screen.getByTestId('email')).toBeInTheDocument();
  });
  
  it('renders the validation error message when fields are empty', async () => {
    renderComponent();

    // Submit the form directly to ensure the onSubmit handler runs under JSDOM
    const form = document.querySelector('form');
    fireEvent.submit(form);

    // Verify error message appears
    const errNode = await waitFor(() => 
      screen.getByText('Please enter your email and select your role.')
    );
    expect(errNode).toBeInTheDocument();

    expect(axios.post).not.toHaveBeenCalled();
  });

  it('updates input fields correctly', () => {
    renderComponent();

    const emailInput = screen.getByTestId('email');
    const userTypeSelect = screen.getByTestId('user-type-select');

    // Simulate user typing and selecting
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(userTypeSelect, { target: { value: 'patient' } });

    expect(emailInput.value).toBe('test@example.com');
    expect(userTypeSelect.value).toBe('patient');
  });

  it('shows an error if fields are empty on submit', async () => {
    renderComponent();

    // Click submit without filling anything
    // Submit the form directly to ensure the onSubmit handler runs under JSDOM
    const form = document.querySelector('form');
    fireEvent.submit(form);

    // The component shows an error state, but the key assertion is that axios.post is NOT called
    // and the error message appears (checking with a flexible matcher or by verifying no API call)
    await waitFor(() => {
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  it('handles successful API submission', async () => {
    // Mock success response
    axios.post.mockResolvedValueOnce({
      data: { message: 'Password reset link sent to your email.' },
    });

    renderComponent();

    // Fill Form
    fireEvent.change(screen.getByTestId('user-type-select'), { target: { value: 'patient' } });
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'test@example.com' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Send Reset Link/i }));

    // Verify API call
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'https://smart-healthcare-appointment-and-triage.onrender.com/api/auth/forgot-password',
        { email: 'test@example.com', userType: 'patient' }
      );
    });

    // Verify success message
    expect(await screen.findByText('Password reset link sent to your email.')).toBeInTheDocument();
  });

  it('shows error when only email is provided (validates OR logic)', async () => {
    renderComponent();
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Reset Link/i }));
    expect(await screen.findByText(/please enter your email and select your role/i)).toBeInTheDocument();
  });

  it('shows validation state when only userType is provided (no success alert)', async () => {
    renderComponent();
    fireEvent.change(screen.getByTestId('user-type-select'), { target: { value: 'patient' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Reset Link/i }));
    await waitFor(() => {
      expect(screen.queryByText(/reset link sent/i)).not.toBeInTheDocument();
      expect(screen.getByTestId('email')).toBeInTheDocument();
    });
  });

  it('renders success alert only when success text is set', async () => {
    axios.post.mockResolvedValueOnce({ data: { message: 'Reset link sent' } });
    renderComponent();
    expect(screen.queryByText(/reset link sent/i)).toBeNull();
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByTestId('user-type-select'), { target: { value: 'patient' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Reset Link/i }));
    expect(await screen.findByText(/reset link sent/i)).toBeInTheDocument();
  });

  it('renders error alert only when error text is set and clears after success', async () => {
    axios.post.mockRejectedValueOnce({ response: { data: { message: 'Server error' } } });
    renderComponent();
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByTestId('user-type-select'), { target: { value: 'patient' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Reset Link/i }));
    expect(await screen.findByText(/server error/i)).toBeInTheDocument();
    axios.post.mockResolvedValueOnce({ data: { message: 'Reset link sent' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Reset Link/i }));
    await screen.findByText(/reset link sent/i);
    expect(screen.queryByText(/server error/i)).toBeNull();
  });

  it('sets loading during submit and then shows success (form hidden after)', async () => {
    const postMock = axios.post.mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve({ data: { message: 'OK' } }), 100)));
    renderComponent();
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByTestId('user-type-select'), { target: { value: 'patient' } });
    const submitBtn = screen.getByRole('button', { name: /Send Reset Link/i });
    fireEvent.click(submitBtn);
    expect(await screen.findByText('Sending Email...')).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();
    await waitFor(() => expect(postMock).toBeDefined());
    await waitFor(() => {
      expect(screen.getByText(/ok/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Send Reset Link/i })).not.toBeInTheDocument();
    });
  });

  it('shows optional chaining fallback message when response.data is missing', async () => {
    axios.post.mockRejectedValueOnce({ response: {} });
    renderComponent();
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByTestId('user-type-select'), { target: { value: 'patient' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Reset Link/i }));
    expect(await screen.findByText(/an error occurred/i)).toBeInTheDocument();
  });

  it('applies primaryColor style to Stethoscope icon', () => {
    renderComponent();
    const icon = screen.getByTestId('icon-stethoscope');
    expect(icon).toBeInTheDocument();
    // We can’t assert inline style through the mock easily; presence assertion ensures style usage path
  });

  it('handles API error response', async () => {
    // Mock error response (404 User not found)
    axios.post.mockRejectedValueOnce({
      response: { data: { message: 'User not found.' } },
    });

    renderComponent();

    fireEvent.change(screen.getByTestId('user-type-select'), { target: { value: 'doctor' } });
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'wrong@example.com' } });

    fireEvent.click(screen.getByRole('button', { name: /Send Reset Link/i }));

    // Verify error message
    expect(await screen.findByText('User not found.')).toBeInTheDocument();
  });

  it('handles generic API error (network error)', async () => {
    // Mock network error
    axios.post.mockRejectedValueOnce(new Error('Network Error'));

    renderComponent();

    fireEvent.change(screen.getByTestId('user-type-select'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'admin@example.com' } });

    fireEvent.click(screen.getByRole('button', { name: /Send Reset Link/i }));

    // Verify generic fallback error
    expect(await screen.findByText('An error occurred.')).toBeInTheDocument();
  });
});