"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import Peer, { DataConnection, MediaConnection } from "peerjs";

interface VideoCallContextType {
  currentPeerId: string;
  peerIds: string[];
  isLoading: boolean;
  error: string | null;
  isMuted: boolean;
  isCallActive: boolean;
  isCallOnHold: boolean;
  myStream: MediaStream | null;
  mediaConnection: MediaConnection | null;
  videoEl: React.RefObject<HTMLVideoElement>;
  handleCall: (peerId: string) => void;
  acceptCall: () => void;
  declineCall: () => void;
  endCall: () => void;
  holdCall: () => void;
  toggleMute: () => void;
  isIncomingCall: boolean;
  callerId: string;
  peerRef: React.RefObject<Peer | null>;
  establishDataConnection: (peerId: string) => void;
  setActiveTab: (tab: string) => void;
}

const VideoCallContext = createContext<VideoCallContextType | null>(null);

export function useVideoCall() {
  const context = useContext(VideoCallContext);
  if (!context) {
    throw new Error("useVideoCall must be used within a VideoCallProvider");
  }
  return context;
}

export function VideoCallProvider({ children }: { children: React.ReactNode }) {
  const [currentPeerId, setCurrentPeerId] = useState("");
  const [peerIds, setPeerIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [mediaConnection, setMediaConnection] = useState<MediaConnection | null>(null);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [callerId, setCallerId] = useState("");
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallOnHold, setIsCallOnHold] = useState(false);
  const [incomingCall, setIncomingCall] = useState<MediaConnection | null>(null);
  const [activeTab, setActiveTab] = useState('home');

  const videoEl = useRef<HTMLVideoElement>(null);
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
      if (myStream) {
        myStream.getTracks().forEach((track) => track.stop());
      }
      peerRef.current?.destroy();
    };
  }, []);

  const establishDataConnection = (peerId: string) => {
    const peer = peerRef.current;
    if (peer) {
      const conn = peer.connect(peerId);
      return conn;
    }
    return null;
  };

  const handleCall = (peerId: string) => {
    console.log(`Calling peer ${peerId}`);
    const peer = peerRef.current;
    if (peer) {
      // First establish data connection for chat
      establishDataConnection(peerId);

      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
        setMyStream(stream);
        const call = peer.call(peerId, stream);
        setMediaConnection(call);
        setIsCallActive(true);
        setActiveTab('activeCall');

        call.on("stream", (remoteStream) => {
          const videoElement = videoEl.current;
          if (videoElement) {
            videoElement.srcObject = remoteStream;
          }
        });

        call.on("close", () => {
          console.log("Call ended");
          endCall();
        });
      });
    }
  };

  const acceptCall = () => {
    if (incomingCall) {
      // First establish data connection for chat
      establishDataConnection(incomingCall.peer);

      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
        setMyStream(stream);
        incomingCall.answer(stream);
        setMediaConnection(incomingCall);
        setIsCallActive(true);
        setActiveTab('activeCall');

        incomingCall.on("stream", (remoteStream) => {
          const videoElement = videoEl.current;
          if (videoElement) {
            videoElement.srcObject = remoteStream;
          }
        });

        incomingCall.on("close", () => {
          console.log("Call ended");
          endCall();
        });
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
      myStream.getTracks().forEach((track) => {
        track.stop();
      });
    }
    setIsCallActive(false);
    setActiveTab('home');
    setMediaConnection(null);
    setMyStream(null);
    setIsCallOnHold(false);
    
    // Clean up video element
    if (videoEl.current) {
      videoEl.current.srcObject = null;
    }
  };

  const holdCall = () => {
    if (myStream) {
      myStream.getTracks().forEach((track) => {
        if (isCallOnHold) {
          track.enabled = true;
        } else {
          track.enabled = false;
        }
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

  const value = {
    currentPeerId,
    peerIds,
    isLoading,
    error,
    isMuted,
    isCallActive,
    isCallOnHold,
    myStream,
    mediaConnection,
    videoEl,
    handleCall,
    acceptCall,
    declineCall,
    endCall,
    holdCall,
    toggleMute,
    isIncomingCall,
    callerId,
    peerRef,
    establishDataConnection,
    setActiveTab,
  };

  return (
    <VideoCallContext.Provider value={value}>
      {children}
    </VideoCallContext.Provider>
  );
}
