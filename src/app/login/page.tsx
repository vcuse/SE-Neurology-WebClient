'use client';
// library imports
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// custom imports
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PerlinNoiseBackground from '@/components/ui/perlin-noise-background';
import { validateAuth } from '@/lib/auth';
import { useTimedLogout } from '@/hooks/useTimedLogout';


export default function LoginPage() {
  // state hooks
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authCheck, setAuthCheck] = useState(false);
  const [isCheckingAuth, setisCheckingAuth] = useState(false);
  const [isRedirected, setIsRedirected] = useState(false);

  const router = useRouter();

  // check if user is already authenticated on mount
  useEffect(() => {
    let mounted = true; // flag in case unmounted 
    const peerId = localStorage.getItem('peerId');
    if (!peerId) {
      setAuthCheck(true); // show login form if no id found
      return;
    }

    if (isRedirected) { // prevents repeated redirects
      return;
    }

    // validate authentication
    const checkAuth = async () => {
      setisCheckingAuth(true);
      try {
        console.log('Starting validation...');
        const ok = await validateAuth();

        if (!mounted) {
          return;
        }

        if (ok) { // if authenticatiojn valid, redirect to user page
          const peerId = localStorage.getItem('peerId');
          if (peerId && !isRedirected) {
            console.log('Auth ok, redirecting with peerId');
            setIsRedirected(true);
            router.replace(`/users?peerId=${encodeURIComponent(peerId)}`);
            return;
          } else {
            console.log('Auth ok but no PeerId found');
          }
        } else {
          console.log('Auth failed');
        }
        if (!isRedirected) { // show login if not redirected
          setAuthCheck(true);
          setisCheckingAuth(false);
        }
      } catch (error) {
        console.log('Validation error: ' + error);
        if (mounted && !isRedirected) {
          setAuthCheck(true);
          setisCheckingAuth(false);
          setError('Authentication failed. Please try again.');
        }
      }
    };
    checkAuth();
    return () => { // cleanup
      mounted = false;
    };
  }, []);

  const { setLogoutTime } = useTimedLogout(); // hook for timing logout

  const handleSubmit = async (e: React.FormEvent, action: 'login' | 'create') => { // handles login and acc creation
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!username || !password) { // error if no input
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    try {
      const isProd = window.location.hostname !== 'localhost'; // use to determine whether running in production or not
      const fetchUrl = isProd ? 'https://videochat-signaling-app.ue.r.appspot.com/key=peerjs/post' : 'http://localhost:9000/key=peerjs/post'
      // const fetchUrl = 'https://videochat-signaling-app.ue.r.appspot.com/key=peerjs/post'
      console.log("logging in to " + fetchUrl);

      const response = await fetch(fetchUrl, {
        method: 'POST',
        credentials: 'include', // must be set to omit (for firefox)
        headers: {
          'Content-Type': 'application/json',
          Action: action, // Either 'login' or 'create' 
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const result = await response.json();

      // if response successful, store peerId 
      if (response.ok && result.success) {
        if (action === 'login') {
          localStorage.setItem("peerId", username);

          const ok = await validateAuth();

          // error if not authetnicated
          if (!ok) {
            setError("Login successful but authentication failed");
            setIsLoading(false);
            return;
          }

          // sets timer provided an exp time
          if (result.expiresAt) {
            console.log("expires: " + result.expiresAt);
            setLogoutTime(result.expiresAt);
          }

          // navigate to the user dashboard
          console.log('Login successful:', result);
          router.push(`/users?peerId=${encodeURIComponent(username)}`);
        } else if (action === 'create') { // account creation successful
          setError('Account created successfully. You may now log in');
        }
      } else if (response.status === 401) { // expired session
        return { success: false, expired: true }
      } else { // other errors
        setError(result || 'An error occurred. Please try again.');
      }
    } catch (err) { // other errors
      console.error('Error:', err);
      setError('An error occurred. Please try again.');
    } finally { // reset loading 
      setIsLoading(false);
    }
  };

  return (
    // main container
    <div className="min-h-screen flex items-center justify-center relative bg-[#f8fafc] overflow-hidden">
      {/* animated background */}
      <PerlinNoiseBackground
        className="absolute inset-0 w-full h-full"
        style={{ filter: 'blur(8px)' }}
      />
      {/* overlay */}
      <div className="absolute inset-0 bg-blue-900/20 z-[0]"></div>

      {/* card header */}
      <Card className="w-full max-w-md z-10 bg-white/95 shadow-lg">
        <CardHeader className="border-b border-blue-100/50">
          <CardTitle className="text-2xl text-blue-900">NeuroConnect</CardTitle>
          <CardDescription className="text-blue-700">Enter your credentials to access your account</CardDescription>
        </CardHeader>

        {/* card content with form */}
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

            {/* password input field */}
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

            {/* error message */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* action buttons */}
            <div className="space-y-2">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>

              {/* account creation button */}
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