"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DataConnection } from "peerjs";

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
}

interface ChatBoxProps {
  dataConnection: DataConnection | null;
  currentPeerId: string;
}

export function ChatBox({ dataConnection, currentPeerId }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!dataConnection) return;

    const handleData = (data: any) => {
      if (data.type === 'chat') {
        setMessages(prev => [...prev, data.message]);
      }
    };

    dataConnection.on('data', handleData);

    return () => {
      dataConnection.off('data', handleData);
    };
  }, [dataConnection]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !dataConnection) return;

    const message: Message = {
      id: Math.random().toString(36).substr(2, 9),
      sender: currentPeerId,
      text: newMessage.trim(),
      timestamp: new Date(),
    };

    dataConnection.send({
      type: 'chat',
      message,
    });

    setMessages(prev => [...prev, message]);
    setNewMessage("");
  };

  return (
    <Card className="mt-4">
      <CardContent className="p-4">
        <div className="h-[200px] overflow-y-auto mb-4 space-y-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`p-2 rounded-lg max-w-[80%] ${
                message.sender === currentPeerId
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
