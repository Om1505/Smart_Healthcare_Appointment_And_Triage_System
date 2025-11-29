import React from 'react';
import { vi } from 'vitest';

// Polyfills and DOM helpers
if (typeof global !== 'undefined') {
  // ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // localStorage polyfill
  if (typeof global.localStorage === 'undefined' || global.localStorage === null) {
    global.localStorage = (function () {
      let store = {};
      return {
        getItem(key) {
          return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
        },
        setItem(key, value) {
          store[key] = String(value);
        },
        removeItem(key) {
          delete store[key];
        },
        clear() {
          store = {};
        }
      };
    })();
  }
}

// DOM helpers used by Radix
if (typeof window !== 'undefined' && window.HTMLElement) {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
}

// Common UI mocks so any import of '@/components/ui/*' resolves
vi.mock('@/components/ui/button', () => ({
  Button: (props) => React.createElement('button', props, props.children)
}));
vi.mock('@/components/ui/card', () => ({
  Card: (props) => React.createElement('div', props, props.children),
  CardContent: (props) => React.createElement('div', props, props.children)
}));
vi.mock('@/components/ui/badge', () => ({
  Badge: (props) => React.createElement('span', props, props.children)
}));
vi.mock('@/components/ui/avatar', () => ({
  Avatar: (props) => React.createElement('div', props, props.children),
  AvatarImage: (props) => React.createElement('img', props),
  AvatarFallback: (props) => React.createElement('span', props, props.children)
}));
vi.mock('@/components/ui/select', () => ({
  Select: (props) => React.createElement('select', props, props.children),
  // Use Fragment for SelectTrigger so we don't inject an extra element inside native <select>
  SelectTrigger: (props) => React.createElement(React.Fragment, null, props.children),
  SelectValue: () => null,
  SelectContent: (props) => React.createElement(React.Fragment, null, props.children),
  SelectItem: (props) => React.createElement('option', { value: props.value }, props.children)
}));
vi.mock('@/components/ui/input', () => ({
  Input: (props) => React.createElement('input', props)
}));
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: (props) => React.createElement('div', props, props.children),
  DropdownMenuTrigger: (props) => React.createElement('button', props, props.children),
  DropdownMenuContent: (props) => React.createElement('div', props, props.children),
  DropdownMenuItem: (props) => React.createElement('div', { role: 'menuitem', onClick: props.onSelect, className: props.className }, props.children),
  DropdownMenuLabel: (props) => React.createElement('div', props, props.children),
  DropdownMenuSeparator: () => React.createElement('hr', null)
}));

// UserProfileModal mock
vi.mock('@/components/UserProfileModal', () => ({
  UserProfileModal: ({ isOpen, onClose, patient }) => (
    isOpen ? React.createElement('div', { role: 'dialog', 'aria-label': 'Profile Modal' }, [
      React.createElement('h1', { key: 'h1' }, 'Modal Open'),
      React.createElement('p', { key: 'p' }, patient?.fullName),
      React.createElement('button', { key: 'close', onClick: onClose }, 'Close Modal')
    ]) : null
  )
}));
