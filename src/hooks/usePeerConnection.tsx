// Comprehensive hook to manage peer connections, chats, and calls

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Peer, { DataConnection, MediaConnection } from "peerjs";

export function usePeerConnection() {
  const router = useRouter();

  // State variables
  const [currentPeerId, setCurrentPeerId] = useState<string>("");
  const [peerIds, setPeerIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isStrokeScaleOpen, setIsStrokeScaleOpen] = useState<boolean>(false);
  const [activeChats, setActiveChats] = useState<{ [key: string]: DataConnection }>({});
  const [minimizedChats, setMinimizedChats] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<{ [key: string]: boolean }>({});
  const [incomingCall, setIncomingCall] = useState<MediaConnection | null>(null);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [mediaConnection, setMediaConnection] = useState<MediaConnection | null>(null);
  const videoEl = useRef<HTMLVideoElement>(null);
  const [isIncomingCall, setIsIncomingCall] = useState<boolean>(false);
  const [callerId, setCallerId] = useState<string>("");
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [isCallOnHold, setIsCallOnHold] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<'home' | 'strokeScale' | 'files' | 'activeCall'>('home');

  // References
  const peerRef = useRef<Peer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout>();
  const currentPeerIdRef = useRef<string>("");

  useEffect(() => {
    const peer = new Peer({
      host: "videochat-signaling-app.ue.r.appspot.com",
      port: 443,
      secure: true,
      path: "/",
      debug: 3,
    });
    peerRef.current = peer;

    peer.on("open", (id) => {
      setCurrentPeerId(id);
      currentPeerIdRef.current = id;
    });

    peer.on("call", (call) => {
      setIncomingCall(call);
      setIsIncomingCall(true);
      setCallerId(call.peer);
    });

    // Fetch peer IDs
    const fetchPeerIds = () => {
      fetch("https://videochat-signaling-app.ue.r.appspot.com/key=peerjs/peers")
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to fetch peer IDs");
          }
          return response.json();
        })
        .then((data) => {
          const otherPeerIds = data.filter((id: string) => id !== currentPeerIdRef.current);
          setPeerIds(otherPeerIds);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Error fetching peer IDs:", err);
          setError("Failed to load peer IDs. Please try again later.");
          setIsLoading(false);
        });
    };

    fetchPeerIds();
    intervalRef.current = setInterval(fetchPeerIds, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      peerRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (myStream) {
        myStream.getTracks().forEach((track) => track.stop());
      }
      if (mediaConnection) {
        mediaConnection.close();
      }
      Object.values(activeChats).forEach(conn => conn.close());
    };
  }, [myStream, mediaConnection, activeChats]);

  useEffect(() => {
    if (!peerRef.current) return;

    const handleConnection = (conn: DataConnection) => {
      conn.on('data', (data: any) => {
        if (data.type === 'chat' && !activeChats[conn.peer]) {
          setNotifications(prev => ({ ...prev, [conn.peer]: true }));
        }
      });
      
      setActiveChats(prev => ({ ...prev, [conn.peer]: conn }));
    };

    peerRef.current.on('connection', handleConnection);

    return () => {
      peerRef.current?.off('connection', handleConnection);
    };
  }, [activeChats]);

  const initializeChat = (peerId: string) => {
    if (activeChats[peerId]) {
      setMinimizedChats(prev => prev.filter(id => id !== peerId));
      setNotifications(prev => ({ ...prev, [peerId]: false }));
      return;
    }

    const existingConn = Object.entries(activeChats).find(([_, conn]) => conn.peer === peerId)?.[1];
    if (existingConn && existingConn.open) {
      setActiveChats(prev => ({ ...prev, [peerId]: existingConn }));
      setNotifications(prev => ({ ...prev, [peerId]: false }));
      return;
    }

    const peer = peerRef.current;
    if (peer) {
      const conn = peer.connect(peerId);
      conn.on('open', () => {
        setActiveChats(prev => ({ ...prev, [peerId]: conn }));
        setNotifications(prev => ({ ...prev, [peerId]: false }));
      });
    }
  };

  const closeChat = (peerId: string) => {
    const conn = activeChats[peerId];
    if (conn) {
      conn.close();
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
    }
  };

  const minimizeChat = (peerId: string) => {
    setMinimizedChats(prev => 
      prev.includes(peerId) 
        ? prev.filter(id => id !== peerId)
        : [...prev, peerId]
    );
  };

  const establishDataConnection = (peerId: string) => {
    if (activeChats[peerId]) return;

    const peer = peerRef.current;
    if (peer) {
      const conn = peer.connect(peerId);
      conn.on('open', () => {
        setActiveChats(prev => ({ ...prev, [peerId]: conn }));
        setNotifications(prev => ({ ...prev, [peerId]: false }));
      });
    }
  };

  const handleCall = (peerId: string) => {
    console.log(`Calling peer ${peerId}`);
    const peer = peerRef.current;
    if (peer) {
      establishDataConnection(peerId);

      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
        setMyStream(stream);
        const call = peer.call(peerId, stream);
        setMediaConnection(call);
        setIsCallActive(true);
        setActiveView('activeCall');

        call.on("stream", (remoteStream) => {
          if (videoEl.current) {
            videoEl.current.srcObject = remoteStream;
          }
        });

        call.on("close", () => {
          console.log("Call ended");
          endCall();
        });
      }).catch((err) => {
        console.error("Error accessing media devices:", err);
        setError("Failed to access media devices.");
      });
    }
  };

  const acceptCall = () => {
    if (incomingCall) {
      establishDataConnection(incomingCall.peer);

      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
        setMyStream(stream);
        incomingCall.answer(stream);
        setMediaConnection(incomingCall);
        setIsCallActive(true);
        setActiveView('activeCall');

        incomingCall.on("stream", (remoteStream) => {
          if (videoEl.current) {
            videoEl.current.srcObject = remoteStream;
          }
        });

        incomingCall.on("close", () => {
          console.log("Call ended");
          endCall();
        });
      }).catch((err) => {
        console.error("Error accessing media devices:", err);
        setError("Failed to access media devices.");
      });
    }
    setIsIncomingCall(false);
  };

  const declineCall = () => {
    if (incomingCall) {
      incomingCall.close();
    }
    setIsIncomingCall(false);
  };

  const endCall = () => {
    if (mediaConnection) {
      mediaConnection.close();
    }
    if (myStream) {
      myStream.getTracks().forEach((track) => track.stop());
    }
    setIsCallActive(false);
    setActiveView('home');
    setMediaConnection(null);
    setMyStream(null);
  };

  const holdCall = () => {
    if (myStream) {
      myStream.getTracks().forEach((track) => {
        track.enabled = isCallOnHold ? true : false;
      });
      setIsCallOnHold(!isCallOnHold);
    }
  };

  const toggleMute = () => {
    if (myStream) {
      const audioTracks = myStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const handleStrokeScaleOpen = () => {
    setIsStrokeScaleOpen(true);
  };

  const handleStrokeScaleClose = () => {
    setIsStrokeScaleOpen(false);
    setIsSidebarOpen(false);
    if (isCallActive) {
      setActiveView('activeCall');
    }
  };

  const handleLogout = () => {
    document.cookie = "isLoggedIn=false; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push('/login');
  };

  return {
    currentPeerId,
    peerIds,
    error,
    isLoading,
    isMuted,
    isStrokeScaleOpen,
    activeChats,
    minimizedChats,
    notifications,
    incomingCall,
    isIncomingCall,
    callerId,
    myStream,
    mediaConnection,
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
    establishDataConnection,
    setActiveView,
    setNotifications,
  };
}