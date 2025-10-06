// RoomClient.ts

import { Socket } from 'socket.io-client';
import { 
    Device, 
    Transport, 
    Producer, 
    Consumer, 
    RtpCapabilities, 
    DtlsParameters, 
    MediaKind 
} from 'mediasoup-client/types'; // Adjust the import path as needed

// 1. Define the media type and event constants
const mediaType = {
  audio: 'audioType',
  video: 'videoType',
  screen: 'screenType'
} as const; // 'as const' ensures string literal types

const _EVENTS = {
  exitRoom: 'exitRoom',
  // ... (rest of the events)
  stopScreen: 'stopScreen'
} as const;

// Helper type for the producer map
type ProducerLabelMap = Map<typeof mediaType[keyof typeof mediaType], string>;
type ProducerMap = Map<string, Producer>;
type ConsumerMap = Map<string, Consumer>;

// Helper type for socket.request (assuming you add it to the socket instance or use a wrapper)
interface SocketRequest {
    request: (type: string, data?: any) => Promise<any>;
}

// NOTE: Since your constructor expects a global `mediasoupClient` library, 
// we will type it as `any` or you should ensure it's imported correctly.

export class RoomClient {
    // 2. Type the class properties
    public readonly name: string;
    public readonly localMediaEl: HTMLElement | null; // Assuming HTMLElements
    public readonly remoteVideoEl: HTMLElement | null;
    public readonly remoteAudioEl: HTMLElement | null;
    public readonly mediasoupClient: any; // Type as 'any' if it's a globally exposed library
    
    public readonly socket: Socket & SocketRequest; // Combine Socket with your custom request function
    public producerTransport: Transport | null = null;
    public consumerTransport: Transport | null = null;
    public device: Device | null = null;
    public readonly room_id: string;

    public isVideoOnFullScreen: boolean = false;
    public isDevicesVisible: boolean = false;

    public consumers: ConsumerMap;
    public producers: ProducerMap;
    public producerLabel: ProducerLabelMap; // Map<mediaType, producer_id>

    private _isOpen: boolean = false;
    // Map<event_name (string), callback[] (function[])>
    private eventListeners: Map<string, Function[]>;
    
    // Static accessors
    static readonly mediaType = mediaType;
    static readonly EVENTS = _EVENTS;


    // 3. Type the constructor
    constructor(
        localMediaEl: HTMLElement | null,
        remoteVideoEl: HTMLElement | null,
        remoteAudioEl: HTMLElement | null,
        mediasoupClient: any, // or typeof import('mediasoup-client')
        socket: Socket,
        room_id: string,
        name: string,
        successCallback: () => void // The callback function
    ) {
        this.name = name;
        this.localMediaEl = localMediaEl;
        this.remoteVideoEl = remoteVideoEl;
        this.remoteAudioEl = remoteAudioEl;
        this.mediasoupClient = mediasoupClient;

        // Attach request function to socket for internal use, as you did previously
        (socket as any).request = function request(type: string, data: any = {}) {
            return new Promise((resolve, reject) => {
                this.emit(type, data, (response: any) => {
                    if (response && response.error) {
                        reject(response.error);
                    } else {
                        resolve(response);
                    }
                });
            });
        };
        this.socket = socket as Socket & SocketRequest; // Cast to the combined type
        
        this.room_id = room_id;
        this.consumers = new Map();
        this.producers = new Map();
        this.producerLabel = new Map();
        this.eventListeners = new Map();
        
        // Initialize event listeners map
        Object.keys(_EVENTS).forEach((evt) => {
            this.eventListeners.set(evt, []);
        });

        // Start connection process
        this.createRoom(room_id)
            .then(async () => {
                await this.join(name, room_id);
                this.initSockets();
                this._isOpen = true;
                successCallback();
            })
            .catch(err => {
                console.error("RoomClient Initialization failed:", err);
            });
    }

    // 4. Example of typing methods (others follow a similar pattern)
    
    // Typing the async function to return a Promise<void>
    async createRoom(room_id: string): Promise<void> {
        await this.socket.request('createRoom', { room_id })
            .catch((err: Error) => {
                console.log('Create room error:', err);
            });
    }

    // Typing the async function to return a Promise<void>
    async join(name: string, room_id: string): Promise<void> {
        // ... (body of join)
    }

    // Typing the async function to return a Promise<Device>
    async loadDevice(routerRtpCapabilities: RtpCapabilities): Promise<Device> {
        // ... (body of loadDevice)
    }

