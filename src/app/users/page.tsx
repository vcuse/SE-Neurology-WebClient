"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { MessageCircle, LogOut, Brain, PanelLeftOpen, PanelLeftClose, HomeIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StrokeScaleForm } from "@/components/stroke-scale/stroke-scale-form";
import { ChatBox } from "@/components/video-call/chat-box";
import { usePeerConnection } from "@/hooks/usePeerConnection";

type MenuItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: 'home' | 'strokeScale';
};

const menuItems: MenuItem[] = [
  { icon: HomeIcon, label: 'Home', value: 'home' },
  { icon: Brain, label: 'Stroke Scale', value: 'strokeScale' },
];

export default function Page() {
  const {
    currentPeerId,
    peerIds,
    error,
    isLoading,
    isMuted,
    isStrokeScaleOpen,
    activeChats,
    minimizedChats,
    notifications,
    callerId,
    videoEl,
    isCallActive,
    isCallOnHold,
    isSidebarOpen,
    activeView,
    handleCall,
    acceptCall,
    declineCall,
    endCall,
    holdCall,
    toggleMute,
    handleStrokeScaleOpen,
    handleStrokeScaleClose,
    handleLogout,
    initializeChat,
    closeChat,
    minimizeChat,
    mediaConnection,
    setActiveView,
  } = usePeerConnection();

  return (
    <div className="flex h-screen">
      <div className={`h-full bg-white border-r transition-all duration-200 flex flex-col ${isSidebarOpen ? 'w-64' : 'w-16'}`}>
        <div className="p-4 flex items-center justify-between border-b">
          {isSidebarOpen && (
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6" />
              <span className="font-bold">NeuroCall</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleStrokeScaleClose}
          >
            {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
          </Button>
        </div>
        <div className="flex flex-col gap-2 p-2">
          {menuItems.map((item) => (
            <Button
              key={item.value}
              variant={activeView === item.value ? "default" : "ghost"}
              className={`w-full h-10 ${isSidebarOpen ? 'justify-start px-3' : 'justify-center px-0'}`}
              onClick={() => {
                if (item.value === 'strokeScale') {
                  handleStrokeScaleOpen();
                } else {
                  setActiveView(item.value);
                }
              }}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {isSidebarOpen && <span className="ml-2">{item.label}</span>}
            </Button>
          ))}
          {isCallActive && (
            <Button
              variant={activeView === 'activeCall' ? "default" : "ghost"}
              className={`w-full h-10 ${isSidebarOpen ? 'justify-start px-3' : 'justify-center px-0'}`}
              onClick={() => setActiveView('activeCall')}
            >
              <HomeIcon className="h-5 w-5 shrink-0" />
              {isSidebarOpen && <span className="ml-2">Active Call</span>}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <header className="bg-blue-500 text-white flex items-center justify-end px-6 py-4 shadow-lg">
          <Button 
            onClick={handleLogout} 
            variant="outline" 
            size="sm" 
            className="text-white border-white bg-transparent hover:bg-blue-600 focus:bg-blue-600"
          >
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </header>

        <div className="container mx-auto p-4">
          {activeView === 'home' && (
            <div className="space-y-6">
              <Card className="mb-6 bg-blue-100">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-lg font-semibold mb-2">Your Peer ID:</div>
                    <div className="text-sm bg-muted p-2 rounded-md overflow-x-auto">
                      <code>{currentPeerId}</code>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {isLoading && <div className="text-center">Loading peer IDs...</div>}
              {error && <div className="text-red-500 mb-4">{error}</div>}
              <div className="grid grid-cols-1 gap-4">
                {peerIds.map((peerId) => (
                  <Card key={peerId} className="flex flex-row items-center">
                    <CardContent className="py-4 flex-grow">
                      <div className="text-sm font-medium">Peer ID:</div>
                      <div className="text-xs text-muted-foreground break-all">
                        {peerId}
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 flex gap-2">
                      <Button onClick={() => handleCall(peerId)} size="sm">
                        <HomeIcon className="mr-2 h-4 w-4" /> Call
                      </Button>
                      <Button 
                        onClick={() => initializeChat(peerId)} 
                        size="sm"
                        variant={notifications[peerId] ? "destructive" : "secondary"}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" /> 
                        {notifications[peerId] ? "New Message" : "Chat"}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeView === 'activeCall' && (
            <div className={`${isStrokeScaleOpen ? 'hidden' : ''}`}>
              <h2 className="text-xl font-bold mb-4">Active Call</h2>
              <video
                ref={videoEl}
                autoPlay
                playsInline
                className="w-full h-auto border"
                muted
              ></video>
              <div className="flex mt-4 space-x-4">
                <Button onClick={endCall} variant="destructive">
                  End Call
                </Button>
                <Button onClick={holdCall}>
                  {isCallOnHold ? 'Resume Call' : 'Hold Call'}
                </Button>
                <Button onClick={toggleMute} variant="outline">
                  {isMuted ? 'Unmute' : 'Mute'}
                </Button>
                <Button onClick={handleStrokeScaleOpen} variant="outline">
                  Open Stroke Scale
                </Button>
              </div>

              {mediaConnection && activeChats[mediaConnection.peer] && (
                <div className="mt-4">
                  <ChatBox
                    dataConnection={activeChats[mediaConnection.peer]}
                    currentPeerId={currentPeerId}
                    remotePeerId={mediaConnection.peer}
                    onMinimize={() => minimizeChat(mediaConnection.peer)}
                    minimized={minimizedChats.includes(mediaConnection.peer)}
                  />
                </div>
              )}
            </div>
          )}

          <div className="fixed bottom-4 right-4 flex flex-col-reverse gap-4 max-h-[80vh] overflow-y-auto">
            {Object.entries(activeChats).map(([peerId, conn]) => (
              <ChatBox
                key={peerId}
                dataConnection={conn}
                currentPeerId={currentPeerId}
                remotePeerId={peerId}
                onClose={() => closeChat(peerId)}
                onMinimize={() => minimizeChat(peerId)}
                minimized={minimizedChats.includes(peerId)}
              />
            ))}
          </div>

          <div className="fixed top-4 right-4 flex flex-col gap-2">
            {Object.entries(notifications)
              .filter(([_, hasNotification]) => hasNotification)
              .map(([peerId]) => (
                <Alert key={peerId} className="w-[300px] cursor-pointer" onClick={() => initializeChat(peerId)}>
                  <AlertDescription>
                    New message from {peerId}
                  </AlertDescription>
                </Alert>
              ))}
          </div>
        </div>
      </div>

      {isStrokeScaleOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg overflow-auto max-h-[90vh] w-full max-w-4xl mx-4">
            <StrokeScaleForm onClose={handleStrokeScaleClose} />
          </div>
        </div>
      )}
    </div>
  );
}
