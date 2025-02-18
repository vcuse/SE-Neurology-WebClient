"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FileAttachment {
  name: string;
  type: string;
  size: number;
  data: ArrayBuffer;
}

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
  file?: FileAttachment;
}

interface ChatBoxCoreProps {
  messages: Message[];
  sendMessage: (text: string, file?: File) => void;
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;
    
    if (selectedFile) {
      try {
        setIsUploading(true);
        await sendMessage(newMessage.trim() || `Sending file: ${selectedFile.name}`, selectedFile);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Error sending file:', error);
        alert('Failed to send file. Please try again.');
      } finally {
        setIsUploading(false);
      }
    } else {
      sendMessage(newMessage.trim());
    }
    setNewMessage("");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert("File size must be less than 10MB");
        e.target.value = '';
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleFileDownload = (file: FileAttachment) => {
    const blob = new Blob([file.data], { type: file.type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
              {message.file && (
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={message.sender === currentPeerId ? "outline" : "default"}
                    onClick={() => handleFileDownload(message.file!)}
                    className="text-xs py-1"
                  >
                    Download {message.file.name} ({(message.file.size / 1024).toFixed(1)}KB)
                  </Button>
                </div>
              )}
              <div className="text-xs opacity-70 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </Card>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="py-3 px-4 border-t">
        <form onSubmit={handleSendMessage} className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 h-8"
            />
            <Button type="submit" size="sm" disabled={isUploading}>
              {isUploading ? "Sending..." : "Send"}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,application/pdf,.doc,.docx,.txt"
              disabled={isUploading}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs"
              disabled={isUploading}
            >
              {isUploading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Uploading...
                </span>
              ) : (
                "Attach File"
              )}
            </Button>
            {selectedFile && !isUploading && (
              <span className="text-xs text-gray-600">
                Selected: {selectedFile.name}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}