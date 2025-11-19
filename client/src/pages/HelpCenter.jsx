import React, { useState } from 'react';
import Chatbot from '../components/Chatbot'; // Our inline chatbot
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HelpCenterPage() {
  // Only state needed now is for the chatbot visibility
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-emerald-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Back Link */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-cyan-700 hover:text-cyan-900 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Link>
        </div>

        {/* Header Text */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">Help Center</h1>
          <p className="text-xl text-gray-700 mt-4 max-w-2xl mx-auto">
            Have questions? Use our automated assistant below to get instant support.
          </p>
        </div>

        {/* Single Column Layout: Centered Chatbot Card */}
        <div className="flex justify-center">
          <Card className="shadow-lg w-full max-w-3xl">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <MessageCircle className="w-8 h-8 text-cyan-600" />
                <div>
                  <CardTitle className="text-2xl">Quick Help</CardTitle>
                  <CardDescription>Get instant answers from our automated assistant.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="min-h-[300px] flex flex-col justify-center">
              {!isChatOpen ? (
                // If chat is NOT open, show the button centered
                <div className="text-center py-10">
                  <p className="text-gray-500 mb-6">
                    Click the button below to start a conversation with our AI support agent.
                  </p>
                  <Button size="lg" onClick={() => setIsChatOpen(true)} className="inline-flex items-center bg-cyan-600 hover:bg-cyan-700">
                    <MessageCircle className="w-5 h-5 mr-2" /> Start Chat
                  </Button>
                </div>
              ) : (
                // If chat IS open, render the chatbot component full width
                <div className="w-full">
                  <Chatbot />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}