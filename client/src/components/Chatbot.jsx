import React, { useRef, useEffect, useState } from 'react';
import { MessageCircle, User, RotateCcw, ChevronLeft, Bot, Sparkles, Home } from 'lucide-react';

// --- HELPER CONSTANTS FOR REUSABLE OPTIONS ---

const BACK_TO_PATIENT_MENU = { text: "⬅ Back to Patient Menu", nextNode: 'PATIENT_START' };
const BACK_TO_DOC_MENU = { text: "⬅ Back to Doctor Menu", nextNode: 'DOCTOR_START' };
const BACK_TO_START = { text: "⬅ Back to Start", nextNode: 'START' };

// --- INTELLICONSULT SPECIFIC CHAT TREE ---
const chatTree = {
  // ================= LEVEL 1: START =================
  'START': {
    text: "Welcome to IntelliConsult AI Support! I can help you navigate our Smart Healthcare & AI Triage system. Who are you?",
    options: [
      { text: "I am a Patient", nextNode: 'PATIENT_START' },
      { text: "I am a Doctor", nextNode: 'DOCTOR_START' },
      { text: "I'm a New Visitor", nextNode: 'NEW_USER_START' },
    ]
  },

  // ================= PATIENT FLOW =================
  'PATIENT_START': {
    text: "Hello! How can IntelliConsult assist you today?",
    options: [
      { text: "Book an Appointment", nextNode: 'PATIENT_BOOKING' },
      { text: "AI Triage & Symptoms", nextNode: 'PATIENT_TRIAGE_INFO' },
      { text: "My Dashboard & Records", nextNode: 'PATIENT_DASHBOARD' },
      { text: "Video Consultation Help", nextNode: 'PATIENT_VIDEO_HELP' },
    ],
  },

  // --- Intelligent Scheduling ---
  'PATIENT_BOOKING': {
    text: "Our Intelligent Scheduling system allows you to filter doctors by specialty, location, and availability.",
    options: [
      { text: "How do I search?", nextNode: 'PATIENT_BOOKING_SEARCH' },
      { text: "Can I reschedule?", nextNode: 'PATIENT_BOOKING_RESCHEDULE' },
      BACK_TO_PATIENT_MENU
    ]
  },
  'PATIENT_BOOKING_SEARCH': {
    text: "Go to 'Find Doctors' on your dashboard. You can view verified profiles and book instantly without phone calls.",
    options: [BACK_TO_PATIENT_MENU]
  },
  'PATIENT_BOOKING_RESCHEDULE': {
    text: "Yes. Visit 'My Appointments' to reschedule or cancel. Our system updates the doctor's availability in real-time.",
    options: [BACK_TO_PATIENT_MENU]
  },

  // --- AI Triage Feature ---
  'PATIENT_TRIAGE_INFO': {
    text: "IntelliConsult uses AI to assess your symptoms before you see a doctor. This helps prioritize urgent cases.",
    options: [
      { text: "What is the Pre-Consultation Prep?", nextNode: 'PATIENT_PREP' },
      { text: "How is Urgency calculated?", nextNode: 'PATIENT_URGENCY' },
      BACK_TO_PATIENT_MENU
    ]
  },
  'PATIENT_PREP': {
    text: "Before your visit, you can list symptoms and medical history. Our AI summarizes this so your doctor is better prepared.",
    options: [
      { text: "How is Urgency calculated?", nextNode: 'PATIENT_URGENCY' },
      BACK_TO_PATIENT_MENU
    ]
  },
  'PATIENT_URGENCY': {
    text: "Our AI analyzes your symptoms and risk factors to generate an 'Urgency Score' (1-5). High scores (4-5) alert doctors immediately.",
    options: [BACK_TO_PATIENT_MENU]
  },

  // --- Digital Dashboard ---
  'PATIENT_DASHBOARD': {
    text: "Your Digital Health Dashboard is the central hub for all your medical data.",
    options: [
      { text: "View Prescriptions", nextNode: 'PATIENT_RX' },
      { text: "Access Lab Reports", nextNode: 'PATIENT_REPORTS' },
      BACK_TO_PATIENT_MENU
    ]
  },
  'PATIENT_RX': {
    text: "Access our Seamless E-Prescription system. You can view medications, dosages, and track pharmacy details directly.",
    options: [BACK_TO_PATIENT_MENU]
  },
  'PATIENT_REPORTS': {
    text: "All consultation notes and uploaded lab reports are stored securely with end-to-end encryption.",
    options: [BACK_TO_PATIENT_MENU]
  },

  'PATIENT_VIDEO_HELP': {
    text: "We offer secure, HIPAA-compliant video calls with real-time transcription features.",
    options: [
      { text: "How do I join?", nextNode: 'PATIENT_VIDEO_JOIN' },
      BACK_TO_PATIENT_MENU
    ]
  },
  'PATIENT_VIDEO_JOIN': {
    text: "A secure link will appear in your appointment card 15 minutes before the scheduled time.",
    options: [BACK_TO_PATIENT_MENU]
  },

  // ================= DOCTOR FLOW =================
  'DOCTOR_START': {
    text: "Welcome, Doctor. How can we optimize your practice today?",
    options: [
      { text: "Triage & Patient Insights", nextNode: 'DOC_TRIAGE' },
      { text: "Manage Schedule", nextNode: 'DOC_SCHEDULE' },
      { text: "Profile Verification", nextNode: 'DOC_VERIFICATION' },
    ],
  },

  // --- AI Triage for Doctors ---
  'DOC_TRIAGE': {
    text: "Our AI Triage system summarizes patient symptoms and highlights risk factors before the consultation starts.",
    options: [
      { text: "Understanding Urgency Scores", nextNode: 'DOC_URGENCY_SCORES' },
      { text: "View Patient History", nextNode: 'DOC_HISTORY' },
      BACK_TO_DOC_MENU
    ]
  },
  'DOC_URGENCY_SCORES': {
    text: "Patients are rated 1-5. Scores of 4-5 indicate high urgency/risk factors, allowing you to prioritize critical cases.",
    options: [BACK_TO_DOC_MENU]
  },
  'DOC_HISTORY': {
    text: "The 'Pre-Consultation Prep' data is available in the patient card, showing summarized symptoms and AI-detected risk factors.",
    options: [BACK_TO_DOC_MENU]
  },

  'DOC_SCHEDULE': {
    text: "You can customize availability slots, block times, and view upcoming video/in-clinic appointments.",
    options: [BACK_TO_DOC_MENU]
  },
  'DOC_VERIFICATION': {
    text: "To maintain platform trust, please upload your medical license. Our admins verify this within 24-48 hours.",
    options: [BACK_TO_DOC_MENU]
  },

  // ================= NEW USER FLOW =================
  'NEW_USER_START': {
    text: "Welcome to IntelliConsult! We are a dual-sided platform for Patients and Doctors.",
    options: [
      { text: "What is AI Triage?", nextNode: 'NEW_AI_TRIAGE' },
      { text: "Is my data secure?", nextNode: 'NEW_SECURITY' },
      { text: "Platform Features", nextNode: 'NEW_FEATURES' },
    ],
  },
  'NEW_AI_TRIAGE': {
    text: "It's our core feature! It assesses symptoms to generate an urgency score, ensuring critical patients get attention faster.",
    options: [BACK_TO_START]
  },
  'NEW_SECURITY': {
    text: "Absolutely. We use End-to-End Encryption and are GDPR & HIPAA compliant to keep your health data safe.",
    options: [BACK_TO_START]
  },
  'NEW_FEATURES': {
    text: "We offer Intelligent Scheduling, Digital Prescriptions, Secure Video Calls, and Automated Clinical Notes.",
    options: [BACK_TO_START]
  },
};

