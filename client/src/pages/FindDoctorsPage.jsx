import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Filter, Star, Clock, Stethoscope, User, LogOut } from "lucide-react";
import { Link } from "react-router-dom";

const specialties = ["All Specialties", "Cardiology", "Dermatology", "Pediatrics", "Neurology", "Orthopedics"];

export default function FindDoctorsPage() {
  const primaryColor = '#0F5257';

  // State for search and filter inputs
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All Specialties");
  
  // State for holding and displaying doctors
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Effect to fetch doctors whenever the search query or specialty changes
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setIsLoading(true);
        // Build the URL with query parameters for the backend
        const params = new URLSearchParams();
        if (searchQuery) {
          params.append('search', searchQuery);
        }
        if (selectedSpecialty && selectedSpecialty !== 'All Specialties') {
          params.append('specialty', selectedSpecialty);
        }
        
        const response = await axios.get(`http://localhost:5001/api/doctors?${params.toString()}`);
        setDoctors(response.data);
      } catch (err) {
        setError('Failed to fetch doctors. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    // Use a timeout to prevent firing a request on every single keystroke
    const debounceTimeout = setTimeout(() => {
        fetchDoctors();
    }, 300); // 300ms delay

    return () => clearTimeout(debounceTimeout);
  }, [searchQuery, selectedSpecialty]);


  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };
const StarRating = ({ rating }) => {
  return (
    <div className="flex items-center space-x-0.5">
      {[...Array(5)].map((_, index) => (
        <Star
          key={index}
          className={`h-4 w-4 ${index < Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );
};
  return (
    <div className="min-h-screen bg-emerald-50 text-gray-800">
        <nav className="border-b border-gray-200 bg-white/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center h-16 sm:h-16 gap-3 sm:gap-0">
            <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <img src="/Logo.svg" className="h-8 sm:h-10" style={{ color: primaryColor }} alt="Logo" />
              <span className="text-2xl sm:text-3xl font-bold">IntelliConsult</span>
            </Link>
            <div className="flex items-center space-x-3">
              <Link to="/patient/dashboard">
                <Button variant="outline" size="sm">Dashboard</Button>
              </Link>
              <Button onClick={handleLogout} variant="outline" size="sm" className="border-slate-300 text-slate-800 hover:bg-slate-50">
                <LogOut className="h-4 w-4 mr-2" /> Logout
              </Button>
              <Avatar><AvatarImage src="/patient-consultation.png" /><AvatarFallback><User className="h-4 w-4" /></AvatarFallback></Avatar>
            </div>
          </div>
        </div>
        </nav>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Your Doctor</h1>
          <p className="text-gray-600">Search and book with qualified healthcare professionals.</p>
        </div>

        <Card className="bg-white border-gray-200 mb-8 sticky md:top-20 top-16 z-40">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or specialty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                <SelectTrigger className="w-full md:w-56">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-12">Loading doctors...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">{error}</div>
        ) : (
          <div className="space-y-6">
            {doctors.length > 0 ? (
              doctors.map((doctor) => (
                <Card key={doctor._id} className="bg-white border-gray-200 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      <Avatar className="w-24 h-24"><AvatarImage src="/female-doctor.jpg" /><AvatarFallback>Dr</AvatarFallback></Avatar>
                      <div className="flex-1">
                        <div className="flex flex-col md:flex-row justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">{doctor.fullName}</h3>
                            <Badge className="bg-teal-100 text-teal-800 mb-2">{doctor.specialization}</Badge>
                            <p className="text-gray-600 text-sm mt-2">{doctor.bio}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t pt-4">
                           <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <StarRating rating={doctor.averageRating} />
                            <span>({doctor.reviewCount} reviews)</span>
                          </div>
                           <div className="flex items-center space-x-2 text-sm text-gray-600"><Clock className="h-4 w-4" /><span>{doctor.experience} years experience</span></div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 justify-center w-full md:w-48">
                        {/* THIS IS THE UPDATED PART */}
                        <Link to={`/patient/book/${doctor._id}`}>
                          <Button className="w-full bg-teal-600 text-white hover:bg-teal-700">Book Appointment</Button>
                        </Link>
                        <Link to={`/doctor/${doctor._id}`}>
                        <Button variant="outline" className="w-full">View Profile</Button>
                      </Link>
                      <Link to={`/doctor/${doctor._id}/reviews`}>
                          <Button variant="outline" className="w-full">View Reviews</Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="bg-white border-gray-200"><CardContent className="text-center py-12"><Search className="h-12 w-12 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-semibold mb-2">No Doctors Found</h3><p className="text-gray-600">Try adjusting your search criteria.</p></CardContent></Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}