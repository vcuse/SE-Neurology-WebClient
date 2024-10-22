import { useEffect, useState, useRef } from 'react';
import Peer, { DataConnection, MediaConnection } from 'peerjs';

const videoCall = () => {
    const [peerId, setPeerId] = useState<string | null>(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [listedUsers, setListedUsers] = useState<string[]>([]);
    const [dataConnection, setDataConnection] = useState<DataConnection | null>(null);
    const [incomingCall, setIncomingCall] = useState<MediaConnection | null>(null);
    const [myStream, setMyStream] = useState<MediaStream | null>(null);
    const [mediaConnection, setMediaConnection] = useState<MediaConnection | null>(null);
    const videoEl = useRef<HTMLVideoElement>(null);
    const audioEl = useRef<HTMLAudioElement>(null);

    // Define the peer reference
    const peerRef = useRef<Peer | null>(null); // Use useRef to persist peer instance across re-renders

    const SIGNALS = ["ENDED", "DECLINED"];

    // Initialize Peer connection
    useEffect(() => {
        // Initialize peer only when the component mounts
        peerRef.current = new Peer({
            host: 'videochat-signaling-app.ue.r.appspot.com',
            port: 443,
            secure: true,
            path: '/',
            debug: 3
        });

        const peer = peerRef.current; // Local variable for cleaner access

        peer.on('open', (id) => {
            setPeerId(id);
            console.log('My peer ID is: ' + id);
        });

        peer.on('call', (call) => {
            setIncomingCall(call);
            const incomingCallContainer = document.getElementById('incomingCallContainer');
            if (incomingCallContainer) incomingCallContainer.style.display = 'flex'; // Show incoming call UI
        });

        peer.on('connection', (connection) => {
            setDataConnection(connection);
            connection.on('data', (data) => handleData(data));
            connection.on('close', () => closeConnections());
        });

        return () => peer.destroy(); // Clean up on unmount
    }, []);

    // Fetch online users periodically
    useEffect(() => {
        const fetchUsers = () => {
            fetch('https://videochat-signaling-app.ue.r.appspot.com/key=peerjs/peers')
                .then((response) => response.json())
                .then((data) => {
                    setOnlineUsers(data);
                })
                .catch((error) => console.log(error));
        };

        const intervalId = setInterval(fetchUsers, 1000);
        return () => clearInterval(intervalId); // Clean up interval
    }, []);

    // Function to call a user
    const callUser = (id: string) => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((stream) => {
                setMyStream(stream);
                const peer = peerRef.current; // Access peer from useRef
                if (peer) {
                    const call = peer.call(id, stream); // Call the user
                    call.on('stream', (remoteStream) => renderVideoOrAudio(remoteStream));
                    setMediaConnection(call);
                }
            })
            .catch((err) => console.error('Failed to get local stream', err));
    };

    // Function to answer an incoming call
    const answerCall = () => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((stream) => {
                setMyStream(stream);
                if (incomingCall) {
                    incomingCall.answer(stream); // Answer the call with the stream
                    incomingCall.on('stream', (remoteStream: MediaStream) => renderVideoOrAudio(remoteStream));
                    setMediaConnection(incomingCall);
                }
            })
            .catch((err) => console.error('Failed to get local stream', err));
    };

    // Function to send a message to the remote user
    const sendMessage = (message: string) => {
        if (dataConnection && message) {
            const messageList = document.getElementById("messageList");
            if (messageList) {
                messageList.innerHTML += `<li>You: ${message}</li>`;
                dataConnection.send(message); // Send the message over the data connection
            }
        }
    };

    // Function to handle incoming data (messages or signals)
    const handleData = (data: any) => {
        if (data[0] === SIGNALS[1]) {
            closeConnections();
            window.alert("Call was declined");
        } else if (data[0] === SIGNALS[0]) {
            closeConnections();
            window.alert("Call was ended by remote user");
        } else {
            const messageList = document.getElementById("messageList");
            if (messageList) {
                messageList.innerHTML += `<li>Remote User: ${data}</li>`;
            }
        }
    };

    // Function to close connections when the call ends
    const closeConnections = () => {
        if (dataConnection) dataConnection.close();
        if (mediaConnection) mediaConnection.close();
        if (myStream) {
            myStream.getTracks().forEach(track => track.stop());
        }
        setMyStream(null);
        setDataConnection(null);
        setMediaConnection(null);
    };

    // Function to render the video or audio stream
    const renderVideoOrAudio = (remoteStream: MediaStream) => {
        const videoElement = videoEl.current;
        const audioElement = audioEl.current;
        if (videoElement && remoteStream.getVideoTracks().length > 0) {
            videoElement.srcObject = remoteStream; // Set video stream
        }

        if (audioElement && !remoteStream.getVideoTracks().length) {
            audioElement.srcObject = remoteStream; // Set audio stream if no video
        }
        const videoContainer = document.getElementById('videoContainer');
        if (videoContainer) videoContainer.style.display = 'flex'; // Show video UI
    };

    return (
        <div>
            <h1>Welcome to the Video Call</h1>
            <p>Your Peer ID: {peerId}</p>

            {/* User List */}
            <ul>
                {listedUsers.length === 0 && <p id="nobodyOnlineIndicator">Hmmmm, nobody's here right now!</p>}
                {listedUsers.map(user => (
                    <li key={user}>
                        {user}
                        <button onClick={() => callUser(user)}>Call</button>
                    </li>
                ))}
            </ul>

            {/* Video and Audio Containers */}
            <div id="videoContainer" style={{ display: 'none' }}>
                <video ref={videoEl} autoPlay playsInline></video>
                <audio ref={audioEl} autoPlay></audio>
            </div>

            {/* Message UI */}
            <div id="messageContainer">
                <ul id="messageList"></ul>
                <input type="text" id="messageInput" placeholder="Type a message" onKeyDown={(e) => {
                    if (e.key === 'Enter') sendMessage(e.currentTarget.value);
                }} />
            </div>

            {/* Incoming Call UI */}
            <div id="incomingCallContainer" style={{ display: 'none' }}>
                <h3>Incoming Call</h3>
                <button onClick={answerCall}>Answer</button>
                <button onClick={closeConnections}>Decline</button>
            </div>
        </div>
    );
};

export default videoCall;