// --- Helper Component: Typing Indicator ---
const ThinkingBubble = () => (
  <div className="flex items-center space-x-1 p-3 bg-gray-100 rounded-xl rounded-tl-none w-fit border border-gray-200">
    <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
    <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
    <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce"></div>
  </div>
);

export default function Chatbot() {
  const [history, setHistory] = useState(['START']);
  const [messages, setMessages] = useState([{
    id: 'init1',
    text: chatTree['START'].text,
    sender: 'bot'
  }]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const currentNode = history[history.length - 1];
  const currentOptions = chatTree[currentNode]?.options || [];

  // Handle Option Click
  const handleOptionClick = (optionText, nextNode) => {
    if (isTyping) return; 

    const userMessage = { id: Date.now(), text: optionText, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    const nextNodeData = chatTree[nextNode];
    
    // Simulated "AI Thinking" delay
    setTimeout(() => {
      if (nextNodeData) {
        const botMessage = { id: Date.now() + 1, text: nextNodeData.text, sender: 'bot' };
        setMessages(prev => [...prev, botMessage]);
        setHistory(prev => [...prev, nextNode]);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          text: "I'm updating my knowledge base. Please reset the chat.",
          sender: 'bot'
        }]);
      }
      setIsTyping(false);
    }, 800); 
  };

  // Handle Back Click
  const handleBackClick = () => {
    if (history.length <= 1 || isTyping) return;
    setMessages(prev => prev.slice(0, -2));
    setHistory(prev => prev.slice(0, -1));
  };

  // Handle Start Over
  const handleStartOver = () => {
    setIsTyping(false);
    setHistory(['START']);
    setMessages([{ id: 'init1', text: chatTree['START'].text, sender: 'bot' }]);
  };

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="bg-white w-full h-[600px] shadow-xl rounded-2xl flex flex-col border border-teal-100 overflow-hidden font-sans">
      {/* --- Header --- */}
      <div className="bg-gradient-to-r from-teal-700 to-emerald-600 text-white p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
            <Sparkles className="w-5 h-5 text-yellow-300" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">IntelliAssistant</h3>
            <p className="text-xs text-teal-100">AI-Powered Triage Support</p>
          </div>
        </div>
        <button 
          onClick={handleStartOver} 
          className="p-2 hover:bg-white/20 rounded-full transition-colors" 
          title="Restart Chat"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* --- Message Area --- */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-emerald-50/50 scrollbar-thin scrollbar-thumb-teal-200">
        {messages.map(msg => (
          <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm
                ${msg.sender === 'user' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'}`}>
                {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>

              {/* Bubble */}
              <div className={`p-3.5 text-sm rounded-2xl shadow-sm
                ${msg.sender === 'user' 
                  ? 'bg-teal-600 text-white rounded-tr-none' 
                  : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex w-full justify-start">
            <div className="flex max-w-[85%] gap-2">
              <div className="w-8 h-8 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                <Bot size={16} />
              </div>
              <ThinkingBubble />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* --- Controls Area --- */}
      <div className="p-4 bg-white border-t border-teal-100">
        <div className="flex flex-col gap-2">
          {/* Options Grid */}
          {!isTyping && (
             <div className="grid grid-cols-1 gap-2">
               {currentOptions.map((option, index) => (
                 <button
                   key={`${option.nextNode}-${index}`}
                   onClick={() => handleOptionClick(option.text, option.nextNode)}
                   className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-gray-700 
                            bg-white hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 
                            border border-gray-200 transition-all duration-200 flex items-center justify-between group shadow-sm"
                 >
                   {option.text}
                   <span className="text-gray-300 group-hover:text-teal-500 transition-colors">&rarr;</span>
                 </button>
               ))}
             </div>
          )}

          {/* Bottom Action Buttons Row */}
          {!isTyping && (
            <div className="flex gap-2 mt-2">
                {/* Back Button */}
                {history.length > 1 && (
                    <button
                    onClick={handleBackClick}
                    className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-gray-500 hover:text-teal-600 hover:bg-gray-50 transition-colors py-2 rounded-lg border border-transparent hover:border-gray-200"
                    >
                    <ChevronLeft size={14} />
                    Go Back
                    </button>
                )}
                
                {/* Main Menu Button */}
                {history.length > 1 && (
                    <button
                    onClick={handleStartOver}
                    className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 transition-colors py-2 rounded-lg border border-transparent hover:border-teal-100"
                    >
                    <Home size={14} />
                    Main Menu
                    </button>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}