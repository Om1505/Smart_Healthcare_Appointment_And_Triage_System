import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from '@/components/ui/input';

describe('ui/Input', () => {
  it('renders input with placeholder and value', () => {
    render(<Input placeholder="Enter" defaultValue="abc" />);
    const inp = screen.getByPlaceholderText('Enter');
    expect(inp).toBeInTheDocument();
    expect(inp).toHaveValue('abc');
  });
});
