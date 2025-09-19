import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

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
  );
}
