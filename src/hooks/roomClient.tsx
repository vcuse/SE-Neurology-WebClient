// RoomClient.ts

import { Socket } from 'socket.io-client';
import { 
    Device, 
    Transport, 
    Producer, 
    Consumer, 
    RtpCapabilities, 
    DtlsParameters, 
    MediaKind, 
    RtpParameters
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
  stopScreen: 'stopScreen',
  startVideo: 'startVideo',
  startAudio: 'startAudio',
  startScreen: 'startScreen',
} as const;

// Helper interface for the result of getConsumeStream
interface ConsumeStreamResult {
    consumer: Consumer;
    stream: MediaStream;
    kind: MediaKind; // 'audio' | 'video'
}

// Helper type for the producer map
type ProducerLabelMap = Map<typeof mediaType[keyof typeof mediaType], string>;
type ProducerMap = Map<string, Producer>;
type ConsumerMap = Map<string, Consumer>;

// Helper type for socket.request (assuming you add it to the socket instance or use a wrapper)
interface SocketRequest {
    request: (type: string, data?: any) => Promise<any>;
}

// Assuming this type is available from the server's response for creating a transport
interface TransportCreationData {
    id: string;
    iceParameters: any; // Use a more specific type if available
    iceCandidates: any; // Use a more specific type if available
    dtlsParameters: any; // Use a more specific type if available
    error?: string;
}

// NOTE: Since your constructor expects a global `mediasoupClient` library, 
// we will type it as `any` or you should ensure it's imported correctly.

export class RoomClient {
    // 2. Type the class properties
    public readonly name: string;
    public readonly localMediaEl: HTMLElement | null; // Assuming HTMLElements
    public remoteVideoEl: HTMLElement | null;
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
    public remoteStreamCallback: (stream: MediaStream) => void;


