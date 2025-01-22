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
  remotePeerId: string;
  onClose?: () => void;
  minimized?: boolean;
  onMinimize?: () => void;
}

export function ChatBox({ 
  dataConnection, 
  currentPeerId, 
  remotePeerId,
  onClose,
  minimized = false,
  onMinimize 
}: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load messages from session storage and handle data connection
  useEffect(() => {
    if (!currentPeerId || !remotePeerId) return;

    // Create a composite key that works both ways
    const peers = [currentPeerId, remotePeerId].sort();
    const storageKey = `chat_messages_${peers[0]}_${peers[1]}`;
    
    // Load existing messages
    const storedMessages = sessionStorage.getItem(storageKey);
    if (storedMessages) {
      try {
        const parsedMessages = JSON.parse(storedMessages);
        setMessages(parsedMessages);
        scrollToBottom();
      } catch (error) {
        console.error('Error parsing stored messages:', error);
      }
    }

    // Set up data connection handler
    if (dataConnection) {
      const handleData = (data: any) => {
        if (data.type === 'chat') {
          const newMessage = data.message;
          setMessages(prev => {
            // Check if message already exists
            if (prev.some(msg => msg.id === newMessage.id)) {
              return prev;
            }
            // Save to session storage immediately
            const updatedMessages = [...prev, newMessage];
            sessionStorage.setItem(storageKey, JSON.stringify(updatedMessages));
            return updatedMessages;
          });
        }
      };

      dataConnection.on('data', handleData);
      return () => {
        dataConnection.off('data', handleData);
      };
    }
  }, [currentPeerId, remotePeerId, dataConnection]);

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

    // Create composite key
    const peers = [currentPeerId, remotePeerId].sort();
    const storageKey = `chat_messages_${peers[0]}_${peers[1]}`;

    setMessages(prev => {
      // Check if message already exists
      if (prev.some(msg => msg.id === message.id)) {
        return prev;
      }
      const updatedMessages = [...prev, message];
      // Save to session storage immediately
      sessionStorage.setItem(storageKey, JSON.stringify(updatedMessages));
      return updatedMessages;
    });
    setNewMessage("");
  };

  return (
    <Card className="mt-4">
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
