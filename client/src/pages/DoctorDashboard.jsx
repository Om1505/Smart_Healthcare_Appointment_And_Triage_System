import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
    Calendar, Clock, IndianRupee, AlertTriangle, CheckCircle, User, Brain, LogOut, Loader2, ShieldAlert, FileText, Star // <-- Added Star
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { UserProfileModal } from '@/components/UserProfileModal';

// --- Verification Pending Component ---
const VerificationPending = ({ doctorName, onLogout }) => (
    <div className="min-h-screen flex items-center justify-center bg-emerald-50 p-4">
        <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="text-center">
                <ShieldAlert className="w-16 h-16 mx-auto text-yellow-500" />
                <CardTitle className="text-2xl font-bold text-gray-900 mt-4">Verification Pending</CardTitle>
                <CardDescription className="text-gray-600">
                    Welcome, {doctorName}!
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
                <p className="text-gray-700">
                    Your profile has been submitted and is currently under review by our admin team.
                    You will receive an email once your profile is verified.
                </p>
                <p className="text-gray-600 text-sm">
                    Patients will not be able to find your profile or book appointments until you are verified.
                </p>
                <Button onClick={onLogout} variant="outline" className="w-full">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                </Button>
            </CardContent>
        </Card>
    </div>
);

// --- AI Urgency Helpers ---
const getPriorityClasses = (priority) => {
    switch (priority) {
        case 'RED':
        case 'P1':
            return "bg-red-100 text-red-800 border-red-300 font-bold";
        case 'YELLOW':
        case 'P2':
            return "bg-yellow-100 text-yellow-900 border-yellow-300 font-semibold";
        case 'GREEN':
        case 'P3':
            return "bg-green-100 text-green-800 border-green-300";
        case 'BLACK':
        case 'P4':
            return "bg-gray-200 text-gray-700 border-gray-300";
        default:
            return "bg-gray-100 text-gray-700 border-gray-200";
    }
};

const getPriorityLabel = (priority, label) => {
    if (label) return label;
    
    switch (priority) {
        case 'RED':
        case 'P1':
            return "🔴 Immediate (P1)";
        case 'YELLOW':
        case 'P2':
            return "🟡 Urgent (P2)";
        case 'GREEN':
        case 'P3':
            return "🟢 Minor (P3)";
        case 'BLACK':
        case 'P4':
            return "⚫ Non-Urgent (P4)";
        default:
            return "Pending Triage";
    }
};

// --- AI Triage Card---
const AITriageCard = ({ patientName, urgency, aiSummary, riskFactors }) => (
    <Card className="mb-3 sm:mb-4 bg-white shadow-md">
        <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
                <span className="text-sm sm:text-base font-semibold truncate">{patientName}</span>
                <Badge className={`${getPriorityClasses(urgency)} text-xs w-fit`}>
                    {getPriorityLabel(urgency, null)}
                </Badge>
            </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
            <div className="space-y-2 sm:space-y-3">
                <div>
                    <h4 className="font-semibold text-sm sm:text-base">AI Summary:</h4>
                    <p className="text-xs sm:text-sm text-gray-700 mt-1">{aiSummary}</p>
                </div>
                <div>
                    <h4 className="font-semibold text-sm sm:text-base">Risk Factors:</h4>
                    <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                        {riskFactors.map((factor, index) => (
                            <Badge key={index} variant="outline" className="text-xs">{factor}</Badge>
                        ))}
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
);


