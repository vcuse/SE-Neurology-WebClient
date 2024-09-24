"use client";

import { useState, useEffect } from "react";
import Peer from "peerjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { PhoneCall } from "lucide-react";

export function HomeCallPage() {
  const [currentPeerId, setCurrentPeerId] = useState("");
  const [peerIds, setPeerIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const peer = new Peer();
    peer.on("open", (id) => {
      setCurrentPeerId(id);
    });

    // Fetch peer IDs from external JSON source
    fetch("https://videochat-signaling-app.ue.r.appspot.com/key=peerjs/peers")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch peer IDs");
        }
        return response.json();
      })
      .then((data) => {
        console.log("Fetched data:", data); // Log the fetched data
        if (Array.isArray(data)) {
          setPeerIds(data);
        } else if (data && Array.isArray(data.peerIds)) {
          setPeerIds(data.peerIds);
        } else {
          throw new Error("Invalid data format");
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching peer IDs:", err);
        setError("Failed to load peer IDs. Please try again later.");
        setIsLoading(false);
      });

    // Cleanup on component unmount
    return () => {
      peer.destroy();
    };
  }, []);

  const handleCall = (peerId: string) => {
    console.log(`Calling peer ${peerId}`);
    // Implement actual call functionality here
  };

  return (
    <div className="container mx-auto p-4">
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
  );
}

export default HomeCallPage;
