"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useVideoCall } from "./video-call-provider";

interface NotificationAreaProps {
  chatNotifications: { [key: string]: boolean };
  onInitChat: (peerId: string) => void;
}

export function NotificationArea({ chatNotifications, onInitChat }: NotificationAreaProps) {
  const {
    isIncomingCall,
    callerId,
    acceptCall,
    declineCall
  } = useVideoCall();

  return (
    <>
      {/* Incoming Call Modal */}
      {isIncomingCall && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
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

      {/* Chat Notifications */}
      <div className="fixed top-4 right-4 flex flex-col gap-2">
        {Object.entries(chatNotifications)
          .filter(([_, hasNotification]) => hasNotification)
          .map(([peerId]) => (
            <Alert key={peerId} className="w-[300px] cursor-pointer" onClick={() => onInitChat(peerId)}>
              <AlertDescription>
                New message from {peerId}
              </AlertDescription>
            </Alert>
          ))}
      </div>
    </>
  );
}
