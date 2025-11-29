import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import FindDoctorsPage from '@/pages/FindDoctorsPage';

// Mock axios
vi.mock('axios');

// Mock UI components used in the page to simplify DOM and avoid animation/style issues
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, 'data-testid': dt }) => <div data-testid={dt} className={className}>{children}</div>,
  CardContent: ({ children, className }) => <div className={className}>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, variant }) => (
    <button onClick={onClick} className={className} data-variant={variant}>{children}</button>
  ),
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }) => <div>{children}</div>,
  AvatarImage: ({ src, alt }) => <img src={src} alt={alt} />,
  AvatarFallback: ({ children }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }) => (
    <select data-testid="specialty-select" value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }) => <>{children}</>,
  SelectItem: ({ value, children }) => <option value={value}>{children}</option>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, className }) => (
    <input aria-label="search-input" placeholder={placeholder} value={value} onChange={onChange} className={className} />
  )
}));

// Mock DropdownMenu and UserProfileModal
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }) => <button>{children}</button>,
  DropdownMenuContent: ({ children }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onSelect }) => <div onClick={() => onSelect && onSelect()}>{children}</div>,
  DropdownMenuLabel: ({ children }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock('@/components/UserProfileModal', () => ({
  UserProfileModal: ({ isOpen, onClose, patient }) => isOpen ? <div data-testid="user-profile-modal"><button data-testid="close-modal" onClick={onClose}>Close</button><div>{patient?.fullName}</div></div> : null
}));

// Mock icons so they don't break tests
vi.mock('lucide-react', () => ({
  Search: () => <span>SearchIcon</span>,
  Filter: () => <span>FilterIcon</span>,
  Star: () => <span>Star</span>,
  Clock: () => <span>Clock</span>,
  User: () => <span>User</span>,
  LogOut: () => <span>LogOut</span>,
}));

describe('FindDoctorsPage', () => {
  const sampleDoctors = [
    { _id: 'd1', fullName: 'Dr Alice', specialization: 'Cardiology', bio: 'Cardio', averageRating: 4.2, reviewCount: 10, experience: 8 },
    { _id: 'd2', fullName: 'Dr Bob', specialization: 'Dermatology', bio: 'Derm', averageRating: 3.6, reviewCount: 5, experience: 5 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Default token exists so the patient profile fetch runs
    Storage.prototype.getItem = vi.fn(() => 'fake-token');
    // Reset location
    delete window.location;
    window.location = { href: '' };
  });

  afterEach(() => {
    // restore timers if used
    try { vi.useRealTimers(); } catch (e) {}
  });

  it('shows loading initially', () => {
    axios.get.mockReturnValue(new Promise(() => {})); // pending

    render(
      <MemoryRouter>
        <FindDoctorsPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading doctors.../i)).toBeInTheDocument();
  });

  it('fetches and displays doctors list', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/users/profile')) return Promise.resolve({ data: { fullName: 'Patient One' } });
      if (url.includes('/doctors')) return Promise.resolve({ data: sampleDoctors });
      return Promise.reject(new Error('not found'));
    });

    render(
      <MemoryRouter>
        <FindDoctorsPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Find Your Doctor')).toBeInTheDocument());

    // Check that doctor names are displayed
    expect(screen.getByText('Dr Alice')).toBeInTheDocument();
    expect(screen.getByText('Dr Bob')).toBeInTheDocument();

    // Check Book Appointment link hrefs
    const bookLinks = screen.getAllByText(/Book Appointment/i);
    expect(bookLinks.length).toBeGreaterThanOrEqual(2);
    // The DOM for Links renders buttons in our mocks; ensure the route strings exist in DOM via link parents
    expect(document.body.innerHTML).toContain('/patient/book/d1');
    expect(document.body.innerHTML).toContain('/patient/book/d2');
  });

  it('filters doctors by search query', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/users/profile')) return Promise.resolve({ data: { fullName: 'Patient One' } });
      // Return full list for initial fetch
      if (url.includes('/doctors') && !url.includes('search')) return Promise.resolve({ data: sampleDoctors });
      // When search param present, return filtered
      if (url.includes('search=Alice')) return Promise.resolve({ data: [sampleDoctors[0]] });
      return Promise.resolve({ data: [] });
    });

    // Use fake timers to advance debounce
    vi.useFakeTimers();

    render(
      <MemoryRouter>
        <FindDoctorsPage />
      </MemoryRouter>
    );

    // Wait initial render
    await waitFor(() => expect(screen.getByText('Dr Alice')).toBeInTheDocument());

    const input = screen.getByLabelText('search-input');
    // type 'Alice'
    fireEvent.change(input, { target: { value: 'Alice' } });

    // advance debounce timer (300ms)
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    // Wait for filtered result
    await waitFor(() => expect(screen.getByText('Dr Alice')).toBeInTheDocument());
    expect(screen.queryByText('Dr Bob')).not.toBeInTheDocument();
  });

  it('filters doctors by specialty', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/users/profile')) return Promise.resolve({ data: { fullName: 'Patient One' } });
      if (url.includes('specialty=Cardiology')) return Promise.resolve({ data: [sampleDoctors[0]] });
      return Promise.resolve({ data: sampleDoctors });
    });

    vi.useFakeTimers();

    render(
      <MemoryRouter>
        <FindDoctorsPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Dr Alice')).toBeInTheDocument());

    const select = screen.getByTestId('specialty-select');
    fireEvent.change(select, { target: { value: 'Cardiology' } });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    await waitFor(() => expect(screen.getByText('Dr Alice')).toBeInTheDocument());
    expect(screen.queryByText('Dr Bob')).not.toBeInTheDocument();
  });

  it('shows no doctors found when API returns empty array', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/users/profile')) return Promise.resolve({ data: { fullName: 'Patient One' } });
      return Promise.resolve({ data: [] });
    });

    render(
      <MemoryRouter>
        <FindDoctorsPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('No Doctors Found')).toBeInTheDocument());
  });

  it('displays error message on API failure', async () => {
    axios.get.mockRejectedValue(new Error('Network Error'));

    render(
      <MemoryRouter>
        <FindDoctorsPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/Failed to fetch doctors/i)).toBeInTheDocument());
  });

  it('logs out user when logout is clicked', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/users/profile')) return Promise.resolve({ data: { fullName: 'Patient One' } });
      if (url.includes('/doctors')) return Promise.resolve({ data: sampleDoctors });
      return Promise.resolve({ data: [] });
    });

    render(
      <MemoryRouter>
        <FindDoctorsPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Find Your Doctor')).toBeInTheDocument());

    // Click logout button (renders text 'Logout')
    const logoutBtn = Array.from(screen.getAllByText(/Logout/i))[0];
    expect(logoutBtn).toBeTruthy();
    fireEvent.click(logoutBtn);

    expect(Storage.prototype.getItem).toHaveBeenCalled();
    expect(window.location.href).toBe('/login');
  });
});
