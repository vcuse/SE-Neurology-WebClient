'use client'

import { useState } from 'react'
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, User } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cookies } from 'next/headers'

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent, action: 'login' | 'create') => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (!username || !password) {
      setError("Please fill in all fields")
      setIsLoading(false)
      return
    }

    try {
      // Simulate a brief loading state
      await new Promise(resolve => setTimeout(resolve, 500))

      if (action === 'login') {
        // Set login cookie
        document.cookie = "isLoggedIn=true; path=/"
        console.log('Login success')
        router.push(`/users?username=${encodeURIComponent(username)}`)
      } else {
        // Simulate account creation
        setError("Account created successfully. You may now log in")
      }
    } catch (err) {
      console.error('Error:', err)
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Login or Create Account</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access or create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => handleSubmit(e, 'login')}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex justify-between mt-6">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
              <Button type="button" onClick={(e) => handleSubmit(e, 'create')} disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
