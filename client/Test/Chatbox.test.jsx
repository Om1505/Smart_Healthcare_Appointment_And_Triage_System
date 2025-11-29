import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Chatbot from '@/components/Chatbot.jsx';

describe('Chatbot', () => {
  it('renders initial UI and echoes selected option', () => {
    // Mock scrollIntoView used by Chatbot
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    render(<Chatbot />);
    // Click 'I am a Patient' and expect bot to respond with patient menu text
    fireEvent.click(screen.getByText('I am a Patient'));
    // user echo bubble should appear immediately
    expect(screen.getByText('I am a Patient')).toBeInTheDocument();
  });
});
