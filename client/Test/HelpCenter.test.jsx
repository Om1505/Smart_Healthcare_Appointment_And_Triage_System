import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HelpCenterPage from '@/pages/HelpCenter'; 

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Link: ({ children, to, className }) => (
      <a href={to} className={className} data-testid="back-link">
        {children}
      </a>
    ),
  };
});

// 2. Mock Lucide Icons
vi.mock('lucide-react', () => ({
  MessageCircle: () => <span data-testid="icon-message-circle" />,
  ArrowLeft: () => <span data-testid="icon-arrow-left" />,
}));

// 3. Mock Child Component (Chatbot)
// We mock this to ensure we only test the Page logic, not the Chatbot logic
vi.mock('../components/Chatbot', () => ({
  default: () => <div data-testid="chatbot-component">Mocked Chatbot Interface</div>,
}));

// --- UI COMPONENT MOCKS ---

// Button Mock
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className }) => (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));

// Card Mocks (Flattened structure)
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }) => <div className={className} data-testid="card">{children}</div>,
  CardHeader: ({ children }) => <div className="card-header">{children}</div>,
  CardTitle: ({ children }) => <h2>{children}</h2>,
  CardDescription: ({ children }) => <p>{children}</p>,
  CardContent: ({ children, className }) => <div className={className}>{children}</div>,
}));

// --- TEST SUITE ---

describe('HelpCenterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    render(
      <MemoryRouter>
        <HelpCenterPage />
      </MemoryRouter>
    );
  };

  it('renders the initial layout correctly', () => {
    renderComponent();

    // Check Header Text
    expect(screen.getByText('Help Center')).toBeInTheDocument();
    expect(screen.getByText(/Have questions\? Use our automated assistant/i)).toBeInTheDocument();

    // Check Back Link
    const backLink = screen.getByTestId('back-link');
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/');
    expect(screen.getByText('Back to Home')).toBeInTheDocument();

    // Check Card Headers
    expect(screen.getByText('Quick Help')).toBeInTheDocument();
    expect(screen.getByText('Get instant answers from our automated assistant.')).toBeInTheDocument();
  });

  it('shows the "Start Chat" button initially', () => {
    renderComponent();

    // Check specific initial state text
    expect(screen.getByText(/Click the button below to start a conversation/i)).toBeInTheDocument();

    // Check Button exists
    const startButton = screen.getByRole('button', { name: /Start Chat/i });
    expect(startButton).toBeInTheDocument();

    // ENSURE Chatbot is NOT visible yet
    expect(screen.queryByTestId('chatbot-component')).not.toBeInTheDocument();
  });

  it('opens the Chatbot component when "Start Chat" is clicked', () => {
    renderComponent();

    const startButton = screen.getByRole('button', { name: /Start Chat/i });

    // Click the button
    fireEvent.click(startButton);

    // 1. The button and initial text should disappear
    expect(screen.queryByText(/Click the button below to start a conversation/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Start Chat/i })).not.toBeInTheDocument();

    // 2. The Chatbot component should now appear
    expect(screen.getByTestId('chatbot-component')).toBeInTheDocument();
    expect(screen.getByText('Mocked Chatbot Interface')).toBeInTheDocument();
  });
});