import React, { useState } from "react";
import { Stethoscope, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select"; // Added necessary Select components
import { Textarea } from "@/components/ui/textarea";

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    userType: "",
    password: "",
    confirmPassword: "",
    // Doctor-specific fields
    specialization: "",
    experience: "",
    licenseNumber: "",
    bio: "",
  });

  const userTypeOptions = [
    { value: 'patient', label: 'Patient' },
    { value: 'doctor', label: 'Doctor' },
    { value: 'admin', label: 'Admin' },
  ];

  const primaryColor = '#0F5257';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    
    if (!formData.userType) {
        alert("Please select a user role.");
        return;
    }

    try {
      const response = await axios.post('http://localhost:5001/api/auth/signup', formData);
      alert(response.data.message);
      
      window.location.href = '/login';
    } catch (error) {
     
      const message = error.response?.data?.message || "An error occurred during signup.";
      alert(message);
    }
  };

  const handleInputChange = (e) => {
    setFormData({...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSelectChange = (value) => {
    setFormData({ ...formData, userType: value });
  };

  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4 text-gray-800">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center space-x-2 mb-8">
          <img src="Logo.svg" className="h-30 w-15" style={{ color: primaryColor }} />
          <span className="text-3xl font-bold text-gray-900">IntelliConsult</span>
        </div>

        <Card className="bg-white border-gray-200 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">Create an Account</CardTitle>
            <CardDescription className="text-gray-600">Get started with IntelliConsult today</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-gray-700">Full Name</Label>
                <Input id="fullName" name="fullName" type="text" placeholder="e.g., Jane Doe" value={formData.fullName} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">Email</Label>
                <Input id="email" name="email" type="email" placeholder="name@example.com" value={formData.email} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userType" className="text-gray-700">I am a</Label>

                <Select
                            placeholder="Select your role"
                            options={userTypeOptions}
                            value={formData.userType}
                            onChange={handleSelectChange}
                          />
              </div>

              {formData.userType === 'doctor' && (
                <>
                  <div className="space-y-2"><Label htmlFor="specialization">Specialization</Label><Input id="specialization" name="specialization" type="text" placeholder="e.g., Cardiology" value={formData.specialization} onChange={handleInputChange} required /></div>
                  <div className="space-y-2"><Label htmlFor="experience">Years of Experience</Label><Input id="experience" name="experience" type="number" placeholder="e.g., 10" value={formData.experience} onChange={handleInputChange} required /></div>
                  <div className="space-y-2"><Label htmlFor="licenseNumber">Medical License Number</Label><Input id="licenseNumber" name="licenseNumber" type="text" placeholder="Your license number" value={formData.licenseNumber} onChange={handleInputChange} required /></div>
                  <div className="space-y-2"><Label htmlFor="bio">Brief Bio</Label><Textarea id="bio" name="bio" placeholder="Tell patients a little about yourself..." value={formData.bio} onChange={handleInputChange} /></div>
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={formData.password} onChange={handleInputChange} required />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm your password" value={formData.confirmPassword} onChange={handleInputChange} required />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}</Button>
                </div>
              </div>
              
              <Button type="submit" className="w-full bg-teal-600 text-white hover:bg-teal-700" size="lg">Create Account</Button>
            </form>
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">Already have an account?{" "}<Link to="/login" className="text-teal-700 hover:text-teal-800 font-medium">Sign in</Link></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}