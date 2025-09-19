import React, { useState, useEffect } from "react"; 
import heroImage from '../assets/hero-img.png';
import { useGetUserInfo } from "../utils/getUserinfo";

const Loading = ({ onLoadingComplete }) => {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || localStorage.getItem("chicknroad");
  
  // Store token if found in URL
  useEffect(() => {
    const urlToken = params.get("token");
    if (urlToken) {
      localStorage.setItem("chicknroad", urlToken);
    }
  }, []);
  
  const { userInfo, isLoading, error } = useGetUserInfo(token);

  const completeLoading = () => {
    setIsVisible(false);
    if (onLoadingComplete) {
      onLoadingComplete();
    }
  };

  useEffect(() => {
    // Simulate loading progress while fetching user info
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => Math.min(99, prev + Math.random() * 15));
    }, 100);

    return () => clearInterval(progressInterval);
  }, [onLoadingComplete]);

  // When user info finishes loading, complete overlay
  useEffect(() => {
    if (!isLoading) {
      setLoadingProgress(100);
      setTimeout(() => {
        completeLoading();
      }, 300);
    }
  }, [isLoading]);

  // Show error message if authentication fails
  if (error && !isLoading) {
    return (
      <div className="fixed inset-0 min-h-screen flex items-center justify-center z-50 bg-gradient-to-br from-gray-950 via-gray-950 to-black">
        <div className="text-center p-8">
          <div className="text-red-400 text-xl mb-4">⚠️ Authentication Error</div>
          <div className="text-white mb-4">{error}</div>
          <div className="text-gray-400 text-sm">Please check your token and try again</div>
        </div>
      </div>
    );
  }

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 min-h-screen flex items-center justify-center z-50 transition-opacity duration-500 cursor-pointer ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={completeLoading}
      title="Click to skip loading"
    >
      {/* Background matching game theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-950 to-black"></div>
      
      {/* Subtle blue accent overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-blue-900/10 via-transparent to-transparent"></div>
      
      {/* Hero image only */}
      <div className="relative z-10">
        <img 
          src={heroImage} 
          alt="Chicken Road 2" 
          className="w-80 h-80 md:w-96 md:h-96 object-contain animate-hero-float drop-shadow-2xl"
        />
      </div>
    </div>
  );
};

export default Loading;