    // 3. Type the constructor
    constructor(
        localMediaEl: HTMLElement | null,
        remoteVideoEl: HTMLVideoElement | null,
        remoteAudioEl: HTMLElement | null,
        mediasoupClient: any, // or typeof import('mediasoup-client')
        socket: Socket,
        room_id: string,
        name: string,
        successCallback: () => void, // The callback function
        remoteStreamCallback: (stream: MediaStream) => void
    ) {
        this.name = name;
        this.remoteStreamCallback = remoteStreamCallback;
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
                console.log('calling create room');
                await this.join(name, room_id);
                this.initSockets();
                this._isOpen = true;
                successCallback();
            })
            .catch(err => {
                console.error("RoomClient Initialization failed:", err);
            });
    }
    event(evt: keyof typeof RoomClient.EVENTS) {
        if (this.eventListeners.has(evt)) {
          // Note: TypeScript users often use the non-null assertion or optional chaining
          this.eventListeners.get(evt)?.forEach((callback) => callback());
        }
    }

    /**
     * Stops and removes a remote consumer's media track and associated DOM element.
     * @param consumer_id The ID of the consumer (which is also the ID of the DOM element).
     */
    removeConsumer(consumer_id: string): void {
        // 1. Find the DOM element
        const elem = document.getElementById(consumer_id) as HTMLVideoElement | HTMLAudioElement | null;

        if (!elem) {
            console.warn(`Attempted to remove consumer element, but DOM element with ID ${consumer_id} not found.`);
            this.consumers.delete(consumer_id);
            return;
        }

        // 2. Stop all tracks in the associated stream
        const stream = elem.srcObject as MediaStream | null;
        if (stream) {
            stream.getTracks().forEach((track: MediaStreamTrack) => {
                track.stop();
            });
        }

        // 3. Remove the element from its parent (if it has one)
        elem.parentNode?.removeChild(elem);

        // 4. Remove the consumer from the internal map
        this.consumers.delete(consumer_id);
        console.log(`Consumer ${consumer_id} removed.`);
    }

    initSockets(): void {
        // NOTE: We assume 'this.socket' is typed as CustomSocket (with .request)
        // and that the class methods (removeConsumer, consume, exit) are defined.
    
        // 1. Handle server telling the client to close a consumer
        this.socket.on(
            'consumerClosed',
            // Using arrow function maintains 'this' context, avoiding the need for .bind(this)
            ({ consumer_id }: { consumer_id: string }) => {
                console.log('Closing consumer:', consumer_id);
                this.removeConsumer(consumer_id);
            }
        );
    
        /**
         * Data from server: [ { producer_id: string, producer_socket_id: string } ]
         */
        // 2. Handle notification of new producers available in the room
        this.socket.on(
            'newProducers',
            async (data: Array<{ producer_id: string; producer_socket_id: string }>) => {
                console.log('New producers:', data);
                
                // Loop through new producers and consume each one
                for (let { producer_id } of data) {
                    // Ensure the new producer isn't one we just created ourselves (optional self-check)
                    if (!this.producers.has(producer_id)) {
                        await this.consume(producer_id);
                    }
                }
            }
        );
    
        // 3. Handle disconnection from the signaling server
        this.socket.on(
            'disconnect',
            () => {
                console.log('Socket disconnected from server.');
                // Call exit(true) to handle cleanup without sending an 'exitRoom' request back
                // this.exit(true);
            }
        );
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
        this.socket.request('join', {
            name,
            room_id
        });

         // 2. Get the router's RTP capabilities from the server
         const rtpCapsResponse: { rtpCapabilities: RtpCapabilities } = await this.socket.request('getRouterRtpCapabilities');
         console.log('received router rtpcaps', rtpCapsResponse);
         const routerRtpCapabilities = rtpCapsResponse as RtpCapabilities;
        
         // 3. Load the mediasoup device
         const device: Device = await this.loadDevice(routerRtpCapabilities);
         this.device = device;
         
         // 4. Initialize producer and consumer transports
         console.log('going to init transports');
         await this.initTransports(device);
         
         // 5. Request existing producers in the room
         this.socket.emit('getProducers');
 
    }

    async submitForm(payload: any): Promise<void>{
        console.log('about to submit and create a new form');

        this.socket.request('CREATEFORM', payload);
        


    }

        /**
     * Initializes the mediasoup client-side Producer and Consumer Transports.
     * @param device The loaded mediasoup Device instance.
     */
    async initTransports(device: Device): Promise<void> {
        console.log('inside of init transports');
        // --- Initialize Producer Transport (Send) ---
        {
            // 1. Request server to create the WebRTC Send Transport
            const data: TransportCreationData = await this.socket.request('createWebRtcTransport', {
                forceTcp: false,
                rtpCapabilities: device.rtpCapabilities
            });
            console.log('received transport data from server', data);
            if (data.error) {
                console.error('Failed to create Producer Transport:', data.error);
                return;
            }

            // 2. Create client-side Send Transport
            this.producerTransport = device.createSendTransport(data);

            // 3. Set up 'connect' event listener
            this.producerTransport.on(
                'connect',
                // Use arrow function to preserve 'this' context
                async ({ dtlsParameters }: { dtlsParameters: DtlsParameters }, callback: () => void, errback: (error: Error) => void) => {
                    this.socket
                        .request('connectTransport', {
                            dtlsParameters,
                            transport_id: data.id // Use the ID returned from the initial creation request
                        })
                        .then(callback)
                        .catch(errback);
                }
            );

            // 4. Set up 'produce' event listener (triggered by this.producerTransport.produce())
            this.producerTransport.on(
                'produce',
                async ({ kind, rtpParameters }: { kind: MediaKind, rtpParameters: RtpParameters }, callback: (data: { id: string }) => void, errback: (error: Error) => void) => {
                    try {
                        // Request server to create the corresponding Producer
                        const { producer_id }: { producer_id: string } = await this.socket.request('produce', {
                            producerTransportId: this.producerTransport?.id, // Use ?. for safety
                            kind,
                            rtpParameters
                        });
                        
                        // Respond to mediasoup-client with the server-side Producer ID
                        callback({
                            id: producer_id
                        });
                    } catch (err: any) {
                        errback(err);
                    }
                }
            );

            // 5. Set up 'connectionstatechange' event listener
            this.producerTransport.on(
                'connectionstatechange',
                (state: Transport['connectionState']) => {
                    switch (state) {
                        case 'connecting':
                            break;
                        case 'connected':
                            // Local media stream should start here if media access was already acquired
                            // localVideo.srcObject = stream;
                            break;
                        case 'failed':
                            this.producerTransport?.close(); // Use optional chaining
                            console.error('Producer Transport failed.');
                            break;
                        default:
                            break;
                    }
                }
            );
        }

        // --- Initialize Consumer Transport (Receive) ---
        {
            // 1. Request server to create the WebRTC Receive Transport
            const data: TransportCreationData = await this.socket.request('createWebRtcTransport', {
                forceTcp: false
            });

            if (data.error) {
                console.error('Failed to create Consumer Transport:', data.error);
                return;
            }

            // 2. Create client-side Receive Transport
            this.consumerTransport = device.createRecvTransport(data);

            // 3. Set up 'connect' event listener
            this.consumerTransport.on(
                'connect',
                ({ dtlsParameters }: { dtlsParameters: DtlsParameters }, callback: () => void, errback: (error: Error) => void) => {
                    this.socket
                        .request('connectTransport', {
                            transport_id: this.consumerTransport?.id, // Use ?. for safety
                            dtlsParameters
                        })
                        .then(callback)
                        .catch(errback);
                }
            );

            // 4. Set up 'connectionstatechange' event listener
            this.consumerTransport.on(
                'connectionstatechange',
                async (state: Transport['connectionState']) => {
                    switch (state) {
                        case 'connecting':
                            break;
                        case 'connected':
                            // Remote streams can now be consumed and resumed
                            // remoteVideo.srcObject = await stream;
                            // await this.socket.request('resume');
                            break;
                        case 'failed':
                            this.consumerTransport?.close(); // Use optional chaining
                            console.error('Consumer Transport failed.');
                            break;
                        default:
                            break;
                    }
                }
            );
        }
    }
    

    // Typing the async function to return a Promise<Device>
    async loadDevice(routerRtpCapabilities: RtpCapabilities): Promise<Device> {
        // ... (body of loadDevice)
        let device;
        try {
            // FIX: Correctly instantiate the device from the client library
            device = new this.mediasoupClient.Device();
        } catch (error: any) {
            if (error.name === 'UnsupportedError') {
                console.error('Browser not supported');
                alert('Browser not supported');
            }
            console.error(error);
            throw error;
        }
        
        // Load the device with the router's capabilities
        await device.load({
            routerRtpCapabilities
        });
        
        return device;
       
    }
        /**
     * Initiates the consumption of a media stream from a remote producer.
     * The stream is then attached to a new video or audio element and added to the DOM.
     * @param producer_id The ID of the producer stream to consume.
     */
    async consume(producer_id: string): Promise<void> {
        try {
            // Use async/await structure instead of .then().bind(this)
            const { consumer, stream, kind }: ConsumeStreamResult = await this.getConsumeStream(producer_id);

            this.consumers.set(consumer.id, consumer);

            let elem: HTMLVideoElement | HTMLAudioElement;

            // 1. Create and append the appropriate DOM element
            if (kind === 'video') {
                elem = document.createElement('video');
                elem.srcObject = stream;
                elem.id = consumer.id;
                elem.autoplay = true;
                elem.className = 'vid';
                console.log('setting remote video element');
                this.remoteStreamCallback(stream);
                this.remoteVideoEl?.appendChild(elem);
                
                // Ensure handleFS is defined on the class
              
            } else {
                elem = document.createElement('audio');
                elem.srcObject = stream;
                elem.id = consumer.id;
                console.log('received audio and setting up');
                
                
                this.remoteAudioEl?.appendChild(elem);
            }

            // 2. Set up consumer event listeners using modern arrow functions
            
            // Listener for when the remote producer stops sending media
            consumer.on('trackended', () => {
                console.log(`Consumer ${consumer.id} track ended.`);
                this.removeConsumer(consumer.id);
            });

            // Listener for when the consumer transport is closed (e.g., room exit)
            consumer.on('transportclose', () => {
                console.log(`Consumer ${consumer.id} transport closed.`);
                this.removeConsumer(consumer.id);
            });
            
        } catch (error) {
            console.error(`Failed to consume producer ${producer_id}:`, error);
        }
    }


