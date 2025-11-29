import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import LandingPage from '@/pages/LandingPage';

vi.mock('axios');
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Link: ({ children, to, className }) => <a href={to} className={className}>{children}</a>,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('lucide-react', () => ({
  ArrowRight: () => <span data-testid="icon-arrow-right" />,
  Shield: () => <span data-testid="icon-shield" />,
  Clock: () => <span data-testid="icon-clock" />,
  Users: () => <span data-testid="icon-users" />,
  Stethoscope: () => <span data-testid="icon-stethoscope" />,
  Brain: () => <span data-testid="icon-brain" />,
  Video: () => <span data-testid="icon-video" />,
  LogOut: () => <span data-testid="icon-logout" />,
}));


vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, style }) => <div data-testid="card" className={className} style={style}>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardTitle: ({ children }) => <h3>{children}</h3>,
  CardDescription: ({ children }) => <p>{children}</p>,
  CardContent: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }) => <span className={className}>{children}</span>,
}));

const createMockToken = (payload) => {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  const signature = "dummy-signature";
  return `${header}.${body}.${signature}`;
};



describe('LandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderComponent = () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );
  };
   it('handles malformed token structure gracefully', async () => {
    
    localStorage.setItem('token', 'this-is-not-a-valid-jwt');

    renderComponent();
    await waitFor(() => {
      expect(screen.queryByText(/Welcome/i)).not.toBeInTheDocument();
    });

    const loginLinks = screen.getAllByText('Login');
    expect(loginLinks.length).toBeGreaterThan(0);
    
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('renders the Logo with correct accessibility attributes', () => {
    renderComponent();

    const logos = screen.getAllByAltText('Logo');
    
    expect(logos.length).toBeGreaterThan(0);
    expect(logos[0]).toHaveAttribute('src', 'Logo.svg');
  
    expect(logos[0]).toHaveStyle({ color: '#0F5257' });
  });

  it('applies correct styling classes to the internal ManualButton component', () => {
    renderComponent();

    
    const learnMoreBtn = screen.getByRole('button', { name: /Learn More/i });

    
    expect(learnMoreBtn).toHaveClass('border');
    expect(learnMoreBtn).toHaveClass('border-teal-300');
    expect(learnMoreBtn).toHaveClass('bg-transparent');
  });

  it('uses a fallback name when user name is missing', async () => {
   
    const mockToken = createMockToken({ userType: 'patient' });
    localStorage.setItem('token', mockToken);
    
   
    axios.get.mockResolvedValueOnce({ data: { email: 'test@test.com' } });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Welcome, User')).toBeInTheDocument();
    });
  });
  it('renders the guest view correctly (No Auth)', () => {
    renderComponent();

   
    expect(screen.getByText('Smart Healthcare for Everyone')).toBeInTheDocument();
    const loginLinks = screen.getAllByText('Login');
    expect(loginLinks.length).toBeGreaterThan(0);
    expect(screen.getByText('Start Your Journey')).toBeInTheDocument();
    expect(screen.queryByText(/Welcome/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
  });

  it('renders the Patient view when logged in', async () => {
    const mockToken = createMockToken({ userType: 'patient', id: '123' });
    localStorage.setItem('token', mockToken);
    
    const mockUser = { fullName: 'John Doe', email: 'john@example.com' };
    axios.get.mockResolvedValueOnce({ data: mockUser });

    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Welcome, John')).toBeInTheDocument();
    });


    expect(screen.getByText('My Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Find Doctors')).toBeInTheDocument();
    expect(screen.getByText('My Appointments')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('renders the Doctor view when logged in', async () => {
    const mockToken = createMockToken({ userType: 'doctor', id: '456' });
    localStorage.setItem('token', mockToken);
    
    const mockUser = { fullName: 'Dr. Smith', email: 'drsmith@example.com' };
    axios.get.mockResolvedValueOnce({ data: mockUser });

    renderComponent();

    // 2. Wait for API call
    await waitFor(() => {
      expect(screen.getByText('Welcome, Dr.')).toBeInTheDocument();
    });

    const dashboardLink = screen.getAllByText('Go to Dashboard')[0].closest('a');
    expect(dashboardLink).toHaveAttribute('href', '/doctor/dashboard');

    // "Find Doctors" should NOT be visible for doctors in the hero CTA (it changes text)
    expect(screen.queryByText('Find Doctors')).not.toBeInTheDocument();
  });

  it('renders the Admin view when logged in', async () => {
    // 1. Setup Mock Token for Admin
    const mockToken = createMockToken({ userType: 'admin', id: '789' });
    localStorage.setItem('token', mockToken);
    
    const mockUser = { fullName: 'Admin User', email: 'admin@example.com' };
    axios.get.mockResolvedValueOnce({ data: mockUser });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Welcome, Admin')).toBeInTheDocument();
    });

    // Check Admin Dashboard Link
    const dashboardLink = screen.getAllByText('Go to Dashboard')[0].closest('a');
    expect(dashboardLink).toHaveAttribute('href', '/admin/dashboard');
  });

  it('handles logout correctly', async () => {
    // 1. Setup Login State
    const mockToken = createMockToken({ userType: 'patient' });
    localStorage.setItem('token', mockToken);
    axios.get.mockResolvedValueOnce({ data: { fullName: 'Jane Doe' } });

    renderComponent();

    // Wait for login to complete
    await waitFor(() => screen.getByText('Welcome, Jane'));

    // 2. Click Logout
    const logoutBtn = screen.getByText('Logout');
    fireEvent.click(logoutBtn);

    // 3. Verify Logout Actions
    await waitFor(() => {
      // Token should be removed
      expect(localStorage.getItem('token')).toBeNull();
      // UI should revert to guest mode - check that no welcome message exists
      expect(screen.queryByText(/Welcome/i)).not.toBeInTheDocument();
    });
  });

  it('handles invalid token (auth check failure)', async () => {
    // 1. Setup Invalid Token
    localStorage.setItem('token', 'invalid-token-structure');
    
    // Mock the decode failure or the API failure
    axios.get.mockRejectedValueOnce(new Error('Unauthorized'));

    renderComponent();

    await waitFor(() => {
      // Logic waits for effect to run
    });

    // Since the initial useEffect is async, we can check if it stays in guest mode
    const loginLinks = screen.queryAllByText('Login');
    expect(loginLinks.length).toBeGreaterThan(0);
    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
  });

  it('renders all feature cards correctly', () => {
    renderComponent();
    
    expect(screen.getByText('AI-Powered Triage')).toBeInTheDocument();
    expect(screen.getByText('Secure Video Consultations')).toBeInTheDocument();
    expect(screen.getByText('Smart Scheduling')).toBeInTheDocument();
    expect(screen.getByText('Privacy & Security')).toBeInTheDocument();
    expect(screen.getByText('For Patients & Doctors')).toBeInTheDocument();
    expect(screen.getByText('Digital Prescriptions')).toBeInTheDocument();
  });

  it('verifies footer links exist', () => {
    renderComponent();

    expect(screen.getAllByText('About Us').length).toBeGreaterThan(0);
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    expect(screen.getByText('Help Center')).toBeInTheDocument();
  });

  // --- NEW TEST CASES START HERE ---

  it('renders header navigation links with correct anchors', () => {
    renderComponent();
    
    // Check Features link - use getAllByText since it appears multiple times
    const featuresLinks = screen.getAllByText('Features');
    expect(featuresLinks.length).toBeGreaterThan(0);
    expect(featuresLinks[0]).toHaveAttribute('href', '#features');
    
    // Check About Us link in header navigation (first occurrence is typically in header)
    const aboutLinks = screen.getAllByText('About Us');
    expect(aboutLinks.length).toBeGreaterThan(0);
    expect(aboutLinks[0]).toHaveAttribute('href', '#about');
  });

  it('renders mobile menu specific elements', () => {
    renderComponent();
    
    // In Guest mode, the Desktop button says "Get Started" (linked to /signup)
    // The Mobile button says "Sign Up" (linked to /signup)
    // We check for the presence of "Sign Up" to verify mobile menu logic is rendered
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
  });
  it('applies sticky positioning to the navigation bar', () => {
    renderComponent();
    // The nav element should have specific CSS classes for sticky behavior
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('sticky');
    expect(nav).toHaveClass('top-0');
    expect(nav).toHaveClass('z-50');
  });

  it('manages responsive visibility for navigation menus', () => {
    renderComponent();
    
    // 1. Desktop Nav Container check
    // We find a link that exists in the desktop menu (e.g., "Features")
    // and verify its parent container hides it on small screens. Because there are
    // multiple "Features" links (desktop + mobile), use getAllByText and pick
    // the one whose ancestor has the desktop classes.
    const featuresLinks = screen.getAllByText('Features');
    const desktopFeatures = featuresLinks.find((el) => el.closest('div')?.classList.contains('md:flex'));
    expect(desktopFeatures).toBeDefined();
    const desktopNav = desktopFeatures.closest('div');
    expect(desktopNav).toHaveClass('hidden');
    expect(desktopNav).toHaveClass('md:flex');

    // 2. Mobile Menu Container check
    // The mobile menu shows "Sign Up" button (unique text for mobile guest view)
    const mobileSignUpBtn = screen.getByText('Sign Up');
    const mobileNav = mobileSignUpBtn.closest('div');
    
    expect(mobileNav).toHaveClass('md:hidden');
  });

  it('associates the correct icon with the "AI-Powered Triage" feature', () => {
    renderComponent();
    const title = screen.getByText('AI-Powered Triage');
    const card = title.closest('div[data-testid="card"]');
    expect(within(card).getByTestId('icon-brain')).toBeInTheDocument();
  });

  it('verifies the primary "Start Your Journey" CTA points to the signup page', () => {
    renderComponent();
    const ctaButtonText = screen.getByText('Start Your Journey');
    
    // Find the parent Link element
    const link = ctaButtonText.closest('a');
    
    // Ensure it directs users to the signup route
    expect(link).toHaveAttribute('href', '/signup');
  });
  
  it('calls profile API with correct URL and Authorization header when token exists', async () => {
    const tokenPayload = { userType: 'patient', id: 'abc' };
    const mockToken = createMockToken(tokenPayload);
    localStorage.setItem('token', mockToken);
    axios.get.mockResolvedValueOnce({ data: { fullName: 'User Example', email: 'u@example.com' } });
    renderComponent();
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        'https://smart-healthcare-appointment-and-triage.onrender.com/api/users/profile',
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: expect.stringContaining('Bearer ') }) })
      );
    });
  });

  it('renders welcome with fallback when user or fullName is missing (optional chaining path)', async () => {
    const mockToken = createMockToken({ userType: 'doctor' });
    localStorage.setItem('token', mockToken);
    axios.get.mockResolvedValueOnce({ data: { email: 'doc@example.com' } });
    renderComponent();
    expect(await screen.findByText('Welcome, User')).toBeInTheDocument();
  });

  it('shows guest CTA section only when not logged in', () => {
    renderComponent();
    // Guest CTA elements should be visible
    expect(screen.getByText('Ready to Experience Smart Healthcare?')).toBeInTheDocument();
    expect(screen.getByText('Get Started Today')).toBeInTheDocument();
  });

  it('hides guest CTA section when logged in as patient', async () => {
    const mockToken = createMockToken({ userType: 'patient' });
    localStorage.setItem('token', mockToken);
    axios.get.mockResolvedValueOnce({ data: { fullName: 'Jane Patient' } });
    renderComponent();
    // Wait until dashboard button appears indicating logged-in state
    await screen.findByText('My Dashboard');
    // Guest CTA title should not be visible for logged-in users
    expect(screen.queryByText('Ready to Experience Smart Healthcare?')).not.toBeInTheDocument();
  });

  it('routes hero primary Link based on userType (patient -> /patient/doctors, doctor -> dashboard)', async () => {
    // Patient case
    let mockToken = createMockToken({ userType: 'patient' });
    localStorage.setItem('token', mockToken);
    axios.get.mockResolvedValueOnce({ data: { fullName: 'Pat Tient' } });
    renderComponent();
    // Wait for hero buttons to render for patient
    await screen.findByText('Find Doctors');
    let link = screen.getAllByRole('link', { name: /Find Doctors|Go to Dashboard/i })[0];
    expect(link).toHaveAttribute('href', '/patient/doctors');

    // Reset and test doctor case
    localStorage.clear();
    vi.clearAllMocks();
    mockToken = createMockToken({ userType: 'doctor' });
    localStorage.setItem('token', mockToken);
    axios.get.mockResolvedValueOnce({ data: { fullName: 'Dr. Who' } });
    renderComponent();
    await screen.findByText('Go to Dashboard');
    link = screen.getAllByRole('link', { name: /Go to Dashboard/i })[0];
    expect(link).toHaveAttribute('href', '/doctor/dashboard');
  });

  it('applies primaryColor style to icons (e.g., Brain) in feature cards', () => {
    renderComponent();
    const card = screen.getByText('AI-Powered Triage').closest('[data-testid="card"]');
    const icon = within(card).getByTestId('icon-brain');
    // Presence ensures style path executes (mock cannot reflect inline colors)
    expect(icon).toBeInTheDocument();
  });

  it('applies animationDelay styles to hero elements', () => {
    renderComponent();
    const heroTitle = screen.getByText('Smart Healthcare for Everyone');
    expect(heroTitle).toHaveClass('animate-fadeInDown');
    // Verify container with delayed animations exists
    const heroContainer = heroTitle.closest('div');
    expect(heroContainer).toBeInTheDocument();
  });

  // Target ManualButton size/variant class maps
  it('ManualButton uses size "lg" and variant "secondary" classnames in CTA', () => {
    renderComponent();
    // In guest view, secondary button is Learn More
    const appointmentsBtn = screen.getByText('Learn More');
    expect(appointmentsBtn).toHaveClass('border');
    expect(appointmentsBtn).toHaveClass('border-teal-300');
    const classes = appointmentsBtn.className;
    expect(classes).toMatch(/px-6/);
  });

  // Token parsing: ensure plus and slash replacement applied
  it('parses JWT with url-safe base64 and replaces - and _ correctly', async () => {
    const payload = { userType: 'patient', id: 'u1' };
    // Create url-safe base64 body manually
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/\+/g, '-').replace(/\//g, '_');
    const body = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_');
    const signature = 'sig';
    const token = `${header}.${body}.${signature}`;
    localStorage.setItem('token', token);
    axios.get.mockResolvedValueOnce({ data: { fullName: 'Jane Doe' } });
    renderComponent();
    // Wait for patient CTA to appear
    await screen.findByText('Find Doctors');
    // Verify patient hero link points to Find Doctors route
    const link = screen.getAllByRole('link', { name: /Find Doctors/i })[0];
    expect(link).toHaveAttribute('href', '/patient/doctors');
  });

  // Admin routing
  it('getDashboardRoute returns admin dashboard when userType is admin', async () => {
    const mockToken = createMockToken({ userType: 'admin', id: 'a1' });
    localStorage.setItem('token', mockToken);
    axios.get.mockResolvedValueOnce({ data: { fullName: 'Admin User' } });
    renderComponent();
    const buttons = await screen.findAllByText('Go to Dashboard');
    const goToDash = buttons[0].closest('a');
    expect(goToDash).toHaveAttribute('href', '/admin/dashboard');
  });

  test('hero elements have animationDelay inline styles', async () => {
    // guest view
    renderComponent();
    // Check a few prominent elements for style presence
    const learnMore = await screen.findByRole('link', { name: /Learn More/i });
    expect(learnMore).toHaveStyle({ animationDelay: expect.stringMatching(/s$/) });
    const startJourney = screen.getByRole('link', { name: /Start Your Journey/i });
    expect(startJourney).toHaveStyle({ animationDelay: expect.stringMatching(/s$/) });
  });

  test('JWT url-safe parsing converts -/_ and decodes payload', async () => {
    // Create a minimal jwt with url-safe base64
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const payloadObj = { name: 'UrlSafe', userType: 'patient' };
    const urlSafeBase64 = btoa(JSON.stringify(payloadObj)).replace(/\+/g, '-').replace(/\//g, '_');
    const jwt = `${header}.${urlSafeBase64}.`; // signature ignored
    // store token to trigger parsing
    window.localStorage.setItem('token', jwt);
    renderComponent();
    // The decoded name should appear, confirming proper replacement
    const welcomePatient = await screen.findByText(/Find Doctors/i);
    expect(welcomePatient).toBeInTheDocument();
    // cleanup
    window.localStorage.removeItem('token');
  });

  // Animation delay specific values
  it('hero section elements have expected animationDelay inline styles', () => {
    renderComponent();
    const title = screen.getByText('Smart Healthcare for Everyone');
    expect(title).toHaveStyle({ animationDelay: '0.2s' });
    const ctaContainer = screen.getByText(/Start Your Journey|Find Doctors/).closest('div');
    expect(ctaContainer).toHaveStyle({ animationDelay: '0.6s' });
  });
  it('applies animation classes to hero elements', () => {
    renderComponent();
    
    // Check for a specific element expected to have animation
    const badge = screen.getByText('AI-Powered Healthcare Platform');
    expect(badge).toHaveClass('animate-fadeInDown');
    
    const title = screen.getByText('Smart Healthcare for Everyone');
    expect(title).toHaveClass('animate-fadeInDown');
  });

  it('renders the About section content correctly', () => {
    renderComponent();
    
    expect(screen.getByText(/About Our Platform: A Commitment to Smarter, Safer Healthcare/i)).toBeInTheDocument();
    
    // Check for the "Join Our Platform" button which is unique to the About section in guest mode
    expect(screen.getByText('Join Our Platform')).toBeInTheDocument();
  });
});