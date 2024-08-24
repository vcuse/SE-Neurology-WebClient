import logo from './logo.svg';
import './App.css';

import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import DoctorPage from "./pages/DoctorPage";
import PatientPage from "./pages/PatientPage";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Login />} />
      </Routes>
    </>
  );
}

export default App;
