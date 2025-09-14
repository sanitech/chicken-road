import React from 'react';

function RoadDisplay({ multipliers, currentLaneIndex, crashIndex, gameEnded }) {
  return (
    <div className="relative w-full h-full bg-gray-100">
      {/* Sidewalk and Environment */}
      <div className="absolute left-0 top-0 w-20 h-full bg-gray-700">
        {/* Tree/Bush */}
        <div className="absolute bottom-0 left-2 w-16 h-32 bg-green-600 rounded-t-full"></div>
        
        {/* Street Lamp */}
        <div className="absolute bottom-20 left-8 w-2 h-16 bg-gray-600"></div>
        <div className="absolute bottom-32 left-6 w-6 h-6 bg-yellow-400 rounded-full opacity-80"></div>
        
        {/* Chicken - Moves across lanes */}
        <div className={`absolute bottom-6 w-12 h-12 transition-all duration-500 ${
          gameEnded && currentLaneIndex >= crashIndex - 1 ? 'opacity-0' : 'opacity-100'
        }`} style={{ left: `${22 + (currentLaneIndex * 12)}%` }}>
          <div className="w-12 h-12 relative flex items-center justify-center">
            {/* Chicken body */}
            <div className="w-8 h-8 bg-white rounded-full relative overflow-hidden">
              <div className="absolute top-1 left-2 w-2 h-2 bg-red-500 rounded-full"></div>
              <div className="absolute top-1 right-2 w-1 h-1 bg-orange-400 rounded-full"></div>
              <div className="absolute bottom-1 left-1 w-1 h-1 bg-orange-400 rounded-full"></div>
            </div>
            {/* Chicken head */}
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-yellow-400 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Road */}
      <div className="absolute left-20 right-0 h-full bg-gray-600">
        {/* Road lanes with dashed lines */}
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="absolute top-0 bottom-0 w-px border-l-2 border-dashed border-white opacity-50" 
               style={{ left: `${20 + (i * 14)}%` }}>
          </div>
        ))}
        
        {/* Manhole covers with multipliers */}
        {multipliers.slice(0, 7).map((multiplier, index) => (
          <div key={index} className="absolute bottom-8 w-16 h-16 rounded-full bg-gray-800 border-4 border-gray-700 flex items-center justify-center"
               style={{ left: `${22 + (index * 12)}%` }}>
            <div className="text-white font-bold text-sm">
              {multiplier.toFixed(2)}x
            </div>
          </div>
        ))}
        
      </div>

      {/* Moving cars (when game is active) */}
      {!gameEnded && Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="absolute top-4 w-8 h-4 bg-red-500 rounded"
             style={{ 
               left: `${15 + (i * 15)}%`,
               animation: `carMove 4s linear infinite`,
               animationDelay: `${i * 0.8}s`
             }}>
        </div>
      ))}
      
      {/* Car movement keyframes */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes carMove {
            0% { transform: translateX(-200px); }
            100% { transform: translateX(calc(100vw + 200px)); }
          }
        `
      }} />
    </div>
  );
}

export default RoadDisplay;
