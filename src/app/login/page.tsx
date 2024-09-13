"use client";

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const router = useRouter();

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (username.length === 0 || password.length === 0) {
      window.alert('Please fill in all fields');
    } else {
      const data = { username, password };

      try {
        const response = await fetch('https://videochat-signaling-app.ue.r.appspot.com/key=peerjs/post', {
          method: 'POST',
          body: JSON.stringify(data),
          headers: {
            'Content-Type': 'application/json',
            Action: 'login',
          },
        });

        const result = await response.text();

        if (
          result !== 'Invalid username or password' &&
          result !== 'No more than one active session per user is allowed'
        ) {
          window.alert('Login success');
          router.push(`/index?username=${encodeURIComponent(username)}`);
        } else {
          window.alert(result);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.error(err);
        } else {
          console.error('An unexpected error occurred');
        }
      }
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-4 border rounded">
      <h1 className="text-2xl font-bold mb-5">Login</h1>
      <form onSubmit={submit}>
        <div className="mb-4">
          <label htmlFor="username" className="block text-sm font-medium mb-1">
            Username
          </label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>
        <Button type="submit">Login</Button>
      </form>
    </div>
  );
}
