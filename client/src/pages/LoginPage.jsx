import React, { useState } from "react";
import { Stethoscope, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState("");
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false); // Added loading state
  const [error, setError] = useState(""); // Added error state
  const navigate = useNavigate(); // Use the useNavigate hook
  const primaryColor = '#0F5257';

  // This is the same as the signup page, just for login
  const handleGoogleLogin = () => {
    // Redirect browser to the backend Google auth route
    window.location.href = 'http://localhost:5001/api/auth/google';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true); 
    setError(""); 
    const loginData = { ...formData, userType };

    if (!loginData.userType) {
      setError("Please select a user role.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost:5001/api/auth/login', loginData);
      localStorage.setItem('token', response.data.token);

      if (response.data.profileComplete === false) {
        navigate('/complete-profile');
        return;
      }

      // Use navigate for redirection
      switch (loginData.userType) {
        case 'doctor':
          navigate('/doctor/dashboard');
          break;
        case 'patient':
          navigate('/patient/dashboard');
          break;
        case 'admin':
          navigate('/admin/dashboard');
          break;
        default:
          navigate('/');
      }
    } catch (error) {
      const message = error.response?.data?.message || "An error occurred during login.";
      setError(message); 
    } finally {
      setIsLoading(false); 
    }
  };

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4 text-gray-800">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center space-x-2 mb-8">
          <Stethoscope className="h-8 w-8" style={{ color: primaryColor }} />
          <span className="text-3xl font-bold text-gray-900">IntelliConsult</span>
        </div>
        <Card className="bg-white border-gray-200 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">Welcome Back</CardTitle>
            <CardDescription className="text-gray-600">Sign in to your account</CardDescription>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userType">I am a</Label>
                <Select value={userType} onValueChange={setUserType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient">Patient</SelectItem>
                    <SelectItem value="doctor">Doctor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="name@example.com" value={formData.email} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={formData.password} onChange={handleInputChange} required />
                   <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}</Button>
                </div>
              </div>
              <div className="flex items-center justify-end">
                <Link to="/forgot-password" className="text-sm text-teal-700 hover:text-teal-800">Forgot password?</Link>
              </div>
              <Button type="submit" className="w-full bg-teal-600 text-white hover:bg-teal-700" size="lg" disabled={isLoading}>
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-4 flex flex-col items-center">
              <div className="relative w-full flex justify-center text-sm my-2">
                  <span className="px-2 bg-white text-gray-500">Or sign in with</span>
              </div>
               <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleLogin} // Call the Google handler
                  disabled={isLoading}
                >
                  Sign in with Google
              </Button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">Don't have an account?{" "}<Link to="/signup" className="text-teal-700 hover:text-teal-800 font-medium">Sign up</Link></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}