/**
 * Requests server-side resources (Consumer and Stream) to consume a producer.
 * @param producerId The ID of the producer to consume.
 * @returns A promise that resolves with the Consumer, MediaStream, and kind.
 */
async getConsumeStream(producerId: string): Promise<ConsumeStreamResult> {
    // 1. Check for required resources
    if (!this.device || !this.consumerTransport) {
        throw new Error("Device or Consumer Transport not initialized.");
    }

    const { rtpCapabilities }: { rtpCapabilities: RtpCapabilities } = this.device;

    // 2. Request server to create a Consumer
    const data: { 
        id: string; 
        kind: MediaKind; 
        rtpParameters: RtpParameters;
    } = await this.socket.request('consume', {
        rtpCapabilities,
        consumerTransportId: this.consumerTransport.id,
        producerId
    });
    
    const { id, kind, rtpParameters } = data;

    // 3. Create the client-side Consumer
    let codecOptions = {};
    const consumer: Consumer = await this.consumerTransport.consume({
        id,
        producerId,
        kind,
        rtpParameters,
     
    });

    // 4. Attach the Consumer track to a MediaStream
    const stream = new MediaStream();
    stream.addTrack(consumer.track);

    return {
        consumer,
        stream,
        kind
    };
    }
    /**
   * Starts producing a media track (audio, video, or screen share) to the room.
   * @param type The media type (e.g., RoomClient.mediaType.video).
   * @param deviceId Optional: The specific device ID to use (e.g., camera ID).
   */
  async produce(type: string, deviceId: string | null = null): Promise<void> {
    console.log('called produce in roomClient');
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
            // deviceId: deviceId || undefined
          }
        };
        break;
      case RoomClient.mediaType.screen:
        //mediaConstraints = false; // getDisplayMedia doesn't use standard constraints object
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
        //this.localMediaEl?.appendChild(elem);
        // this.handleFS(elem.id);
      } else {
        // elem = document.createElement('audio');
        // elem.srcObject = stream;
        // elem.id = producer.id;
        // elem.playsInline = false;
        //elem.autoplay = true;
        //this.remoteAudioEl?.appendChild(elem); // NOTE: Placing local audio in remoteAudioEl is unusual, but matches original JS
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