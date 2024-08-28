import React, { useState } from 'react';
import styled from 'styled-components';

type LoginProps = {
  onLogin: (role: 'doctor' | 'patient', credentials: { email: string; password: string }) => void;
};

const Container = styled.div<{ isDoctor: boolean }>`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100vw;
  background: ${({ isDoctor }) =>
    isDoctor
      ? 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)'
      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
  transition: background 0.5s ease;
`;

const LoginBubble = styled.div`
  background: #e8e8e8;
  padding: 2rem;
  border-radius: 24px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 800px;
  text-align: center;
`;

const Title = styled.h2`
  font-size: 4rem;
  font-weight: bold;
  margin-bottom: 2rem;
`;

const Input = styled.input<{ isDoctor: boolean }>`
  width: 100%;
  padding: 1.5rem;
  margin: 1rem 0;
  border-radius: 16px;
  border: 2px solid #ddd;
  font-size: 2rem;
  box-sizing: border-box;
  &:focus {
    border-color: ${({ isDoctor }) => (isDoctor ? '#6a11cb' : '#2575fc')};
    outline: none;
    box-shadow: 0 0 0 8px ${({ isDoctor }) => (isDoctor ? 'rgba(106, 17, 203, 0.2)' : 'rgba(118, 75, 162, 0.2)')};
  }
`;

const Button = styled.button<{ isDoctor: boolean }>`
  width: 100%;
  padding: 1.5rem;
  margin: 2rem 0;
  border-radius: 16px;
  border: none;
  box-sizing: border-box;
  background-color: ${({ isDoctor }) => (isDoctor ? '#6a11cb' : '#764ba2')};
  color: #e8e8e8;
  font-size: 2rem;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s ease;

  &:hover {
    background-color: ${({ isDoctor }) => (isDoctor ? '#5317a8' : '#4d2478')};
  }
`;

const ToggleButton = styled.button<{ isDoctor: boolean }>`
  background: none;
  border: none;
  color: ${({ isDoctor }) => (isDoctor ? '#6a11cb' : '#764ba2')};
  font-weight: bold;
  cursor: pointer;
  font-size: 1.5rem;
  transition: color 0.3s ease;

  &:hover {
    color: ${({ isDoctor }) => (isDoctor ? '#5317a8' : '#4d2478')};
  }
`;

const LoginPage: React.FC<LoginProps> = ({ onLogin }) => {
  const [isDoctor, setIsDoctor] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const handleToggle = () => {
    setIsDoctor((prevIsDoctor) => !prevIsDoctor);
    setEmail('');
    setPassword('');
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const role = isDoctor ? 'doctor' : 'patient';
    onLogin(role, { email, password });
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  return (
    <Container isDoctor={isDoctor}>
      <LoginBubble>
        <Title>{isDoctor ? 'Doctor Login' : 'Patient Login'}</Title>
        <form onSubmit={handleSubmit}>
          <Input
            type="email"
            id="email"
            value={email}
            onChange={handleEmailChange}
            required
            placeholder="Email Address"
            isDoctor={isDoctor}
          />
          <Input
            type="password"
            id="password"
            value={password}
            onChange={handlePasswordChange}
            required
            placeholder="Password"
            isDoctor={isDoctor}
          />
          <Button type="submit" isDoctor={isDoctor}>
            Login
          </Button>
        </form>
        <ToggleButton onClick={handleToggle} isDoctor={isDoctor}>
          {isDoctor ? 'I am a Patient' : 'I am a Doctor'}
        </ToggleButton>
      </LoginBubble>
    </Container>
  );
};

export default LoginPage;
