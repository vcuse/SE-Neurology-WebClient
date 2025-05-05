'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PerlinNoiseBackground from '@/components/ui/perlin-noise-background';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent, action: 'login' | 'create') => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!username || !password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('https://devbranch-server-dot-videochat-signaling-app.ue.r.appspot.com/key=peerjs/post', {
        method: 'POST',
        credentials: 'omit', // Include cookies
        headers: {
          'Content-Type': 'application/json',
          Action: 'login', // Either 'login' or 'create'
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const result = await response.text();

      if (response.ok) {
        if (action === 'login') {
          // Navigate to the user dashboard
          console.log('Login successful:', result);
          router.push(`/users?username=${encodeURIComponent(username)}`);
        } else if (action === 'create') {
          setError('Account created successfully. You may now log in');
        }
      } else {
        setError(result || 'An error occurred. Please try again.');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-[#f8fafc] overflow-hidden">
      <PerlinNoiseBackground
        className="absolute inset-0 w-full h-full"
        style={{ filter: 'blur(8px)' }}
      />
      <div className="absolute inset-0 bg-blue-900/20 z-[0]"></div>
      <Card className="w-full max-w-md z-10 bg-white/95 shadow-lg">
        <CardHeader className="border-b border-blue-100/50">
          <CardTitle className="text-2xl text-blue-900">NeuroConnect</CardTitle>
          <CardDescription className="text-blue-700">Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={(e) => handleSubmit(e, 'login')} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-blue-900">Username</Label>
              <Input
                id="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                className="border-blue-100 focus:border-blue-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-blue-900">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="border-blue-100 focus:border-blue-200"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700" 
                type="submit" 
                disabled={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
              <Button
                className="w-full border-blue-200 text-blue-900 hover:bg-blue-50"
                type="button"
                variant="outline"
                onClick={(e) => handleSubmit(e, 'create')}
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
