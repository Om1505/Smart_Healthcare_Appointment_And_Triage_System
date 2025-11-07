import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle, Stethoscope, Users, Calendar, LogOut, User, Mail, ShieldCheck, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input"; // <-- Add this
import { Label } from "@/components/ui/label"; // <-- Add this
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate, Link } from 'react-router-dom';
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
  const [rejectingId, setRejectingId] = useState(null); // <-- Add This
  const [suspendingId, setSuspendingId] = useState(null); // <-- Add This
  const [specializationFilter, setSpecializationFilter] = useState('all');
  const [nameFilter, setNameFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [licenseFilter, setLicenseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [adminProfile, setAdminProfile] = useState(null);
  const [patientNameFilter, setPatientNameFilter] = useState('');
  const [patientEmailFilter, setPatientEmailFilter] = useState('');
  const [patientDateFromFilter, setPatientDateFromFilter] = useState(''); // Will store 'YYYY-MM-DD'
  const [patientDateToFilter, setPatientDateToFilter] = useState('');
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  
  useOutsideClick(dropdownRef, () => setIsProfileOpen(false));
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError("Authorization token not found. Please log in.");
        setLoading(false);
        navigate('/login');
        return;
      }

      try {
        
        const [usersResponse, profileResponse] = await Promise.all([
          // Request for all doctors and patients for the tables
          axios.get('http://localhost:5001/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          
          axios.get('http://localhost:5001/api/users/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        
        if (profileResponse.data.userType !== 'admin') {
            setError("Access Denied. You are not an admin.");
            localStorage.removeItem('token');
            navigate('/login');
        } else {
            setDoctors(usersResponse.data.doctors);
            setPatients(usersResponse.data.patients);
            setAdminProfile(profileResponse.data);
        }

      } catch (err) {
        const errorMessage = err.response?.data?.message || "An error occurred while fetching data.";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleVerify = async (doctorId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert("Session expired. Please log in again.");
      return;
    }
    setVerifyingId(doctorId);
    try {
      // Call the correct admin verification route
      const response = await axios.put(
        `http://localhost:5001/api/admin/verify-doctor/${doctorId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const updatedDoctor = response.data.doctor;

      setDoctors(docs =>
        docs.map(doc => 
          doc._id === doctorId 
            ? { ...doc, isVerified: updatedDoctor.isVerified } 
            : doc
        )
      );

    } catch (err) {
      alert(`Error: ${err.response?.data?.message || "Failed to verify doctor."}`);
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
    // Start with the full list
    let filtered = doctors;

    // 1. Filter by Specialization
    if (specializationFilter !== 'all') {
      filtered = filtered.filter(doc => doc.specialization === specializationFilter);
    }

    // 2. Filter by Status
    if (statusFilter !== 'all') {
      const isVerified = statusFilter === 'verified';
      filtered = filtered.filter(doc => doc.isVerified === isVerified);
    }

    // 3. Filter by Name (case-insensitive)
    if (nameFilter) {
      filtered = filtered.filter(doc =>
        doc.fullName.toLowerCase().includes(nameFilter.toLowerCase())
      );
    }

    // 4. Filter by Email (case-insensitive)
    if (emailFilter) {
      filtered = filtered.filter(doc =>
        doc.email.toLowerCase().includes(emailFilter.toLowerCase())
      );
    }

    // 5. Filter by License Number
    if (licenseFilter) {
      filtered = filtered.filter(doc =>
        doc.licenseNumber?.toLowerCase().includes(licenseFilter.toLowerCase())
      );
    }

    return filtered;
    
  }, [
    doctors, 
    specializationFilter, 
    statusFilter, 
    nameFilter, 
    emailFilter, 
    licenseFilter
  ]); // <-- Make sure to add all new filters to the dependency array
  const filteredPatients = useMemo(() => {
    let filtered = patients;

    // 1. Filter by Name (case-insensitive)
    if (patientNameFilter) {
      filtered = filtered.filter(p =>
        p.fullName.toLowerCase().includes(patientNameFilter.toLowerCase())
      );
    }

    // 2. Filter by Email (case-insensitive)
    if (patientEmailFilter) {
      filtered = filtered.filter(p =>
        p.email.toLowerCase().includes(patientEmailFilter.toLowerCase())
      );
    }

    // 3. Filter by Date Range
    try {
      // Create Date objects at midnight (for 'from') and just before midnight (for 'to')
      // This ensures the full "from" and "to" days are included in the range.
      const dateFrom = patientDateFromFilter ? new Date(patientDateFromFilter + 'T00:00:00') : null;
      const dateTo = patientDateToFilter ? new Date(patientDateToFilter + 'T23:59:59') : null;

      if (dateFrom) {
        filtered = filtered.filter(p => new Date(p.createdAt) >= dateFrom);
      }
      if (dateTo) {
        filtered = filtered.filter(p => new Date(p.createdAt) <= dateTo);
      }
    } catch (e) {
      // Caches potential invalid date string errors
      console.error("Invalid date filter:", e);
    }
    
    return filtered;

  }, [
    patients, 
    patientNameFilter, 
    patientEmailFilter, 
    patientDateFromFilter, 
    patientDateToFilter
  ]);
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <Loader2 className="w-12 h-12 animate-spin text-cyan-600" />
        <span className="ml-4 text-lg text-gray-700">Loading Dashboard...</span>
      </div>
    );
  }
   // This new function will DELETE a pending doctor
  const handleReject = async (doctorId) => {
    // Add a confirmation step because this is a destructive action
    if (!window.confirm("Are you sure you want to reject and permanently delete this doctor?")) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert("Session expired. Please log in again.");
      return;
    }
    setRejectingId(doctorId);
    try {
      // NOTE: This requires a new backend endpoint
      await axios.delete(
        `http://localhost:5001/api/admin/reject-doctor/${doctorId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Remove the doctor from the list in the UI
      setDoctors(docs => docs.filter(doc => doc._id !== doctorId));

    } catch (err) {
      alert(`Error: ${err.response?.data?.message || "Failed to reject doctor."}`);
    } finally {
      setRejectingId(null);
    }
  };

  // This new function will UN-VERIFY (suspend) an already verified doctor
  const handleSuspend = async (doctorId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert("Session expired. Please log in again.");
      return;
    }
    setSuspendingId(doctorId);
    try {
      // NOTE: This also requires a new backend endpoint
      const response = await axios.put(
        `http://localhost:5001/api/admin/suspend-doctor/${doctorId}`,
        {}, // No body needed
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const updatedDoctor = response.data.doctor;

      // Update the doctor's status in the UI
      setDoctors(docs =>
        docs.map(doc => 
          doc._id === doctorId 
            ? { ...doc, isVerified: updatedDoctor.isVerified } // This will now be false
            : doc
        )
      );

    } catch (err) {
      alert(`Error: ${err.response?.data?.message || "Failed to suspend doctor."}`);
    } finally {
      setSuspendingId(null);
    }
  };
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
            <Button variant="outline" className="border-cyan-500 text-cyan-600 hover:bg-cyan-50" onClick={() => navigate('/admin/appointments')}>
              <Calendar className="w-4 h-4 mr-2" />
              View All Appointments
            </Button>
            <div className="relative" ref={dropdownRef}>
              <div
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-10 h-10 rounded-full bg-cyan-200 flex items-center justify-center text-cyan-800 font-semibold text-xs cursor-pointer hover:bg-cyan-300 transition-colors"
              >
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
              {/* This part is the same */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center text-2xl"><Stethoscope className="w-6 h-6 mr-3 text-blue-700" />Doctors</CardTitle>
                  <CardDescription>A list of all registered doctors and their verification status.</CardDescription>
                </div>
              </div>

              {/* --- This is the new filter section --- */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-4 mt-4 border-t">
                
                {/* Name Filter */}
                <div className="space-y-1">
                  <Label htmlFor="nameFilter" className="text-xs font-medium">Name</Label>
                  <Input 
                    id="nameFilter" 
                    placeholder="Search by name..." 
                    value={nameFilter}
                    onChange={e => setNameFilter(e.target.value)} 
                  />
                </div>

                {/* Email Filter */}
                <div className="space-y-1">
                  <Label htmlFor="emailFilter" className="text-xs font-medium">Email</Label>
                  <Input 
                    id="emailFilter" 
                    placeholder="Search by email..." 
                    value={emailFilter}
                    onChange={e => setEmailFilter(e.target.value)} 
                  />
                </div>

                {/* License Filter */}
                <div className="space-y-1">
                  <Label htmlFor="licenseFilter" className="text-xs font-medium">License</Label>
                  <Input 
                    id="licenseFilter" 
                    placeholder="Search by license..." 
                    value={licenseFilter}
                    onChange={e => setLicenseFilter(e.target.value)} 
                  />
                </div>

                {/* Status Filter */}
                <div className="space-y-1">
                  <Label htmlFor="statusFilter" className="text-xs font-medium">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="statusFilter"><SelectValue placeholder="Filter by status..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Specialization Filter (Moved) */}
                <div className="space-y-1">
                  <Label htmlFor="specFilter" className="text-xs font-medium">Specialization</Label>
                  <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
                    <SelectTrigger id="specFilter"><SelectValue placeholder="Filter by specialization..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Specializations</SelectItem>
                      {uniqueSpecializations.map(spec => (<SelectItem key={spec} value={spec}>{spec}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

              </div>
              {/* --- End of new filter section --- */}
              
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Full Name</TableHead><TableHead>Email</TableHead><TableHead>Specialization</TableHead><TableHead>License Number</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-center">Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredDoctors.length > 0 ? (
                    filteredDoctors.map((doctor) => (
                      <TableRow key={doctor._id}>
                        <TableCell className="font-medium">{doctor.fullName}</TableCell>
                        <TableCell>{doctor.email}</TableCell>
                        <TableCell><Badge variant="outline">{doctor.specialization}</Badge></TableCell>
                        <TableCell>{doctor.licenseNumber}</TableCell>
                        <TableCell className="text-center">
                          {doctor.isVerified ? (
                            <Badge className="bg-green-100 text-green-800">
                              <ShieldCheck className="w-4 h-4 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-yellow-100 text-yellow-800">
                              <ShieldAlert className="w-4 h-4 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                       <TableCell className="text-center">
                    {doctor.isVerified ? (
                      // --- Case 1: Doctor is ALREADY VERIFIED ---
                      // Show a "Suspend" button
                      <Button
                        variant="destructive"
                        size="sm"
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() => handleSuspend(doctor._id)}
                        disabled={suspendingId === doctor._id}
                      >
                        {suspendingId === doctor._id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Suspend'}
                      </Button>
                    ) : (
                      // --- Case 2: Doctor is PENDING ---
                      // Show "Verify" and "Reject" buttons side-by-side
                      <div className="flex justify-center gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleVerify(doctor._id)}
                          disabled={verifyingId === doctor._id || rejectingId === doctor._id}
                        >
                          {verifyingId === doctor._id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => handleReject(doctor._id)}
                          disabled={rejectingId === doctor._id || verifyingId === doctor._id}
                        >
                          {rejectingId === doctor._id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reject'}
                        </Button>
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
          {/* Patients Table */}
        <Card className="shadow-sm">
          <CardHeader>
            {/* Title and Description */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center text-2xl"><Users className="w-6 h-6 mr-3 text-purple-700" />Patients</CardTitle>
                <CardDescription>A list of all registered patients.</CardDescription>
              </div>
            </div>

            {/* --- New Patient Filter Section --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 mt-4 border-t">
              
              {/* Patient Name Filter */}
              <div className="space-y-1">
                <Label htmlFor="patientNameFilter" className="text-xs font-medium">Name</Label>
                <Input 
                  id="patientNameFilter" 
                  placeholder="Search by name..." 
                  value={patientNameFilter}
                  onChange={e => setPatientNameFilter(e.target.value)} 
                />
              </div>

              {/* Patient Email Filter */}
              <div className="space-y-1">
                <Label htmlFor="patientEmailFilter" className="text-xs font-medium">Email</Label>
                <Input 
                  id="patientEmailFilter" 
                  placeholder="Search by email..." 
                  value={patientEmailFilter}
                  onChange={e => setPatientEmailFilter(e.target.value)} 
                />
              </div>

              {/* Joined Date (From) Filter */}
              <div className="space-y-1">
                <Label htmlFor="dateFromFilter" className="text-xs font-medium">Joined From</Label>
                <Input 
                  id="dateFromFilter" 
                  type="date"
                  value={patientDateFromFilter}
                  onChange={e => setPatientDateFromFilter(e.target.value)}
                  className="text-gray-700" // Add class to make date text visible
                />
              </div>

              {/* Joined Date (To) Filter */}
              <div className="space-y-1">
                <Label htmlFor="dateToFilter" className="text-xs font-medium">Joined To</Label>
                <Input 
                  id="dateToFilter" 
                  type="date"
                  value={patientDateToFilter}
                  onChange={e => setPatientDateToFilter(e.target.value)}
                  className="text-gray-700" // Add class to make date text visible
                />
              </div>
            </div>
            {/* --- End of new filter section --- */}
            
          </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Full Name</TableHead><TableHead>Email</TableHead><TableHead>Joined On</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredPatients.length > 0 ? (
                    filteredPatients.map((patient) => ( // <-- Use filteredPatients
                      <TableRow key={patient._id}>
                        <TableCell className="font-medium">{patient.fullName}</TableCell>
                        <TableCell>{patient.email}</TableCell>
                        <TableCell>{new Date(patient.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                     <TableRow><TableCell colSpan={3} className="text-center text-gray-500 py-8">
                      {/* Show a different message if filters are active */}
                      {patients.length > 0 ? "No patients match the current filters." : "No patients found."}
                     </TableCell></TableRow>
                  )}
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

