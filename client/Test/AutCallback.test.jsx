/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AuthCallback from '@/pages/AuthCallback';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('AuthCallback', () => {
  beforeEach(() => {
    // Clear mocks and localStorage before each test
    vi.clearAllMocks();
    localStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('renders loading state initially', () => {
    render(
      <MemoryRouter initialEntries={['/?token=test123']}>
        <AuthCallback />
      </MemoryRouter>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('Finalizing your sign-in, please wait.')).toBeInTheDocument();
  });

  it('stores token in localStorage and navigates to patient dashboard when token is provided without nextPath', async () => {
    render(
      <MemoryRouter initialEntries={['/?token=test-token-123']}>
        <AuthCallback />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('test-token-123');
      expect(mockNavigate).toHaveBeenCalledWith('/patient/dashboard');
    });
  });

  it('stores token and navigates to decoded nextPath when both token and nextPath are provided', async () => {
    const encodedPath = encodeURIComponent('/doctor/dashboard');
    
    render(
      <MemoryRouter initialEntries={[`/?token=test-token-456&next=${encodedPath}`]}>
        <AuthCallback />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('test-token-456');
      expect(mockNavigate).toHaveBeenCalledWith('/doctor/dashboard');
    });
  });

  it('navigates to login with error when error parameter is present', async () => {
    render(
      <MemoryRouter initialEntries={['/?error=access_denied']}>
        <AuthCallback />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('Google Auth Error:', 'access_denied');
      expect(mockNavigate).toHaveBeenCalledWith('/login?error=google_failed');
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  it('navigates to login with token_missing error when no token is provided', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthCallback />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('No token provided in callback.');
      expect(mockNavigate).toHaveBeenCalledWith('/login?error=token_missing');
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  it('handles complex encoded nextPath correctly', async () => {
    const complexPath = '/admin/doctors?filter=active&sort=name';
    const encodedPath = encodeURIComponent(complexPath);
    
    render(
      <MemoryRouter initialEntries={[`/?token=admin-token&next=${encodedPath}`]}>
        <AuthCallback />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('admin-token');
      expect(mockNavigate).toHaveBeenCalledWith(complexPath);
    });
  });

  it('prioritizes error over token when both are present', async () => {
    render(
      <MemoryRouter initialEntries={['/?token=test-token&error=server_error']}>
        <AuthCallback />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('Google Auth Error:', 'server_error');
      expect(mockNavigate).toHaveBeenCalledWith('/login?error=google_failed');
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  it('handles empty token parameter as missing token', async () => {
    render(
      <MemoryRouter initialEntries={['/?token=']}>
        <AuthCallback />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('No token provided in callback.');
      expect(mockNavigate).toHaveBeenCalledWith('/login?error=token_missing');
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  it('handles nextPath without token correctly', async () => {
    const encodedPath = encodeURIComponent('/doctor/dashboard');
    
    render(
      <MemoryRouter initialEntries={[`/?next=${encodedPath}`]}>
        <AuthCallback />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('No token provided in callback.');
      expect(mockNavigate).toHaveBeenCalledWith('/login?error=token_missing');
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  it('stores token even with special characters', async () => {
    const specialToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    
    render(
      <MemoryRouter initialEntries={[`/?token=${specialToken}`]}>
        <AuthCallback />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe(specialToken);
      expect(mockNavigate).toHaveBeenCalledWith('/patient/dashboard');
    });
  });

  it('renders loading UI elements with correct styling', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/?token=test']}>
        <AuthCallback />
      </MemoryRouter>
    );

    const mainDiv = container.querySelector('.min-h-screen');
    expect(mainDiv).toHaveClass('bg-emerald-50', 'flex', 'items-center', 'justify-center', 'p-4');

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveClass('text-2xl', 'font-bold', 'text-gray-900');
  });
});
