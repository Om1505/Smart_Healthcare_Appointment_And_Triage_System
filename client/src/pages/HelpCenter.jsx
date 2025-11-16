import React, { useState } from 'react';
import Chatbot from '../components/Chatbot'; // Our inline chatbot
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail, MessageCircle, Send, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HelpCenterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [formStatus, setFormStatus] = useState(null); // 'success' or 'error'
  
  // --- THIS STATE NOW CORRECTLY TOGGLES THE INLINE CHAT ---
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    // This is where you would call your backend API
    console.log("Form Submitted:", { name, email, subject, message });
    setFormStatus('success');
    setName('');
    setEmail('');
    setSubject('');
    setMessage('');
  };

  return (
    <div className="min-h-screen bg-emerald-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-cyan-700 hover:text-cyan-900 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Link>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">Help Center</h1>
          <p className="text-xl text-gray-700 mt-4 max-w-2xl mx-auto">
            Have questions? We're here to help. Choose an option below to get support.
          </p>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Column 1: Quick Help Chatbot */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <MessageCircle className="w-8 h-8 text-cyan-600" />
                <div>
                  <CardTitle className="text-2xl">Quick Help</CardTitle>
                  <CardDescription>Get instant answers from our automated assistant.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* --- THIS IS THE CORRECTED LOGIC --- */}
              {!isChatOpen ? (
                // If chat is NOT open, show the button
                <Button onClick={() => setIsChatOpen(true)} className="inline-flex items-center">
                  <MessageCircle className="w-4 h-4 mr-2" /> Open Chat
                </Button>
              ) : (
                // If chat IS open, render the chatbot component.
                // It will appear right here, inside the card.
                <Chatbot />
              )}
              {/* ------------------------------------ */}
            </CardContent>
          </Card>

          {/* Column 2: Manual Contact Form */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Mail className="w-8 h-8 text-cyan-600" />
                <div>
                  <CardTitle className="text-2xl">Contact Support</CardTitle>
                  <CardDescription>Send our team a message and we'll get back to you soon.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {formStatus === 'success' ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                  <CheckCircle className="w-16 h-16 text-green-500" />
                  <h3 className="text-xl font-semibold mt-4">Message Sent!</h3>
                  <p className="text-gray-600 mt-2">We'll get back to you as soon as possible.</p>
                  <Button onClick={() => setFormStatus(null)} className="mt-6">Ask Another Question</Button>
                </div>
              ) : (
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="name">Your Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email">Your Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Regarding my appointment..." required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="message">Your Message</Label>
                    <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Please describe your issue..." required rows={6} />
                  </div>
                  <Button type="submit" className="w-full">
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

// Dummy CheckCircle component if not imported
const CheckCircle = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
  </svg>
);