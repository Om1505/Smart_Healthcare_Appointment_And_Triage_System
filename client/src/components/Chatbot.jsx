import React, { useRef, useEffect, useState } from 'react';

// --- Chat Decision Tree (Deep Version) ---
// (This is the same 5-level tree from our previous step)
const chatTree = {
  // --- START (Level 1) ---
  'START': {
    text: "Welcome to IntelliConsult! To help me assist you, please let me know who you are:",
    options: [
      { text: "I am a Patient", nextNode: 'PATIENT_START' },
      { text: "I am a Doctor", nextNode: 'DOCTOR_START' },
      { text: "I'm a New User", nextNode: 'NEW_USER_START' },
    ]
  },
  
  // --- PATIENT FLOW (Level 2) ---
  'PATIENT_START': {
    text: "Great! As a patient, what can I help you with today?",
    options: [
      { text: "My Appointments", nextNode: 'PATIENT_APPT_MENU' },
      { text: "Find a Doctor", nextNode: 'PATIENT_DOCTOR_MENU' },
      { text: "My Account & Profile", nextNode: 'PATIENT_ACCT_MENU' },
    ],
    isEnd: false,
  },
  
  // --- PATIENT_APPT (Level 3) ---
  'PATIENT_APPT_MENU': {
    text: "How can I help with your appointments?",
    options: [
      { text: "How do I book?", nextNode: 'PATIENT_APPT_HOW_TO' },
      { text: "How do video calls work?", nextNode: 'PATIENT_APPT_VIDEO' },
      { text: "Where can I see my treatment info?", nextNode: 'PATIENT_APPT_TREATMENT' },
      // { text: "Back", nextNode: 'PATIENT_START' } // No longer needed, handled by Back button
    ],
    isEnd: false,
  },
  'PATIENT_DOCTOR_MENU': {
    text: "You can find all our verified doctors on your dashboard. What information do you need?",
    options: [
      { text: "How do I search for a doctor?", nextNode: 'PATIENT_DOCTOR_SEARCH' },
      { text: "Are the doctors verified?", nextNode: 'PATIENT_DOCTOR_VERIFY' },
      // { text: "Back", nextNode: 'PATIENT_START' }
    ],
  },
  'PATIENT_ACCT_MENU': {
    text: "You can manage your account from your patient dashboard. What do you need help with?",
    options: [
      { text: "How do I complete my profile?", nextNode: 'PATIENT_ACCT_PROFILE' },
      { text: "I forgot my password.", nextNode: 'PATIENT_ACCT_PASSWORD' },
      // { text: "Back", nextNode: 'PATIENT_START' }
    ],
  },
  
  // --- PATIENT (Level 4) ---
  'PATIENT_APPT_HOW_TO': {
    text: "To book, go to the 'Find Doctors' page from your dashboard. You can filter by specialty, then select a doctor and choose an available time slot.",
    options: [
      { text: "How do video calls work?", nextNode: 'PATIENT_APPT_VIDEO' },
      // { text: "Back to Appointments", nextNode: 'PATIENT_APPT_MENU' }
    ]
  },
  'PATIENT_APPT_VIDEO': {
    text: "After booking a video consultation, you will receive a secure link in your dashboard. Simply join the link at your scheduled time.",
    options: [
      { text: "How do I book?", nextNode: 'PATIENT_APPT_HOW_TO' },
      // { text: "Back to Appointments", nextNode: 'PATIENT_APPT_MENU' }
    ]
  },
  'PATIENT_APPT_TREATMENT': {
    text: "Information regarding your treatment, including prescriptions and test results, can be viewed on your personal dashboard under 'My Appointments' or 'My Records'.",
    options: [
      // { text: "Back to Appointments", nextNode: 'PATIENT_APPT_MENU' },
      { text: "Back to start", nextNode: 'START' }
    ]
  },
  'PATIENT_DOCTOR_SEARCH': {
    text: "On the 'Find Doctors' page, you can use the search bar or filters to find doctors by name, or specialty (e.g., 'Cardiology').",
    options: [
        { text: "Are the doctors verified?", nextNode: 'PATIENT_DOCTOR_VERIFY' },
        // { text: "Back", nextNode: 'PATIENT_DOCTOR_MENU' }
    ]
  },
  'PATIENT_DOCTOR_VERIFY': {
    text: "Yes, all doctors on our platform go through a strict verification process by our admin team, who check their medical license and credentials.",
    options: [
      { text: "How do I search for a doctor?", nextNode: 'PATIENT_DOCTOR_SEARCH' },
      // { text: "Back", nextNode: 'PATIENT_DOCTOR_MENU' }
    ]
  },
  'PATIENT_ACCT_PROFILE': {
    text: "After you sign up, you should go to your dashboard and 'Complete Profile' with your details. This helps doctors understand your needs better.",
    options: [
        { text: "I forgot my password", nextNode: 'PATIENT_ACCT_PASSWORD' },
        // { text: "Back to Account", nextNode: 'PATIENT_ACCT_MENU' }
    ]
  },
  'PATIENT_ACCT_PASSWORD': {
    text: "No problem. On the 'Login' page, click the 'Forgot Password' link. We will send reset instructions to your registered email address.",
    options: [
        { text: "How do I complete my profile?", nextNode: 'PATIENT_ACCT_PROFILE' },
        // { text: "Back to Account", nextNode: 'PATIENT_ACCT_MENU' }
    ]
  },

  // --- DOCTOR FLOW (Level 2) ---
  'DOCTOR_START': {
    text: "Thank you, Doctor. How can I assist with your practice?",
    options: [
      { text: "My Schedule & Appointments", nextNode: 'DOC_SCHEDULE_MENU' },
      { text: "My Profile & Verification", nextNode: 'DOC_PROFILE_MENU' },
      { text: "My Earnings", nextNode: 'DOC_EARNINGS_MENU' },
    ],
    isEnd: false,
  },

  // --- DOCTOR (Level 3) ---
  'DOC_SCHEDULE_MENU': {
    text: "You can manage your schedule from your dashboard. What do you need to do?",
    options: [
      { text: "How do I set my schedule?", nextNode: 'DOC_SCHEDULE_SET' },
      { text: "How do I manage appointments?", nextNode: 'DOC_SCHEDULE_MANAGE' },
      // { text: "Back", nextNode: 'DOCTOR_START' }
    ],
  },
  'DOC_PROFILE_MENU': {
    text: "Your professional profile is important. What do you need help with?",
    options: [
      { text: "How do I get verified?", nextNode: 'DOC_PROFILE_VERIFY' },
      { text: "How do I update my profile?", nextNode: 'DOC_PROFILE_UPDATE' },
      // { text: "Back", nextNode: 'DOCTOR_START' }
    ],
  },
  'DOC_EARNINGS_MENU': {
    text: "You can track your consultation fees from your dashboard. What info do you need?",
    options: [
      { text: "Where do I see my earnings?", nextNode: 'DOC_EARNINGS_VIEW' },
      { text: "How do payouts work?", nextNode: 'DOC_EARNINGS_PAYOUT' },
      // { text: "Back", nextNode: 'DOCTOR_START' }
    ],
  },

  // --- DOCTOR (Level 4) ---
  'DOC_SCHEDULE_SET': {
    text: "Go to the 'Schedule Page' in your dashboard. You can open time slots for specific days and mark yourself as available for video or in-clinic visits.",
    options: [
      { text: "How do I manage appointments?", nextNode: 'DOC_SCHEDULE_MANAGE' },
      // { text: "Back to Schedule", nextNode: 'DOC_SCHEDULE_MENU' }
    ]
  },
  'DOC_SCHEDULE_MANAGE': {
    text: "All your booked appointments appear on your 'Doctor Dashboard'. You can confirm, cancel, or reschedule them from there.",
    options: [
      { text: "How do I set my schedule?", nextNode: 'DOC_SCHEDULE_SET' },
      // { text: "Back to Schedule", nextNode: 'DOC_SCHEDULE_MENU' }
    ]
  },
  'DOC_PROFILE_VERIFY': {
    text: "After signing up, please complete your profile and submit your medical license number. Our admin team will review it for verification.",
    options: [
      { text: "How long does verification take?", nextNode: 'DOC_PROFILE_VERIFY_TIME' }, // <-- Level 5
      // { text: "Back to Profile", nextNode: 'DOC_PROFILE_MENU' }
    ]
  },
  'DOC_PROFILE_UPDATE': {
    text: "Visit your 'Doctor Profile Page' from the dashboard. You can update your bio, specialization, experience, and consultation fee.",
    options: [
      { text: "How do I get verified?", nextNode: 'DOC_PROFILE_VERIFY' },
      // { text: "Back to Profile", nextNode: 'DOC_PROFILE_MENU' }
    ]
  },
  'DOC_EARNINGS_VIEW': {
    text: "There is an 'Earning Page' in your dashboard. It shows a detailed breakdown of all your completed consultations and total earnings.",
    options: [
      { text: "How do payouts work?", nextNode: 'DOC_EARNINGS_PAYOUT' },
      // { text: "Back to Earnings", nextNode: 'DOC_EARNINGS_MENU' }
    ]
  },
  'DOC_EARNINGS_PAYOUT': {
    text: "Payouts are processed automatically at the end of each month to the bank account you provide in your profile. (This is an example answer)",
    options: [
      { text: "Where do I see my earnings?", nextNode: 'DOC_EARNINGS_VIEW' },
      // { text: "Back to Earnings", nextNode: 'DOC_EARNINGS_MENU' }
    ]
  },

  // --- DOCTOR (Level 5) ---
  'DOC_PROFILE_VERIFY_TIME': {
    text: "Verification is manually done by our admins and typically takes 1-2 business days. You will receive an email as soon as your profile is verified.",
    options: [
      // { text: "Back to Profile", nextNode: 'DOC_PROFILE_MENU' },
      { text: "Back to start", nextNode: 'START' }
    ],
    isEnd: true // This is an end-point
  },

  // --- NEW USER FLOW (Level 2) ---
  'NEW_USER_START': {
    text: "Welcome! We're glad you're here. What would you like to know?",
    options: [
      { text: "What is IntelliConsult?", nextNode: 'NEW_WHAT_IS' },
      { text: "Platform Features", nextNode: 'NEW_FEATURES_MENU' },
      { text: "Security & Privacy", nextNode: 'NEW_SECURITY_MENU' },
    ],
    isEnd: false,
  },

  // --- NEW USER (Level 3) ---
  'NEW_WHAT_IS': {
    text: "IntelliConsult is a smart healthcare platform connecting patients with top doctors for seamless online and in-clinic appointments.",
    options: [
        { text: "What are the features?", nextNode: 'NEW_FEATURES_MENU' },
        { text: "Is it secure?", nextNode: 'NEW_SECURITY_MENU' },
        // { text: "Back", nextNode: 'NEW_USER_START' }
    ]
  },
  'NEW_FEATURES_MENU': {
    text: "Our platform is built with modern, intelligent features. Which one would you like to know about?",
    options: [
        { text: "AI-Powered Triage", nextNode: 'NEW_FEATURE_AI' },
        { text: "Smart Scheduling", nextNode: 'NEW_FEATURE_SCHEDULE' },
        { text: "Video Consultations", nextNode: 'NEW_FEATURE_VIDEO' },
        // { text: "Back", nextNode: 'NEW_USER_START' }
    ]
  },
  'NEW_SECURITY_MENU': {
    text: "Your data privacy is our top priority. What are your concerns?",
    options: [
        { text: "How is my data protected?", nextNode: 'NEW_SECURITY_DATA' },
        { text: "Is it HIPAA compliant?", nextNode: 'NEW_SECURITY_HIPAA' },
        // { text: "Back", nextNode: 'NEW_USER_START' }
    ]
  },

  // --- NEW USER (Level 4) ---
  'NEW_FEATURE_AI': {
    text: "Our AI Triage system can help patients assess their symptoms to recommend the right specialist, saving time and worry.",
    options: [
      { text: "Is this AI a diagnosis?", nextNode: 'NEW_FEATURE_AI_DIAGNOSIS' }, // <-- Level 5
      // { text: "Back to Features", nextNode: 'NEW_FEATURES_MENU' }
    ]
  },
  'NEW_FEATURE_SCHEDULE': {
    text: "Our 'Smart Scheduling' system shows doctors' real-time availability, so you can book, reschedule, or cancel 24/7 without a phone call.",
    options: [
      { text: "What about AI Triage?", nextNode: 'NEW_FEATURE_AI' },
      // { text: "Back to Features", nextNode: 'NEW_FEATURES_MENU' }
    ]
  },
  'NEW_FEATURE_VIDEO': {
    text: "We offer secure, high-quality video consultations, so you can see a doctor from the comfort of your home.",
    options: [
      { text: "What about AI TTriage?", nextNode: 'NEW_FEATURE_AI' },
      // { text: "Back to Features", nextNode: 'NEW_FEATURES_MENU' }
    ]
  },
  'NEW_SECURITY_DATA': {
    text: "We use end-to-end encryption for all personal data, and our database is protected with industry-leading security standards.",
    options: [
      { text: "Is it HIPAA compliant?", nextNode: 'NEW_SECURITY_HIPAA' },
      // { text: "Back to Security", nextNode: 'NEW_SECURITY_MENU' }
    ]
  },
  'NEW_SECURITY_HIPAA': {
    text: "Yes, our platform is built to be HIPAA-compliant, following strict guidelines on how patient medical information is stored and handled.",
    options: [
      { text: "How is my data protected?", nextNode: 'NEW_SECURITY_DATA' },
      // { text: "Back to Security", nextNode: 'NEW_SECURITY_MENU' }
    ]
  },

  // --- NEW USER (Level 5) ---
  'NEW_FEATURE_AI_DIAGNOSIS': {
    text: "No. The AI Triage is an informational tool, not a diagnosis. Only a qualified doctor can provide a medical diagnosis, which you can get *after* the AI guides you to the right one.",
    options: [
      // { text: "Back to Features", nextNode: 'NEW_FEATURES_MENU' },
      { text: "Back to start", nextNode: 'START' }
    ],
    isEnd: true // This is an end-point
  },

};

