import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, Clock, Users, Stethoscope, Brain, Video  } from "lucide-react";

const ManualButton = ({ children, variant = 'default', size = 'default', className = '', ...props }) => {
  const baseClasses =
    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-300 transform hover:scale-105";

  const sizeClasses = {
    default: 'h-9 px-4 py-2',
    lg: 'h-10 rounded-md px-6',
  }[size];

  const variantClasses = {
    default: 'bg-teal-600 text-white hover:bg-teal-700',
    outline: 'border border-teal-300 bg-transparent hover:bg-teal-50 text-teal-800',
    secondary: 'bg-white text-teal-800 hover:bg-gray-100',
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default function LandingPage() {
  const primaryColor = '#0F5257';

  return (
    <div className="min-h-screen bg-emerald-50 text-gray-800">

    <style>
        {`
        /* Existing animation */
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* New animation for hero title */
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* New simple fade-in animation */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        /* New slide-in from left animation */
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        /* New slide-in from right animation */
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        /* New bounce-in animation for CTA */
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        /* New pulse animation for navigation button */
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }


        .animate-fadeInUp { animation: fadeInUp 0.6s ease-out forwards; }
        .animate-fadeInDown { animation: fadeInDown 0.6s ease-out forwards; }
        .animate-fadeIn { animation: fadeIn 0.8s ease-out forwards; }
        .animate-slideInLeft { animation: slideInLeft 0.7s ease-out forwards; }
        .animate-slideInRight { animation: slideInRight 0.7s ease-out forwards; }
        .animate-bounceIn { animation: bounceIn 0.8s ease-out forwards; }
        .animate-pulse { animation: pulse 2s infinite ease-in-out; }
        `}
      </style>

    <nav className="border-b border-gray-100 bg-white/95 backdrop-blur sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <img src="Logo.svg" className="h-25 w-30" style={{ color: primaryColor }} alt="Logo" />
            <span className="text-3xl font-bold">IntelliConsult</span>
          </div>

          {/* Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">
              Features
            </a>
            <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors">
              About Us
            </a>
            <Link to="/login" className="text-gray-600 hover:text-gray-900 transition-colors">
              Login
            </Link>
            <Link to="/signup">
              <ManualButton className="animate-pulse">Get Started</ManualButton>
            </Link>
          </div>
        </div>
      </div>
    </nav>

    {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-emerald-50">
        <div className="container mx-auto text-center">
          <Badge
            className="mb-4 font-semibold bg-teal-100 text-teal-800 animate-fadeInDown" 
            style={{ animationDelay: '0.1s' }} >
            AI-Powered Healthcare Platform
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 animate-fadeInDown" style={{ animationDelay: '0.2s' }}>
            Smart Healthcare for Everyone
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-3xl mx-auto animate-fadeIn" style={{ animationDelay: '0.4s' }}>
            Experience the future of healthcare with IntelliConsult's Smart Care. AI-powered triage, seamless
            consultations, and intelligent scheduling.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-bounceIn" style={{ animationDelay: '0.6s' }}> 
            <Link to="/signup">
              <ManualButton size="lg" className="w-full sm:w-auto">
                Start Your Journey
                <ArrowRight className="ml-2 h-4 w-4" />
              </ManualButton>
            </Link>
            <a href="#features">
              <ManualButton variant="outline" size="lg" className="w-full sm:w-auto">
                Learn More
              </ManualButton>
            </a>
          </div>
        </div>
      </section>

          {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16 animate-fadeInUp">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose IntelliConsult?
            </h2>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
              Our platform revolutionizes healthcare delivery through intelligent automation and seamless user
              experiences.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="group border-gray-200 bg-emerald-50 hover:shadow-lg hover:-translate-y-2 transition-all duration-300 animate-fadeInUp" style={{ animationDelay: '0.1s' }}> 
              <CardHeader>
                <Brain className="h-12 w-12 mb-4 transition-transform duration-300 group-hover:scale-110" style={{ color: primaryColor }} />
                <CardTitle className="font-bold">AI-Powered Triage</CardTitle>
                <CardDescription className="text-gray-700">
                  Intelligent symptom assessment and priority scoring to ensure urgent cases get immediate attention.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="group border-gray-200 bg-emerald-50 hover:shadow-lg hover:-translate-y-2 transition-all duration-300 animate-fadeInUp" style={{ animationDelay: '0.2s' }}> 
              <CardHeader>
                <Video className="h-12 w-12 mb-4 transition-transform duration-300 group-hover:scale-110" style={{ color: primaryColor }} />
                <CardTitle className="font-bold">Secure Video Consultations</CardTitle>
                <CardDescription className="text-gray-700">
                  HIPAA-compliant video calls with real-time transcription and automated clinical note generation.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="group border-gray-200 bg-emerald-50 hover:shadow-lg hover:-translate-y-2 transition-all duration-300 animate-fadeInUp" style={{ animationDelay: '0.3s' }}> {/* Changed bg-green-50 to bg-emerald-50 */}
              <CardHeader>
                <Clock className="h-12 w-12 mb-4 transition-transform duration-300 group-hover:scale-110" style={{ color: primaryColor }} />
                <CardTitle className="font-bold">Smart Scheduling</CardTitle>
                <CardDescription className="text-gray-700">
                  Intelligent appointment management that optimizes doctor availability and patient preferences.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="group border-gray-200 bg-emerald-50 hover:shadow-lg hover:-translate-y-2 transition-all duration-300 animate-fadeInUp" style={{ animationDelay: '0.4s' }}> {/* Changed bg-green-50 to bg-emerald-50 */}
              <CardHeader>
                <Shield className="h-12 w-12 mb-4 transition-transform duration-300 group-hover:scale-110" style={{ color: primaryColor }} />
                <CardTitle className="font-bold">Privacy & Security</CardTitle>
                <CardDescription className="text-gray-700">
                  End-to-end encryption and GDPR compliance ensure your health data remains completely secure.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="group border-gray-200 bg-emerald-50 hover:shadow-lg hover:-translate-y-2 transition-all duration-300 animate-fadeInUp" style={{ animationDelay: '0.5s' }}> {/* Changed bg-green-50 to bg-emerald-50 */}
              <CardHeader>
                <Users className="h-12 w-12 mb-4 transition-transform duration-300 group-hover:scale-110" style={{ color: primaryColor }} />
                <CardTitle className="font-bold">For Patients & Doctors</CardTitle>
                <CardDescription className="text-gray-700">
                  Dual-sided platform designed to enhance experiences for both healthcare seekers and providers.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="group border-gray-200 bg-emerald-50 hover:shadow-lg hover:-translate-y-2 transition-all duration-300 animate-fadeInUp" style={{ animationDelay: '0.6s' }}> {/* Changed bg-green-50 to bg-emerald-50 */}
              <CardHeader>
                <Stethoscope className="h-12 w-12 mb-4 transition-transform duration-300 group-hover:scale-110" style={{ color: primaryColor }} />
                <CardTitle className="font-bold">Digital Prescriptions</CardTitle>
                <CardDescription className="text-gray-700">
                  Seamless e-prescription system with direct pharmacy integration and medication tracking.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>
  </div>
  );
}
