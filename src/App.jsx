import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom"; 
import Loading from "./components/Loading";
import Chicken from "./components/Lobby"; 
import Lane from "./components/Lane";
import Car from "./components/Car"; 
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Chicken />} /> 
        <Route path="/loading" element={<Loading />} />  
        <Route path="/chicken" element={<Chicken />} /> 
        <Route path="/lane" element={<Lane />} />
        <Route path="/car" element={<Car />} /> 
      </Routes>
    </Router>
  );
}

export default App;
