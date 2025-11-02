import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';


export default function VideoCallPage() {
  const { roomId } = useParams(); 
  const location = useLocation(); 
  const navigate = useNavigate();
  
  const userName = location.state?.userName || "User";
  
  const handleLeaveRoom = () => {
    navigate('/'); 
  };

  const myMeeting = async (element) => {
     if (!element) return;

    // For Vite use import.meta.env.VITE_*
    const APP_ID = Number(import.meta.env.VITE_ZEGO_ID);
    const SERVER_SECRET = import.meta.env.VITE_ZEGO_SECRET;

    if (!APP_ID || !SERVER_SECRET) {
      console.error('ZEGO env vars missing. In production generate token on server instead of exposing secret.');
      return;
    }
    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
      APP_ID,
      SERVER_SECRET,
      roomId,
      Date.now().toString(), 
      userName
    );

    const zp = ZegoUIKitPrebuilt.create(kitToken);

    zp.joinRoom({
      container: element, 
      scenario: {
        mode: ZegoUIKitPrebuilt.OneONoneCall, 
      },
      showPreJoinView: true,       
      showScreenSharingButton: true,
      onLeaveRoom: handleLeaveRoom, 
    });
  };

  return (
    <div 
      className="flex items-center justify-center h-screen w-screen"
      style={{ background: '#f0f2f5' }}
    >
      <div 
        ref={myMeeting} 
        className="w-full h-full"
      />
    </div>
  );
}