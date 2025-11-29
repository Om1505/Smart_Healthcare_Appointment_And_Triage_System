import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

describe('ui/Dialog', () => {
  it('renders dialog content and header', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modal</DialogTitle>
            <DialogDescription>Desc</DialogDescription>
          </DialogHeader>
          <div>Content</div>
          <DialogFooter>Actions</DialogFooter>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByText('Modal')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Desc')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });
});
