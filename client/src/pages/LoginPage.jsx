import React, { useState } from "react";
import { Stethoscope, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
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
  const primaryColor = '#0F5257';

  const userTypeOptions = [
    { value: 'patient', label: 'Patient' },
    { value: 'doctor', label: 'Doctor' },
    { value: 'admin', label: 'Admin' },
  ];
  const handleSubmit = async (e) => {
    e.preventDefault();
    const loginData = { ...formData, userType };

    if (!loginData.userType) {
      alert("Please select a user role.");
      return;
    }

    try {
      const response = await axios.post('http://localhost:5001/api/auth/login', loginData);
      localStorage.setItem('token', response.data.token);
      alert(response.data.message);

      switch (loginData.userType) {
        case 'doctor':
          alert("In the next update you will be succesfully redirected to Doctor Dashboard");
          window.location.href = '/doctor/dashboard';
          break;
        case 'patient':
          alert("In the next update you will be succesfully redirected to Patinet Dashboard");
          window.location.href = '/patient/dashboard';
          break;
        case 'admin':
          alert("In the next update you will be succesfully redirected to admin Dashboard");
          window.location.href = '/';
          break;
        default:
          window.location.href = '/';
      }
    } catch (error) {
      const message = error.response?.data?.message || "An error occurred during login.";
      alert(message);
    }
  };

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4 text-gray-800">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center space-x-2 mb-8">
          <img src="Logo.svg" className="h-30 w-15" style={{ color: primaryColor }} />
          <span className="text-3xl font-bold text-gray-900">IntelliConsult</span>
        </div>
        <Card className="bg-white border-gray-200 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">Welcome Back</CardTitle>
            <CardDescription className="text-gray-600">Sign in to your account</CardDescription>
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
              <Button type="submit" className="w-full bg-teal-600 text-white hover:bg-teal-700" size="lg">Sign In</Button>
            </form>
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">Don't have an account?{" "}<Link to="/signup" className="text-teal-700 hover:text-teal-800 font-medium">Sign up</Link></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

