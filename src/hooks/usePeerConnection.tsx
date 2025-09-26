// library imports
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Peer, { DataConnection, MediaConnection } from "peerjs";

// Heartbeat intervals 
type IntervalId = ReturnType<typeof setInterval>;

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
  // Add this new state variable with your others
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
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
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
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

  // --- Presence heartbeat to your server ---
  const startHeartbeat = () => {
    const fetchUrl = process.env.NEXT_PUBLIC_SERVER_FETCH_URL;
    const username =
      (typeof window !== "undefined" && localStorage.getItem("username")) ||
      currentPeerIdRef.current;

    if (!fetchUrl || !username) return;

    const send = () => {
      const payload = JSON.stringify({ username });

      // Prefer sendBeacon for hidden tabs / unload
      if (navigator.sendBeacon) {
        try {
          const url = new URL(fetchUrl);
          url.searchParams.set("action", "heartbeat"); // server can read from query
          const blob = new Blob([payload], { type: "application/json" });
          navigator.sendBeacon(url.toString(), blob);
          return;
        } catch {
          // fall through
        }
      }

      // Fallback: fetch with keepalive
      fetch(fetchUrl, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Action": "heartbeat",
        },
        keepalive: true,
        body: payload,
      }).catch(() => { });
    };

    // fire now, then repeat
    send();
    heartbeatIntervalRef.current = setInterval(send, 25_000);

    const onVis = () => {
      if (document.visibilityState === "hidden") send();
    };
    const onUnload = () => send();

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("beforeunload", onUnload);

    // cleanup
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", onUnload);
    };
  };

  const startPlayback = () => {
    if (videoEl.current) {
        // This is triggered by a human click
        videoEl.current.play().catch(e => {
            console.error('Manual play failed:', e); 
        });
    }

    return () => {
    }
};

  // Add this new effect after your main useEffect
  useEffect(() => {
    // This effect runs *only when* the remoteStream state changes OR the ref is ready.
    if (videoEl.current && remoteStream) {
        console.log('Attaching stream to video element...');
        videoEl.current.srcObject = remoteStream;
        
        // Manual play for browser policy (must be in the effect)
        // videoEl.current.play().catch(error => {
        //     console.error('Video playback failed:', error);
        // });
    }
  }, [videoEl, remoteStream]); // Dependencies: runs when the ref or the stream data changes


  // main hook to initialize connections
  useEffect(() => {
    const secure = process.env.NEXT_PUBLIC_SERVER_SECURE
    const isSecure = secure == 'true';
    // create a PeerJS object with ID retrieved from storage (or make a new one if none exist)
    const storedPeerId = localStorage.getItem('peerId');
    const peer = new Peer(storedPeerId || '', {
      host: process.env.NEXT_PUBLIC_SERVER_URL!,
      port: Number(process.env.NEXT_PUBLIC_SERVER_PORT),
      secure: isSecure,
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
      setIsIncomingCall(true);
      console.log("We are receiving a call");
      setIncomingCall(call);
      setIsIncomingCall(true);
      setCallerId(call.peer);
    });

    // Updated Handler in useEffect:
      peer.on("streamReceived", (stream) => {
        // 1. Convert the track to a stream
        setActiveView('activeCall'); 
        // const stream = new MediaStream(); 
        // stream.addTrack(track);
        console.log('stream active', stream.active);
        // 2. Set both the active view AND the stream state
        setRemoteStream(stream); 

        // setIsIncomingCall(true);
        console.log('Stream data received and saved to state.');
      });

    // Optional: Also listen for errors to understand why it might *not* open
    peer.on("error", (err) => {
      console.error("PeerJS error:", err);
      // Handle errors like server connection issues, invalid ID, etc.
    });
  
    peer.on('connection', setupDataConnection);

    // If the WS drops, try to reconnect
    peer.on('disconnected', () => {
      try {
        peer.reconnect();
      } catch (e) {
        console.warn("Peer reconnect failed:", e);
      }
    });

    // Fetch peer IDs
    const fetchPeerIds = () => {
      fetch(process.env.NEXT_PUBLIC_SERVER_FETCH_PEERS!, { credentials: 'include' })
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

  useEffect(() => {
    // Have we got *either* a stored username or a current Peer ID?
    const hasIdentity =
      (typeof window !== "undefined" && !!localStorage.getItem("username")) ||
      !!currentPeerIdRef.current;

    if (!hasIdentity) return;

    const stop = startHeartbeat(); // returns a cleanup function
    return () => {
      if (stop) stop();
    };
  }, [currentPeerId]);

  // clean up effect after stream or media connection change
  useEffect(() => {
    return () => {
      if (myStream) {
        //myStream.getTracks().forEach((track) => track.stop());
      }
      if (mediaConnection) {
        //mediaConnection.close();
      }
    };
  }, [myStream, mediaConnection]);

  const runTest = async () => {
    try {
      const peer = peerRef.current
      if(peer){
        
        const stream = await peer.checkLocalStream();
        console.log('Successfully got stream from library:', stream);
      }
     
    } catch (e) {
      console.error('Test failed.', e);
    }
  }
  //=====================================
  // CALL MANAGEMENT
  //=====================================

  const handleCall = (peerId: string) => {
    console.log(`Calling peer ${peerId}`);
    const peer = peerRef.current;
    if (peer) {
      const call = peer.call(peerId);
      setActiveView('activeCall');
      // peer.on("streamReceived", (stream) => {
        
      
      // });
    }
    // if (peer) {
    //   navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
    //     setMyStream(stream);
    //     setIsRinging(true);
        
       
    //   });
    // }

    //     // // Setup data channel for chat
    //     // const dataConnection = peer.connect(peerId);
    //     // setupDataConnection(dataConnection);

    

    //     call.on("close", () => {
    //       console.log("Call ended");
    //       endCall();
    //     });
    //   }).catch((err) => {
    //     console.error("Error accessing media devices:", err);
    //     setError("Failed to access media devices.");
    //   });
    // }
  };

  const acceptCall = () => {
    if (incomingCall) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
        setMyStream(stream);
        incomingCall.answer(stream);
        setMediaConnection(incomingCall);
        // setActiveView('activeCall');

        // Connection handler is already set up in the main peer.on('connection') handler

        incomingCall.on("stream", (remoteStream) => {
          if (videoEl.current) {
            // videoEl.current.srcObject = remoteStream;

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
      // myStream.getTracks().forEach((track) => track.stop());
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
    remoteStream,
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
    runTest
  };
}