    /**
   * Starts producing a media track (audio, video, or screen share) to the room.
   * @param type The media type (e.g., RoomClient.mediaType.video).
   * @param deviceId Optional: The specific device ID to use (e.g., camera ID).
   */
  async produce(type: string, deviceId: string | null = null): Promise<void> {
    let mediaConstraints: MediaStreamConstraints = {};
    let audio: boolean = false;
    let screen: boolean = false;

    // 1. Determine media type and constraints
    switch (type) {
      case RoomClient.mediaType.audio:
        mediaConstraints = {
          audio: { deviceId: deviceId || undefined },
          video: false
        };
        audio = true;
        break;
      case RoomClient.mediaType.video:
        mediaConstraints = {
          audio: false,
          video: {
            width: { min: 640, ideal: 1920 },
            height: { min: 400, ideal: 1080 },
            deviceId: deviceId || undefined
          }
        };
        break;
      case RoomClient.mediaType.screen:
        mediaConstraints = false; // getDisplayMedia doesn't use standard constraints object
        screen = true;
        break;
      default:
        return;
    }

    // 2. Pre-flight checks
    if (!this.device?.canProduce('video') && !audio) {
      console.error('Cannot produce video: Device is not loaded or cannot produce.');
      return;
    }
    if (this.producerLabel.has(type)) {
      console.log('Producer already exists for this type ' + type);
      return;
    }
    if (!this.producerTransport) {
        console.error('Producer transport is not initialized.');
        return;
    }
    
    console.log('Media constraints:', mediaConstraints);

    let stream: MediaStream | null = null;
    try {
      // 3. Get MediaStream from browser
      stream = screen
        ? await navigator.mediaDevices.getDisplayMedia()
        : await navigator.mediaDevices.getUserMedia(mediaConstraints);

      // 4. Prepare track and parameters for mediasoup
      const track: MediaStreamTrack = audio 
        ? stream.getAudioTracks()[0] 
        : stream.getVideoTracks()[0];
        
      const params: any = { track };
      
      // Add SVC encodings for simulcast/scalable video
      if (!audio && !screen) {
        params.encodings = [
          { rid: 'r0', maxBitrate: 100000, scalabilityMode: 'S1T3' },
          { rid: 'r1', maxBitrate: 300000, scalabilityMode: 'S1T3' },
          { rid: 'r2', maxBitrate: 900000, scalabilityMode: 'S1T3' }
        ];
        params.codecOptions = {
          videoGoogleStartBitrate: 1000
        };
      }
      
      // **THE FIX:** Declare 'producer' as a local constant
      const producer: Producer = await this.producerTransport.produce(params);

      console.log('Producer created:', producer);

      this.producers.set(producer.id, producer);

      // 5. Attach stream to local DOM element
      let elem: HTMLVideoElement | HTMLAudioElement;
      
      // Create and append the local media element
      if (!audio) {
        elem = document.createElement('video');
        elem.srcObject = stream;
        elem.id = producer.id;
        // elem.playsInline = false;
        elem.autoplay = true;
        elem.className = 'vid';
        this.localMediaEl?.appendChild(elem);
        this.handleFS(elem.id);
      } else {
        elem = document.createElement('audio');
        elem.srcObject = stream;
        elem.id = producer.id;
        // elem.playsInline = false;
        elem.autoplay = true;
        this.remoteAudioEl?.appendChild(elem); // NOTE: Placing local audio in remoteAudioEl is unusual, but matches original JS
      }
      
      // 6. Set up event listeners for the new producer
      producer.on('trackended', () => {
        // this.closeProducer(type);
      });

      producer.on('transportclose', () => {
        console.log('Producer transport close');
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
        elem.parentNode?.removeChild(elem);
        this.producers.delete(producer.id);
      });

      producer.on('@close', () => {
        console.log('Closing producer');
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
        elem.parentNode?.removeChild(elem);
        this.producers.delete(producer.id);
      });

      // 7. Update state maps and fire UI event
      this.producerLabel.set(type, producer.id);

      switch (type) {
        case RoomClient.mediaType.audio:
          this.event(RoomClient.EVENTS.startAudio);
          break;
        case RoomClient.mediaType.video:
          this.event(RoomClient.EVENTS.startVideo);
          break;
        case RoomClient.mediaType.screen:
          this.event(RoomClient.EVENTS.startScreen);
          break;
      }
    } catch (err) {
      console.error('Produce error:', err);
    }
  }

    // ... (rest of the methods)
}

// 5. Export the class
// export default RoomClient; // Use default export if this is the main export of the file