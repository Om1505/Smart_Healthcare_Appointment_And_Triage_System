import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReviewModal } from '@/components/ReviewModal.jsx';

describe('ReviewModal', () => {
  it('renders when open with doctor name', () => {
    const appointment = { _id: 'a1', doctor: { _id: 'd1', fullName: 'Smith' } };
    render(<ReviewModal isOpen appointment={appointment} onClose={() => {}} />);
    expect(screen.getByText(/dr\. smith/i)).toBeInTheDocument();
  });
});
