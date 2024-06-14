const peer = new Peer({
    host: 'videochat-signaling-app.ue.r.appspot.com',
    port: 443,
    secure: true,
    path: '/',
});

let callInitiated = false; // Flag to track if a call has been initiated
let incomingCall = null;
let mediaConnection = null;
let ringingTimeout = null;
let localStream = null; // Store stream globally to allow muting

peer.on('call', (call) => {
    incomingCall = call;
    document.getElementById('incomingCallContainer').style.display = 'flex'; // Show incoming call message and call menu
    callInitiated = true; // Set the flag to true when a call is initiated
});

peer.on('open', function (id) {
    console.log('My peer ID is: ' + id);
    document.getElementById('ownPeerId').innerText = id;
});

peer.on('connection', function (conn) {
    conn.on('data', function (data) {
        console.log('Received: ' + data);
        appendMessage('Received: ' + data);
    });
});

let conn = null;

function connect() {
    const remoteId = document.getElementById('remoteId').value;
    conn = peer.connect(remoteId);

    conn.on('open', function () {
        console.log('Connected to: ' + remoteId);
    });

    conn.on('error', function (err) {
        console.error(err);
    });
}

function sendMessage() {
    if (conn === null) {
        console.error('You are not connected to any peer.');
        return;
    }

    const message = document.getElementById('message').value;
    appendMessage('Sent: ' + message);
    conn.send(message);
}

function appendMessage(message) {
    const messagesContainer = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.innerText = message;
    messagesContainer.appendChild(messageElement);
}

function callUser() {
    callInitiated = true;
    const remoteId = document.getElementById('callId').value;

    // Show ringing pop-up
    document.getElementById('ringingPopup').style.display = 'block';

    // Set a timeout to hide the pop-up after a certain duration
    ringingTimeout = setTimeout(() => {
        // Hide ringing pop-up after 5 seconds (adjust as needed)
        document.getElementById('ringingPopup').style.display = 'none';
    }, 5000); // Change duration as needed

    // This will filter out any devices we have, allowing for audio only chatting if needed
    navigator.mediaDevices.enumerateDevices()
        .then((devices) => {
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            const constraints = {audio: true, video: videoDevices.length > 0};

            return navigator.mediaDevices.getUserMedia(constraints);
        })
        .then((stream) => {
            localStream = stream;
            mediaConnection = peer.call(remoteId, stream);
            mediaConnection.on('stream', (remoteStream) => {
                renderVideoOrAudio(remoteStream, stream);
            });
            document.getElementById('videoContainer').style.display = 'flex';
            showButtons();
        })
        .catch((err) => {
            console.warn('Failed to get media stream: ', err);
        });

    // Clear the timeout when the call is declined
    peer.once('call', () => {
        clearTimeout(ringingTimeout); // Clear the timeout since the call is declined
        document.getElementById('ringingPopup').style.display = 'none'; // Hide the pop-up
    });
}

function renderVideoOrAudio(remoteStream, stream) {
    const videoEl = document.getElementById('remoteVideo');
    const audioEl = document.getElementById('remoteAudio');
    if(remoteStream.getVideoTracks().length > 0){
        videoEl.srcObject = remoteStream; // Render video stream if available
    } 
    else{
        // Render audio stream only
        audioEl.srcObject = remoteStream;
        videoEl.src = 'palm_trees.webm';
        videoEl.loop = true;
        console.log("Rendering audio only stream");
    }

    if(stream.getVideoTracks().length == 0){
        videoEl.src = 'palm_trees.webm';
        videoEl.loop = true;
        console.log("Rendering audio only stream");
    }
    
    showButtons();
}

function answerCall() {
    navigator.mediaDevices.enumerateDevices()
        .then((devices) => {
            const videoDevices = devices.filter(device => device.kind == 'videoinput');
            const constraints = {audio: true, video: videoDevices.length > 0};

            return navigator.mediaDevices.getUserMedia(constraints);
        })
        .then((stream) => {
            localStream = stream;
            incomingCall.answer(stream);
            mediaConnection = incomingCall;
            mediaConnection.on('stream', (remoteStream) => {
                renderVideoOrAudio(remoteStream, stream);
            });
            document.getElementById('incomingCallContainer').style.display = 'none';
            document.getElementById('videoContainer').style.display = 'flex';
            showButtons();
        })
        .catch((err) => {
            console.log('Failed to get local stream: ', err);
        });
}

function declineCall() {
    incomingCall.close();
    document.getElementById('incomingCallContainer').style.display = 'none'; // Hide incoming call message and call menu after declining
}

function hangupCall() {
    if (mediaConnection) {
        mediaConnection.close();
        document.getElementById('hangupButton').style.display = 'none'; // Hide hang-up button after hanging up
        document.getElementById('videoContainer').style.display = 'none'; // Hide the video container
        document.getElementById('optionsBar').style.display = 'none'; // Hide the hang-up bar
    }
}

// Function that mutes and unmutes the user
function muteCall(){
    let muteButton = document.getElementById('muteButton');
    let muteImage = document.getElementById('muteImage');
    if(!localStream.getAudioTracks()[0].enabled){
        localStream.getAudioTracks()[0].enabled = true;
        muteImage.src = 'icons/mic.png';
        muteButton.title = "Mute";
    }
    else{
        localStream.getAudioTracks()[0].enabled = false;
        muteImage.src = 'icons/mic_off.png';
        muteButton.title = "Unmute";
    }
}

// Function to show the hang-up and mute buttons only if a call has been initiated
function showButtons() {
    if (callInitiated) {
        document.getElementById('hangupButton').style.display = 'block';
        document.getElementById('muteButton').style.display = 'block';
        document.getElementById('optionsBar').style.display = 'flex'; // Show the hang-up bar
    }
}