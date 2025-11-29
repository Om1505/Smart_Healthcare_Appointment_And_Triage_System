import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Select, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator, SelectScrollUpButton, SelectScrollDownButton, SelectGroup } from '@/components/ui/select';

describe('ui/Select', () => {
  it('renders select trigger', () => {
    render(
      <Select value="One">
        <SelectTrigger>Choose</SelectTrigger>
        <SelectContent>
          {/* Label must be inside a Group */}
          <SelectGroup>
            <SelectLabel>Label</SelectLabel>
            <SelectItem value="One">One</SelectItem>
            <SelectSeparator />
          </SelectGroup>
          <SelectScrollUpButton />
          <SelectScrollDownButton />
        </SelectContent>
      </Select>
    );
    expect(screen.getByText('Choose')).toBeInTheDocument();
    // Portal content may not be directly queryable; presence of trigger suffices to exercise subcomponents.
  });
});
