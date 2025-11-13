import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Calendar, Clock, Users, IndianRupee, AlertTriangle, CheckCircle, User, Settings, Brain, LogOut, Loader2, ShieldAlert
} from "lucide-react";
import { Link } from "react-router-dom";

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
    <Card className="mb-4 bg-white shadow-md">
        <CardHeader>
            <CardTitle className="flex justify-between items-center">
                <span>{patientName}</span>
                <Badge className={getPriorityClasses(urgency)}>
                    {getPriorityLabel(urgency, null)}
                </Badge>
            </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-2">
                <h4 className="font-semibold">AI Summary:</h4>
                <p className="text-sm text-gray-700">{aiSummary}</p>
                <h4 className="font-semibold">Risk Factors:</h4>
                <div className="flex flex-wrap gap-2">
                    {riskFactors.map((factor, index) => (
                        <Badge key={index} variant="outline">{factor}</Badge>
                    ))}
                </div>
            </div>
        </CardContent>
    </Card>
);


export default function DoctorDashboard() {
    const primaryColor = '#0F5257';
    const secondaryColor = '#2E8B57';

    const [doctor, setDoctor] = useState(null);
    const [aiSummaries, setAiSummaries] = useState({});
    const [loadingSummaries, setLoadingSummaries] = useState({});
    const [appointments, setAppointments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [triageResults, setTriageResults] = useState({});
    const [loadingTriage, setLoadingTriage] = useState({});

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

    const highPriorityCount = useMemo(() => sortedUpcomingAppointments.filter(apt => apt.urgency === 'High').length, [sortedUpcomingAppointments]);

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

    const handleStartConsultation = async (appointmentId) => {
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
            alert("Appointment marked as completed!");

        } catch (err) {
            console.error("Error completing appointment:", err.response || err);
            alert(err.response?.data?.message || "Failed to start consultation.");
        }
    };

    const generateAISummary = (apt) => {
        // ✅ UPDATED: Use AI-generated summary if available
        if (aiSummaries[apt._id]) {
            return aiSummaries[apt._id];
        }

        // Fallback to generated summary from form data
        let summary = `Patient is scheduled for a consultation regarding: ${apt.primaryReason || 'Not specified'}. `;
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

    return (
        <div className="min-h-screen bg-emerald-50 text-gray-800">
            <nav className="border-b border-gray-200 bg-white/95 backdrop-blur sticky top-0 z-50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                            <img src="/Logo.svg" className="h-25 w-30" style={{ color: primaryColor }} alt="Logo" />
                            <span className="text-3xl font-bold">IntelliConsult</span>
                        </Link>
                        <div className="flex items-center space-x-4">
                            <Link to="/doctor/schedule"><Button variant="outline" size="sm" className="border-teal-300 text-teal-800 hover:bg-teal-50 hover:text-teal-900"><Calendar className="h-4 w-4 mr-2" />Schedule</Button></Link>
                            <Button onClick={handleLogout} variant="outline" size="sm" className="border-slate-300 text-slate-800 hover:bg-slate-50 hover:text-slate-900"><LogOut className="h-4 w-4 mr-2" />Logout</Button>
                            <Avatar><AvatarImage src="/female-doctor.jpg" alt={doctor.fullName} /><AvatarFallback className="bg-teal-100 text-teal-800">{doctor.fullName.split(" ").map((n) => n[0]).join("")}</AvatarFallback></Avatar>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{getTimeBasedGreeting()}, Dr. {doctor.fullName.split(' ').pop()}!</h1>
                    <p className="text-gray-600">You have {sortedUpcomingAppointments.length} {sortedUpcomingAppointments.length === 1 ? 'patient' : 'patients'} in your queue for today.</p>
                </div>

                <div className="grid md:grid-cols-4 gap-6 mb-8">
                    <Card className="bg-white hover:shadow-lg hover:-translate-y-2 transition-all duration-300"><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-sm font-medium text-gray-700">Upcoming Today</CardTitle><Calendar className="h-4 w-4 text-gray-500" /></div><div className="text-2xl font-bold">{sortedUpcomingAppointments.length}</div></CardHeader></Card>
                    <Card className="bg-white hover:shadow-lg hover:-translate-y-2 transition-all duration-300"><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-sm font-medium text-gray-700">High Priority</CardTitle><AlertTriangle className="h-4 w-4 text-orange-500" /></div><div className="text-2xl font-bold text-orange-600">{highPriorityCount}</div></CardHeader></Card>
                    <Card className="bg-white hover:shadow-lg hover:-translate-y-2 transition-all duration-300"><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-sm font-medium text-gray-700">AI Analyzed</CardTitle><Brain className="h-4 w-4" style={{ color: primaryColor }} /></div><div className="text-2xl font-bold" style={{ color: primaryColor }}>{sortedUpcomingAppointments.length}</div></CardHeader></Card>
                    <Card className="bg-white hover:shadow-lg hover:-translate-y-2 transition-all duration-300"><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-sm font-medium text-gray-700">Completed Today</CardTitle><CheckCircle className="h-4 w-4" style={{ color: secondaryColor }} /></div><div className="text-2xl font-bold" style={{ color: secondaryColor }}>{completedAppointmentsToday.length}</div></CardHeader></Card>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <Card className="bg-white hover:shadow-lg hover:-translate-y-2 transition-all duration-300">
                            <CardHeader><CardTitle className="flex items-center text-gray-900"><Brain className="h-5 w-5 mr-2" style={{ color: primaryColor }} /> Triage Queue</CardTitle><CardDescription>Patients waiting for consultation, sorted by urgency.</CardDescription></CardHeader>
                            <CardContent>
                                <Tabs defaultValue="queue" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 bg-emerald-100"><TabsTrigger value="queue">Appointment Queue</TabsTrigger><TabsTrigger value="analysis">Patient Details</TabsTrigger></TabsList>
                                        <TabsContent value="queue" className="space-y-4 mt-4">
                                          {sortedUpcomingAppointments.length > 0 ? sortedUpcomingAppointments.map((appointment) => (
                                            <div key={appointment._id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-emerald-50">
                                                <Avatar><AvatarImage src="/placeholder.svg" /><AvatarFallback>{appointment.patientNameForVisit ? appointment.patientNameForVisit.split(" ").map((n) => n[0]).join("") : 'N/A'}</AvatarFallback></Avatar>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h3 className="font-semibold text-gray-900">{appointment.patientNameForVisit || 'N/A'}</h3>
                                                        {loadingTriage[appointment._id] ? (
                                                            <Badge variant="outline" className="animate-pulse">
                                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                                Triaging...
                                                            </Badge>
                                                                ) : (
                                                            <Badge variant="outline" className={getPriorityClasses(triageResults[appointment._id]?.priority || appointment.triagePriority || 'GREEN')}>
                                                            {getPriorityLabel(triageResults[appointment._id]?.priority || appointment.triagePriority, triageResults[appointment._id]?.label || appointment.triageLabel)}
                                                            </Badge>
                                                            )}
                                                    </div>
                                                    <p className="text-sm text-gray-600 mb-2 font-medium">Reason: {appointment.primaryReason || 'Not specified'}</p>
                                                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                                                        <div className="flex items-center space-x-1"><Clock className="h-4 w-4" /><span>{appointment.time} on {new Date(appointment.date).toLocaleDateString()}</span></div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col space-y-2">
                                                    <Button
                                                        size="sm"
                                                        className="bg-teal-600 text-white hover:bg-teal-700 w-full"
                                                        onClick={() => handleStartConsultation(appointment._id)}
                                                    >
                                                        Start Consultation
                                                    </Button>
                                                </div>
                                            </div>
                                        )) : <p className="text-center text-gray-500 py-8">You have no scheduled appointments.</p>}
                                    </TabsContent>

                                    <TabsContent value="analysis" className="space-y-4 mt-4">{sortedUpcomingAppointments.map((appointment) => {
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
})}

                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="space-y-6">
                        <Card className="bg-white hover:shadow-lg hover:-translate-y-2 transition-all duration-300">
                            <CardHeader><CardTitle className="text-gray-900">Quick Actions</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <Link to="/doctor/schedule" className="w-full"><Button variant="outline" className="w-full justify-start"><Calendar className="h-4 w-4 mr-2" /> Manage Schedule</Button></Link>
                                <Link to="/doctor/update-profile" className="w-full"><Button variant="outline" className="w-full justify-start"><User className="h-4 w-4 mr-2" /> Update Profile</Button></Link>
                                <Link to="/doctor/earnings" className="w-full"><Button variant="outline" className="w-full justify-start"><IndianRupee className="h-4 w-4 mr-2" /> View Earnings</Button></Link>
                            </CardContent>
                        </Card>
                        <Card className="bg-white hover:shadow-lg hover:-translate-y-2 transition-all duration-300">
                            <CardHeader><CardTitle className="text-gray-900">Today's Schedule</CardTitle><CardDescription>Your upcoming appointments</CardDescription></CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {sortedUpcomingAppointments.slice(0, 3).map(appointment => (
                                        <div key={appointment._id} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                                            <div><div className="font-medium text-gray-800">{appointment.patientNameForVisit || 'N/A'}</div><div className="text-sm text-gray-600">Consultation</div></div>
                                            <div className="text-sm font-medium text-gray-800">{appointment.time}</div>
                                        </div>
                                    ))}
                                </div>
                                <Link to="/doctor/schedule" className="w-full"><Button variant="outline" className="w-full mt-4">View Full Schedule</Button></Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}