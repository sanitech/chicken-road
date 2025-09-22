import React, { useState, useEffect } from "react"; 
import heroImage from '../assets/hero-img.png';
import cap1Image from '../assets/cap1.png'
import cap2Image from '../assets/cap2.png'
import blockerImage from '../assets/blocker.png'
import sideRoadImage from '../assets/sideroad.png'
import finalSideRoadImage from '../assets/final.png'
import car1 from '../assets/car1.png'
import car2 from '../assets/car2.png'
import car3 from '../assets/car3.png'
import car4 from '../assets/car4.png'
import logoImage from '../assets/logo.png'
import winNotificationImage from '../assets/winNotification.aba8bdcf.png'
import deadChickenImage from '../assets/chickendead.png'
import { preloadImages } from '../utils/preloadAssets'
import { useGetUserInfo } from "../utils/getUserinfo";

const Loading = ({ onLoadingComplete }) => {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [assetsReady, setAssetsReady] = useState(false)
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
    // Simulate loading progress while fetching and preloading
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => Math.min(99, prev + Math.random() * 12));
    }, 120);
    return () => clearInterval(progressInterval);
  }, [onLoadingComplete]);

  // Preload image assets at app start
  useEffect(() => {
    const images = [
      heroImage,
      cap1Image, cap2Image, blockerImage,
      sideRoadImage, finalSideRoadImage,
      car1, car2, car3, car4,
      logoImage, winNotificationImage, deadChickenImage,
    ]
    preloadImages(images).then(() => setAssetsReady(true))
  }, [])

  // Complete when both assets and user info are ready
  useEffect(() => {
    if (!isLoading && assetsReady) {
      setLoadingProgress(100)
      const t = setTimeout(() => completeLoading(), 300)
      return () => clearTimeout(t)
    }
  }, [isLoading, assetsReady])

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
