"use client";

import { Button } from "@/components/ui/button";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { useVideoCall } from "./video-call-provider";

export function CallControls() {
  const {
    isMuted,
    isCallOnHold,
    endCall,
    holdCall,
    toggleMute,
    setActiveTab
  } = useVideoCall();

  return (
    <div className="flex mt-4 space-x-4">
      <Button onClick={endCall} variant="destructive">
        <PhoneOff className="mr-2 h-4 w-4" />
        End Call
      </Button>
      <Button onClick={holdCall} variant="outline">
        {isCallOnHold ? 'Resume Call' : 'Hold Call'}
      </Button>
      <Button onClick={toggleMute} variant="outline">
        {isMuted ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
        {isMuted ? 'Unmute' : 'Mute'}
      </Button>
      <Button 
        onClick={() => setActiveTab('strokeScale')} 
        variant="outline"
      >
        Open Stroke Scale
      </Button>
    </div>
  );
}
