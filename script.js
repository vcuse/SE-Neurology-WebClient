// Global Vars
const peer = new Peer({
    host: 'videochat-signaling-app.ue.r.appspot.com',
    port: 443,
    secure: true,
    path: '/',
});
let callInitiated = false;
let incomingCall = null;
let mediaConnection = null;
let ringingTimeout = null;
let localStream = null;
let isAudioMuted = false;
let isVideoMuted = false;
let isCaller = false;


peer.on('call', (call) => {
    incomingCall = call;
    document.getElementById('incomingCallContainer').style.display = 'flex'; // Show incoming call message and call menu
    callInitiated = true; // Set the flag to true when a call is initiated
});

peer.on('open', function(id) {
    console.log('My peer ID is: ' + id);
    document.getElementById('ownPeerId').innerText = id;
});

peer.on('connection', function(conn) {
    conn.on('data', function(data) {
        console.log('Received: ' + data);
        appendMessage('Received: ' + data);
    });
});

// Handle data connection for declined calls
peer.on('connection', (conn) => {
    conn.on('data', (data) => {
        if (data === 'declined') {
            // showDeclinedPopup();
        }
    });
});

let conn = null;

function connect() {
    const remoteId = document.getElementById('remoteId').value;
    conn = peer.connect(remoteId);

    conn.on('open', function() {
        console.log('Connected to: ' + remoteId);
    });

    conn.on('error', function(err) {
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
    const remoteId = document.getElementById('callId').value;

    // Show ringing pop-up
    document.getElementById('ringingPopup').style.display = 'block';

    // Set a timeout to hide the pop-up after a certain duration
    ringingTimeout = setTimeout(() => {
        // Hide ringing pop-up after 5 seconds (adjust as needed)
        document.getElementById('ringingPopup').style.display = 'none';
    }, 5000); // Change duration as needed

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
            localStream = stream;
            mediaConnection = peer.call(remoteId, stream);
            mediaConnection.on('stream', renderVideoOrAudio);
            mediaConnection.on('close', () => handleCallEnd(false));
            mediaConnection.on('error', handleCallError);
            console.log("Connected to user with video");
            document.getElementById('videoContainer').style.display = 'flex'; // Show the video container
            callInitiated = true;
            isCaller = true;
            showHangupButton(); // Show hang-up button when calling
            showMuteButtons(); // Show mute buttons when calling
        })
        .catch((videoErr) => {
            console.warn('Failed to get video stream:', videoErr);

            navigator.mediaDevices.getUserMedia({ video: false, audio: true })
                .then((audioStream) => {
                    localStream = audioStream;
                    mediaConnection = peer.call(remoteId, audioStream);
                    mediaConnection.on('stream', renderVideoOrAudio);
                    mediaConnection.on('close', () => handleCallEnd(false));
                    mediaConnection.on('error', handleCallError);
                    console.log("Connected to user with audio");
                    document.getElementById('videoContainer').style.display = 'flex'; // Show the video container
                    callInitiated = true;
                    isCaller = true;
                    showHangupButton(); // Show hang-up button when calling
                    showMuteButtons(); // Show mute buttons when calling
                })
                .catch((audioErr) => {
                    console.error('Failed to get audio stream:', audioErr);
                });
        });

    // Handle the case where the call is declined
    mediaConnection.on('error', (err) => {
        if (err.type === 'peer-unavailable') {
            document.getElementById('ringingPopup').style.display = 'none'; // Hide the pop-up
            // showDeclinedPopup(); // Show the "User Declined" popup
        }
    });
}



// Show hang-up button and mute buttons
function showHangupButton() {
    document.getElementById('hangupButton').style.display = 'block';
    document.getElementById('hangupBar').style.display = 'flex'; // Show the hang-up bar
}

function showMuteButtons() {
    document.getElementById('muteAudioButton').style.display = 'block';
    document.getElementById('muteVideoButton').style.display = 'block';
}

