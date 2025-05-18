"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Clipboard, Filter, Sliders } from "lucide-react";
import {
  Pause,
  LogOut,
  Stethoscope,
  User2,
  Video,
  PhoneCall,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Notebook,
  NotebookIcon,
} from "lucide-react";
import { StrokeScaleForm } from "@/components/stroke-scale/stroke-scale-form";
import { usePeerConnection } from "@/hooks/usePeerConnection";
import { cn } from "@/lib/utils";
import { HomeViewChat, CallViewChat } from "@/components/video-call";
import Link from "next/link";


type MenuItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: 'home' | 'strokeScale';
};

const menuItems: MenuItem[] = [
  { icon: Stethoscope, label: 'Consultations', value: 'home' },
  { icon: NotebookIcon, label: 'Forms', value: 'strokeScale' },
];

export default function Page() {
  const [isSidebarExpanded, setIsSidebarExpanded] = React.useState(() => {
    // Get initial state from localStorage, default to true if not set
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarExpanded');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });

  // Save sidebar state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarExpanded', JSON.stringify(isSidebarExpanded));
  }, [isSidebarExpanded]);

  const {
    currentPeerId,
    peerIds,
    error,
    isLoading,
    isMuted,
    callerId,
    setCallerId,
    videoEl,
    audioEl,
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
    isChatVisible,
    minimizedChat,
    toggleChat,
    toggleMinimizeChat,
    initializeChat,
    messages,
    sendMessage,
    isStrokeScaleVisible,
    toggleStrokeScale,
  } = usePeerConnection();

  useEffect(() => {
    if (!isCallOnHold && videoEl.current && mediaConnection?.remoteStream && audioEl.current) {
      videoEl.current.srcObject = mediaConnection.remoteStream;
      audioEl.current.srcObject = mediaConnection.remoteStream;
    }
  }, [isCallOnHold, mediaConnection, videoEl]);

  const [filterOpen, setFilterOpen] = React.useState(false);
  const [selectedFilter, setSelectedFilter] = useState("");
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleclickOutside(event: MouseEvent): void {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleclickOutside);
    return () => {
      document.removeEventListener("mousedown", handleclickOutside);
    };
  }, [filterRef]);

  const handleFilterChange = (value: string) => {
    setSelectedFilter(value);
    setFilterOpen(false);

    if (value === "date") { }

    if (value === "A-Z") { }
  }

  return (
    <div className="flex h-screen bg-[#f8fafc]">
      {/* Collapsible Sidebar */}
      <div className={cn(
        "transition-all duration-300 ease-in-out border-r border-gray-100 bg-white",
        isSidebarExpanded ? "w-[280px]" : "w-[80px]"
      )}>
        <div className="relative p-4">
          <div className={cn(
            "flex items-center pb-6",
            isSidebarExpanded ? "gap-3" : "justify-center"
          )}>
            <Avatar className="h-8 w-8">
              <AvatarFallback>NC</AvatarFallback>
            </Avatar>
            {isSidebarExpanded && (
              <h1 className="text-lg font-semibold text-blue-900">
                NeuroConnect
              </h1>
            )}
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="absolute -right-4 top-6 h-8 w-8 rounded-full border border-gray-200 bg-white p-0 shadow-sm hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
          >
            {isSidebarExpanded ?
              <ChevronLeft className="h-5 w-5" /> :
              <ChevronRight className="h-5 w-5" />
            }
          </Button>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isForms = item.value === 'strokeScale';

              return (
                <HoverCard key={item.value}>
                  <HoverCardTrigger asChild>
                    <Button
                      key={item.value}
                      variant={activeView === item.value ? "secondary" : "ghost"}
                      className={cn(
                        "w-full",
                        isSidebarExpanded ? "justify-start gap-3 px-3" : "p-0",
                        activeView === item.value && "bg-blue-100 text-blue-900 hover:bg-blue-200"
                      )}
                      onClick={() => {
                        if (isForms && activeView === 'activeCall') {
                          const confirm = window.confirm("Clicking this will end the current call. Do you wish to continue?");
                          if (!confirm) {
                            return;
                          }
                          endCall();
                        }
                        setActiveView(item.value);
                      }}
                    >
                      <item.icon className="h-5 w-5 text-blue-600" />
                      {isSidebarExpanded && <span>{item.label}</span>}
                    </Button>
                  </HoverCardTrigger>

                  {!isSidebarExpanded && (
                    <HoverCardContent side="right" className="w-auto text-sm px-2 py-1">
                      {item.label}
                    </HoverCardContent>
                  )}
                </HoverCard>
              );
            })}
          </nav>
        </div>
      </div >

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

        <div className="flex items-center gap-4 p-6 pb-0 relative">
          {activeView === 'strokeScale' && (
            <div ref={filterRef} className="relative">
              <Button
                variant="outline"
                size="sm"
                className="p-2"
                onClick={() => setFilterOpen(open => !open)}
              >
                <Filter className="mr-2 h-4 w-4" />
                {selectedFilter && <span>{selectedFilter === "Date"}</span>}
              </Button>

              {filterOpen && (
                <div className="absolute top-full left-0 mt-1 z-50 w-64 rounded-md border border-gray-200 bg-white shadow-lg">
                  <select value={selectedFilter}
                    onChange={(e) => handleFilterChange(e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 pr-10"
                  >
                    <option value="" disabled>Select Filter</option>
                    <option value="date">Sort by Date</option>
                    <option value="A-Z">Sort A-Z</option>
                  </select>
                </div>
              )}
            </div >
          )}
        </div>

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
                                    <h4 className="font-medium">Video Consultation</h4>
                                    <p className="text-sm text-gray-600">
                                      Start a video consultation with this specialist.
                                    </p>
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                              <HoverCard>
                                <HoverCardTrigger asChild>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      initializeChat(peerId);
                                      setCallerId(peerId);
                                    }}
                                    variant="outline"
                                    className="gap-2 border-blue-200 text-blue-900 hover:bg-blue-50"
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                    <span>Chat</span>
                                  </Button>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-80">
                                  <div className="space-y-2">
                                    <h4 className="font-medium">Text Chat</h4>
                                    <p className="text-sm text-gray-600">
                                      Start a text conversation with this specialist.
                                    </p>
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            </div>
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

              {isChatVisible && (
                <div className="fixed bottom-6 right-6 w-[350px] z-50">
                  <HomeViewChat
                    currentPeerId={currentPeerId}
                    remotePeerId={callerId}
                    onClose={toggleChat}
                    onMinimize={toggleMinimizeChat}
                    minimized={minimizedChat}
                    visible={isChatVisible}
                    messages={messages}
                    sendMessage={sendMessage}
                  />
                </div>
              )}
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
            <div className="w-full px-6">
              <div className={cn(
                "grid gap-6",
                (isChatVisible || isStrokeScaleVisible) ? "grid-cols-[1fr,525px]" : "grid-cols-1"
              )}>
                <Card className="overflow-hidden border-blue-50 flex flex-col">
                  <CardHeader className="border-b border-blue-50 bg-blue-50 p-4">
                    <CardTitle className="flex items-center gap-2 text-blue-900">
                      <PhoneCall className="h-5 w-5" />
                      Ongoing Consultation
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-0 flex flex-col">
                    <div className="relative">
                      {isCallOnHold ? (
                        <div className="flex items-center justify-center h-full bg-gray-100 text-gray-500">
                          <Pause className="h-12 w-12" />
                        </div>
                      ) : (

                        <>
                          <video
                            ref={videoEl}
                            autoPlay
                            playsInline
                            className="w-full max-h-[calc(100vh-250px)] object-contain mx-auto"
                          />
                          <audio
                            ref={audioEl}
                            autoPlay
                            playsInline
                            className="hidden" // Hide the audio player controls
                          />
                        </>
                      )}
                    </div>

                    <div className="flex gap-2 p-4 border-t border-blue-50 bg-white">
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
                      <Button
                        onClick={toggleChat}
                        variant="outline"
                        className="gap-2 border-blue-200 text-blue-900 hover:bg-blue-50"
                      >
                        {isChatVisible ? 'Hide Chat' : 'Show Chat'}
                      </Button>
                      <Button
                        onClick={toggleStrokeScale}
                        variant="outline"
                        className="gap-2 border-blue-200 text-blue-900 hover:bg-blue-50"
                      >
                        {isStrokeScaleVisible ? 'Hide Stroke Scale' : 'Show Stroke Scale'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {isChatVisible && (
                  <Card className="border-blue-50 h-[calc(100vh-200px)] self-start flex flex-col">
                    <CardHeader className="border-b border-blue-50 bg-blue-50 p-4">
                      <CardTitle className="flex items-center gap-2 text-blue-900">
                        <MessageSquare className="h-5 w-5" />
                        Chat
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto">
                      <CallViewChat
                        currentPeerId={currentPeerId}
                        remotePeerId={callerId}
                        messages={messages}
                        sendMessage={sendMessage}
                      />
                    </CardContent>
                  </Card>
                )}
                {isStrokeScaleVisible && (
                  <Card className="border-blue-50 h-[calc(100vh-200px)] self-start flex flex-col">
                    <CardHeader className="border-b border-blue-50 bg-blue-50 p-4">
                      <CardTitle className="flex items-center gap-2 text-blue-900">
                        <Stethoscope className="h-5 w-5" />
                        Stroke Scale Assessment
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto">
                      <StrokeScaleForm onClose={toggleStrokeScale} />
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {activeView === 'strokeScale' && (
            <div className="mx-auto max-w-2xl space-y-6">
              <Card className="border-blue-50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex w-full items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-blue-900"> <Clipboard className="h-5 w-5" />
                      Stroke Scale Forms
                    </CardTitle>

                    <div className="relative w-full sm:w-auto sm:min-w-[240px]">
                      <input type="text"
                        placeholder="Search..."
                        className="w-full rounded-md border border-blue-500 bg-white px-3 py-2 text-sm
                  placeholder:test-grey-400 focus:outline-none focus:ring-2 focus:ring-blue-200 pr-10"
                        onChange={(e) => {
                          console.log(e.target.value);

                        }}
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  { }
                  {(
                    <div className="p-6 text-center text-gray-500">
                      No forms available
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="fixed bottom-6 left-6">
                <Button variant="outline" className="shadow-md hover:bg-blue-50 border-blue-200 text-blue-900"
                  onClick={() => setActiveView('home')}><ChevronLeft className="mr-2 h-4 w-4" />
                  Back to Consultations</Button>
              </div>
            </div>
          )
          }
        </div >
      </main >
    </div >
  );
}
