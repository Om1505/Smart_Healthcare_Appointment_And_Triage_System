import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Calendar, Download, User, ArrowLeft, LogOut, IndianRupee } from "lucide-react";
import { Link } from "react-router-dom";

export default function DoctorEarningsPage() {
    const [earningsData, setEarningsData] = useState(null);
    const [doctor, setDoctor] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/login';
                return;
            }
            try {
                const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
                const [earningsRes, profileRes] = await Promise.all([
                    // --- UPDATE THIS URL ---
                    axios.get('http://localhost:5001/api/doctors/earnings/data', authHeaders), // Use the new route
                    axios.get('http://localhost:5001/api/users/profile', authHeaders)
                ]);
                setEarningsData(earningsRes.data);
                setDoctor(profileRes.data);
            } catch (err) {
                console.error("Error fetching data:", err.response || err);
                setError(`Failed to fetch earnings data (${err.response?.status || 'Network Error'}).`);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    };
    const handleDownloadReport = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert("Authentication error. Please log in again.");
            return;
        }

        try {
            const response = await axios.get('http://localhost:5001/api/doctors/earnings/download-report', {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob', // Important: Tell axios to expect binary data (the file)
            });

            // Create a URL for the blob data
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Extract filename from content-disposition header if available, otherwise use default
            const contentDisposition = response.headers['content-disposition'];
            let fileName = `earnings-report-${new Date().toISOString().split('T')[0]}.csv`; // Default
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
                if (fileNameMatch && fileNameMatch.length === 2)
                    fileName = fileNameMatch[1];
            }
            link.setAttribute('download', fileName);

            // Append to html link element page
            document.body.appendChild(link);

            // Start download
            link.click();

            // Clean up and remove the link
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (err) {
            console.error("Download Error:", err.response || err);
            alert("Failed to download report. See console for details.");
        }
    };
    if (isLoading) return <div className="flex items-center justify-center h-screen">Loading Earnings Dashboard...</div>;
    if (error) return <div className="flex items-center justify-center h-screen text-red-600">{error}</div>;
    const filteredTransactions = earningsData?.recentTransactions?.filter(tx => {
        if (filter === 'all') return true;
        // Check against the actual appointment status now
        return tx.status === filter; // 'filter' will be 'upcoming' or 'completed'
    }) || []; // Default to empty array if earningsData or recentTransactions is null
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
                                <AvatarImage src="/female-doctor.jpg" alt={doctor.fullName} />
                                <AvatarFallback className="bg-teal-100 text-teal-800">
                                    {doctor.fullName.split(" ").map((n) => n[0]).join("")}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Earnings Dashboard</h1>
                        <p className="text-gray-600">Track your consultation earnings and financial performance</p>
                    </div>
                    <Button
                        className="bg-teal-600 text-white hover:bg-teal-700"
                        onClick={handleDownloadReport} // Use the new handler
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Download Report
                    </Button>
                </div>

                <div className="grid md:grid-cols-4 gap-6 mb-8">
                    <Card className="bg-white"><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-sm font-medium">Today</CardTitle><IndianRupee className="h-4 w-4 text-teal-600" /></div><div className="text-2xl font-bold text-teal-600">₹{earningsData.today.toLocaleString()}</div></CardHeader></Card>
                    <Card className="bg-white"><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-sm font-medium">This Week</CardTitle><TrendingUp className="h-4 w-4 text-green-600" /></div><div className="text-2xl font-bold text-green-600">₹{earningsData.thisWeek.toLocaleString()}</div></CardHeader></Card>
                    <Card className="bg-white"><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-sm font-medium">This Month</CardTitle><Calendar className="h-4 w-4 text-blue-600" /></div><div className="text-2xl font-bold text-blue-600">₹{earningsData.thisMonth.toLocaleString()}</div></CardHeader></Card>
                    <Card className="bg-white"><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-sm font-medium">Total Earnings</CardTitle><IndianRupee className="h-4 w-4 text-gray-500" /></div><div className="text-2xl font-bold">₹{earningsData.totalEarnings.toLocaleString()}</div></CardHeader></Card>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <Card className="bg-white">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Recent Transactions</CardTitle>
                                        <CardDescription>Your latest consultation payments</CardDescription>
                                    </div>
                                    <Select value={filter} onValueChange={setFilter}>
                                        <SelectTrigger className="w-38"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Appointments</SelectItem>
                                            <SelectItem value="upcoming">Upcoming</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {filteredTransactions.map((tx) => (
                                        <div key={tx.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                            <div className="flex items-center space-x-4">
                                                <Avatar><AvatarImage src="/placeholder.svg" /><AvatarFallback>{tx.patientName.split(" ").map((n) => n[0]).join("")}</AvatarFallback></Avatar>
                                                <div><h3 className="font-semibold">{tx.patientName}</h3><p className="text-sm text-gray-500">{new Date(tx.date).toLocaleDateString()} • {tx.time}</p></div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-semibold">₹{tx.amount?.toFixed(2) ?? '0.00'}</div>
                                                <Badge variant={tx.status === "completed" ? "default" : "secondary"}>
                                                    {tx.status === 'upcoming' ? 'Upcoming' : 'Completed'}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="bg-white">
                        <CardHeader><CardTitle>Monthly Breakdown</CardTitle><CardDescription>Earnings by month</CardDescription></CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {earningsData.monthlyBreakdown.map((month, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                                        <div><div className="font-medium">{month.month}</div><div className="text-sm text-gray-500">{month.appointments} appointments</div></div>
                                        <div className="text-right"><div className="font-semibold">₹{month.earnings.toLocaleString()}</div></div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}