import React, { useState, useEffect } from "react";
import Loading from "./components/Loading";
import Lobby from "./components/Lobby"; 

function App() {
  const [isLoading, setIsLoading] = useState(true);

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  // Auto-loading simulation
  useEffect(() => {
    // Optional: You can add actual loading logic here
    // For now, the Loading component handles its own timing
  }, []);

  return (
    <div className="App">
      {isLoading ? (
        <Loading onLoadingComplete={handleLoadingComplete} />
      ) : (
        <Lobby />
      )}
    </div>
  );
}

export default App;
