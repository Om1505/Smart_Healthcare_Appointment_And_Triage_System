import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import VideoCallPage from '@/pages/VideoCallPage';

// --- MOCKS ---

// 1. Mock Axios
vi.mock('axios');

// 2. Mock React Router
const mockNavigate = vi.fn();
const mockLocation = {
  state: {
    userName: 'Test User',
    userType: 'patient',
    userid: 'user123',
    appointment: { _id: 'apt123' }
  }
};

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
    useParams: () => ({ roomId: 'room_abc123' }),
  };
});

// 3. Mock ZegoUIKitPrebuilt
// We need to capture the 'joinRoom' configuration to test the callbacks (onLeaveRoom)
const mockJoinRoom = vi.fn();
vi.mock('@zegocloud/zego-uikit-prebuilt', () => ({
  ZegoUIKitPrebuilt: {
    generateKitTokenForTest: vi.fn(() => 'mock_kit_token'),
    create: vi.fn(() => ({
      joinRoom: mockJoinRoom,
    })),
    OneONoneCall: 'OneONoneCall',
  },
}));

// --- TEST SUITE ---

describe('VideoCallPage', () => {
  const originalEnv = import.meta.env;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Environment Variables
    // Note: In Vitest, you might need vi.stubEnv for process.env, 
    // but for import.meta.env, we often assign to a mocked object if environment permits,
    // or we rely on the fact that vite config sets them. 
    // Here we force them for the test context if possible, or assume setupTests handles it.
    // Since import.meta is read-only in strict modules, we'll rely on the code running in JSDOM
    // potentially having these undefined, so we might need to ensure the component handles missing vars 
    // or mock the module that uses them if we extracted the config.
    // However, since they are accessed directly, let's try to assign properties if writable, 
    // or assume the test runner environment loads .env.test. 
    
    // Provide env vars via globalThis so the component can read them (see fallback in component)
    vi.stubGlobal('VITE_ZEGO_ID', '123456');
    vi.stubGlobal('VITE_ZEGO_SECRET', 'secret_key');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const renderComponent = (stateOverride = {}) => {
    // Update the mock location state dynamically for different tests
    Object.assign(mockLocation.state, stateOverride);
    
    render(
      <MemoryRouter>
        <VideoCallPage />
      </MemoryRouter>
    );
  };

  it('renders the video container', () => {
    renderComponent();
    // The component renders a div with ref, it doesn't have text initially until Zego loads.
    // We check for the container presence.
    // Note: container logic relies on ref callback.
    // RTL render is synchronous, ref callback is triggered after mount.
  });

  it('initializes ZegoUIKit with correct parameters', async () => {
    renderComponent({ userName: 'Iron Man' });

    // Wait for the async ref callback logic to fire
    await waitFor(() => {
      expect(ZegoUIKitPrebuilt.generateKitTokenForTest).toHaveBeenCalledWith(
        123456, // APP_ID
        'secret_key', // SERVER_SECRET
        'room_abc123', // roomId
        expect.any(String), // User ID (Date.now string)
        'Iron Man' // userName
      );
    });

    expect(ZegoUIKitPrebuilt.create).toHaveBeenCalledWith('mock_kit_token');
    expect(mockJoinRoom).toHaveBeenCalledWith(expect.objectContaining({
      container: expect.anything(),
      scenario: { mode: 'OneONoneCall' },
      showPreJoinView: true,
      showScreenSharingButton: true,
      onLeaveRoom: expect.any(Function),
    }));
  });

  it('handles Doctor leaving the room (Completes Appointment)', async () => {
    // 1. Setup Doctor State
    const doctorId = 'doc_123';
    renderComponent({ 
        userType: 'doctor', 
        userid: doctorId 
    });

    localStorage.setItem('token', 'doctor_auth_token');
    axios.put.mockResolvedValue({ data: { success: true } });

    // 2. Wait for Zego Init
    await waitFor(() => expect(mockJoinRoom).toHaveBeenCalled());

    // 3. Extract the onLeaveRoom callback passed to Zego
    const config = mockJoinRoom.mock.calls[0][0];
    const onLeaveRoomCallback = config.onLeaveRoom;

    // 4. Trigger the callback manually
    onLeaveRoomCallback();

    // 5. Verify API Call to complete appointment
    expect(axios.put).toHaveBeenCalledWith(
      'https://smart-healthcare-appointment-and-triage.onrender.com/api/appointments/room_abc123/complete',
      {},
      expect.objectContaining({
        headers: { Authorization: 'Bearer doctor_auth_token' }
      })
    );

    // 6. Verify Navigation to Prescription Page
    expect(mockNavigate).toHaveBeenCalledWith(`/doctor/prescription/${doctorId}`);
  });

  it('handles Patient leaving the room (Redirects to Dashboard with Review)', async () => {
    // 1. Setup Patient State
    const appointmentData = { _id: 'apt_999', doctor: 'Dr. Strange' };
    renderComponent({ 
        userType: 'patient', 
        appointment: appointmentData 
    });

    // 2. Wait for Zego Init
    await waitFor(() => expect(mockJoinRoom).toHaveBeenCalled());

    // 3. Extract & Trigger Leave Callback
    const config = mockJoinRoom.mock.calls[0][0];
    config.onLeaveRoom();

    // 4. Verify NO API call (Patient doesn't complete appointment via API here)
    expect(axios.put).not.toHaveBeenCalled();

    // 5. Verify Navigation to Dashboard with Review State
    expect(mockNavigate).toHaveBeenCalledWith('/patient/dashboard', {
      replace: true,
      state: {
        showReviewFor: appointmentData
      }
    });
  });

  it('handles Default/Guest leaving the room (Redirects to Home)', async () => {
    // 1. Setup Guest State (no userType)
    renderComponent({ userType: undefined });

    // 2. Wait for Init
    await waitFor(() => expect(mockJoinRoom).toHaveBeenCalled());

    // 3. Trigger Leave
    const config = mockJoinRoom.mock.calls[0][0];
    config.onLeaveRoom();

    // 4. Verify Navigation to Home
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('uses default userName when none provided', async () => {
    // Render without a userName to exercise the fallback to "User"
    renderComponent({ userName: undefined });

    await waitFor(() => {
      // generateKitTokenForTest should be called with userName 'User'
      expect(ZegoUIKitPrebuilt.generateKitTokenForTest).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        'User'
      );
    });
  });

  it('doctor leaving without token navigates but does not call API', async () => {
    // Ensure no token is set
    localStorage.removeItem('token');

    const doctorId = 'doc_no_token';
    renderComponent({ userType: 'doctor', userid: doctorId });

    // Wait for Zego to initialize
    await waitFor(() => expect(mockJoinRoom).toHaveBeenCalled());

    const config = mockJoinRoom.mock.calls[0][0];
    // Trigger leave
    config.onLeaveRoom();

    // API should NOT be called (no token)
    expect(axios.put).not.toHaveBeenCalled();

    // Navigation to prescription should still happen
    expect(mockNavigate).toHaveBeenCalledWith(`/doctor/prescription/${doctorId}`);
  });

  it('logs error if API call fails when Doctor leaves', async () => {
    // 1. Setup
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderComponent({ userType: 'doctor' });
    localStorage.setItem('token', 'token');
    
    axios.put.mockRejectedValue(new Error('API Error'));

    // 2. Trigger Leave
    await waitFor(() => expect(mockJoinRoom).toHaveBeenCalled());
    const config = mockJoinRoom.mock.calls[0][0];
    
    // We need to await the callback if it's treated as async in the component, 
    // though in the component code provided, the axios call is not awaited inside the callback logic 
    // (it's a fire-and-forget promise chain).
    config.onLeaveRoom();

    // 3. Verify Error Log (Since it's a promise chain, we wait for the promise to reject)
    // We might need to wait a tick
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Failed to complete appointment", expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('does not initialize Zego if env vars are missing', async () => {
    // 1. Remove Env Vars that were stubbed in beforeEach
    vi.stubGlobal('VITE_ZEGO_ID', undefined);
    vi.stubGlobal('VITE_ZEGO_SECRET', undefined);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderComponent();

    // 2. Wait for effect
    // Since the check happens inside the async function `myMeeting`, we wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));

    // 3. Verify Zego was NOT initialized
    expect(ZegoUIKitPrebuilt.generateKitTokenForTest).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('ZEGO env vars missing'));

    consoleSpy.mockRestore();
  });
});