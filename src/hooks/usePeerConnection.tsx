// library imports
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Peer, { DataConnection, MediaConnection } from "peerjs";

// interface defenition for chat messages
interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
}

// custom react hook for calls
export function usePeerConnection() {
  const router = useRouter();

  //=====================================
  // STATE VARIABLES
  //=====================================

  // peer connection states
  const [currentPeerId, setCurrentPeerId] = useState<string>("");
  const [peerIds, setPeerIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // call management states
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [incomingCall, setIncomingCall] = useState<MediaConnection | null>(null);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [mediaConnection, setMediaConnection] = useState<MediaConnection | null>(null);
  const [isIncomingCall, setIsIncomingCall] = useState<boolean>(false);
  const [callerId, setCallerId] = useState<string>("");
  const [isCallOnHold, setIsCallOnHold] = useState<boolean>(false);
  const [isRinging, setIsRinging] = useState<boolean>(false);

  // UI states
  const [activeView, setActiveView] = useState<'home' | 'strokeScale' | 'files' | 'activeCall'>('home');
  const [minimizedChat, setMinimizedChat] = useState<boolean>(false);
  const [isChatVisible, setIsChatVisible] = useState<boolean>(false);
  const [isStrokeScaleVisible, setIsStrokeScaleVisible] = useState<boolean>(false);

  // messaging states
  const [messages, setMessages] = useState<Message[]>([]);

  //=====================================
  // REFERENCES
  //=====================================

  // remote video and audio refs 
  const videoEl = useRef<HTMLVideoElement>(null);
  const audioEl = useRef<HTMLAudioElement>(null);

  // peer connection refs
  const peerRef = useRef<Peer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout>();
  const currentPeerIdRef = useRef<string>("");
  const dataConnectionRef = useRef<DataConnection | null>(null);


  // set up data connection handler
  const setupDataConnection = (dataConnection: DataConnection) => {
    console.log('Setting up data connection with:', dataConnection.peer);

    // Clean up existing connection if any
    if (dataConnectionRef.current) {
      dataConnectionRef.current.off('data');
      dataConnectionRef.current.off('open');
      dataConnectionRef.current.off('close');
      dataConnectionRef.current.off('error');
      dataConnectionRef.current.close();
    }

    // store new connection and set it to caller id
    dataConnectionRef.current = dataConnection;
    setCallerId(dataConnection.peer);

    // handling for when a channel is opened 
    dataConnection.on('open', () => {
      console.log('Data channel opened');
      // setIsChatVisible(true);
    });

    // handling for incoming chat messages 
    dataConnection.on('data', (data: unknown) => {
      if (typeof data === 'string') {
        setMessages(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          text: data,
          sender: dataConnection.peer,
          timestamp: new Date()
        }]);
        // setIsChatVisible(true);
      }
    });

    // handling for when a channel is closed 
    dataConnection.on('close', () => {
      console.log('Data channel closed');
      dataConnectionRef.current = null;
    });

    // handling for when a connection error occurs
    dataConnection.on('error', (err) => {
      console.error('Data channel error:', err);
      setError('Chat connection error. Please try again.');
    });
  };

  // main hook to initialize connections
  useEffect(() => {
    // create a PeerJS object with ID retrieved from storage (or make a new one if none exist)
    const storedPeerId = localStorage.getItem('peerId');
    const peer = new Peer(storedPeerId || '', {
      host: "videochat-signaling-app.ue.r.appspot.com",
      port: 443,
      secure: true,
      path: "/",
      debug: 3,
    });
    peerRef.current = peer; // saves the object for reuse
    console.log(`created PeerRef with stored peerid ${storedPeerId}`);

    peer.on("open", (id) => {
      // if no ID was saved in storage, store the new one
      if (!storedPeerId) {
        localStorage.setItem('peerId', id);
      }
      setCurrentPeerId(id);
      currentPeerIdRef.current = id; //saves for reuse
    });

    //handle incoming calls
    peer.on('call', (call) => {
      console.log("We are receiving a call");
      setIncomingCall(call);
      setIsIncomingCall(true);
      setCallerId(call.peer);
    });

    // Optional: Also listen for errors to understand why it might *not* open
    peer.on("error", (err) => {
      console.error("PeerJS error:", err);
      // Handle errors like server connection issues, invalid ID, etc.
    });

    peer.on('connection', setupDataConnection);

    // Fetch peer IDs
    const fetchPeerIds = () => {
      fetch("https://videochat-signaling-app.ue.r.appspot.com/key=peerjs/peers", { credentials: 'include' })
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
    intervalRef.current = setInterval(fetchPeerIds, 5000); // updates every 5 seconds

    //=====================================
    // CLEANUP CODE
    //=====================================

    // clean up object after unmounting  
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      console.log("Destroying peerRef");
      peerRef.current?.destroy();
    };
  }, []);

  // clean up effect after stream or media connection change
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

  //=====================================
  // CALL MANAGEMENT
  //=====================================

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
        setupDataConnection(dataConnection);

        call.on("stream", (remoteStream) => {
          if (videoEl.current) {
            videoEl.current.srcObject = remoteStream;

          }
          if (audioEl.current) {
            audioEl.current.srcObject = remoteStream;
            console.log("added audio stream");
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

        // Connection handler is already set up in the main peer.on('connection') handler

        incomingCall.on("stream", (remoteStream) => {
          if (videoEl.current) {
            videoEl.current.srcObject = remoteStream;

          }
          if (audioEl.current) {
            audioEl.current.srcObject = remoteStream;
            console.log("added audio stream");
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
    if (!isChatVisible) {
      setIsStrokeScaleVisible(false);
    }
  };

  const toggleStrokeScale = () => {
    setIsStrokeScaleVisible(prev => !prev);
    if (!isStrokeScaleVisible) {
      setIsChatVisible(false);
    }
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

    // Create and set up new data connection
    const dataConnection = peer.connect(peerId);
    setupDataConnection(dataConnection);
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
    audioEl,
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
    isStrokeScaleVisible,
    toggleStrokeScale,
  };
}