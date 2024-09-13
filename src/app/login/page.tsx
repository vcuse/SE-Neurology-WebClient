"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Define the possible user types
type UserType = 'Doctor' | 'Specialist';

const LoginPage = () => {
  const [userType, setUserType] = useState<UserType>('Doctor'); // Explicitly typed
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const router = useRouter(); // Correct usage of the useRouter hook in a client component

  // Mock login credentials
  const mockLogins: Record<UserType, { email: string; password: string }> = {
    Doctor: { email: 'doctor', password: 'doctor' },
    Specialist: { email: 'specialist', password: 'specialist' },
  };

  const handleLogin = () => {
    const mockUser = mockLogins[userType]; // Safe access using explicit typing

    if (
      credentials.email === mockUser.email &&
      credentials.password === mockUser.password
    ) {
      // Redirect to the appropriate dashboard
      if (userType === 'Doctor') {
        router.push('/doctor-dashboard');
      } else {
        router.push('/specialist-dashboard');
      }
    } else {
      // Show error message if credentials are incorrect
      setError('Invalid email or password. Please try again.');
    }
  };

  const toggleUserType = () => {
    setUserType(userType === 'Doctor' ? 'Specialist' : 'Doctor');
    setError(''); // Clear any previous error when toggling user type
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-700">
          {userType} Login
        </h2>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) =>
              setCredentials({ ...credentials, email: e.target.value })
            }
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) =>
              setCredentials({ ...credentials, password: e.target.value })
            }
          />
          <button
            onClick={handleLogin}
            className="w-full py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-600"
          >
            Sign In
          </button>
          <p className="text-center text-sm text-gray-500">
            {userType === 'Doctor' ? 'Need Specialist Login?' : 'Need Doctor Login?'}{' '}
            <span
              onClick={toggleUserType}
              className="font-medium text-blue-500 cursor-pointer hover:underline"
            >
              Click here
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;