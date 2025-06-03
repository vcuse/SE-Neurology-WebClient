"use client";
// library imports
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
// custom imports 
import NewStrokeScaleForm from "@/app/stroke-scale/new-stroke-scale-form";
import { usePeerConnection } from "@/hooks/usePeerConnection";
import { cn } from "@/lib/utils";
import { HomeViewChat, CallViewChat } from "@/components/video-call";
import Link from "next/link";

// type defenition for sidebar menu items 
// type defenition for sidebar menu items 
type MenuItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: 'home' | 'strokeScale';
};

// array of current menu items in the sidebar
// array of current menu items in the sidebar
const menuItems: MenuItem[] = [
  { icon: Stethoscope, label: 'Consultations', value: 'home' },
  { icon: NotebookIcon, label: 'Stroke Scale Forms', value: 'strokeScale' },
];

//=====================================
// SIDEBAR BEHAVIOR
//=====================================

// sidebar expand/collapse behavior
//=====================================
// SIDEBAR BEHAVIOR
//=====================================

// sidebar expand/collapse behavior
export default function Page() {
  const [isSidebarExpanded, setIsSidebarExpanded] = React.useState(() => {
    // get initial state from localStorage, default to true if not set
    // get initial state from localStorage, default to true if not set
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarExpanded');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });

  // save sidebar state to localStorage whenever it changes
  // save sidebar state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarExpanded', JSON.stringify(isSidebarExpanded));
  }, [isSidebarExpanded]);

  const [isNewFormVisible, setIsNewFormVisible] = useState(false);
  const [savedForms, setSavedForms] = useState<any[]>([]);

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

  //=====================================
  // VIDEO STREAM HANDLING
  //=====================================

  // manage remote video and audio streams
  //=====================================
  // VIDEO STREAM HANDLING
  //=====================================

  // manage remote video and audio streams
  useEffect(() => {
    if (!isCallOnHold && videoEl.current && mediaConnection?.remoteStream && audioEl.current) { // only set up streams if not on hold and the connectio is valid
    if (!isCallOnHold && videoEl.current && mediaConnection?.remoteStream && audioEl.current) { // only set up streams if not on hold and the connectio is valid
      videoEl.current.srcObject = mediaConnection.remoteStream;
      audioEl.current.srcObject = mediaConnection.remoteStream;
    }
  }, [isCallOnHold, mediaConnection, videoEl]);

  //=====================================
  // FILTER DROPDOWN HANDLING
  //=====================================

  //=====================================
  // FILTER DROPDOWN HANDLING
  //=====================================

  const [filterOpen, setFilterOpen] = React.useState(false);
  const [selectedFilter, setSelectedFilter] = useState("");
  const filterRef = useRef<HTMLDivElement>(null);

  // close the filter when you click outside 
  // close the filter when you click outside 
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
    function handleClickOutside(event: MouseEvent): void {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [filterRef]);

  // filtering handler (not yet implemented)
  // filtering handler (not yet implemented)
  const handleFilterChange = (value: string) => {
    setSelectedFilter(value);
    setFilterOpen(false);

    if (value === "date") { }

    if (value === "A-Z") { }
  }

  useEffect(() => {
    if (activeView === 'strokeScale') {
      fetchSavedForms();
    }
  }, [activeView]);

  const fetchSavedForms = async () => {
    const username = localStorage.getItem("username");
    if (!username) {
      alert("Username missing. Please log in again.");
      return;
    }

    try {
      const response = await fetch("https://videochat-signaling-app.ue.r.appspot.com/key=peerjs/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Action": "getUsersForms",
        },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch forms");
      }

      const forms = await response.json();
      setSavedForms(forms);
    } catch (error) {
      console.error("Error fetching forms:", error);
    }
  };


  //=====================================
  // MAIN RENDER
  //=====================================

  return (
    <div className="flex h-screen bg-[#f8fafc]">
      {/*=====================================
        Collapsible Sidebar 
        =====================================*/}
      {/*=====================================
        Collapsible Sidebar 
        =====================================*/}
      <div className={cn(
        "transition-all duration-300 ease-in-out border-r border-gray-100 bg-white",
        isSidebarExpanded ? "w-[280px]" : "w-[80px]"
      )}>
        {/*logo styling*/}
        {/*logo styling*/}
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

          {/*toggle sidebar*/}
          {/*toggle sidebar*/}
          <Button
            variant="secondary"
            size="sm"
            className="absolute -right-4 top-6 h-8 w-8 rounded-full border border-gray-200 bg-white p-0 shadow-sm hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
          >
            {isSidebarExpanded ?
              <ChevronLeft className="h-5 w-5" /> : // collapse
              <ChevronRight className="h-5 w-5" /> // expand
              <ChevronLeft className="h-5 w-5" /> : // collapse
              <ChevronRight className="h-5 w-5" /> // expand
            }
          </Button>

          {/*navigation sidebar*/}
          {/*navigation sidebar*/}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isForms = item.value === 'strokeScale';

              return (
                <HoverCard key={item.value}>
                  <HoverCardTrigger asChild>
                    <Button
                      key={item.value}
                      variant={activeView === item.value ? "secondary" : "ghost"} // highlights active view
                      variant={activeView === item.value ? "secondary" : "ghost"} // highlights active view
                      className={cn(
                        "w-full",
                        isSidebarExpanded ? "justify-start gap-3 px-3" : "p-0", // expand/change layout
                        isSidebarExpanded ? "justify-start gap-3 px-3" : "p-0", // expand/change layout
                        activeView === item.value && "bg-blue-100 text-blue-900 hover:bg-blue-200"
                      )}
                      // handle when trying to change view while on an active call
                      // handle when trying to change view while on an active call
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

                  {/* shows tooltip if the sidebar is collapsed*/}
                  {/* shows tooltip if the sidebar is collapsed*/}
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

      {/*=====================================
        MAIN AREA 
        =====================================*/}
      {/*=====================================
        MAIN AREA 
        =====================================*/}
      <main className="flex-1 overflow-hidden">
        {/*header bar at top*/}
        {/*header bar at top*/}
        <header className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <div className="flex items-center gap-2">
            {/* shows the user's ID*/}
            {/* shows the user's ID*/}
            <Badge variant="outline" className="border-blue-100 bg-blue-50 text-blue-900">
              <User2 className="mr-2 h-4 w-4" />
              {currentPeerId ? (
                <span className="font-mono text-sm">{currentPeerId}</span>
              ) : (
                <Skeleton className="h-4 w-24" />
              )}
            </Badge>
          </div>

          {/* logout button */}
          {/* logout button */}
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="text-red-600 hover:bg-red-50"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </header>

        {activeView === 'strokeScale' && !isNewFormVisible && (
          <div className="flex justify-between items-center px-6 pt-4">
            {/* Filter button on the left */}
            <div ref={filterRef} className="relative">
              <Button
                variant="outline"
                size="sm"
                className="p-2"
                onClick={() => setFilterOpen(open => !open)}
              >
                <Filter className="mr-2 h-4 w-4" />
              </Button>

              {/* dropdown menu */}
              {/* dropdown menu */}
              {filterOpen && (
                <div className="absolute top-full left-0 mt-1 z-50 w-64 rounded-md border border-gray-200 bg-white shadow-lg">
                  <select
                    value={selectedFilter}
                    onChange={(e) => handleFilterChange(e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 pr-10"
                  >
                    <option value="" disabled>Select Filter</option>
                    <option value="date">Sort by Date</option>
                    <option value="A-Z">Sort A-Z</option>
                  </select>
                </div>
              )}
            </div>

            {/* Search + New Form on the right */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => setIsNewFormVisible(true)}
              >
                + New Form
              </Button>
            </div>
          </div>
        )}


        {isNewFormVisible && (
          <Card className="border-blue-50">
            <CardContent>
              <NewStrokeScaleForm onCancel={() => {
                setIsNewFormVisible(false);
                setActiveView("strokeScale");
              }} />
            </CardContent>
          </Card>
        )}

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
                    // list of available peers
                    // list of available peers
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
                          {/* action buttons */}
                          {/* action buttons */}
                          <div className="flex gap-2">
                            <div className="flex gap-2">
                              {/* video call button */}
                              {/* video call button */}
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
                                {/* chat button */}
                                {/* chat button */}
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

              {/* chat widget in home view */}
              {/* chat widget in home view */}
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

          {/* incoming call popup */}
          {/* incoming call popup */}
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

          {/* active call view */}
          {/* active call view */}
          {activeView === 'activeCall' && (
            <div className="h-[calc(100vh-140px)] overflow-y-auto p-6">
              <div className={cn(
                "flex gap-6 grid-cols-1",
                (isChatVisible || isStrokeScaleVisible) ? "flex-col lg:flex-row" : "flex-col"
              )}>

                {/* call panel */}
                <div className="flex-1 min-w-0">
                  <Card className="h-full flex flex-col overflow-hidden border-blue-50">
                    <CardHeader className="border-b border-blue-50 bg-blue-50 p-4 flex-shrink-0">
                      <CardTitle className="flex items-center gap-2 text-blue-900">
                        <PhoneCall className="h-5 w-5" />
                        Ongoing Consultation
                      </CardTitle>
                    </CardHeader>

                    {/* video display area */}
                    <CardContent className="p-4 flex-1 flex flex-col">
                      <div className="flex-1 flex items-center justify-center mb-4 min-h-0 p-2">
                        {isCallOnHold ? (
                          // on hold  
                          <div className="flex items-center justify-center bg-gray-100 text-gray-500 rounded-lg w-full">
                            <Pause className="h-12 w-12" />
                          </div>
                        ) : (
                          // active call
                          <div className="w-full max-w-[800px] aspect-[900/570] mx-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
                            {/* remote video stream */}
                            <video
                              ref={videoEl}
                              autoPlay
                              playsInline
                              className="w-full h-full object-cover rounded-lg bg-black"
                            />
                            {/* remote audio stream */}
                            <audio
                              ref={audioEl}
                              autoPlay
                              playsInline
                              className="hidden" // hide the audio player controls
                            />
                          </div>
                        )}
                      </div>

                      {/* call control buttons */}
                      <div className="flex gap-2 pt-4 border-t border-blue-50 bg-white flex-wrap">
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
                </div>

                {/* chat panel during video call */}
                {/* chat panel during video call */}
                {isChatVisible && (
                  <Card className="border-blue-50 w-full lg:w-[400px] h-[675px] flex-shrink-0 flex flex-col">
                    <CardHeader className="border-b border-blue-50 bg-blue-50 p-4 flex-shrink-0">
                  <Card className="border-blue-50 h-[715px] w-[550px] self-start flex flex-col">
                    <CardHeader className="border-b border-blue-50 bg-blue-50 p-4">
                      <CardTitle className="flex items-center gap-2 text-blue-900">
                        <MessageSquare className="h-5 w-5" />
                        Chat
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-hidden">
                    <CardContent className="p-0 flex-1 overflow-hidden">
                      <CallViewChat
                        currentPeerId={currentPeerId}
                        remotePeerId={callerId}
                        messages={messages}
                        sendMessage={sendMessage}
                      />
                    </CardContent>
                  </Card>
                )}
                {/* stroke assessment scale during video call */}
                {/* stroke assessment scale during video call */}
                {isStrokeScaleVisible && (
                  <Card className="border-blue-50 w-full lg:w-[400px] h-[675px] flex-shrink-0 flex flex-col">
                    <CardHeader className="border-b border-blue-50 bg-blue-50 p-4 flex-shrink-0">
                      <CardTitle className="flex items-center gap-2 text-blue-900">
                        <Stethoscope className="h-5 w-5" />
                        Stroke Scale Assessment
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto">
                      <NewStrokeScaleForm onCancel={toggleStrokeScale} />
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* stroke scale forms view */}
          {/* stroke scale forms view */}
          {activeView === 'strokeScale' && (
            <div className="mx-auto max-w-2xl space-y-6">
              <Card className="border-blue-50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex w-full items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-blue-900"> <Clipboard className="h-5 w-5" />
                      Stroke Scale Forms
                    </CardTitle>

                    {/* search bar*/}
                    {/* search bar*/}
                    <div className="relative w-full sm:w-auto sm:min-w-[240px]">
                      <input type="text"
                        placeholder="Search..."
                        className="w-full rounded-md border border-blue-500 bg-white px-3 py-2 text-sm
                  placeholder:test-grey-400 focus:outline-none focus:ring-2 focus:ring-blue-200 pr-10"
                        onChange={(e) => {
                          {/* logic not yet implemented */ }

                        }}
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
  {savedForms.length > 0 ? (
    savedForms.map((form, index) => (
      <div
        key={index}
        className="border border-blue-200 rounded-lg p-4 m-4 flex items-center justify-between"
      >
        <div>
          <h2 className="text-xl font-semibold text-blue-900">{form.name}</h2>
          <p className="text-gray-600">DOB: {form.dob}</p>
          <p className="text-gray-600">Date: {form.form_date}</p>
        </div>
        <Button className="bg-blue-600 text-white hover:bg-blue-700">
          View Form
        </Button>
      </div>
    ))
  ) : (
    <div className="p-6 text-center text-gray-500">
      No forms available
    </div>
  )}
</CardContent>

              </Card>

              {/* button that takes you back to consultations / home page */}
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