// This is the INLINE component, not a pop-up.
// The React logic below is updated for Back button functionality.
export default function Chatbot() {
  // --- NEW: History stack to track nodes ---
  const [history, setHistory] = useState(['START']);
  
  // Get current node from history
  const currentNode = history[history.length - 1];
  
  const [messages, setMessages] = useState([
    {
      id: 'init1',
      text: chatTree['START'].text,
      sender: 'bot'
    }
  ]);
  
  const chatEndRef = useRef(null);

  // Function to handle user's option click
  const handleOptionClick = (optionText, nextNode) => {
    const userMessage = { id: Date.now(), text: optionText, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);

    const nextNodeData = chatTree[nextNode];
    if (nextNodeData) {
      const botMessage = { id: Date.now() + 1, text: nextNodeData.text, sender: 'bot' };
      setTimeout(() => {
        setMessages(prev => [...prev, botMessage]);
        // --- NEW: Push new node to history ---
        setHistory(prev => [...prev, nextNode]);
      }, 500);

    } else {
      // (Error handling remains the same)
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          text: "Sorry, I don't have more information on that path.",
          sender: 'bot'
        }]);
        // Don't reset history here, let them click "Start Over"
      }, 500);
    }
  };

  // --- NEW: Function to handle Back button click ---
  const handleBackClick = () => {
    if (history.length <= 1) return; // Can't go back from START

    // Remove the last two messages (user's choice + bot's response)
    setMessages(prev => prev.slice(0, -2));
    
    // Pop the current node from history to go to the previous one
    setHistory(prev => prev.slice(0, -1));
  };
  
  // --- NEW: Function to handle Start Over ---
  const handleStartOver = () => {
    setHistory(['START']); // Reset history
    setMessages([{ id: 'init1', text: chatTree['START'].text, sender: 'bot' }]);
  };

  // Auto-scroll to the bottom of the chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const currentOptions = chatTree[currentNode]?.options || [];
  const isConversationEnd = chatTree[currentNode]?.isEnd || currentOptions.length === 0;

  // Render the chat window directly.
  return (
    <div className="bg-white w-full h-[500px] shadow-md rounded-lg flex flex-col border mt-4">
      {/* Header */}
      <div className="bg-cyan-600 text-white p-3 flex justify-between items-center rounded-t-lg">
        <h3 className="font-semibold text-lg">IntelliConsult Bot</h3>
      </div>

      {/* Message List */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto bg-gray-50">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`p-2 rounded-lg max-w-[80%] break-words ${
                msg.sender === 'user' 
                  ? 'bg-cyan-500 text-white' 
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Options Area */}
      <div className="p-3 border-t bg-white space-y-2 rounded-b-lg">
        {!isConversationEnd ? (
          // If conversation is not over, show the next set of options
          currentOptions.map(option => (
            <button
              key={option.nextNode}
              onClick={() => handleOptionClick(option.text, option.nextNode)}
              className="w-full text-left p-2 border rounded-lg text-cyan-700 border-cyan-300 hover:bg-cyan-50 transition-colors"
            >
              {option.text}
            </button>
          ))
        ) : (
          // If conversation is over, show a "Start Over" button
          <button
            onClick={handleStartOver}
            className="w-full text-left p-2 border rounded-lg text-cyan-700 border-cyan-300 hover:bg-cyan-50 transition-colors"
          >
            Start Over
          </button>
        )}
        
        {/* --- NEW: Back Button --- */}
        {history.length > 1 && !isConversationEnd && (
          <button
            onClick={handleBackClick}
            className="w-full text-left p-2 border rounded-lg text-gray-600 border-gray-300 hover:bg-gray-100 transition-colors"
          >
            &larr; Back
          </button>
        )}
      </div>
    </div>
  );
}