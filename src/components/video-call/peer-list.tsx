"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PhoneCall, MessageCircle } from "lucide-react";
import { useVideoCall } from "./video-call-provider";

interface PeerListProps {
  onInitChat: (peerId: string) => void;
  notifications: { [key: string]: boolean };
}

export function PeerList({ onInitChat, notifications }: PeerListProps) {
  const {
    currentPeerId,
    peerIds,
    isLoading,
    error,
    handleCall
  } = useVideoCall();

  if (isLoading) {
    return <div className="text-center">Loading peer IDs...</div>;
  }

  if (error) {
    return <div className="text-red-500 mb-4">{error}</div>;
  }

  return (
    <div>
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
                <PhoneCall className="mr-2 h-4 w-4" /> Call
              </Button>
              <Button 
                onClick={() => onInitChat(peerId)} 
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
  );
}
