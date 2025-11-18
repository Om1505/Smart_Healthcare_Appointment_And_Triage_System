import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button.jsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.jsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Star, ArrowLeft } from 'lucide-react';

// Helper component to render stars
const StarRating = ({ rating }) => {
  return (
    <div className="flex items-center space-x-1">
      {[...Array(5)].map((_, index) => (
        <Star
          key={index}
          className={`h-5 w-5 ${index < Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );
};

export default function DoctorReviewsPage() {
  const { id: doctorId } = useParams();
  const [doctor, setDoctor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch doctor details and reviews in parallel
        const [doctorRes, reviewsRes] = await Promise.all([
          axios.get(`http://localhost:5001/api/doctors/${doctorId}`),
          axios.get(`http://localhost:5001/api/reviews/doctor/${doctorId}`)
        ]);
        setDoctor(doctorRes.data);
        setReviews(reviewsRes.data);
      } catch (err) {
        setError("Failed to load reviews. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [doctorId]);

  if (isLoading) return <div className="flex items-center justify-center h-screen">Loading reviews...</div>;
  if (error) return <div className="flex items-center justify-center h-screen text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-emerald-50 p-4 md:p-8">
      <div className="container max-w-3xl mx-auto">
        {doctor && (
          <Card className="bg-white shadow-lg mb-8">
            <CardHeader className="flex flex-row items-center space-x-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src="/female-doctor.jpg" alt={doctor.fullName} />
                <AvatarFallback>{doctor.fullName.split(" ").map(n => n[0]).join("")}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{doctor.fullName}</CardTitle>
                <CardDescription className="text-md">{doctor.specialization}</CardDescription>
                <div className="flex items-center space-x-2 mt-2">
                  <StarRating rating={doctor.averageRating} />
                  <span className="text-gray-600">({doctor.reviewCount} reviews)</span>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">All Reviews</h2>
          <Link to="/patient/doctors">
            <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Search</Button>
          </Link>
        </div>

        <Card className="bg-white shadow-lg">
          <CardContent className="p-6 space-y-6">
            {reviews.length > 0 ? reviews.map(review => (
              <div key={review._id} className="border-b pb-4 last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{review.patient.fullName.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                    </Avatar>
                    <span className="font-semibold">{review.patient.fullName}</span>
                  </div>
                  <span className="text-sm text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="mb-2">
                  <StarRating rating={review.rating} />
                </div>
                <p className="text-gray-700">{review.comment}</p>
              </div>
            )) : (
              <p className="text-gray-500 text-center py-8">No reviews for this doctor yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}