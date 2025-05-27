"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
}

interface ChatBoxCoreProps {
  messages: Message[];
  sendMessage: (text: string) => void;
  currentPeerId: string;
  className?: string;
}

export function ChatBoxCore({
  messages,
  sendMessage,
  currentPeerId,
  className = "",
}: ChatBoxCoreProps) {
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
    <div className={cn("h-full flex flex-col overflow-hidden", className)}>
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 p-4">
        {messages.map((message) => (
          <Card
            key={message.id}
            className={cn(
              "max-w-[80%] overflow-hidden",
              message.sender === currentPeerId ? "ml-auto" : ""
            )}
          >
            <div
              className={cn(
                "p-2",
                message.sender === currentPeerId
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100"
              )}
            >
              <div className="text-sm">{message.text}</div>
              <div className="text-xs opacity-70">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </Card>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="py-3 px-4 border-t">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 h-8"
          />
          <Button type="submit" size="sm">Send</Button>
        </form>
      </div>
    </div>
  );
}