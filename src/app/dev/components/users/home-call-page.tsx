"use client";

import { useState, useEffect, useRef } from "react";
import Peer, { DataConnection, MediaConnection } from "peerjs";
import { Button } from "@/app/dev/components/ui/button";
import { Card, CardContent, CardFooter } from "@/app/dev/components/ui/card";
import { PhoneCall } from "lucide-react";
import PerlinNoiseBackground from '@/app/dev/components/ui/perlinNoiseBackground';

export function HomeCallPage() {
  const [currentPeerId, setCurrentPeerId] = useState("");
  const [peerIds, setPeerIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [dataConnection, setDataConnection] = useState<DataConnection | null>(null);
  const [incomingCall, setIncomingCall] = useState<MediaConnection | null>(null);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [mediaConnection, setMediaConnection] = useState<MediaConnection | null>(null);
  const videoEl = useRef<HTMLVideoElement>(null);

  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [callerId, setCallerId] = useState("");

  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallOnHold, setIsCallOnHold] = useState(false);

  const [activeTab, setActiveTab] = useState<'home' | 'strokeScale' | 'files' | 'activeCall'>('home');

  const tabs = [
    { name: 'Home', key: 'home' },
    { name: 'Stroke Scale', key: 'strokeScale' },
    { name: 'Files', key: 'files' },
  ];

  // Define the peer reference
  const peerRef = useRef<Peer | null>(null);

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
    });

    peer.on("call", (call) => {
      setIncomingCall(call);
      setIsIncomingCall(true);
      setCallerId(call.peer);
    });

    // Fetch peer IDs from external JSON source
    const fetchPeerIds = () => {
      fetch("https://videochat-signaling-app.ue.r.appspot.com/key=peerjs/peers")
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to fetch peer IDs");
          }
          return response.json();
        })
        .then((data) => {
          const otherPeerIds = data.filter((id: string) => id !== currentPeerId);
          setPeerIds(otherPeerIds);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Error fetching peer IDs:", err);
          setError("Failed to load peer IDs. Please try again later.");
          setIsLoading(false);
        });
    };

    // Fetch peer IDs initially and set an interval to refresh
    fetchPeerIds();
    const intervalId = setInterval(fetchPeerIds, 5000);

    // Cleanup on component unmount
    return () => {
      if (myStream) {
        myStream.getTracks().forEach((track) => track.stop());
      }
      if (mediaConnection) {
        mediaConnection.close();
      }
      if (dataConnection) {
        dataConnection.close();
      }
      peerRef.current?.destroy();
      clearInterval(intervalId);
    };
  }, []); // Empty dependency array ensures this runs only once

  const handleCall = (peerId: string) => {
    console.log(`Calling peer ${peerId}`);
    const peer = peerRef.current;
    if (peer) {
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
      myStream.getTracks().forEach((track) => track.stop());
    }
    setIsCallActive(false);
    setActiveTab('home');
    setMediaConnection(null);
    setMyStream(null);
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

  return (
    <div className="container mx-auto p-4">
      {/*Here's where you remove the perlin background if it's too messy looking*/}
      <PerlinNoiseBackground
        className="absolute inset-0 w-full h-full"
        style={{ filter: 'blur(30px)', zIndex: -5}}
      />
      <div className="absolute inset-0 bg-white opacity-60 z-[-4]"></div>
      {isIncomingCall && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-md text-center">
            <p className="mb-4">Incoming call from {callerId}</p>
            <Button onClick={acceptCall} className="mr-2">
              Accept
            </Button>
            <Button onClick={declineCall} variant="destructive">
              Decline
            </Button>
          </div>
        </div>
      )}

      {/* Tab Selector */}
      <div className="mb-4">
        <div className="flex border-b">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`px-4 py-2 -mb-px border-b-2 ${
                activeTab === tab.key ? 'border-blue-500 font-medium' : 'border-transparent'
              }`}
              onClick={() => setActiveTab(tab.key as any)}
            >
              {tab.name}
            </button>
          ))}
          {isCallActive && (
            <button
              className={`px-4 py-2 -mb-px border-b-2 ${
                activeTab === 'activeCall' ? 'border-blue-500 font-medium' : 'border-transparent'
              }`}
              onClick={() => setActiveTab('activeCall')}
            >
              Active Call
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'home' && (
        <div>
          {/* Home Tab Content */}
          <h1 className="text-2xl font-bold mb-6">Home Call Page</h1>
          <Card className="mb-6">
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
                <CardFooter className="p-4">
                  <Button onClick={() => handleCall(peerId)} size="sm">
                    <PhoneCall className="mr-2 h-4 w-4" /> Call
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'strokeScale' && (
        <div>
          {/* Stroke Scale Tab Content */}
          <h1 className="text-2xl font-bold mb-6">Stroke Scale</h1>
          {/* Add your Stroke Scale content here */}
        </div>
      )}

      {activeTab === 'files' && (
        <div>
          {/* Files Tab Content */}
          <h1 className="text-2xl font-bold mb-6">Files</h1>
          {/* Add your Files content here */}
        </div>
      )}

      {activeTab === 'activeCall' && (
        <div className="mt-6">
          {/* Active Call Content */}
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
          </div>
        </div>
      )}
    </div>
  );
}

export default HomeCallPage;
