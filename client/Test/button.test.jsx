import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('ui/Button', () => {
  it('renders with children and className', () => {
    render(<Button className="primary">Click Me</Button>);
    const btn = screen.getByText('Click Me');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass('primary');
  });

  it('applies variant and size classes', () => {
    render(<Button variant="secondary" size="sm">Small</Button>);
    const btn = screen.getByText('Small');
    expect(btn).toHaveClass('h-8');
  });

  it('renders as child element when asChild is true', () => {
    render(
      <Button asChild variant="link">
        <a href="#" data-testid="link-btn">Link Btn</a>
      </Button>
    );
    const link = screen.getByTestId('link-btn');
    expect(link).toBeInTheDocument();
    // Should receive button classes via Slot
    expect(link.className).toMatch(/inline-flex/);
  });
});
