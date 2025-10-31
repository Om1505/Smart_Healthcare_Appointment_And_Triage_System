import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle, Stethoscope, Users, Calendar, LogOut, User, Mail } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate, Link } from 'react-router-dom';

// Custom hook to handle clicks outside a specified element
function useOutsideClick(ref, handler) {
  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        handler();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, handler]);
}

export default function AdminDashboard() {
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);
  const [specializationFilter, setSpecializationFilter] = useState('all');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // State to store the logged-in admin's profile data
  const [adminProfile, setAdminProfile] = useState(null);

  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useOutsideClick(dropdownRef, () => setIsProfileOpen(false));

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError("Authorization token not found. Please log in.");
        setLoading(false);
        return;
      }

      try {
        // Use Promise.all to fetch all necessary data concurrently
        const [usersResponse, profileResponse] = await Promise.all([
          axios.get('http://localhost:5001/api/admin/users', {
            withCredentials: true,
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          axios.get('http://localhost:5001/api/users/profile', {
            withCredentials: true,
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        setDoctors(usersResponse.data.doctors);
        setPatients(usersResponse.data.patients);
        setAdminProfile(profileResponse.data); // Store the admin's profile

      } catch (err) {
        const errorMessage = err.response?.data?.message || "An error occurred while fetching data.";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleVerify = async (userId, userType) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert("Session expired. Please log in again.");
      return;
    }
    setVerifyingId(userId);
    try {
      const response = await axios.put(
        `http://localhost:5001/api/admin/verify-doctor/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updatedUser = response.data.doctor; // Backend route returns a 'doctor' object
      if (userType === 'doctor') {
        setDoctors(docs =>
          docs.map(doc => doc._id === userId ? { ...doc, isProfileComplete: updatedUser.isProfileComplete } : doc)
        );
      }
    } catch (err) {
      alert(`Error: ${err.response?.data?.message || "Failed to verify user."}`);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const uniqueSpecializations = useMemo(() => {
    const specs = new Set(doctors.map(doc => doc.specialization).filter(Boolean));
    return Array.from(specs);
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    if (specializationFilter === 'all') return doctors;
    return doctors.filter(doc => doc.specialization === specializationFilter);
  }, [doctors, specializationFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        <span className="ml-4 text-lg text-gray-700">Loading Dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <AlertCircle className="w-12 h-12 text-red-600" />
        <span className="mt-4 text-lg text-red-700">Error: {error}</span>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-50 text-gray-800">
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-8 h-8 text-cyan-600" />
            <Link to="/" className="text-xl font-bold text-gray-800 hover:text-cyan-600 transition-colors">
              IntelliConsult
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" className="border-cyan-500 text-cyan-600 hover:bg-cyan-50" onClick={() => navigate('/appointments')}>
              <Calendar className="w-4 h-4 mr-2" />
              View Appointments
            </Button>
            <div className="relative" ref={dropdownRef}>
              <div
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-10 h-10 rounded-full bg-cyan-200 flex items-center justify-center text-cyan-800 font-semibold text-xs cursor-pointer hover:bg-cyan-300 transition-colors"
              >
                {/* Display admin initials if profile is loaded */}
                {adminProfile ? adminProfile.fullName.substring(0, 2).toUpperCase() : 'AD'}
              </div>
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      <p className="font-medium">{adminProfile?.fullName || "Admin"}</p>
                      <p className="text-xs text-gray-500 truncate">{adminProfile?.email || ""}</p>
                    </div>
                    <button
                      onClick={() => { setShowProfileModal(true); setIsProfileOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      View Profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>

      <main className="p-4 sm:p-6 lg:p-8">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

          {/* Doctors Table */}
          <Card className="mb-8 shadow-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center text-2xl"><Stethoscope className="w-6 h-6 mr-3 text-blue-700" />Doctors</CardTitle>
                  <CardDescription>A list of all registered doctors and their verification status.</CardDescription>
                </div>
                <div className="w-full sm:w-auto sm:min-w-[200px]">
                  <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
                    <SelectTrigger><SelectValue placeholder="Filter by specialization..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Specializations</SelectItem>
                      {uniqueSpecializations.map(spec => (<SelectItem key={spec} value={spec}>{spec}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Full Name</TableHead><TableHead>Email</TableHead><TableHead>Specialization</TableHead><TableHead>Experience</TableHead><TableHead>License Number</TableHead><TableHead className="text-center">Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredDoctors.length > 0 ? (
                    filteredDoctors.map((doctor) => (
                      <TableRow key={doctor._id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/admin/doctor/${doctor._id}`)}>
                        <TableCell className="font-medium">{doctor.fullName}</TableCell>
                        <TableCell>{doctor.email}</TableCell>
                        <TableCell><Badge variant="outline">{doctor.specialization}</Badge></TableCell>
                        <TableCell>{doctor.experience} years</TableCell>
                        <TableCell>{doctor.licenseNumber}</TableCell>
                        <TableCell className="text-center">
                          {/* --- FIX 4: Changed check from isVerified to isProfileComplete --- */}
                          {doctor.isProfileComplete ? (
                            <Badge className="bg-green-600 hover:bg-green-700"><CheckCircle className="w-4 h-4 mr-1" />Verified</Badge>
                          ) : (
                            <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleVerify(doctor._id, 'doctor')} disabled={verifyingId === doctor._id}>
                                {verifyingId === doctor._id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                              </Button>
                              <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => alert('Reject functionality not implemented')}>Reject</Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={6} className="text-center text-gray-500 py-8">No doctors found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Patients Table */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl"><Users className="w-6 h-6 mr-3 text-purple-700" />Patients</CardTitle>
              <CardDescription>A list of all registered patients.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Full Name</TableHead><TableHead>Email</TableHead><TableHead>Joined On</TableHead></TableRow></TableHeader>
                <TableBody>
                  {patients.map((patient) => (
                    <TableRow key={patient._id}>
                      <TableCell className="font-medium">{patient.fullName}</TableCell>
                      <TableCell>{patient.email}</TableCell>
                      <TableCell>{new Date(patient.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">Your Profile</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Your Name</p>
                    <p className="font-medium text-gray-900">{adminProfile?.fullName || 'Loading...'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Your Email</p>
                    <p className="font-medium text-gray-900">{adminProfile?.email || 'Loading...'}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setShowProfileModal(false)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}