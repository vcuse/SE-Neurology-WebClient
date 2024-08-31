import './App.css';
import React, {useState} from "react";
import { Routes, Route } from 'react-router-dom';
import Login from "./pages/Login";
import Layout from './components/Layout';
import authService from './services/authService';


function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isLoggedIn());

  const handleLogin = (role, credentials) => {
    setIsAuthenticated(true);
    console.log('User logged in:', role, credentials);
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
  };

  return (
    <>
    <Layout>
      <Routes>
        {isAuthenticated ? (
            <Route
              path="/"
              element={
                <div>
                  Welcome, you are logged in! <button onClick={handleLogout}>Logout</button>
                </div>
              }
            />
          ) : (
            <Route path="/" element={<Login onLogin={handleLogin} />} />
          )}
        {/* <Route path="/" element={<Login />} /> */}
      </Routes>
    </Layout>
    </>
  );
}

export default App;
