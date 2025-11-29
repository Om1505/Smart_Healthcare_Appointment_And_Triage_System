import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ResetPasswordPage from '@/pages/ResetPasswordPage.jsx';
import axios from 'axios';

vi.mock('axios');

const renderWithToken = (token = 'abc123') => {
  return render(
    <MemoryRouter initialEntries={[`/reset-password/${token}`]}>
      <Routes>
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders initial form with empty password fields and no messages', () => {
    renderWithToken();
    const passwordInput = screen.getByLabelText(/^New Password$/i);
    const confirmInput = screen.getByLabelText(/^Confirm New Password$/i);
    expect(passwordInput).toHaveValue('');
    expect(confirmInput).toHaveValue('');
    expect(screen.queryByText(/Passwords do not match!/i)).toBeNull();
    expect(screen.queryByText(/Password reset successful/i)).toBeNull();
  });

  it('shows mismatch error when passwords differ', async () => {
    renderWithToken();
    fireEvent.change(screen.getByLabelText(/^New Password$/i), { target: { value: 'ValidPass1!' } });
    fireEvent.change(screen.getByLabelText(/^Confirm New Password$/i), { target: { value: 'OtherPass1!' } });
    fireEvent.click(screen.getByRole('button', { name: /Reset Password/i }));
    expect(await screen.findByText(/Passwords do not match!/i)).toBeInTheDocument();
  });

  it('shows regex validation error for weak password', async () => {
    renderWithToken();
    // Invalid: too short and missing uppercase
    fireEvent.change(screen.getByLabelText(/^New Password$/i), { target: { value: 'short1!' } });
    fireEvent.change(screen.getByLabelText(/^Confirm New Password$/i), { target: { value: 'short1!' } });
    fireEvent.click(screen.getByRole('button', { name: /Reset Password/i }));
    expect(await screen.findByText(/Password must be at least 8 characters/i)).toBeInTheDocument();
  });

  it('submits successfully and hides form, showing login link', async () => {
    axios.put.mockResolvedValueOnce({ data: { message: 'Password reset successful' } });
    renderWithToken('resetTokenXYZ');
    fireEvent.change(screen.getByLabelText(/^New Password$/i), { target: { value: 'ValidPass1!' } });
    fireEvent.change(screen.getByLabelText(/^Confirm New Password$/i), { target: { value: 'ValidPass1!' } });
    fireEvent.click(screen.getByRole('button', { name: /Reset Password/i }));
    expect(await screen.findByText(/Password reset successful/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument();
    // Form should be hidden when success is present
    expect(screen.queryByLabelText(/New Password/i)).toBeNull();
    // Ensure token was used in URL
    expect(axios.put).toHaveBeenCalledWith(
      expect.stringContaining('/reset-password/resetTokenXYZ'),
      expect.objectContaining({ password: 'ValidPass1!', confirmPassword: 'ValidPass1!' })
    );
  });

  it('shows fallback error on network failure without response data', async () => {
    axios.put.mockRejectedValueOnce(new Error('Network failed'));
    renderWithToken();
    fireEvent.change(screen.getByLabelText(/^New Password$/i), { target: { value: 'ValidPass1!' } });
    fireEvent.change(screen.getByLabelText(/^Confirm New Password$/i), { target: { value: 'ValidPass1!' } });
    fireEvent.click(screen.getByRole('button', { name: /Reset Password/i }));
    expect(await screen.findByText(/An error occurred/i)).toBeInTheDocument();
  });

  it('shows API error message from response', async () => {
    axios.put.mockRejectedValueOnce({ response: { data: { message: 'Reset failed' } } });
    renderWithToken();
    fireEvent.change(screen.getByLabelText(/^New Password$/i), { target: { value: 'ValidPass1!' } });
    fireEvent.change(screen.getByLabelText(/^Confirm New Password$/i), { target: { value: 'ValidPass1!' } });
    fireEvent.click(screen.getByRole('button', { name: /Reset Password/i }));
    expect(await screen.findByText(/Reset failed/i)).toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    renderWithToken();
    const passwordInput = screen.getByLabelText(/^New Password$/i);
    // Find the toggle button inside the password field container (variant ghost)
    const toggle = passwordInput.parentElement.querySelector('button');
    expect(passwordInput).toHaveAttribute('type', 'password');
    fireEvent.click(toggle);
    expect(passwordInput).toHaveAttribute('type', 'text');
    fireEvent.click(toggle);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('toggles confirm password visibility', () => {
    renderWithToken();
    const confirmInput = screen.getByLabelText(/^Confirm New Password$/i);
    const toggle = confirmInput.parentElement.querySelector('button');
    expect(confirmInput).toHaveAttribute('type', 'password');
    fireEvent.click(toggle);
    expect(confirmInput).toHaveAttribute('type', 'text');
    fireEvent.click(toggle);
    expect(confirmInput).toHaveAttribute('type', 'password');
  });

  it('shows loading state and then resets isLoading after submission', async () => {
    axios.put.mockResolvedValueOnce({ data: { message: 'Password reset successful' } });
    renderWithToken();
    fireEvent.change(screen.getByLabelText(/^New Password$/i), { target: { value: 'ValidPass1!' } });
    fireEvent.change(screen.getByLabelText(/^Confirm New Password$/i), { target: { value: 'ValidPass1!' } });
    const submitBtn = screen.getByRole('button', { name: /Reset Password/i });
    fireEvent.click(submitBtn);
    // During loading text changes
    expect(screen.getByRole('button', { name: /Resetting Password.../i })).toBeDisabled();
    await waitFor(() => expect(screen.queryByRole('button', { name: /Resetting Password.../i })).toBeNull());
  });

  it('clears previous error when resubmitting successfully', async () => {
    // First attempt: mismatch -> error
    renderWithToken();
    fireEvent.change(screen.getByLabelText(/^New Password$/i), { target: { value: 'ValidPass1!' } });
    fireEvent.change(screen.getByLabelText(/^Confirm New Password$/i), { target: { value: 'OtherPass1!' } });
    fireEvent.click(screen.getByRole('button', { name: /Reset Password/i }));
    expect(await screen.findByText(/Passwords do not match!/i)).toBeInTheDocument();
    // Second attempt success
    axios.put.mockResolvedValueOnce({ data: { message: 'Password reset successful' } });
    fireEvent.change(screen.getByLabelText(/^Confirm New Password$/i), { target: { value: 'ValidPass1!' } });
    fireEvent.click(screen.getByRole('button', { name: /Reset Password/i }));
    expect(await screen.findByText(/Password reset successful/i)).toBeInTheDocument();
    // Error should be cleared (no red error div)
    expect(screen.queryByText(/Passwords do not match!/i)).toBeNull();
  });

  it('applies primaryColor style to the stethoscope icon', () => {
    const { container } = renderWithToken();
    const svg = container.querySelector('svg.h-8.w-8');
    expect(svg).toBeTruthy();
    const color = svg.getAttribute('style') || '';
    // Accept either hex or computed rgb format
    expect(color).toMatch(/color:\s*(#0F5257|rgb\(15, 82, 87\))/i);
  });
});
