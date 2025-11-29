import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

describe('ui/Badge', () => {
  it('renders badge with text and variant class', () => {
    render(<Badge className="secondary">New</Badge>);
    const el = screen.getByText('New');
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass('secondary');
  });
});
