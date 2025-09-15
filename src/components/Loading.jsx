import React, { useState, useEffect } from "react"; 
import heroImage from '../assets/hero-img.png';

const Loading = ({ onLoadingComplete }) => {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const completeLoading = () => {
    setIsVisible(false);
    if (onLoadingComplete) {
      onLoadingComplete();
    }
  };

  useEffect(() => {
    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          // Fade out after loading completes
          setTimeout(() => {
            completeLoading();
          }, 500);
          return 100;
        }
        return prev + Math.random() * 15; // Random progress increments
      });
    }, 100);

    return () => clearInterval(progressInterval);
  }, [onLoadingComplete]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 min-h-screen flex items-center justify-center z-50 transition-opacity duration-500 cursor-pointer ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={completeLoading}
      title="Click to skip loading"
    >
      {/* Background matching game theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black"></div>
      
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
