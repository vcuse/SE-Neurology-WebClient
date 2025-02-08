"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Pause,
  LogOut,
  Stethoscope,
  User2,
  Video,
  PhoneCall,
} from "lucide-react";
import { StrokeScaleForm } from "@/components/stroke-scale/stroke-scale-form";
import { usePeerConnection } from "@/hooks/usePeerConnection";
import { cn } from "@/lib/utils";

type MenuItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: 'home' | 'strokeScale';
};

const menuItems: MenuItem[] = [
  { icon: Stethoscope, label: 'Consultations', value: 'home' },
];

export default function Page() {
  const {
    currentPeerId,
    peerIds,
    error,
    isLoading,
    isMuted,
    callerId,
    videoEl,
    isCallOnHold,
    activeView,
    handleCall,
    acceptCall,
    declineCall,
    endCall,
    holdCall,
    toggleMute,
    handleLogout,
    mediaConnection,
    setActiveView,
    isIncomingCall,
  } = usePeerConnection();

  useEffect(() => {
    if (!isCallOnHold && videoEl.current && mediaConnection?.remoteStream) {
      videoEl.current.srcObject = mediaConnection.remoteStream;
    }
  }, [isCallOnHold, mediaConnection, videoEl]);

  return (
    <div className="flex h-screen bg-[#f8fafc]">
      {/* Static Sidebar */}
      <div className="w-[280px] border-r border-gray-100 bg-white p-4">
        <div className="flex items-center gap-3 pb-6">
          <Avatar className="h-8 w-8">
            <AvatarFallback>NC</AvatarFallback>
          </Avatar>
          <h1 className="text-lg font-semibold text-blue-900">
            NeuroConnect
          </h1>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => (
            <Button
              key={item.value}
              variant={activeView === item.value ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3",
                activeView === item.value && "bg-blue-50 text-blue-900"
              )}
              onClick={() => {
                setActiveView(item.value)
              }}
            >
              <item.icon className="h-5 w-5 text-blue-600" />
              {item.label}
            </Button>
          ))}
        </nav>
      </div>

      <main className="flex-1 overflow-hidden">
        <header className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-blue-100 bg-blue-50 text-blue-900">
              <User2 className="mr-2 h-4 w-4" />
              {currentPeerId ? (
                <span className="font-mono text-sm">{currentPeerId}</span>
              ) : (
                <Skeleton className="h-4 w-24" />
              )}
            </Badge>
          </div>

          <Button
            onClick={handleLogout}
            variant="ghost"
            className="text-red-600 hover:bg-red-50"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </header>

        <div className="h-[calc(100vh-80px)] overflow-y-auto p-6">
          {activeView === 'home' && (
            <div className="mx-auto max-w-4xl space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Connection Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Card className="border-blue-50 bg-white shadow-sm">
                <CardHeader className="border-b border-blue-50">
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Video className="h-5 w-5" />
                    Active Consultations
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="space-y-4 p-6">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : peerIds.length > 0 ? (
                    <div className="divide-y divide-blue-50">
                      {peerIds.map((peerId) => (
                        <div key={peerId} className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback>MD</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-900">{peerId}</p>
                              <p className="text-sm text-gray-500">Cardiology</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <HoverCard>
                              <HoverCardTrigger asChild>
                                <Button
                                  size="sm"
                                  onClick={() => handleCall(peerId)}
                                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                                >
                                  <PhoneCall className="h-4 w-4" />
                                  <span>Video Call</span>
                                </Button>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-80">
                                <div className="space-y-2">
                                  <h4 className="font-medium">Consultation Options</h4>
                                  <p className="text-sm text-gray-600">
                                    Initiate a video consultation or text chat with this specialist.
                                  </p>
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-gray-500">
                      No active consultations available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {isIncomingCall && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <Card className="w-full max-w-md border-blue-50 bg-white shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-blue-900">Incoming Call</CardTitle>
                </CardHeader>
                <CardContent>
                  <AlertDescription>
                    Incoming call from Dr. {callerId}
                    <div className="mt-2 flex justify-end gap-2">
                      <Button variant="ghost" onClick={declineCall}>
                        Decline
                      </Button>
                      <Button onClick={acceptCall}>Accept</Button>
                    </div>
                  </AlertDescription>
                </CardContent>
              </Card>
            </div>
          )}

          {activeView === 'activeCall' && (
            <div className="mx-auto max-w-4xl space-y-6">
              <Card className="overflow-hidden border-blue-50">
                <CardHeader className="border-b border-blue-50 bg-blue-50 p-4">
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <PhoneCall className="h-5 w-5" />
                    Ongoing Consultation
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                  {isCallOnHold ? (
                    <div className="flex h-[500px] w-full items-center justify-center bg-gray-100 text-gray-500">
                      <Pause className="h-12 w-12" />
                    </div>
                  ) : (
                    <video
                      ref={videoEl}
                      autoPlay
                      playsInline
                      className="h-[500px] w-full object-cover"
                      muted
                    />
                  )}

                  <div className="flex gap-2 p-4">
                    <Button
                      onClick={endCall}
                      variant="destructive"
                      className="gap-2"
                    >
                      <PhoneCall className="h-4 w-4" />
                      End Call
                    </Button>
                    <Button
                      onClick={holdCall}
                      variant="outline"
                      className="gap-2 border-blue-200 text-blue-900 hover:bg-blue-50"
                    >
                      {isCallOnHold ? 'Resume' : 'Hold'}
                    </Button>
                    <Button
                      onClick={toggleMute}
                      variant="outline"
                      className="gap-2 border-blue-200 text-blue-900 hover:bg-blue-50"
                    >
                      {isMuted ? 'Unmute' : 'Mute'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
