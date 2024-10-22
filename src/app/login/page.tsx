'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from "next/navigation"
import { createNoise2D } from 'simplex-noise'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastFrameTimeRef = useRef(0)
  const FPS = 30 // Limit to 30 FPS
  const frameInterval = 1000 / FPS

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const noise2D = createNoise2D()
    let animationFrameId: number

    const resize = () => {
      // Reduce resolution to 1/4 of screen size
      canvas.width = Math.floor(window.innerWidth / 4)
      canvas.height = Math.floor(window.innerHeight / 4)
      canvas.style.width = '100%'
      canvas.style.height = '100%'
    }

    const animate = (timestamp: number) => {
      // Throttle frame rate
      if (timestamp - lastFrameTimeRef.current < frameInterval) {
        animationFrameId = requestAnimationFrame(animate)
        return
      }
      lastFrameTimeRef.current = timestamp

      const imageData = ctx.createImageData(canvas.width, canvas.height)
      const data = imageData.data
      const time = Date.now() * 0.0001
      
      // Process fewer pixels with larger steps
      for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % canvas.width
        const y = Math.floor((i / 4) / canvas.width)
        
        const nx = x / canvas.width - 0.5
        const ny = y / canvas.height - 0.5
        
        const noise = noise2D(nx + time, ny + time)
        const value = (noise + 1) * 0.5 * 255
        
        data[i] = value     // red
        data[i + 1] = value // green
        data[i + 2] = value // blue
        data[i + 3] = 255   // alpha
      }

      ctx.putImageData(imageData, 0, 0)
      animationFrameId = requestAnimationFrame(animate)
    }

    resize()
    animationFrameId = requestAnimationFrame(animate)

    const debouncedResize = debounce(resize, 250)
    window.addEventListener('resize', debouncedResize)

    return () => {
      window.removeEventListener('resize', debouncedResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  // Debounce helper function
  function debounce(func: Function, wait: number) {
    let timeout: NodeJS.Timeout
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

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
    <div className="min-h-screen flex items-center justify-center relative">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ filter: 'blur(8px)' }}
      />
      <Card className="w-full max-w-md z-10">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => handleSubmit(e, 'login')} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
              <Button 
                className="w-full" 
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
  )
}
