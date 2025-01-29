"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import HomeCallPage from '@/components/video-call/home-call-page';
import { StrokeScaleForm } from '@/components/stroke-scale/stroke-scale-form';
import { Button } from '@/components/ui/button';

const UserPage = () => {
  const router = useRouter();
  const [showStrokeScale, setShowStrokeScale] = useState(false);

  const handleLogout = () => {
    document.cookie = "isLoggedIn=false; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push('/login');
  };

  return (
    <div>
      <Button onClick={handleLogout} className="absolute top-4 right-4 z-50">
        Logout
      </Button>
      
      <HomeCallPage />
    </div>
  );
};

export default UserPage;