// Toggle mute audio
function toggleMuteAudio() {
    if (localStream) {
        isAudioMuted = !isAudioMuted;
        localStream.getAudioTracks()[0].enabled = !isAudioMuted;
        document.getElementById('muteAudioButton').innerText = isAudioMuted ? 'Unmute Audio' : 'Mute Audio';
    }
}

// Toggle mute video
function toggleMuteVideo() {
    if (localStream) {
        isVideoMuted = !isVideoMuted;
        localStream.getVideoTracks()[0].enabled = !isVideoMuted;
        document.getElementById('muteVideoButton').innerText = isVideoMuted ? 'Unmute Video' : 'Mute Video';
    }
}


// Handle call end
function handleCallEnd(hungUpByOther) {
    document.getElementById('hangupButton').style.display = 'none'; // Hide hang-up button after hanging up
    document.getElementById('videoContainer').style.display = 'none'; // Hide the video container
    document.getElementById('hangupBar').style.display = 'none'; // Hide the hang-up bar
    document.getElementById('muteAudioButton').style.display = 'none';
    document.getElementById('muteVideoButton').style.display = 'none';

    clearLocalStream();
}

// Handle call errors (including declined calls)
function handleCallError(err) {
    if (err.type === 'peer-unavailable') {
        document.getElementById('ringingPopup').style.display = 'none'; // Hide the pop-up
    }
}


// Show "User Declined" popup
function showDeclinedPopup() {
    document.getElementById('declinedPopup').style.display = 'block';
}

// Dismiss "User Declined" popup
function dismissDeclinedPopup() {
    document.getElementById('declinedPopup').style.display = 'none';
    clearLocalStream();
}

// Show "User Hung Up" popup
function showHungupPopup() {
    document.getElementById('hungupPopup').style.display = 'block';
}

// Dismiss "User Hung Up" popup
function dismissHungupPopup() {
    document.getElementById('hungupPopup').style.display = 'none';
    clearLocalStream();
}

// Clear local stream
function clearLocalStream() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
}


function renderVideoOrAudio(stream) {
    const videoEl = document.getElementById('remoteVideo');
    if (stream.getVideoTracks().length > 0) {
        videoEl.srcObject = stream; // Render video stream if available
        showHangupButton(); // Call function to show hang-up button
    } else {
        // Render audio stream
        // You can choose to display a message indicating that the call is audio-only
        console.log("Rendering audio stream");
    }
}

// Answer an incoming call
function answerCall() {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
            localStream = stream;
            incomingCall.answer(stream); // Answer the call with an A/V stream.
            mediaConnection = incomingCall;
            mediaConnection.on('stream', renderVideoOrAudio);
            mediaConnection.on('close', () => handleCallEnd(false));
            mediaConnection.on('error', handleCallError);
            document.getElementById('incomingCallContainer').style.display = 'none'; // Hide incoming call message and call menu after answering
            document.getElementById('videoContainer').style.display = 'flex'; // Show the video container
            callInitiated = true;
            isCaller = false;
            showHangupButton(); // Show hang-up button when answering
            showMuteButtons(); // Show mute buttons when answering
        })
        .catch((err) => {
            console.log('Failed to get local stream ' + err);
        });
}

// Decline an incoming call
function declineCall() {
    if (incomingCall) {
        incomingCall.close();
        document.getElementById('incomingCallContainer').style.display = 'none'; // Hide incoming call message and call menu after declining
        // Notify the caller that the call was declined
        peer.connect(incomingCall.peer).send('declined');
        incomingCall = null;
    }
}

// Hang up the call
function hangupCall() {
    if (mediaConnection) {
        mediaConnection.close();
        handleCallEnd(true);
    }
}

// Function to show the hang-up button only if a call has been initiated
function showHangupButton() {
    if (callInitiated) {
        document.getElementById('hangupButton').style.display = 'block';
        document.getElementById('hangupBar').style.display = 'flex'; // Show the hang-up bar
    }
}