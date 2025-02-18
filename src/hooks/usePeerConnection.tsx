import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Peer, { DataConnection, MediaConnection } from "peerjs";

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

export function usePeerConnection() {
  const router = useRouter();

  // State variables
  const [currentPeerId, setCurrentPeerId] = useState<string>("");
  const [peerIds, setPeerIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [incomingCall, setIncomingCall] = useState<MediaConnection | null>(null);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [mediaConnection, setMediaConnection] = useState<MediaConnection | null>(null);
  const videoEl = useRef<HTMLVideoElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isIncomingCall, setIsIncomingCall] = useState<boolean>(false);
  const [callerId, setCallerId] = useState<string>("");
  const dataConnectionRef = useRef<DataConnection | null>(null);
  const [isCallOnHold, setIsCallOnHold] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'home' | 'strokeScale' | 'files' | 'activeCall'>('home');
  const [isRinging, setIsRinging] = useState<boolean>(false);
  const [minimizedChat, setMinimizedChat] = useState<boolean>(false);
  const [isChatVisible, setIsChatVisible] = useState<boolean>(false);

  // References
  const peerRef = useRef<Peer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout>();
  const currentPeerIdRef = useRef<string>("");

  useEffect(() => {
    const storedPeerId = localStorage.getItem('peerId');
    const peer = new Peer(storedPeerId || '', {
      host: "videochat-signaling-app.ue.r.appspot.com",
      port: 443,
      secure: true,
      path: "/",
      debug: 3,
    });
    peerRef.current = peer;

    peer.on("open", (id) => {
      if (!storedPeerId) {
        localStorage.setItem('peerId', id);
      }
      setCurrentPeerId(id);
      currentPeerIdRef.current = id;
    });

    peer.on("call", (call) => {
      setIncomingCall(call);
      setIsIncomingCall(true);
      setCallerId(call.peer);
    });

    // Set up data channel receiver
    peer.on('connection', (dataConnection) => {
      console.log('Incoming data connection from:', dataConnection.peer);
      dataConnectionRef.current = dataConnection;
      setCallerId(dataConnection.peer);
      
      dataConnection.on('open', () => {
        console.log('Data channel opened');
      });

      // Set up file transfer state
      const fileTransfers = new Map<string, {
        chunks: Map<number, Uint8Array>;
        meta: Message;
        totalChunks: number;
      }>();

      // Set up data handler
      dataConnection.on('data', (data: unknown) => {
        if (typeof data === 'string') {
          try {
            const parsedData = JSON.parse(data);
            
            if (parsedData.type === 'text') {
              setMessages(prev => [...prev, {
                id: Math.random().toString(36).substr(2, 9),
                text: parsedData.text,
                sender: dataConnection.peer,
                timestamp: new Date()
              }]);
              setIsChatVisible(true);
            }
            else if (parsedData.type === 'file-meta') {
              const { message } = parsedData;
              fileTransfers.set(message.id, {
                chunks: new Map(),
                meta: message,
                totalChunks: 0
              });
            }
            else if (parsedData.type === 'file-chunk-meta') {
              const transfer = fileTransfers.get(parsedData.messageId);
              if (transfer) {
                transfer.totalChunks = parsedData.totalChunks;
              }
            }
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        } else if (data instanceof ArrayBuffer) {
          // Handle file chunks
          for (const [messageId, transfer] of fileTransfers.entries()) {
            if (transfer.chunks.size < transfer.totalChunks) {
              const chunkIndex = transfer.chunks.size;
              transfer.chunks.set(chunkIndex, new Uint8Array(data));
              
              // Check if all chunks received
              if (transfer.chunks.size === transfer.totalChunks) {
                // Combine chunks in order
                const totalSize = Array.from(transfer.chunks.values())
                  .reduce((acc, chunk) => acc + chunk.byteLength, 0);
                const combinedChunks = new Uint8Array(totalSize);
                
                let offset = 0;
                for (let i = 0; i < transfer.totalChunks; i++) {
                  const chunk = transfer.chunks.get(i)!;
                  combinedChunks.set(chunk, offset);
                  offset += chunk.byteLength;
                }
                
                // Create message with file
                const message = transfer.meta;
                message.file!.data = combinedChunks.buffer;
                
                setMessages(prev => [...prev, message]);
                setIsChatVisible(true);
                
                // Clean up
                fileTransfers.delete(messageId);
                break;
              }
            }
          }
        }
      });

      dataConnection.on('close', () => {
        console.log('Data channel closed');
        dataConnectionRef.current = null;
      });

      dataConnection.on('error', (err) => {
        console.error('Data channel error:', err);
        setError('Chat connection error. Please try again.');
      });
    });

    // Fetch peer IDs
    const fetchPeerIds = () => {
      fetch("https://videochat-signaling-app.ue.r.appspot.com/key=peerjs/peers")
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to fetch peer IDs");
          }
          return response.json();
        })
        .then((data) => {
          const otherPeerIds = data.filter((id: string) => id !== currentPeerIdRef.current);
          setPeerIds(otherPeerIds);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Error fetching peer IDs:", err);
          setError("Failed to load peer IDs. Please try again later.");
          setIsLoading(false);
        });
    };

    fetchPeerIds();
    intervalRef.current = setInterval(fetchPeerIds, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      peerRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (myStream) {
        myStream.getTracks().forEach((track) => track.stop());
      }
      if (mediaConnection) {
        mediaConnection.close();
      }
    };
  }, [myStream, mediaConnection]);

  const handleCall = async (peerId: string) => {
    console.log(`Calling peer ${peerId}`);
    const peer = peerRef.current;
    if (!peer) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setMyStream(stream);
      setIsRinging(true);
      const call = peer.call(peerId, stream);
      setMediaConnection(call);
      setActiveView('activeCall');
      
      // Initialize chat connection
      await initializeChat(peerId);

      call.on("stream", (remoteStream) => {
        if (videoEl.current) {
          videoEl.current.srcObject = remoteStream;
        }
      });

      call.on("close", () => {
        console.log("Call ended");
        endCall();
      });
    } catch (err) {
      console.error("Error accessing media devices:", err);
      setError("Failed to access media devices.");
    }
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setMyStream(stream);
      incomingCall.answer(stream);
      setMediaConnection(incomingCall);
      setActiveView('activeCall');
      
      // Initialize chat connection
      await initializeChat(incomingCall.peer);

      incomingCall.on("stream", (remoteStream) => {
        if (videoEl.current) {
          videoEl.current.srcObject = remoteStream;
        }
      });

      incomingCall.on("close", () => {
        console.log("Call ended");
        endCall();
      });
    } catch (err) {
      console.error("Error accessing media devices:", err);
      setError("Failed to access media devices.");
    } finally {
      setIsIncomingCall(false);
    }
  };

  const declineCall = () => {
    if (incomingCall) {
      incomingCall.close();
    }
    setIsIncomingCall(false);
    setIsRinging(false);
  };

  const endCall = () => {
    if (mediaConnection) {
      mediaConnection.close();
    }
    if (myStream) {
      myStream.getTracks().forEach((track) => track.stop());
    }
    setActiveView('home');
    setMediaConnection(null);
    setMyStream(null);
  };

  const holdCall = () => {
    if (myStream) {
      myStream.getTracks().forEach((track) => {
        track.enabled = isCallOnHold ? true : false;
      });
      setIsCallOnHold(!isCallOnHold);
    }
  };

  const toggleMute = () => {
    if (myStream) {
      myStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted ? true : false;
      });
      setIsMuted(!isMuted);
    }
  };

  const ensureConnection = async (): Promise<DataConnection> => {
    let connection = dataConnectionRef.current;
    
    if (!callerId) {
      setError('No recipient selected');
      throw new Error('No recipient selected');
    }

    // If no connection exists or it's closed, create a new one
    if (!connection?.open) {
      const peer = peerRef.current;
      if (!peer) {
        setError('Connection not available');
        throw new Error('Connection not available');
      }
      
      const newConnection = peer.connect(callerId);
      dataConnectionRef.current = newConnection;
      
      // Wait for connection to open
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
          newConnection.close();
        }, 5000);
        
        newConnection.on('open', () => {
          clearTimeout(timeout);
          resolve();
        });
        
        newConnection.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
      
      connection = newConnection;
    }
    
    if (!connection) {
      throw new Error('Failed to establish connection');
    }
    
    return connection;
  };

  const sendMessage = async (text: string, file?: File) => {
    try {
      const connection = await ensureConnection();

      if (file) {
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          setError('File size must be less than 10MB');
          throw new Error('File too large');
        }

        const fileData = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = () => reject(reader.error);
          reader.readAsArrayBuffer(file);
        });

        const messageId = Math.random().toString(36).substr(2, 9);
        const message = {
          id: messageId,
          text: `Sent file: ${file.name}`,
          sender: currentPeerId,
          timestamp: new Date(),
          file: {
            name: file.name,
            type: file.type,
            size: file.size,
            data: new ArrayBuffer(0) // Will be filled on receiver side
          }
        };

        // Send metadata first
        connection.send(JSON.stringify({
          type: 'file-meta',
          message
        }));

        // Send binary data in chunks
        const chunkSize = 16384; // 16KB chunks
        const totalChunks = Math.ceil(fileData.byteLength / chunkSize);
        
        for (let i = 0; i < totalChunks; i++) {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, fileData.byteLength);
          const chunk = fileData.slice(start, end);
          
          // Send chunk metadata
          connection.send(JSON.stringify({
            type: 'file-chunk-meta',
            messageId,
            chunkIndex: i,
            totalChunks
          }));
          
          // Send binary chunk directly
          connection.send(chunk);
          
          // Small delay to prevent overwhelming the connection
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        setMessages(prev => [...prev, message]);
      } else {
        // Regular text message
        connection.send(JSON.stringify({
          type: 'text',
          text
        }));
        setMessages(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          text,
          sender: currentPeerId,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
      throw error;
    }
  };

  const handleLogout = () => {
    document.cookie = "isLoggedIn=false; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    localStorage.removeItem('peerId');
    router.push('/login');
  };

  const toggleChat = () => {
    setIsChatVisible(prev => !prev);
  };

  const toggleMinimizeChat = () => {
    setMinimizedChat(prev => !prev);
  };

  const initializeChat = async (peerId: string) => {
    try {
      const peer = peerRef.current;
      if (!peer) {
        setError('Connection not available');
        return;
      }

      // Close existing data connection if any
      if (dataConnectionRef.current) {
        dataConnectionRef.current.close();
        dataConnectionRef.current = null;
      }

      // Set callerId for the new chat
      setCallerId(peerId);

      // Create new data connection
      const dataConnection = peer.connect(peerId);
      dataConnectionRef.current = dataConnection;

      // Wait for connection to open
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
          dataConnection.close();
        }, 5000);

        dataConnection.on('open', () => {
          clearTimeout(timeout);
          console.log('Data channel opened');
          setIsChatVisible(true);
          resolve();
        });

        dataConnection.on('error', (err) => {
          clearTimeout(timeout);
          console.error('Data channel error:', err);
          setError('Chat connection error. Please try again.');
          reject(err);
        });
      });

      // Set up file transfer state
      const fileTransfers = new Map<string, {
        chunks: Map<number, Uint8Array>;
        meta: Message;
        totalChunks: number;
      }>();

      // Set up data handler
      dataConnection.on('data', (data: unknown) => {
        if (typeof data === 'string') {
          try {
            const parsedData = JSON.parse(data);
            
            if (parsedData.type === 'text') {
              setMessages(prev => [...prev, {
                id: Math.random().toString(36).substr(2, 9),
                text: parsedData.text,
                sender: peerId,
                timestamp: new Date()
              }]);
              setIsChatVisible(true);
            }
            else if (parsedData.type === 'file-meta') {
              const { message } = parsedData;
              fileTransfers.set(message.id, {
                chunks: new Map(),
                meta: message,
                totalChunks: 0
              });
            }
            else if (parsedData.type === 'file-chunk-meta') {
              const transfer = fileTransfers.get(parsedData.messageId);
              if (transfer) {
                transfer.totalChunks = parsedData.totalChunks;
              }
            }
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        } else if (data instanceof ArrayBuffer) {
          // Handle file chunks
          for (const [messageId, transfer] of fileTransfers.entries()) {
            if (transfer.chunks.size < transfer.totalChunks) {
              const chunkIndex = transfer.chunks.size;
              transfer.chunks.set(chunkIndex, new Uint8Array(data));
              
              // Check if all chunks received
              if (transfer.chunks.size === transfer.totalChunks) {
                // Combine chunks in order
                const totalSize = Array.from(transfer.chunks.values())
                  .reduce((acc, chunk) => acc + chunk.byteLength, 0);
                const combinedChunks = new Uint8Array(totalSize);
                
                let offset = 0;
                for (let i = 0; i < transfer.totalChunks; i++) {
                  const chunk = transfer.chunks.get(i)!;
                  combinedChunks.set(chunk, offset);
                  offset += chunk.byteLength;
                }
                
                // Create message with file
                const message = transfer.meta;
                message.file!.data = combinedChunks.buffer;
                
                setMessages(prev => [...prev, message]);
                setIsChatVisible(true);
                
                // Clean up
                fileTransfers.delete(messageId);
                break;
              }
            }
          }
        }
      });

      dataConnection.on('close', () => {
        console.log('Data channel closed');
        dataConnectionRef.current = null;
      });

    } catch (error) {
      console.error('Error initializing chat:', error);
      setError('Failed to initialize chat. Please try again.');
      if (dataConnectionRef.current) {
        dataConnectionRef.current.close();
        dataConnectionRef.current = null;
      }
    }
  };

  return {
    currentPeerId,
    peerIds,
    error,
    isLoading,
    isMuted,
    incomingCall,
    isIncomingCall,
    callerId,
    setCallerId,
    myStream,
    mediaConnection,
    videoEl,
    isCallOnHold,
    activeView,
    messages,
    setMessages,
    sendMessage,
    handleCall,
    acceptCall,
    declineCall,
    endCall,
    holdCall,
    toggleMute,
    handleLogout,
    setActiveView,
    isRinging,
    isChatVisible,
    minimizedChat,
    toggleChat,
    toggleMinimizeChat,
    initializeChat,
  };
}