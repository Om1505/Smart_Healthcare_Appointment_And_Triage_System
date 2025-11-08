import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Save, Loader2, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function DoctorUpdateProfile() {
    const navigate = useNavigate();
    const [doctor, setDoctor] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        specialization: "",
        experience: "",
        licenseNumber: "",
        address: "",
        consultationFee: "",
        bio: "",
        phoneNumber: ""
    });

    const specializations = [
        "Cardiology", "Dermatology", "Endocrinology", "Gastroenterology", 
        "Neurology", "Oncology", "Orthopedics", "Pediatrics", "Psychiatry", 
        "Radiology", "General Practice", "Internal Medicine"
    ];

    useEffect(() => {
        const fetchDoctorProfile = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                const response = await axios.get('http://localhost:5001/api/users/profile', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data.userType !== 'doctor') {
                    setError('Access denied. Not a doctor account.');
                    return;
                }

                setDoctor(response.data);
                setFormData({
                    fullName: response.data.fullName || "",
                    email: response.data.email || "",
                    specialization: response.data.specialization || "",
                    experience: response.data.experience || "",
                    licenseNumber: response.data.licenseNumber || "",
                    address: response.data.address || "",
                    consultationFee: response.data.consultationFee || "",
                    bio: response.data.bio || "",
                    phoneNumber: response.data.phoneNumber || ""
                });
            } catch (err) {
                console.error("Error fetching doctor profile:", err);
                setError('Failed to fetch doctor profile. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchDoctorProfile();
    }, [navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSpecializationChange = (value) => {
        setFormData(prev => ({
            ...prev,
            specialization: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError('');
        setSuccessMessage('');

        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        try {
            const response = await axios.put('http://localhost:5001/api/users/update-profile', 
                formData, 
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            setDoctor(response.data);
            
            // Show alert message and then route to dashboard
            alert('Profile updated successfully!');
            navigate('/doctor/dashboard');

        } catch (err) {
            console.error("Error updating profile:", err);
            setError(err.response?.data?.message || 'Failed to update profile. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-12 h-12 animate-spin text-teal-600" />
            </div>
        );
    }

    if (error && !doctor) {
        return (
            <div className="flex items-center justify-center h-screen text-red-600">
                {error}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-emerald-50 text-gray-800">
            <nav className="border-b border-gray-200 bg-white/95 backdrop-blur sticky top-0 z-50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                            <img src="/Logo.svg" className="h-25 w-30" alt="Logo" />
                            <span className="text-3xl font-bold">IntelliConsult</span>
                        </Link>
                        <div className="flex items-center space-x-4">
                            <Link to="/doctor/dashboard">
                                <Button variant="outline" size="sm" className="border-gray-300">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Dashboard
                                </Button>
                            </Link>
                            <Button onClick={handleLogout} variant="outline" size="sm" className="border-gray-300">
                                <LogOut className="h-4 w-4 mr-2" />
                                Logout
                            </Button>
                            <Avatar>
                                <AvatarImage src="/female-doctor.jpg" alt={doctor?.fullName} />
                                <AvatarFallback className="bg-teal-100 text-teal-800">
                                    {doctor?.fullName ? doctor.fullName.split(" ").map((n) => n[0]).join("") : "Dr"}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Update Profile</h1>
                        <p className="text-gray-600">Update your professional information and consultation details.</p>
                    </div>

                    {successMessage && (
                        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                            {successMessage}
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-8">
                            {/* Personal Information */}
                            <Card className="bg-white">
                                <CardHeader>
                                    <CardTitle>Personal Information</CardTitle>
                                    <CardDescription>Update your basic personal details</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="fullName">Full Name*</Label>
                                            <Input
                                                id="fullName"
                                                name="fullName"
                                                value={formData.fullName}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email Address*</Label>
                                            <Input
                                                id="email"
                                                name="email"
                                                type="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="phoneNumber">Phone Number</Label>
                                            <Input
                                                id="phoneNumber"
                                                name="phoneNumber"
                                                type="tel"
                                                value={formData.phoneNumber}
                                                onChange={handleInputChange}
                                                placeholder="e.g., +91 9876543210"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="licenseNumber">Medical License Number*</Label>
                                            <Input
                                                id="licenseNumber"
                                                name="licenseNumber"
                                                value={formData.licenseNumber}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="address">Address</Label>
                                        <Textarea
                                            id="address"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleInputChange}
                                            placeholder="Your clinic/hospital address"
                                            rows={3}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Professional Information */}
                            <Card className="bg-white">
                                <CardHeader>
                                    <CardTitle>Professional Information</CardTitle>
                                    <CardDescription>Update your medical specialization and experience</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="specialization">Specialization*</Label>
                                            <Select value={formData.specialization} onValueChange={handleSpecializationChange}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select your specialization" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {specializations.map((spec) => (
                                                        <SelectItem key={spec} value={spec}>
                                                            {spec}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="experience">Years of Experience*</Label>
                                            <Input
                                                id="experience"
                                                name="experience"
                                                type="number"
                                                min="0"
                                                max="60"
                                                value={formData.experience}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="consultationFee">Consultation Fee (in ₹)*</Label>
                                        <Input
                                            id="consultationFee"
                                            name="consultationFee"
                                            type="number"
                                            min="0"
                                            value={formData.consultationFee}
                                            onChange={handleInputChange}
                                            placeholder="e.g., 800"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="bio">Bio/About</Label>
                                        <Textarea
                                            id="bio"
                                            name="bio"
                                            value={formData.bio}
                                            onChange={handleInputChange}
                                            placeholder="Tell patients about yourself, your expertise, and approach to treatment..."
                                            rows={4}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Save Button */}
                            <div className="flex justify-end space-x-4">
                                <Link to="/doctor/dashboard">
                                    <Button type="button" variant="outline">
                                        Cancel
                                    </Button>
                                </Link>
                                <Button 
                                    type="submit" 
                                    className="bg-teal-600 text-white hover:bg-teal-700"
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}