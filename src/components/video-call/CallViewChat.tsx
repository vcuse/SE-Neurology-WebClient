"use client";

import { ChatBoxCore } from "./ChatBoxCore";

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
}

interface CallViewChatProps {
  currentPeerId: string;
  remotePeerId: string;
  messages: Message[];
  sendMessage: (text: string) => void;
}

export function CallViewChat({
  currentPeerId,
  remotePeerId,
  messages,
  sendMessage,
}: CallViewChatProps) {
  return (
    <ChatBoxCore
      messages={messages}
      sendMessage={sendMessage}
      currentPeerId={currentPeerId}
      className="h-full"
    />
  );
}