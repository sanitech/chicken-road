import React, { useState, useEffect } from "react"; 
import { PacmanLoader, RiseLoader } from "react-spinners";

const Loading = () => {
 
  return (
    <div className="fixed inset-0 min-h-screen bg-[#3a0c1e] flex flex-col items-center justify-center z-50">
      {/* Loading card with combined floating and pulse animation */}
 

      {/* Progress indicator using center image */}
      <div className="flex flex-col items-center mt-[-120px]">
 
        <div className="mt-[-50px]">
          <RiseLoader color="#FFD700" size={15} />
        </div>
      </div>

      <style jsx>{`
        @keyframes rock {
          0%,
          100% {
            transform: rotate(-10deg);
          }
          50% {
            transform: rotate(10deg);
          }
        }
      `}</style>
    </div>
  );
};

export default Loading;
