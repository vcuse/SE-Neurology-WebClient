import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Peer, { DataConnection, MediaConnection } from "peerjs";

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
}

export function usePeerConnection() {
  const router = useRouter();

  // State variables
  const [currentPeerId, setCurrentPeerId] = useState<string>("");
  const [peerIds, setPeerIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [incomingCall, setIncomingCall] = useState<MediaConnection | null>(null);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [mediaConnection, setMediaConnection] = useState<MediaConnection | null>(null);
  const videoEl = useRef<HTMLVideoElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isIncomingCall, setIsIncomingCall] = useState<boolean>(false);
  const [callerId, setCallerId] = useState<string>("");
  const dataConnectionRef = useRef<DataConnection | null>(null);
  const [isCallOnHold, setIsCallOnHold] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'home' | 'strokeScale' | 'files' | 'activeCall'>('home');
  const [isRinging, setIsRinging] = useState<boolean>(false);
  const [minimizedChat, setMinimizedChat] = useState<boolean>(false);
  const [isChatVisible, setIsChatVisible] = useState<boolean>(false);

  // References
  const peerRef = useRef<Peer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout>();
  const currentPeerIdRef = useRef<string>("");

  useEffect(() => {
    const storedPeerId = localStorage.getItem('peerId');
    const peer = new Peer(storedPeerId || '', {
      host: "videochat-signaling-app.ue.r.appspot.com",
      port: 443,
      secure: true,
      path: "/",
      debug: 3,
    });
    peerRef.current = peer;

    peer.on("open", (id) => {
      if (!storedPeerId) {
        localStorage.setItem('peerId', id);
      }
      setCurrentPeerId(id);
      currentPeerIdRef.current = id;
    });

    peer.on("call", (call) => {
      setIncomingCall(call);
      setIsIncomingCall(true);
      setCallerId(call.peer);
    });

    // Set up data channel receiver
    peer.on('connection', (dataConnection) => {
      console.log('Incoming data connection from:', dataConnection.peer);
      dataConnectionRef.current = dataConnection;
      setCallerId(dataConnection.peer);
      
      dataConnection.on('open', () => {
        console.log('Data channel opened');
      });

      dataConnection.on('data', (data: unknown) => {
        if (typeof data === 'string') {
          setMessages(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            text: data,
            sender: dataConnection.peer,
            timestamp: new Date()
          }]);
          setIsChatVisible(true);
        }
      });

      dataConnection.on('close', () => {
        console.log('Data channel closed');
        dataConnectionRef.current = null;
      });

      dataConnection.on('error', (err) => {
        console.error('Data channel error:', err);
        setError('Chat connection error. Please try again.');
      });
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
    };
  }, [myStream, mediaConnection]);

  const handleCall = (peerId: string) => {
    console.log(`Calling peer ${peerId}`);
    const peer = peerRef.current;
    if (peer) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
        setMyStream(stream);
        setIsRinging(true);
        const call = peer.call(peerId, stream);
        setMediaConnection(call);
        setActiveView('activeCall');
        
        // Setup data channel for chat
        const dataConnection = peer.connect(peerId);
        dataConnectionRef.current = dataConnection;
        dataConnection.on('data', (data: unknown) => {
          if (typeof data === 'string') {
            setMessages(prev => [...prev, {
              id: Math.random().toString(36).substr(2, 9),
              text: data,
              sender: peerId,
              timestamp: new Date()
            }]);
          }
        });

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
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
        setMyStream(stream);
        incomingCall.answer(stream);
        setMediaConnection(incomingCall);
        setActiveView('activeCall');
        
        // Setup data channel receiver
        peerRef.current?.on('connection', (dataConnection) => {
          dataConnectionRef.current = dataConnection;
          dataConnection.on('data', (data: unknown) => {
            if (typeof data === 'string') {
              setMessages(prev => [...prev, {
                id: Math.random().toString(36).substr(2, 9),
                text: data,
                sender: dataConnection.peer,
                timestamp: new Date()
              }]);
            }
          });
        });

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
    setIsRinging(false);
  };

  const endCall = () => {
    if (mediaConnection) {
      mediaConnection.close();
    }
    if (myStream) {
      myStream.getTracks().forEach((track) => track.stop());
    }
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
      myStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted ? true : false;
      });
      setIsMuted(!isMuted);
    }
  };

  const sendMessage = (text: string) => {
    if (dataConnectionRef.current?.open) {
      dataConnectionRef.current.send(text);
      setMessages(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        text,
        sender: currentPeerId,
        timestamp: new Date()
      }]);
    }
  };

  const handleLogout = () => {
    document.cookie = "isLoggedIn=false; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    localStorage.removeItem('peerId');
    router.push('/login');
  };

  const toggleChat = () => {
    setIsChatVisible(prev => !prev);
  };

  const toggleMinimizeChat = () => {
    setMinimizedChat(prev => !prev);
  };

  const initializeChat = (peerId: string) => {
    const peer = peerRef.current;
    if (!peer) return;

    // Close existing data connection if any
    if (dataConnectionRef.current) {
      dataConnectionRef.current.close();
      dataConnectionRef.current = null;
    }

    // Create new data connection
    const dataConnection = peer.connect(peerId);
    dataConnectionRef.current = dataConnection;

    // Set up connection event handlers
    dataConnection.on('open', () => {
      console.log('Data channel opened');
      setIsChatVisible(true); // Show chat for sender when they initiate
    });

    dataConnection.on('data', (data: unknown) => {
      if (typeof data === 'string') {
        setMessages(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          text: data,
          sender: peerId,
          timestamp: new Date()
        }]);
        setIsChatVisible(true);
      }
    });

    dataConnection.on('close', () => {
      console.log('Data channel closed');
      dataConnectionRef.current = null;
    });

    dataConnection.on('error', (err) => {
      console.error('Data channel error:', err);
      setError('Chat connection error. Please try again.');
    });
  };

  return {
    currentPeerId,
    peerIds,
    error,
    isLoading,
    isMuted,
    incomingCall,
    isIncomingCall,
    callerId,
    setCallerId,
    myStream,
    mediaConnection,
    videoEl,
    isCallOnHold,
    activeView,
    messages,
    setMessages,
    sendMessage,
    handleCall,
    acceptCall,
    declineCall,
    endCall,
    holdCall,
    toggleMute,
    handleLogout,
    setActiveView,
    isRinging,
    isChatVisible,
    minimizedChat,
    toggleChat,
    toggleMinimizeChat,
    initializeChat,
  };
}