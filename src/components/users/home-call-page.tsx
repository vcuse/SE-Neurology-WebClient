"use client";

import { useState, useEffect, useRef } from "react";
import Peer, { DataConnection, MediaConnection } from "peerjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { PhoneCall } from "lucide-react";

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

        call.on("stream", (remoteStream) => {
          const videoElement = videoEl.current;
          if (videoElement) {
            videoElement.srcObject = remoteStream;
          }
        });

        call.on("close", () => {
          console.log("Call ended");
          // Handle UI updates or cleanup
        });
      });
    }
  };

  const acceptCall = () => {
    if (incomingCall) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
        setMyStream(stream);
        incomingCall.answer(stream);

        incomingCall.on("stream", (remoteStream) => {
          const videoElement = videoEl.current;
          if (videoElement) {
            videoElement.srcObject = remoteStream;
          }
        });

        incomingCall.on("close", () => {
          console.log("Call ended");
          // Handle UI updates or cleanup
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

  return (
    <div className="container mx-auto p-4">
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
      {/* Video Container */}
      {(myStream || mediaConnection) && (
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-4">Video Call</h2>
          <video
            ref={videoEl}
            autoPlay
            playsInline
            className="w-full h-auto border"
            muted
          ></video>
        </div>
      )}
    </div>
  );
}

export default HomeCallPage;
