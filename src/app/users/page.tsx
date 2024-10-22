"use client"

import { useRouter } from 'next/navigation'
import HomeCallPage from "@/components/users/home-call-page"
import { Button } from "@/components/ui/button"

const UserPage = () => {
  const router = useRouter()

  const handleLogout = () => {
    document.cookie = "isLoggedIn=false; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    router.push('/login')
  }

  return (
    <div>
      <Button onClick={handleLogout} className="absolute top-4 right-4">Logout</Button>
      <HomeCallPage />
    </div>
  )
}

export default UserPage
