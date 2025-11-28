
import axios from 'axios';
import { useEffect, useState } from 'react';
import LandingPage from '../LandingPage';

// LandingPage.test.jsx
import { fireEvent, render, screen } from '@testing-library/react';
import "@testing-library/jest-dom";

// LandingPage.test.jsx
// Mocking necessary components and hooks
jest.mock("axios");
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useState: jest.fn(),
  useEffect: jest.fn(),
}));
jest.mock("@/components/ui/card", () => ({
  Card: ({ children }) => <div>{children}</div>,
  CardContent: ({ children }) => <div>{children}</div>,
  CardDescription: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardTitle: ({ children }) => <div>{children}</div>,
}));
jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }) => <div>{children}</div>,
}));
jest.mock("react-router-dom", () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

describe('LandingPage() LandingPage method', () => {
  let setStateMock;

  beforeEach(() => {
    setStateMock = jest.fn();
    useState.mockImplementation(init => [init, setStateMock]);
    useEffect.mockImplementation(f => f());
    axios.get.mockResolvedValue({ data: { fullName: 'John Doe' } });
  });

  describe('Happy Paths', () => {
    test('should render the landing page with default state', () => {
      // Render the component
      render(<LandingPage />);

      // Check if the main elements are present
      expect(screen.getByText('IntelliConsult')).toBeInTheDocument();
      expect(screen.getByText('AI-Powered Healthcare Platform')).toBeInTheDocument();
      expect(screen.getByText('Smart Healthcare for Everyone')).toBeInTheDocument();
    });

    test('should display user name when logged in', async () => {
      // Simulate logged-in state
      useState.mockImplementationOnce(() => [{ fullName: 'John Doe' }, setStateMock]);
      useState.mockImplementationOnce(() => [true, setStateMock]);
      useState.mockImplementationOnce(() => ['patient', setStateMock]);

      // Render the component
      render(<LandingPage />);

      // Check if the user name is displayed
      expect(screen.getByText('Welcome, John')).toBeInTheDocument();
    });

    test('should navigate to dashboard when user is logged in', () => {
      // Simulate logged-in state
      useState.mockImplementationOnce(() => [{ fullName: 'John Doe' }, setStateMock]);
      useState.mockImplementationOnce(() => [true, setStateMock]);
      useState.mockImplementationOnce(() => ['doctor', setStateMock]);

      // Render the component
      render(<LandingPage />);

      // Check if the dashboard link is present
      expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('should handle invalid token gracefully', async () => {
      // Simulate invalid token
      axios.get.mockRejectedValueOnce(new Error('Invalid token'));

      // Render the component
      render(<LandingPage />);

      // Check if the login link is present
      expect(screen.getByText('Login')).toBeInTheDocument();
    });

    test('should handle missing user type in token', async () => {
      // Simulate missing user type
      useState.mockImplementationOnce(() => [{ fullName: 'John Doe' }, setStateMock]);
      useState.mockImplementationOnce(() => [true, setStateMock]);
      useState.mockImplementationOnce(() => [null, setStateMock]);

      // Render the component
      render(<LandingPage />);

      // Check if the default dashboard link is present
      expect(screen.getByText('My Dashboard')).toBeInTheDocument();
    });

    test('should handle logout correctly', () => {
      // Simulate logged-in state
      useState.mockImplementationOnce(() => [{ fullName: 'John Doe' }, setStateMock]);
      useState.mockImplementationOnce(() => [true, setStateMock]);
      useState.mockImplementationOnce(() => ['patient', setStateMock]);

      // Render the component
      render(<LandingPage />);

      // Simulate logout
      fireEvent.click(screen.getByText('Logout'));

      // Check if the login link is present after logout
      expect(screen.getByText('Login')).toBeInTheDocument();
    });
  });
});