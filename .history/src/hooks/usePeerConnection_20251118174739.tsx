// library imports
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from 'socket.io-client';
import Peer, { DataConnection, MediaConnection, SocketEventType, util } from "peerjs";
import * as mediaSoup from "mediasoup-client";
import { Producer, RtpCapabilities, Transport } from "mediasoup-client/types";
import { RoomClient } from "./roomClient";
import { create } from "domain";
import { connect } from "http2";
// Heartbeat intervals 
type IntervalId = ReturnType<typeof setInterval>;

// interface defenition for chat messages
interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
}
interface SocketRequest {
  request: (type: string, data?: any) => Promise<any>;
}

interface GetRtpCapabilitiesResponse {
  // The structure returned by the server on success
  rtpCapabilities: RtpCapabilities;
}

// custom react hook for calls
export function usePeerConnection() {
  const router = useRouter();

  //=====================================
  // STATE VARIABLES
  //=====================================

  // peer connection states
  const [currentPeerId, setCurrentPeerId] = useState<string>("");
  const [peerIds, setPeerIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeRoomID, setActiveRoomID] = useState<string | null>(null);

  // call management states
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [incomingCall, setIncomingCall] = useState<MediaConnection | null>(null);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [mediaConnection, setMediaConnection] = useState<MediaConnection | null>(null);
  const [isIncomingCall, setIsIncomingCall] = useState<boolean>(false);
  const [callerId, setCallerId] = useState<string>("");
  const [isCallOnHold, setIsCallOnHold] = useState<boolean>(false);
  const [isRinging, setIsRinging] = useState<boolean>(false);
  // Add this new state variable with your others
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  // UI states
  const [activeView, setActiveView] = useState<'home' | 'strokeScale' | 'files' | 'activeCall'>('home');
  const [minimizedChat, setMinimizedChat] = useState<boolean>(false);
  const [isChatVisible, setIsChatVisible] = useState<boolean>(false);
  const [isStrokeScaleVisible, setIsStrokeScaleVisible] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState(false);
  // messaging states
  const [messages, setMessages] = useState<Message[]>([]);
  const [availableRooms, setAvailableRooms] = useState<string[]>([]);
  const [isRoomListLoading, setIsRoomListLoading] = useState(false);


  //=====================================
  // REFERENCES
  //=====================================

  // remote video and audio refs 
  const videoEl = useRef<HTMLVideoElement>(null);
  const audioEl = useRef<HTMLAudioElement>(null);



  const rtpCapRef = useRef<mediaSoup.types.RtpCapabilities | null>(null);


  let _producerId: string;

  const deviceRef = useRef<mediaSoup.Device | null>(null);
  const sendTransportRef = useRef<Transport | null>(null);
  const recvTransportRef = useRef<Transport | null>(null);
  const producerRef = useRef<Producer | null>(null); // For your _sendVideoProducer


  let _sendVideoProducer: Producer;


  // peer connection refs
  const peerRef = useRef<Peer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentPeerIdRef = useRef<string>("");
  const dataConnectionRef = useRef<DataConnection | null>(null);
  const _awaitingResponses: Map<string, { resolve: (data: any) => void; reject: (error: Error) => void }> = new Map();

  const [socket, setSocket] = useState<Socket | null>(null);

  let rcRef = useRef<RoomClient | null>(null);
  const [rtpCapabilities, setRtpCapabilities] = useState<RtpCapabilities | null>(null);

  // ---

  // ... (socket initialization and socketRequest function)

  // =====================================
  // HELPER FUNCTIONS (Encapsulating Device Logic)
  // =====================================

  // Encapsulates the initEnumerateDevices logic
  const initEnumerateDevices = () => {
    // Use a ref or state if you need to persist `isEnumerateDevices`
    // For simplicity, we just check if any device has been added to the selectors (which we don't have yet)

    const constraints = {
      audio: true,
      video: true
    };

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        enumerateDevices(stream);
        stream.getTracks().forEach(function (track) {
          track.stop();
        });
      })
      .catch((err) => {
        console.error('Access denied for audio/video: ', err);
        setError('Media access denied. Check your camera and microphone permissions.');
      });
  };

  /**
 * Wrapper to safely call the RoomClient's createRoom method.
 * @param roomId The ID of the room to create.
 */
  const createRoom = async (roomId: string, roomClientClass: any): Promise<void> => {
    // 1. Check if the RoomClient instance has been created
    if (!rcRef.current) {
      console.log('rcref was null')
      return;
    }
    try {
      // 2. Call the method directly on the instance
      await rcRef.current.createRoom(roomId);
      console.log(`Room creation request sent for: ${roomId}`);
    } catch (err) {
      console.error(`Error requesting room creation for ${roomId}:`, err);
      throw err;
    }
  };

  const socketRequest = function request<T>(socket: Socket, type: string, data: any = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      // CRITICAL: Check if the socket is actually initialized
      if (!socket) {
        console.error(`Socket not initialized when attempting to emit: ${type}`);
        return reject(new Error("Socket connection is not ready."));
      }

      console.log('socket request emit called:', type);

      // Use the standard socket.emit with a callback for acknowledgement
      socket.emit(type, { data }, (response: any) => {
        if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response as T);
        }
      });
    });
  }

  const socketRequestAPI = function request<T>(type: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      // CRITICAL: Check if the socket is actually initialized
      if (!socket) {
        console.error(`Socket not initialized when attempting to emit: ${type}`);
        return reject(new Error("Socket connection is not ready."));
      }

      console.log('socket request emit called:', type);

      // Use the standard socket.emit with a callback for acknowledgement
      socket.emit(type, data, (response: any) => {

        console.log('response to emit was', response);
        if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response as any);
        }
      });
    });
  }




  // Encapsulates the enumerateDevices logic
  const enumerateDevices = (stream: MediaStream) => {
    // NOTE: In a React application, you typically don't directly manipulate
    // global variables like `audioSelect` and `videoSelect`.
    // Instead, you would store the devices in state, and your React component
    // would render the select dropdowns based on that state.

    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      const videoInputs = devices.filter(d => d.kind === 'videoinput');

      // *** You would typically set state here: ***
      // setAudioDevices(audioInputs);
      // setVideoDevices(videoInputs);

      console.log('Available Audio Inputs:', audioInputs);
      console.log('Available Video Inputs:', videoInputs);
    });
  };

  // Helper function to get the correct Mediasoup Device constructor
  const getMediasoupDeviceConstructor = () => {
    // Check for the most common export pattern and return the constructor function
    if (mediaSoup && (mediaSoup as any).Device) {
      return (mediaSoup as any).Device;
    }
    throw new Error("Mediasoup Device constructor not found.");
  };
  // =====================================
  // EXPOSED CORE ROOM FUNCTIONS
  // =====================================

  const createRoomClient = async (name: string, room_id: string, roomClientClass: any) => {


  }

  const produce = async () => {
    setActiveView('activeCall');
    console.log('Produce was called');
    if (rcRef.current) {
      rcRef.current.produce('videoType')
      //rcRef.current.produce('audioType')
    }
  }

  /**
   * Encapsulates the original `joinRoom` logic.
   * This method is called from your `Page.tsx` component when the user clicks 'Join'.
   */
  const joinRoom = async (name: string, room_id: string, roomClientClass: any): Promise<string> => {

    setActiveRoomID(room_id);
    if (rcRef.current /* && rcRef.current.isOpen() */) {
      console.log('Already connected to a room');
      return 'FAILED TO JOIN';
    }
    console.log('about to initEnumerateDevices');
    // 2. Initialize media devices
    initEnumerateDevices();

    try {


      // We pass the callback that updates the view state
      const roomOpenCallback = () => {
        setActiveView('activeCall'); // This replaces the old roomOpen UI logic
      };

      const addRemoteStream = (stream: MediaStream) => {
        console.log("HOOK: addRemoteStream called. Adding new stream to list.");
        setRemoteStream(stream);
      };
      console.log('before creating newRC');
      deviceRef.current = new mediaSoup.Device;
      // Replace the global DOM elements with nulls, as the RoomClient should manage them

      // const remoteVideoElement = document.createElement('video');
      // remoteVideoElement.style.position = 'fixed';
      // remoteVideoElement.style.top = '10px';
      // remoteVideoElement.style.right = '10px';
      // remoteVideoElement.style.width = '300px';
      // remoteVideoElement.style.border = '5px solid red'; // Visual confirmation
      // remoteVideoElement.style.zIndex = '9999'; 
      // // 3. Attach it directly to the main document body


      // document.body.appendChild(remoteVideoElement);
      console.log('Direct Video Element Injected. Check top-right corner. consumer paused? ');
      const localMedia = null;
      // const remoteVideos = remoteVideoElement;
      const remoteAudios = null;
      const newRc = new roomClientClass(
        localMedia,
        videoEl.current,
        remoteAudios,
        // ARGUMENT 4: The Mediasoup Device constructor!
        mediaSoup,
        // ARGUMENT 5: The socket instance
        socket,
        // ARGUMENT 6: room_id
        room_id,
        // ARGUMENT 7: name
        name,
        // ARGUMENT 8: successCallback
        roomOpenCallback,
        addRemoteStream
      );
      console.log('after creating newRC')
      rcRef.current = newRc;
      console.log('at rc ref.current');
      return room_id;

    } catch (err: any) {
      console.error('Failed to join room or fetch capabilities:', err);
      setError(`Failed to connect: ${err.message || 'Unknown error'}`);
      return 'FAILED TO JOIN';
    }
  };

  const leaveRoom = async () => {
    if (!activeRoomID || !null) {
      return;
    }

    try {
      await socketRequestAPI("LEAVEROOM", { roomId: activeRoomID });
      if(rcRef.current?.close) 
        rcRef.current?.close();
      {

      }

    } catch {

    }
  }

  // Add a useEffect to listen for the connection event
  useEffect(() => {
    //todo: change to use env variable


    const socketUrl = process.env.NEXT_PUBLIC_SERVER_FETCH_PEERS
    console.log('current socketUrl is', socketUrl);
    const socket = io(socketUrl, {
      autoConnect: true, // Important: delay the connection
      withCredentials: true,

    });

    setSocket(socket);


    const onConnect = () => {
      setIsConnected(true);
      getAvailableRooms(socket);
      //const intervalId = setInterval(getAvailableRooms, 5000);
      console.log('socket.io connected');
      // setActiveView('activeCall');
      // You can set currentPeerId here if the server returns it, or get it from socket.id
      // setCurrentPeerId(socket.id); 
    };
    const onDisconnect = () => {
      setIsConnected(false);
    };

    /**
  * Requests the list of all active room IDs from the server.
  * @returns A promise that resolves with an array of room IDs.
  */
    const getAvailableRooms = async (activeSocket: Socket): Promise<string[]> => {
      setIsRoomListLoading(true);
      try {
        // Use the socketRequest utility. We expect a string[] back.

        const roomList: string[] = await socketRequest(socket, 'getRoomList');
        console.log('roomlist is', roomList);
        setAvailableRooms(roomList);
        setIsLoading(false);
        return roomList;

      } catch (e) {
        console.error("Error fetching room list:", e);
        setError("Failed to load active consultations.");
        setAvailableRooms([]);
        return [];
      } finally {
        setIsRoomListLoading(false);
      }
    };



    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Cleanup listeners
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };

  }, []); // Depend on the socket instance

  // ...
  const handleLogout = () => {
    document.cookie = "isLoggedIn=false; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    localStorage.removeItem('peerId');
    router.push('/login');
  };

  const toggleChat = () => {
    setIsChatVisible(prev => !prev);
    if (!isChatVisible) {
      setIsStrokeScaleVisible(false);
    }
  };

  const toggleStrokeScale = () => {
    setIsStrokeScaleVisible(prev => !prev);
    if (!isStrokeScaleVisible) {
      setIsChatVisible(false);
    }
  };

  const toggleMinimizeChat = () => {
    setMinimizedChat(prev => !prev);
  };


  /**
   * Encapsulates the original `addListeners` logic.
   * Note: You need to decide how RoomClient's events (`startScreen`, `stopAudio`, etc.)
   * will translate into state changes here (e.g., setting `isAudioProducing: true`).
   */
  const addRoomClientListeners = (newRc: any) => {
    // Since we don't have the RoomClient EVENTS enum, we use placeholders.
    // In a real app, you'd use newRc.on(RoomClient.EVENTS.startScreen, ...)

    newRc.on('startScreen', () => {
      // This event might trigger a state change like setScreenSharing(true)
      console.log('RoomClient event: Screen sharing started');
    });

    newRc.on('exitRoom', () => {
      // This event clears the RoomClient and sets the view back to home
      rcRef.current = null;
      setActiveView('home');
      setCallerId('');
      // You would also call endCall() cleanup here
    });

    // ... (add other event listeners here)
  };



  // ... (existing call management functions like handleCall, endCall, etc.)


  // =====================================
  // EXPORT NEW FUNCTIONS
  // =====================================

  return {
    // ... (existing state and refs)
    joinRoom,
    socketRequestAPI,
    isConnected,
    createRoom,
    setActiveView,
    activeView,
    // getAvailableRooms,   
    availableRooms,    // <-- New state array
    isRoomListLoading,  // <-- Expose the function to refresh the 
    produce,
    remoteStream,
    setRemoteStream,
    videoEl,
    // If you want to allow the component to manually toggle devices:
    // initEnumerateDevices,
    // ... (other exposed methods)
    isStrokeScaleVisible,
    toggleStrokeScale,
  };


  // // set up data connection handler
  // const setupDataConnection = (dataConnection: DataConnection) => {
  //   // console.log('Setting up data connection with:', dataConnection.peer);

  //   // // Clean up existing connection if any
  //   // if (dataConnectionRef.current) {
  //   //   dataConnectionRef.current.off('data');
  //   //   dataConnectionRef.current.off('open');
  //   //   dataConnectionRef.current.off('close');
  //   //   dataConnectionRef.current.off('error');
  //   //   dataConnectionRef.current.close();
  //   // }

  //   // // store new connection and set it to caller id
  //   // dataConnectionRef.current = dataConnection;
  //   // setCallerId(dataConnection.peer);

  //   // // handling for when a channel is opened 
  //   // dataConnection.on('open', () => {
  //   //   console.log('Data channel opened');
  //   //   // setIsChatVisible(true);
  //   // });

  //   // // handling for incoming chat messages 
  //   // dataConnection.on('data', (data: unknown) => {
  //   //   if (typeof data === 'string') {
  //   //     setMessages(prev => [...prev, {
  //   //       id: Math.random().toString(36).substr(2, 9),
  //   //       text: data,
  //   //       sender: dataConnection.peer,
  //   //       timestamp: new Date()
  //   //     }]);
  //   //     // setIsChatVisible(true);
  //   //   }
  //   // });

  //   // // handling for when a channel is closed 
  //   // dataConnection.on('close', () => {
  //   //   console.log('Data channel closed');
  //   //   dataConnectionRef.current = null;
  //   // });

  //   // // handling for when a connection error occurs
  //   // dataConnection.on('error', (err) => {
  //   //   console.error('Data channel error:', err);
  //   //   setError('Chat connection error. Please try again.');
  //   // });
  // };

  // // --- Presence heartbeat to your server ---
  // const startHeartbeat = () => {
  //   const fetchUrl = process.env.NEXT_PUBLIC_SERVER_FETCH_URL;
  //   const username =
  //     (typeof window !== "undefined" && localStorage.getItem("username")) ||
  //     currentPeerIdRef.current;

  //   if (!fetchUrl || !username) return;

  //   const send = () => {
  //     const payload = JSON.stringify({ username });

  //     // Prefer sendBeacon for hidden tabs / unload
  //     if (navigator.sendBeacon) {
  //       try {
  //         const url = new URL(fetchUrl);
  //         url.searchParams.set("action", "heartbeat"); // server can read from query
  //         const blob = new Blob([payload], { type: "application/json" });
  //         navigator.sendBeacon(url.toString(), blob);
  //         return;
  //       } catch {
  //         // fall through
  //       }
  //     }

  //     // Fallback: fetch with keepalive
  //     fetch(fetchUrl, {
  //       method: "POST",
  //       credentials: "include",
  //       headers: {
  //         "Content-Type": "application/json",
  //         "Action": "heartbeat",
  //       },
  //       keepalive: true,
  //       body: payload,
  //     }).catch(() => { });
  //   };

  //   // fire now, then repeat
  //   send();
  //   heartbeatIntervalRef.current = setInterval(send, 25_000);

  //   const onVis = () => {
  //     if (document.visibilityState === "hidden") send();
  //   };
  //   const onUnload = () => send();

  //   document.addEventListener("visibilitychange", onVis);
  //   window.addEventListener("beforeunload", onUnload);

  //   // cleanup
  //   return () => {
  //     if (heartbeatIntervalRef.current) {
  //       clearInterval(heartbeatIntervalRef.current);
  //       heartbeatIntervalRef.current = null;
  //     }
  //     document.removeEventListener("visibilitychange", onVis);
  //     window.removeEventListener("beforeunload", onUnload);
  //   };
  // };

  const startPlayback = () => {
    if (videoEl.current) {
      // This is triggered by a human click
      videoEl.current.play().catch(e => {
        console.error('Manual play failed:', e);
      });
    }

    return () => {
    }
  };



  // Add this new effect after your main useEffect
  useEffect(() => {
    //This effect runs *only when* the remoteStream state changes OR the ref is ready.
    if (videoEl.current && remoteStream) {
      console.log('Attaching stream to video element...');
      videoEl.current.srcObject = remoteStream;

      // Manual play for browser policy (must be in the effect)
      // videoEl.current.play().catch(error => {
      //     console.error('Video playback failed:', error);
      // });
    }
  }, [videoEl, remoteStream]); // Dependencies: runs when the ref or the stream data changes


  // // main hook to initialize connections
  // // useEffect(() => {
  // //   // const secure = process.env.NEXT_PUBLIC_SERVER_SECURE
  // //   // const isSecure = secure == 'true';
  // //   // // create a PeerJS object with ID retrieved from storage (or make a new one if none exist)
  // //   // const storedPeerId = localStorage.getItem('peerId');
  // //   // const peer = new Peer(storedPeerId || '', {
  // //   //   host: process.env.NEXT_PUBLIC_SERVER_URL!,
  // //   //   port: Number(process.env.NEXT_PUBLIC_SERVER_PORT),
  // //   //   secure: true,
  // //   //   path: "/",
  // //   //   debug: 3,
  // //   // });
  // //   // peerRef.current = peer; // saves the object for reuse
  // //   // console.log(`created PeerRef with stored peerid ${storedPeerId}`);

  // //   // peer.on("open", (id) => {
  // //   //   // if no ID was saved in storage, store the new one
  // //   //   if (!storedPeerId) {
  // //   //     localStorage.setItem('peerId', id);
  // //   //   }


  // //   //   setCurrentPeerId(id);
  // //   //   currentPeerIdRef.current = id; //saves for reuse
  // //   //   startMediaSoup();

  // //   // });

  // //   // //handle incoming calls
  // //   // peer.on('call', (call) => {
  // //   //   // setIsIncomingCall(true);
  // //   //   // console.log("We are receiving a call");
  // //   //   // setIncomingCall(call);
  // //   //   // setIsIncomingCall(true);
  // //   //   // setCallerId(call.peer);
  // //   // });



  // //   // // Updated Handler in useEffect:
  // //   // peer.on("streamReceived", (remoteStream) => {

  // //   //   // // 1. Convert the track to a stream
  // //   //   // setActiveView('activeCall'); 
  // //   //   // // const stream = new MediaStream(); 
  // //   //   // // stream.addTrack(track);
  // //   //   // console.log('stream active', stream.active);
  // //   //   // // 2. Set both the active view AND the stream state
  // //   //   // setRemoteStream(stream); 

  // //   //   // // setIsIncomingCall(true);
  // //   //   // console.log('Stream data received and saved to state.');
  // //   // });

  // //   // // Optional: Also listen for errors to understand why it might *not* open
  // //   // peer.on("error", (err) => {
  // //   //   console.error("PeerJS error:", err);
  // //   //   // Handle errors like server connection issues, invalid ID, etc.
  // //   // });


  // //   // peer.socket.on("message", async (data: any)=>{
  // //   //   console.log('mesage received on socket', data );
  // //   //   await _handleMessage(data);
  // //   // });

  // //   // peer.on('connection', setupDataConnection);

  // //   // // If the WS drops, try to reconnect
  // //   // peer.on('disconnected', () => {
  // //   //   try {
  // //   //     peer.reconnect();
  // //   //   } catch (e) {
  // //   //     console.warn("Peer reconnect failed:", e);
  // //   //   }
  // //   // });

  // //   // // Fetch peer IDs
  // //   // const fetchPeerIds = () => {
  // //   //   fetch(process.env.NEXT_PUBLIC_SERVER_FETCH_PEERS!, { credentials: 'include' })
  // //   //     .then((response) => {
  // //   //       if (!response.ok) {
  // //   //         throw new Error("Failed to fetch peer IDs");
  // //   //       }
  // //   //       return response.json();
  // //   //     })
  // //   //     .then((data) => {
  // //   //       const otherPeerIds = data.filter((id: string) => id !== currentPeerIdRef.current);
  // //   //       setPeerIds(otherPeerIds);
  // //   //       setIsLoading(false);
  // //   //     })
  // //   //     .catch((err) => {
  // //   //       console.error("Error fetching peer IDs:", err);
  // //   //       setError("Failed to load peer IDs. Please try again later.");
  // //   //       setIsLoading(false);
  // //   //     });
  // //   }

  // //   // fetchPeerIds();
  // //   // intervalRef.current = setInterval(fetchPeerIds, 5000); // updates every 5 seconds

  // //   //=====================================
  // //   // CLEANUP CODE
  // //   //=====================================

  // //   // clean up object after unmounting  
  // //   return () => {
  // //     if (intervalRef.current) {
  // //       clearInterval(intervalRef.current);
  // //     }
  // //     console.log("Destroying peerRef");
  // //     peerRef.current?.destroy();
  // //   };
  // // }, []);

  // // useEffect(() => {
  // //   // Have we got *either* a stored username or a current Peer ID?
  // //   const hasIdentity =
  // //     (typeof window !== "undefined" && !!localStorage.getItem("username")) ||
  // //     !!currentPeerIdRef.current;

  // //   if (!hasIdentity) return;

  // //   const stop = startHeartbeat(); // returns a cleanup function
  // //   return () => {
  // //     if (stop) stop();
  // //   };
  // // }, [currentPeerId]);

  // // clean up effect after stream or media connection change
  // useEffect(() => {
  //   return () => {
  //     if (myStream) {
  //       //myStream.getTracks().forEach((track) => track.stop());
  //     }
  //     if (mediaConnection) {
  //       //mediaConnection.close();
  //     }
  //   };
  // }, [myStream, mediaConnection]);



  // // const runTest = async () => {
  // //   try {
  // //     const peer = peerRef.current
  // //     if(peer){

  // //       const stream = await peer.checkLocalStream();
  // //       console.log('Successfully got stream from library:', stream);
  // //     }

  // //   } catch (e) {
  // //     console.error('Test failed.', e);
  // //   }
  // // }
  // //=====================================
  // // CALL MANAGEMENT
  // //=====================================

  // const handleCall = (peerId: string) => {
  //   // console.log(`Calling peer ${peerId}`);
  //   // const peer = peerRef.current;
  //   // if (peer && deviceRef.current) {
  //   //   // const call = peer.call(peerId);
  //   //   try {
  //   //   const test:RtpCapabilities = deviceRef.current.rtpCapabilities;
  //   //   }catch (e){
  //   //     console.log("ERROR GETTING _DEVICERTP", e);
  //   //   } 
  //   //   console.log('device rtp cap',);
  //   //   peer.socket.send({type: 'OFFER', payload: rtpCapRef.current, dst: peerId, src: peer.id});
  //   //   // setActiveView('activeCall');
  //   //   // peer.on("streamReceived", (stream) => {


  //     // });
  //   }
  //   // if (peer) {
  //   //   navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
  //   //     setMyStream(stream);
  //   //     setIsRinging(true);


  //   //   });
  //   // }

  //   //     // // Setup data channel for chat
  //   //     // const dataConnection = peer.connect(peerId);
  //   //     // setupDataConnection(dataConnection);



  //   //     call.on("close", () => {
  //   //       console.log("Call ended");
  //   //       endCall();
  //   //     });
  //   //   }).catch((err) => {
  //   //     console.error("Error accessing media devices:", err);
  //   //     setError("Failed to access media devices.");
  //   //   });
  //   // }
  // };

  // const acceptCall = () => {
  //   // if (incomingCall) {
  //   //   navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
  //   //     setMyStream(stream);
  //   //     incomingCall.answer(stream);
  //   //     setMediaConnection(incomingCall);
  //   //     // setActiveView('activeCall');

  //   //     // Connection handler is already set up in the main peer.on('connection') handler

  //   //     incomingCall.on("stream", (remoteStream) => {
  //   //       if (videoEl.current) {
  //   //         // videoEl.current.srcObject = remoteStream;

  //   //       }
  //   //       if (audioEl.current) {
  //   //         audioEl.current.srcObject = remoteStream;
  //   //         console.log("added audio stream");
  //   //       }
  //   //     });

  //   //     incomingCall.on("close", () => {
  //   //       console.log("Call ended");
  //   //       //endCall();
  //   //     });
  //   //   }).catch((err) => {
  //   //     console.error("Error accessing media devices:", err);
  //   //     setError("Failed to access media devices.");
  //   //   });
  //   // }
  //   // setIsIncomingCall(false);
  // };

  // // Example on the Client (Inside your Peer class's _handleMessage):
  // async function _handleMessage(message: any){

  //   // const payload = message.payload;
  //   // const requestId = payload?.requestId;

  //   // // Check if this message is an answer to an outstanding request
  //   // if (requestId && _awaitingResponses.has(requestId)) {
  //   //   const { resolve, reject } = _awaitingResponses.get(requestId)!;
  //   //   _awaitingResponses.delete(requestId);

  //   //   if (payload.status === 'error') {
  //   //       reject(new Error(payload.error || 'Server error'));
  //   //   } else {
  //   //       resolve(payload.data); // Resolve the promise with the data
  //   //   }



  //   // // ... continue with switch case for regular unsolicited messages (Open, etc.)
  //   // }


  //   // console.log('in handlemsg', message);
  //   // let socket: any;
  //   // if(peerRef.current){
  //   //   socket = peerRef.current.socket;

  //   // }
  //   // if(message.MessageType == 'PRODUCERFROMSERVERCREATED'){
  //   //   _producerId = message.payload.producerId;
  //   // }

  //   // if(message.MessageType == 'CONSUMERMADE' && recvTransportRef.current){
  //   //   const rtpParameters = message.payload.rtpParameters;
  //   //   const theirProducerId = message.payload.theirProducerId;

  //   //   const consumer = recvTransportRef.current.consume({producerId: theirProducerId, rtpParameters: rtpParameters, id: message.payload.id, kind: message.payload.kind});
  //   //   (await consumer).resume();
  //   //   const track = (await consumer).track;
  //   //   const remoteStream = new MediaStream();
  //   //   remoteStream.addTrack(track);
  //   //     // 1. Convert the track into a MediaStream (REQUIRED)
  //   //   // 2. Create a new, standalone video element
  //   //   const remoteVideoElement = document.createElement('video');

  //   //   // Set properties for immediate visibility and policy bypass
  //   //   remoteVideoElement.srcObject = remoteStream;
  //   //   remoteVideoElement.autoplay = true;
  //   //   remoteVideoElement.playsInline = true;
  //   //   remoteVideoElement.muted = true; // Strongest playback policy bypass

  //   //   // Make it highly visible on the screen
  //   //   remoteVideoElement.style.position = 'fixed';
  //   //   remoteVideoElement.style.top = '10px';
  //   //   remoteVideoElement.style.right = '10px';
  //   //   remoteVideoElement.style.width = '300px';
  //   //   remoteVideoElement.style.border = '5px solid red'; // Visual confirmation
  //   //   remoteVideoElement.style.zIndex = '9999'; 
  //   //   // 3. Attach it directly to the main document body
  //   //   document.body.appendChild(remoteVideoElement);

  //   //   console.log('Direct Video Element Injected. Check top-right corner. consumer paused? ', (await consumer).paused);

  //   //   console.log('CONSUMED THE CALLERS PRODUCERID, DID RECVTRANSPORT.CONSUME status is', recvTransportRef.current.connectionState);
  //   //   socket.send({type: 'CLIENTMEDIAREADY', payload: 'blank payload'});
  //   // }
  //   // if(message.MessageType == 'RTPCAPFROMSERVER' && deviceRef.current){
  //   //   rtpCapRef.current = message.payload.rtpCapabilities;
  //   //   try {
  //   //     await deviceRef.current.load({routerRtpCapabilities: message.payload.rtpCapabilities});
  //   //     console.log('device loaded rtp settings successfully');
  //   //     console.log('trying to print devicertp', deviceRef.current.rtpCapabilities);
  //   //   } catch (e){
  //   //     console.log("failed to load RTPCaps into our device Error:", e);
  //   //   }

  //   // }

  //   // if(message.MessageType == 'RECVTRANSPORTCREATED' && deviceRef.current){
  //   //   recvTransportRef.current = deviceRef.current.createRecvTransport({id: payload.sendTransportFromServer.id, iceParameters: payload.sendTransportFromServer.iceParameters, iceCandidates: payload.sendTransportFromServer.iceCandidates, dtlsParameters: payload.sendTransportFromServer.dtlsParameters, sctpParameters: payload.sendTransportFromServer.sctpParameters});
  //   //   console.log('recv Transport created');
  //   //   // socket.send({type: "WEBRTC_RECV_CONNECT", payload: message.payload.sendTransportFromServer});
  //   //   recvTransportRef.current.on("connect", ({ dtlsParameters }, callback, _errback) => {
  //   //     console.log('recv Transport received the conenct msg');
  //   //     socket.send({type: 'WEBRTC_RECV_CONNECT', payload: {dtlsParameters: dtlsParameters}});

  //   //     callback();
  //   //   });


  //   // }
  //   // if(message.MessageType == 'SENDTRANSPORTCREATED' && deviceRef.current){


  //   //   sendTransportRef.current = deviceRef.current.createSendTransport({id: payload.sendTransportFromServer.id, iceParameters: payload.sendTransportFromServer.iceParameters, iceCandidates: payload.sendTransportFromServer.iceCandidates, dtlsParameters: payload.sendTransportFromServer.dtlsParameters, sctpParameters: payload.sendTransportFromServer.sctpParameters});
  //   //   sendTransportRef.current.on("connect", ({ dtlsParameters }, callback, _errback) => {
  //   //     console.log('about to send dtls stuff');
  //   //     const payload = { dtlsParameters: dtlsParameters};
  //   //     // Signal local DTLS parameters to the server side transport
  //   //     socket.send({type: "WEBRTC_SEND_CONNECT", payload: payload});
  //   //     console.log('sent dtls params to server');
  //   //     callback();
  //   //   });

  //   //   // "produce" is emitted upon each call to transport.produce()
  //   //   sendTransportRef.current.on("produce", async (produceParameters, callback, _errback) => {
  //   //     const requestId = Math.random().toString(36).substring(2, 15);
  //   //     const payload = { produceParamters: produceParameters, requestId: requestId};


  //   //     socket.send({type:  "WEBRTC_SEND_PRODUCE", payload: payload}); 
  //   //     console.log("[startWebrtcSend] WebRTC SEND producer created", produceParameters);
  //   //     // 2. Await the server's acknowledgment containing the real producerId
  //   //     const responseWait = awaitServerResponse(requestId);

  //   //     const final = await responseWait;
  //   //     callback({id: _producerId});


  //   //   });
  //   //   let stream;
  //   //   try{ 
  //   //     stream = await navigator.mediaDevices.getUserMedia({
  //   //     video: true,});
  //   //   } catch (e) {
  //   //     console.log("[startWebrtcSend] ERROR:", e);
  //   //     return;
  //   //   }

  //   //   _sendVideoProducer = await sendTransportRef.current.produce({track: stream.getVideoTracks()[0]});

  //   //   console.log("send transport successfuly made is video paused", _sendVideoProducer.paused);

  //   // }
  //   // return;
  // }

  // function awaitServerResponse(requestId: string): Promise<any> {
  //   // return new Promise((resolve, reject) => {
  //   //     // 1. Store the promise resolver
  //   //     _awaitingResponses.set(requestId, { resolve,  reject });
  //   //     // 2. Set a timeout (essential for network reliability)
  //   //     setTimeout(() => {
  //   //         if (_awaitingResponses.has(requestId)) {
  //   //             _awaitingResponses.delete(requestId);
  //   //             reject(new Error(`Server response timeout for request: ${requestId}`));
  //   //         }
  //   //     }, 10000); 
  //   // });
  // }


  // async function sendMediaSoupRequest(): Promise<any> { 
  //   // const peer = peerRef.current?.socket;
  //   // if(!peer){
  //   //     console.error('Peer or Socket not ready.');
  //   //     return Promise.reject(new Error('Peer connection is not initialized.'));
  //   // }

  //   // const requestId = Math.random().toString(36).substring(2, 15);

  //   // // 2. Create the promise and store its handlers
  //   // const waitPromise = awaitServerResponse(requestId); 

  //   // // 3. Prepare the message
  //   // const msg = {
  //   //     type: 'GETRTPCAPABILITIES',
  //   //     payload: { test: 'testargs', requestId: requestId } 
  //   // };

  //   // // 4. Send the message
  //   // peer.send(msg); 

  //   // // 5. AWAIT the promise and return the resolved value directly.
  //   //  // 2. AWAIT the promise and store the result
  //   // const result = await waitPromise; 
  //   // return result; 
  // }




  // async function startMediaSoup(){
  //   // try {
  //   //   // Await pauses here. If it resolves, it was successful.
  //   //   // ... rest of your initialization code.
  //   //   deviceRef.current = new mediasoup.Device();
  //   //   const rtpCapabilities = await sendMediaSoupRequest(); 

  //   //   console.log('called start media');
  //   //   console.log('SUCCESS: MediaSoup capabilities received and loaded.'); // <-- Success Log



  //   //   const transportResults = await getSendTransportFromServer();
  //   //   console.log('SUCCESS SEND TRANS FROM SERVER CREATED');
  //   //   const   recvTransport = await getRecvTransportFromServer();
  //   //   console.log('SUCCESS RECV TRANS FROM SERVER CREATED');


  //   // } catch(e) {
  //   //     // If an error is thrown by the promise, the code jumps here (Failure).
  //   //     console.log('MediaSoup initialization failled', e);
  //   // }


  // }

  // async function getSendTransportFromServer(){
  //   // console.log('called getSendTransportFromServer');
  //   // const peerSocket = peerRef.current?.socket;
  //   // const requestId = Math.random().toString(36).substring(2, 15);

  //   // // 2. Create the promise and store its handlers
  //   // const waitPromise = awaitServerResponse(requestId); 
  //   // if(peerSocket){
  //   //   // 3. Prepare the message
  //   //   const msg = {
  //   //     type: 'GETSERVERSENDTRANSPORT',
  //   //     payload: { test: 'testargs', requestId: requestId } 
  //   //   };

  //   //   // 4. Send the message
  //   //   peerSocket.send(msg); 
  //   // }

  //   // const response = await waitPromise;
  //   // return response;
  // }



  // async function getRecvTransportFromServer(){
  //   // console.log('called getSendTransportFromServer');
  //   // const peerSocket = peerRef.current?.socket;
  //   // const requestId = Math.random().toString(36).substring(2, 15);

  //   // // 2. Create the promise and store its handlers
  //   // const waitPromise = awaitServerResponse(requestId); 
  //   // if(peerSocket){
  //   //   // 3. Prepare the message
  //   //   const msg = {
  //   //     type: 'GETSERVERRECVTRANSPORT',
  //   //     payload: { test: 'testargs', requestId: requestId } 
  //   //   };

  //   //   // 4. Send the message
  //   //   peerSocket.send(msg); 
  //   // }

  //   // const response = await waitPromise;
  //   // return response;
  // }

  // const declineCall = () => {
  //   // if (incomingCall) {
  //   //   incomingCall.close();
  //   // }
  //   // setIsIncomingCall(false);
  //   // setIsRinging(false);
  // };

  // const endCall = () => {
  //   // if (mediaConnection) {
  //   //   mediaConnection.close();
  //   // }
  //   // if (myStream) {
  //   //   // myStream.getTracks().forEach((track) => track.stop());
  //   // }
  //   // setActiveView('home');
  //   // setMediaConnection(null);
  //   // setMyStream(null);
  // };

  // const holdCall = () => {
  //   // if (myStream) {
  //   //   myStream.getTracks().forEach((track) => {
  //   //     track.enabled = isCallOnHold ? true : false;
  //   //   });
  //   //   setIsCallOnHold(!isCallOnHold);
  //   // }
  // };

  // const toggleMute = () => {
  //   // if (myStream) {
  //   //   myStream.getAudioTracks().forEach(track => {
  //   //     track.enabled = isMuted ? true : false;
  //   //   });
  //   //   setIsMuted(!isMuted);
  //   // }
  // };

  // const sendMessage = (text: string) => {
  //   // if (dataConnectionRef.current?.open) {
  //   //   dataConnectionRef.current.send(text);
  //   //   setMessages(prev => [...prev, {
  //   //     id: Math.random().toString(36).substr(2, 9),
  //   //     text,
  //   //     sender: currentPeerId,
  //   //     timestamp: new Date()
  //   //   }]);
  //   // }
  // };

  // this needs to be changed to send a message to the server
  // to tell it to expire the cookie


  const initializeChat = (peerId: string) => {
    // const peer = peerRef.current;
    // if (!peer) return;

    // // Close existing data connection if any
    // if (dataConnectionRef.current) {
    //   dataConnectionRef.current.close();
    //   dataConnectionRef.current = null;
    // }

    // // Create and set up new data connection
    // const dataConnection = peer.connect(peerId);
    // setupDataConnection(dataConnection);
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
    remoteStream,
    videoEl,
    audioEl,
    isCallOnHold,
    activeView,
    messages,
    setMessages,
    handleLogout,
    setActiveView,
    isRinging,
    isChatVisible,
    minimizedChat,
    toggleChat,
    toggleMinimizeChat,
    initializeChat,
    isStrokeScaleVisible,
    toggleStrokeScale,

  };
}