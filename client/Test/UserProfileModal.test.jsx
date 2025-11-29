import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserProfileModal } from '@/components/UserProfileModal.jsx';

describe('UserProfileModal', () => {
  it('renders user name and email when open (patient)', () => {
    const patient = { fullName: 'John Doe', email: 'john@example.com', userType: 'patient' };
    render(<UserProfileModal isOpen patient={patient} onClose={() => {}} onProfileUpdate={() => {}} />);
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
