"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import HomeCallPage from '@/components/users/home-call-page';
import StrokeScaleForm from '@/components/stroke-scale/stroke-scale-form';
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
      <Button onClick={handleLogout} className="absolute top-4 right-4">
        Logout
      </Button>
      
      <Button 
        onClick={() => setShowStrokeScale(true)}
        className="absolute top-4 right-24"
      >
        Open Stroke Scale
      </Button>

      {showStrokeScale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <StrokeScaleForm onClose={() => setShowStrokeScale(false)} />
        </div>
      )}

      <HomeCallPage />
    </div>
  );
};

export default UserPage;
