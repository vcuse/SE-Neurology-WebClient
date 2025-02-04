"use client";

import { useEffect, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Peer, { DataConnection } from "peerjs";
import { StrokeScaleForm } from "@/components/stroke-scale/stroke-scale-form";
import { ChatBox } from "./chat-box";
import { VideoCallProvider, useVideoCall } from "./video-call-provider";
import { PeerList } from "./peer-list";
import { CallUI } from "./call-ui";
import { NotificationArea } from "./notification-area";
import PerlinNoiseBackground from "@/components/ui/perlin-noise-background";

function HomeCallPageContent() {
  const [activeTab, setActiveTab] = useState<'home' | 'strokeScale' | 'files' | 'activeCall'>('home');
  const [activeChats, setActiveChats] = useState<{[key: string]: DataConnection}>({});
  const [minimizedChats, setMinimizedChats] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<{[key: string]: boolean}>({});
  const [visibleChats, setVisibleChats] = useState<string[]>([]);

  const { peerRef, isCallActive } = useVideoCall();

  // Handle incoming connections
  useEffect(() => {
    const peer = peerRef.current;
    if (!peer) return;

    const handleConnection = (conn: DataConnection) => {
      // Set up connection handlers
      conn.on('open', () => {
        setActiveChats(prev => ({ ...prev, [conn.peer]: conn }));
      });

      conn.on('data', (data: any) => {
        if (data.type === 'chat') {
          if (!activeChats[conn.peer] || !visibleChats.includes(conn.peer) || minimizedChats.includes(conn.peer)) {
            setNotifications(prev => ({ ...prev, [conn.peer]: true }));
          }
        }
      });
      
      const existingConn = activeChats[conn.peer];
      if (!existingConn) {
        setActiveChats(prev => ({ ...prev, [conn.peer]: conn }));
      }
    };

    peerRef.current.on('connection', handleConnection);

    return () => {
      peerRef.current?.off('connection', handleConnection);
    };
  }, [activeChats, visibleChats, minimizedChats]);

  // Initialize or show existing chat
  const initializeChat = (peerId: string) => {
    if (activeChats[peerId]) {
      setVisibleChats(prev => [...prev.filter(id => id !== peerId), peerId]);
      setMinimizedChats(prev => prev.filter(id => id !== peerId));
      setNotifications(prev => ({ ...prev, [peerId]: false }));
      return;
    }

    const peer = peerRef.current;
    if (peer) {
      const conn = peer.connect(peerId);
      
      // Set up connection handlers
      conn.on('open', () => {
        setActiveChats(prev => ({ ...prev, [peerId]: conn }));
        setVisibleChats(prev => [...prev, peerId]);
        setNotifications(prev => ({ ...prev, [peerId]: false }));
      });

      // Set up data handlers
      conn.on('data', (data: any) => {
        if (data.type === 'chat') {
          if (!visibleChats.includes(peerId) || minimizedChats.includes(peerId)) {
            setNotifications(prev => ({ ...prev, [peerId]: true }));
          }
        }
      });

      // Handle connection close
      conn.on('close', () => {
        closeChat(peerId);
      });
    }
  };

  // Close chat and clean up connection
  const closeChat = (peerId: string) => {
    const conn = activeChats[peerId];
    if (conn) {
      // Remove all listeners before closing
      conn.removeAllListeners();
      conn.close();
      
      // Clean up state
      setActiveChats(prev => {
        const newChats = { ...prev };
        delete newChats[peerId];
        return newChats;
      });
      setNotifications(prev => {
        const newNotifications = { ...prev };
        delete newNotifications[peerId];
        return newNotifications;
      });
      setVisibleChats(prev => prev.filter(id => id !== peerId));
      setMinimizedChats(prev => prev.filter(id => id !== peerId));
    }
  };

  const minimizeChat = (peerId: string) => {
    setMinimizedChats(prev => 
      prev.includes(peerId) 
        ? prev.filter(id => id !== peerId)
        : [...prev, peerId]
    );
  };

  const handleConnectionEstablished = (peerId: string, newConn: DataConnection) => {
    setActiveChats(prev => ({ ...prev, [peerId]: newConn }));
  };

  const tabs = [
    { name: 'Home', key: 'home' },
    { name: 'Stroke Scale', key: 'strokeScale' },
    { name: 'Files', key: 'files' },
  ];

  // Update active tab when call status changes
  useEffect(() => {
    if (isCallActive && activeTab !== 'activeCall') {
      setActiveTab('activeCall');
    }
  }, [isCallActive, activeTab]);

  return (
      <div className="min-h-screen relative">
        <div className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
          <PerlinNoiseBackground
            className="absolute inset-0 w-full h-full"
            style={{ filter: 'blur(30px)'}}
          />
          <div className="absolute inset-0 bg-white opacity-60"></div>
        </div>

        <div className="relative min-h-screen z-0">
          <div className="container mx-auto p-4">
            <NotificationArea 
              chatNotifications={notifications}
              onInitChat={initializeChat}
            />

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
              <TabsList className="w-full border-b rounded-none bg-transparent">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.key}
                    value={tab.key}
                    className="data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    {tab.name}
                  </TabsTrigger>
                ))}
                {activeTab === 'activeCall' && (
                  <TabsTrigger
                    value="activeCall"
                    className="data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    Active Call
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="home">
                <h1 className="text-2xl font-bold mb-6">Home Call Page</h1>
                <PeerList 
                  onInitChat={initializeChat}
                  notifications={notifications}
                />
              </TabsContent>

              <TabsContent value="strokeScale">
                <div className="mt-6">
                  <StrokeScaleForm />
                </div>
              </TabsContent>

              <TabsContent value="files">
                <h1 className="text-2xl font-bold mb-6">Files</h1>
                {/* Add your Files content here */}
              </TabsContent>

              <TabsContent value="activeCall">
                <CallUI />
              </TabsContent>
            </Tabs>

            {/* Standalone Chat Boxes */}
            <div className="fixed bottom-4 right-4 flex flex-col-reverse gap-4 max-h-[80vh] overflow-y-auto">
              {Object.entries(activeChats).map(([peerId, conn]) => (
                <ChatBox
                  key={peerId}
                  dataConnection={conn}
                  currentPeerId={peerRef.current?.id || ''}
                  remotePeerId={peerId}
                  onClose={() => closeChat(peerId)}
                  onMinimize={() => minimizeChat(peerId)}
                  minimized={minimizedChats.includes(peerId)}
                  visible={visibleChats.includes(peerId)}
                  peer={peerRef.current}
                  onConnectionEstablished={(conn) => handleConnectionEstablished(peerId, conn)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
  );
}

export function HomeCallPage() {
  return (
    <VideoCallProvider>
      <HomeCallPageContent />
    </VideoCallProvider>
  );
}

export default HomeCallPage;
