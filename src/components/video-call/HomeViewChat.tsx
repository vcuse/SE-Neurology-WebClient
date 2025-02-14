"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChatBoxCore } from "./ChatBoxCore";

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
}

interface HomeViewChatProps {
  currentPeerId: string;
  remotePeerId: string;
  onClose?: () => void;
  minimized?: boolean;
  onMinimize?: () => void;
  visible?: boolean;
  messages: Message[];
  sendMessage: (text: string) => void;
}

export function HomeViewChat({
  currentPeerId,
  remotePeerId,
  onClose,
  minimized = false,
  onMinimize,
  visible = true,
  messages,
  sendMessage,
}: HomeViewChatProps) {
  return (
    <Card className={`mt-4 ${!visible ? 'hidden' : ''}`}>
      <CardContent className="p-4 border-b">
        <div className="flex justify-between items-center">
          <div className="text-sm font-medium truncate">
            Chat with {remotePeerId}
          </div>
          <div className="flex gap-1">
            {onMinimize && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMinimize}
              >
                {minimized ? "+" : "-"}
              </Button>
            )}
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                ×
              </Button>
            )}
          </div>
        </div>
      </CardContent>
      <CardContent className={`p-4 ${minimized ? 'hidden' : ''}`}>
        <ChatBoxCore
          messages={messages}
          sendMessage={sendMessage}
          currentPeerId={currentPeerId}
        />
      </CardContent>
    </Card>
  );
}