export default function DoctorDashboard() {
    const primaryColor = '#0F5257';
    const secondaryColor = '#2E8B57';

    const navigate = useNavigate();
    const [doctor, setDoctor] = useState(null);
    const [aiSummaries, setAiSummaries] = useState({});
    const [loadingSummaries, setLoadingSummaries] = useState({});
    const [appointments, setAppointments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [triageResults, setTriageResults] = useState({});
    const [loadingTriage, setLoadingTriage] = useState({});
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/login';
                return;
            }
            try {
                const [profileRes, appointmentsRes] = await Promise.all([
                    axios.get('http://localhost:5001/api/users/profile', {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get('http://localhost:5001/api/appointments/doctor', {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);

                if (profileRes.data.userType !== 'doctor') {
                    setError('Access denied. Not a doctor account.');
                    localStorage.removeItem('token');
                    window.location.href = '/login';
                    return;
                }

                setDoctor(profileRes.data);
                setAppointments(appointmentsRes.data);
            } catch (err) {
                console.error("Error fetching data:", err.response || err);
                setError(`Failed to fetch dashboard data (${err.response?.status || 'Network Error'}).`);
                localStorage.removeItem('token');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const fetchAISummary = async (appointmentId) => {
        setLoadingSummaries(prev => ({ ...prev, [appointmentId]: true }));

        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `http://localhost:5001/api/summary/appointment/${appointmentId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                setAiSummaries(prev => ({
                    ...prev,
                    [appointmentId]: response.data.summary
                }));
            }
        } catch (error) {
            console.error('Error fetching AI summary:', error);
            setAiSummaries(prev => ({
                ...prev,
                [appointmentId]: 'Unable to generate AI summary at this time.'
            }));
        } finally {
            setLoadingSummaries(prev => ({ ...prev, [appointmentId]: false }));
        }
    };

    const fetchAITriage = async (appointmentId) => {
        setLoadingTriage(prev => ({ ...prev, [appointmentId]: true }));
        
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `http://localhost:5001/api/triage/appointment/${appointmentId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                setTriageResults(prev => ({
                    ...prev,
                    [appointmentId]: response.data.triage
                }));
            }
        } catch (error) {
            console.error('Error fetching triage:', error);
        } finally {
            setLoadingTriage(prev => ({ ...prev, [appointmentId]: false }));
        }
    };


    useEffect(() => {
        if (appointments.length > 0) {
            const upcomingAppts = appointments.filter(apt => apt.status === 'upcoming');
            upcomingAppts.forEach(apt => {
                fetchAISummary(apt._id);
                fetchAITriage(apt._id);
            });
        }
    }, [appointments]);

    // --- Data Computations (Moved to top level) ---
    const urgencyToValue = (urgency) => {
        switch (urgency) {
            case 'High': return 3;
            case 'Medium': return 2;
            case 'Low': return 1;
            default: return 0;
        }
    };

    const sortedUpcomingAppointments = useMemo(() => {
        return appointments
            .filter(apt => apt.status === 'upcoming')
            .sort((a, b) => urgencyToValue(b.urgency) - urgencyToValue(a.urgency));
    }, [appointments]);

    const upcomingAppointmentsToday = useMemo(() => {
        return appointments.filter(apt => 
            apt.status === 'upcoming' && 
            new Date(apt.date).toDateString() === new Date().toDateString()
        );
    }, [appointments]);

    const completedAppointments = useMemo(() =>
        appointments
            .filter(apt => apt.status === 'completed')
            .sort((a, b) => new Date(b.date) - new Date(a.date)),
        [appointments]
    );

    const highPriorityCount = useMemo(() => {
        return sortedUpcomingAppointments.filter(apt => {
            const priority = triageResults[apt._id]?.priority || apt.triagePriority;
            return priority === 'RED' || priority === 'P1';
        }).length;
    }, [sortedUpcomingAppointments, triageResults]);

    const completedAppointmentsToday = useMemo(() =>
        appointments.filter(apt => apt.status === 'completed' && new Date(apt.date).toDateString() === new Date().toDateString()),
        [appointments]);
    // --- End of Computations ---

    // Function to get time-based greeting
    const getTimeBasedGreeting = () => {
        const currentHour = new Date().getHours();

        if (currentHour >= 5 && currentHour < 12) {
            return "Good morning";
        } else if (currentHour >= 12 && currentHour < 17) {
            return "Good afternoon";
        } else {
            return "Good evening";
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    const handleProfileUpdate = (updatedDoctor) => {
        setDoctor(updatedDoctor);
    };

    const handleCompleteConsultation = async (appointmentId) => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert("Authentication error. Please log in again.");
            return;
        }

        try {
            const response = await axios.put(`http://localhost:5001/api/appointments/${appointmentId}/complete`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setAppointments(prevAppointments =>
                prevAppointments.map(apt =>
                    apt._id === appointmentId ? { ...apt, status: 'completed' } : apt
                )
            );

            console.log("Appointment marked as completed:", response.data.appointment);
            alert("Appointment marked as completed! Redirecting to prescription form...");
            navigate(`/doctor/prescription/${appointmentId}`);

        } catch (err) {
            console.error("Error completing appointment:", err.response || err);
            alert(err.response?.data?.message || "Failed to start consultation.");
        }
    };
    
    const handleStartConsultation = async (appointment) => {
        const token = localStorage.getItem('token');
        if (!token) {
          alert("Authentication error. Please log in again.");
          return;
        }
      
        try {
          // 1. Mark the appointment as completed first
          await axios.put(`http://localhost:5001/api/appointments/${appointment._id}/complete`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
      
          // 2. Update local state so the appointment disappears from the queue
          setAppointments(prevAppointments =>
            prevAppointments.map(apt =>
              apt._id === appointment._id ? { ...apt, status: 'completed' } : apt
            )
          );
          
          // 3. Navigate to the call page
          navigate(`/call/${appointment._id}`, { 
            state: { 
              userName: doctor.fullName, 
              userType: 'doctor',
              userid: appointment._id 
            } 
          });
      
        } catch (err) {
          console.error("Error starting consultation:", err.response || err);
          alert(err.response?.data?.message || "Failed to start consultation.");
        }
      };

    const generateAISummary = (apt) => {
        if (aiSummaries[apt._id]) {
            return aiSummaries[apt._id];
        }

        // Fallback to generated summary from form data
        let summary = `Patient is scheduled for a consultation regarding: ${apt.primaryReason || apt.reasonForVisit || 'Not specified'}. `;
        let symptoms = [...(apt.symptomsList || [])];
        if (apt.symptomsOther) {
            symptoms.push(apt.symptomsOther);
        }
        if (symptoms.length > 0) {
            summary += `Reported symptoms: ${symptoms.join(', ')}. `;
        }
        return summary;
    };


    const generateRiskFactors = (apt) => {
        let factors = [];
        if (apt.preExistingConditions && apt.preExistingConditions.length > 0 && apt.preExistingConditions[0] !== 'None of the above') {
            factors = [...apt.preExistingConditions];
        }
        if (apt.preExistingConditionsOther) {
            factors.push(apt.preExistingConditionsOther);
        }
        if (apt.familyHistory && apt.familyHistory.length > 0 && apt.familyHistory[0] !== 'None of the above') {
            apt.familyHistory.forEach(hist => factors.push(`Family Hx: ${hist}`));
        }
        if (apt.familyHistoryOther) {
            factors.push(`Family Hx: ${apt.familyHistoryOther}`);
        }
        return factors.length > 0 ? factors : ["No significant risk factors reported"];
    };


    if (isLoading) return (
        <div className="flex items-center justify-center h-screen">
            <Loader2 className="w-12 h-12 animate-spin text-cyan-600" />
        </div>
    );

    if (error) return (
        <div className="flex items-center justify-center h-screen text-red-600">{error}</div>
    );

    if (!doctor) return (
        <div className="flex items-center justify-center h-screen">Loading doctor data...</div>
    );

    // --- Admin Verification Check ---
    if (!doctor.isVerified) {
        return <VerificationPending doctorName={doctor.fullName} onLogout={handleLogout} />;
    }

    const heroActions = [
        {
            label: "Manage Schedule",
            description: "Fine-tune your availability.",
            icon: Calendar,
            to: "/doctor/schedule"
        },
        {
            label: "View Earnings",
            description: "Monitor completed consultations.",
            icon: IndianRupee,
            to: "/doctor/earnings"
        }
    ];

    const statHighlights = [
        {
            title: "Upcoming Today",
            value: upcomingAppointmentsToday.length,
            icon: Calendar,
            accent: "bg-emerald-50 text-emerald-700"
        },
        {
            title: "High Urgency",
            value: highPriorityCount,
            icon: AlertTriangle,
            accent: "bg-red-50 text-red-600"
        },
        // --- REPLACED "AI Analyzed" with "Patient Rating" ---
        {
            title: "Patient Rating",
            value: doctor.averageRating ? (
                <div className="flex items-center">
                    {doctor.averageRating.toFixed(1)}
                    <Star className="w-5 h-5 ml-1 text-yellow-400 fill-current" />
                </div>
            ) : "N/A",
            description: `${doctor.reviewCount || 0} reviews`, // Custom field for rendering
            icon: Star,
            accent: "bg-yellow-50 text-yellow-600"
        },
        {
            title: "Completed Today",
            value: completedAppointmentsToday.length,
            icon: CheckCircle,
            accent: "bg-teal-50 text-teal-700"
        }
    ];

    return (
        <div className="min-h-screen bg-emerald-50 text-gray-800">
            <nav className="border-b border-gray-200 bg-white/95 backdrop-blur sticky top-0 z-50">
                <div className="container mx-auto px-2 sm:px-4 lg:px-8">
                    <div className="flex justify-between items-center h-14 sm:h-16">
                        <Link to="/" className="flex items-center space-x-1 sm:space-x-2 hover:opacity-80 transition-opacity">
                            <img src="/Logo.svg" className="h-25 w-30" style={{ color: primaryColor }} alt="Logo" />
                            <span className="text-lg sm:text-2xl lg:text-3xl font-bold">IntelliConsult</span>
                        </Link>
                        <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4">
                            <Button onClick={handleLogout} variant="outline" size="sm" className="border-slate-300 text-slate-800 hover:bg-slate-50 hover:text-slate-900 text-xs sm:text-sm hidden sm:flex">
                                <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                <span className="hidden md:inline">Logout</span>
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10 cursor-pointer">
                                        <AvatarImage src="/female-doctor.jpg" alt={doctor.fullName} />
                                        <AvatarFallback className="bg-teal-100 text-teal-800 text-xs sm:text-sm">
                                            {doctor.fullName.split(" ").map((n) => n[0]).join("")}
                                        </AvatarFallback>
                                    </Avatar>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => setIsProfileModalOpen(true)}>
                                        <User className="h-4 w-4 mr-2" />
                                        Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link to="/doctor/schedule" className="flex items-center w-full">
                                            <Calendar className="h-4 w-4 mr-2" />
                                            Schedule
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link to="/doctor/update-profile" className="flex items-center w-full">
                                            <User className="h-4 w-4 mr-2" />
                                            Update Profile
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link to="/doctor/earnings" className="flex items-center w-full">
                                            <IndianRupee className="h-4 w-4 mr-2" />
                                            Earnings
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={handleLogout} className="text-red-600">
                                        <LogOut className="h-4 w-4 mr-2" />
                                        Logout
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="container mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
                <div className="mb-6 sm:mb-8 space-y-4">
                    <div className="rounded-3xl border border-emerald-100 bg-white shadow-sm px-4 py-3 sm:px-5 sm:py-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex-1">
                                <h1 className="text-2xl sm:text-[26px] font-bold text-gray-900">
                                    {getTimeBasedGreeting()}, Dr. {doctor.fullName.split(' ').pop()}!
                                </h1>
                                <p className="text-sm sm:text-base text-gray-600 mt-1">
                                    You have {sortedUpcomingAppointments.length} {sortedUpcomingAppointments.length === 1 ? 'patient' : 'patients'} waiting today.
                                </p>
                            </div>
                            <div className="w-full lg:max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
                                {heroActions.map(({ label, description, icon: Icon, to }) => (
                                    <Link key={label} to={to} className="group" aria-label={label}>
                                        <div className="h-full rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3.5 py-3 shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-white group-hover:shadow-md">
                                            <div className="flex items-center gap-3.5">
                                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow">
                                                    <Icon className="h-4 w-4" />
                                                </span>
                                                <div className="flex-1">
                                                    <p className="text-sm sm:text-base font-semibold text-gray-900 leading-snug">{label}</p>
                                                    <p className="text-xs text-gray-500 leading-tight mt-0.5">{description}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* --- UPDATED STATS GRID (Responsive: 1 col -> 2 cols -> 4 cols) --- */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {statHighlights.map(({ title, value, description, icon: Icon, accent }) => (
                            <div key={title} className="rounded-2xl border border-emerald-50 bg-white shadow-sm p-4 sm:p-5 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-full">
                                <div className="flex items-start justify-between">
                                    <p className="text-sm font-medium text-gray-600">{title}</p>
                                    <span className={`flex h-9 w-9 items-center justify-center rounded-full ${accent}`}>
                                        <Icon className="h-4 w-4" />
                                    </span>
                                </div>
                                <div>
                                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 mt-3">
                                        {value}
                                    </div>
                                    {description && (
                                        <p className="text-xs text-gray-500 mt-1">{description}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                    <div className="lg:col-span-2">
                        <Card className="bg-white hover:shadow-lg hover:-translate-y-2 transition-all duration-300">
                            <CardHeader>
                                <CardTitle className="flex items-center text-gray-900 text-lg sm:text-xl">
                                    <Brain className="h-4 w-4 sm:h-5 sm:w-5 mr-2" style={{ color: primaryColor }} /> 
                                    Triage Queue
                                </CardTitle>
                                <CardDescription className="text-sm">Patients waiting for consultation, sorted by urgency.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-3 sm:p-6">
                                <Tabs defaultValue="queue" className="w-full">
                                    {/* --- 1. UPDATED GRID COLUMNS to 3 --- */}
                                    <TabsList className="grid w-full grid-cols-3 bg-emerald-100">
                                        <TabsTrigger value="queue" className="text-xs sm:text-sm">Queue</TabsTrigger>
                                        <TabsTrigger value="analysis" className="text-xs sm:text-sm">Analysis</TabsTrigger>
                                        <TabsTrigger value="completed" className="text-xs sm:text-sm">Completed</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="queue" className="space-y-3 sm:space-y-4 mt-4">
                                        {sortedUpcomingAppointments.length > 0 ? sortedUpcomingAppointments.map((appointment) => (
                                            <div key={appointment._id} className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 p-3 sm:p-4 border rounded-lg hover:bg-emerald-50">
                                                <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                                                    <AvatarImage src="/placeholder.svg" />
                                                    <AvatarFallback className="text-xs sm:text-sm">
                                                        {appointment.patientNameForVisit ? appointment.patientNameForVisit.split(" ").map((n) => n[0]).join("") : 'N/A'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-2 sm:space-y-0">
                                                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                                                            {appointment.patientNameForVisit || 'N/A'}
                                                        </h3>
                                                        {loadingTriage[appointment._id] ? (
                                                            <Badge variant="outline" className="animate-pulse text-xs w-fit">
                                                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                                Triaging...
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className={`${getPriorityClasses(triageResults[appointment._id]?.priority || appointment.triagePriority || 'GREEN')} text-xs w-fit`}>
                                                                {getPriorityLabel(triageResults[appointment._id]?.priority || appointment.triagePriority, triageResults[appointment._id]?.label || appointment.triageLabel)}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs sm:text-sm text-gray-600 mb-2 font-medium">
                                                        Reason: {appointment.primaryReason || appointment.reasonForVisit || 'Not specified'}
                                                    </p>
                                                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-gray-600">
                                                        <div className="flex items-center space-x-1">
                                                            <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                                            <span className="truncate">{appointment.time} on {new Date(appointment.date).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col space-y-2 w-full sm:w-auto">
                                                    <Button
                                                        size="sm"
                                                        className="bg-teal-600 text-white hover:bg-teal-700 w-full sm:w-auto text-xs sm:text-sm"
                                                        onClick={() => handleStartConsultation(appointment)}
                                                    >
                                                        Start Consultation
                                                    </Button>
                                                </div>
                                            </div>
                                        )) : <p className="text-center text-gray-500 py-8 text-sm sm:text-base">You have no scheduled appointments.</p>}
                                    </TabsContent>

                                    <TabsContent value="analysis" className="space-y-3 sm:space-y-4 mt-4">
                                        {sortedUpcomingAppointments.length > 0 ? sortedUpcomingAppointments.map((appointment) => {
                                            const triage = triageResults[appointment._id];
                                            const priority = triage?.priority || appointment.triagePriority || 'GREEN';
                                            
                                            return (
                                                <AITriageCard 
                                                    key={appointment._id} 
                                                    patientName={appointment.patientNameForVisit || 'N/A'} 
                                                    urgency={priority}
                                                    aiSummary={generateAISummary(appointment)} 
                                                    riskFactors={generateRiskFactors(appointment)}
                                                    isLoading={loadingSummaries[appointment._id]}
                                                />
                                            );
                                        }) : (
                                            <p className="text-center text-gray-500 py-8 text-sm sm:text-base">
                                                No patient analysis available.
                                            </p>
                                        )}
                                    </TabsContent>

                                    {/* --- 2. COMPLETED APPOINTMENTS TAB --- */}
                                    <TabsContent value="completed" className="space-y-3 sm:space-y-4 mt-4">
                                        {completedAppointments.length > 0 ? completedAppointments.map((appointment) => (
                                            <div key={appointment._id} className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 p-3 sm:p-4 border rounded-lg hover:bg-emerald-50">
                                                <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                                                    <AvatarImage src="/placeholder.svg" />
                                                    <AvatarFallback className="text-xs sm:text-sm">
                                                        {appointment.patientNameForVisit ? appointment.patientNameForVisit.split(" ").map((n) => n[0]).join("") : 'N/A'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                                                            {appointment.patientNameForVisit || 'N/A'}
                                                        </h3>
                                                        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 text-xs w-fit">
                                                            Completed
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs sm:text-sm text-gray-600 mb-2 font-medium">
                                                        Reason: {appointment.primaryReason || appointment.reasonForVisit || 'Not specified'}
                                                    </p>
                                                    <div className="flex items-center space-x-1 text-xs sm:text-sm text-gray-600">
                                                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                                        <span className="truncate">{new Date(appointment.date).toLocaleDateString()} at {appointment.time}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col space-y-2 w-full sm:w-auto">
                                                    <Link to={`/doctor/prescription/${appointment._id}`} className="w-full sm:w-auto">
                                                        <Button variant="outline" size="sm" className="w-full text-xs sm:text-sm">
                                                            <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                                            View Prescription
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        )) : (
                                            <p className="text-center text-gray-500 py-8 text-sm sm:text-base">
                                                No completed appointments yet.
                                            </p>
                                        )}
                                    </TabsContent>

                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="space-y-4 sm:space-y-6">
                        <Card className="bg-white hover:shadow-lg hover:-translate-y-2 transition-all duration-300">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <CardTitle className="text-gray-900 text-lg sm:text-xl">Today's Schedule</CardTitle>
                                        <CardDescription className="text-xs sm:text-sm">
                                            The next few patients in your day, prioritized for you.
                                        </CardDescription>
                                    </div>
                                    <Badge variant="outline" className="text-xs sm:text-sm px-3 py-1">
                                        {upcomingAppointmentsToday.length} today
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 sm:p-6 space-y-3">
                                {upcomingAppointmentsToday.length > 0 ? (
                                    upcomingAppointmentsToday.slice(0, 4).map((appointment) => {
                                        const priority = triageResults[appointment._id]?.priority || appointment.triagePriority || 'GREEN';
                                        const label = triageResults[appointment._id]?.label || appointment.triageLabel;

                                        return (
                                            <div
                                                key={appointment._id}
                                                className="p-3 sm:p-4 border border-emerald-100 rounded-xl bg-emerald-50/60 hover:bg-emerald-50 transition"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                                                            {appointment.patientNameForVisit || 'N/A'}
                                                        </p>
                                                        <p className="text-xs sm:text-sm text-gray-600 truncate">
                                                            Reason: {appointment.primaryReason || appointment.reasonForVisit || 'Consultation'}
                                                        </p>
                                                    </div>
                                                    <Badge
                                                        variant="outline"
                                                        className={`${getPriorityClasses(priority)} text-[10px] sm:text-xs`}
                                                    >
                                                        {getPriorityLabel(priority, label)}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center text-xs sm:text-sm text-gray-700 mt-2 space-x-2">
                                                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                                    <span>{appointment.time}</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-center text-sm text-gray-500 py-6">
                                        You're all caught up for today.
                                    </p>
                                )}
                                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                                    <Link to="/doctor/schedule" className="w-full">
                                        <Button variant="outline" className="w-full text-sm">Open full schedule</Button>
                                    </Link>
                                    <Link to="/doctor/schedule" className="w-full sm:hidden">
                                        <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white text-sm">
                                            Add new slot
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Profile Modal */}
            <UserProfileModal 
                isOpen={isProfileModalOpen} 
                onClose={() => setIsProfileModalOpen(false)} 
                patient={doctor} 
                onProfileUpdate={handleProfileUpdate} 
            />
        </div>
    );
}