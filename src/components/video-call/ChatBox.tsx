"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
}

interface ChatBoxProps {
  currentPeerId: string;
  remotePeerId: string;
  onClose?: () => void;
  minimized?: boolean;
  onMinimize?: () => void;
  visible?: boolean;
  messages: Message[];
  sendMessage: (text: string) => void;
}

export function ChatBox({
  currentPeerId,
  remotePeerId,
  onClose,
  minimized = false,
  onMinimize,
  visible = true,
  messages,
  sendMessage,
}: ChatBoxProps) {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMessage(newMessage.trim());
    setNewMessage("");
  };

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
        <div className="h-[200px] overflow-y-auto mb-4 space-y-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`p-2 rounded-lg max-w-[80%] ${message.sender === currentPeerId
                  ? "ml-auto bg-blue-500 text-white"
                  : "bg-gray-100"
                }`}
            >
              <div className="text-sm">{message.text}</div>
              <div className="text-xs opacity-70">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit">Send</Button>
        </form>
      </CardContent>
    </Card>
  );
}