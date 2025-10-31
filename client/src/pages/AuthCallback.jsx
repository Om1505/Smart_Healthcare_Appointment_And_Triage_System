import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Get the data from the URL query parameters
    const token = searchParams.get('token');
    const nextPath = searchParams.get('next'); // The path determined by the backend
    const error = searchParams.get('error');

    if (error) {
      // Handle any errors from Google
      console.error("Google Auth Error:", error);
      navigate('/login?error=google_failed'); // Redirect to login with error
      return;
    }

    if (token) {
      
      localStorage.setItem('token', token);

      if (nextPath) {
        navigate(decodeURIComponent(nextPath));
      } else {
        navigate('/patient/dashboard'); 
      }
    } else {
      // No token found, something went wrong
      console.error("No token provided in callback.");
      navigate('/login?error=token_missing');
    }
    
  }, [searchParams, navigate]);

  // Render a simple loading state while the redirect is happening
  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Loading...</h1>
        <p className="text-gray-600">Finalizing your sign-in, please wait.</p>
      </div>
    </div>
  );
}