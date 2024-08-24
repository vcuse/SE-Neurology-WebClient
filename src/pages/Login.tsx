import React, { useState } from 'react';

type LoginProps = {
    onLogin: (role: 'doctor' | 'patient', credentials: { email: string; password: string }) => void;
  };

  const LoginPage: React.FC<LoginProps> = ({ onLogin }) => {
    const [isDoctor, setIsDoctor] = useState<boolean>(true);
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
  
    const handleToggle = () => {
      setIsDoctor((prevIsDoctor) => !prevIsDoctor);
      setEmail(''); // Reset the form fields on toggle
      setPassword('');
    };
  
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const role = isDoctor ? 'doctor' : 'patient';
      onLogin(role, { email, password });
    };
  
    return (
      <div className="login-page">
        <div className="login-bubble">
          <div className="toggle-container">
            <button 
              className={`toggle-button ${isDoctor ? 'active' : ''}`} 
              onClick={handleToggle}
            >
              {isDoctor ? 'Doctor' : 'Patient'}
            </button>
          </div>
          <h2>{isDoctor ? 'Doctor Login' : 'Patient Login'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="login-button">
              Login as {isDoctor ? 'Doctor' : 'Patient'}
            </button>
          </form>
        </div>
      </div>
    );
  };
  
  export default LoginPage;