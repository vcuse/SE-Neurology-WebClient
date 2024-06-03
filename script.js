    const peer = new Peer({
        host: 'videochat-signaling-app.ue.r.appspot.com',
        port: 443,
        secure: true,
        path: '/',
    });
    let callInitiated = false; // Flag to track if a call has been initiated
    let incomingCall = null;
    let mediaConnection = null;
    let ringingTineout = null;

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
    const remoteId = document.getElementById('callId').value;

    // Show ringing pop-up
    document.getElementById('ringingPopup').style.display = 'block';

    // Set a timeout to hide the pop-up after a certain duration
    ringingTimeout = setTimeout(() => {
        // Hide ringing pop-up after 5 seconds (adjust as needed)
        document.getElementById('ringingPopup').style.display = 'none';
    }, 5000); // Change duration as needed

    navigator.mediaDevices.getUserMedia({video: true, audio: true})
        .then((stream) => {
            mediaConnection = peer.call(remoteId, stream);
            mediaConnection.on('stream', renderVideoOrAudio);
            console.log("Connected to user with video");
            document.getElementById('videoContainer').style.display = 'flex'; // Show the video container
            showHangupButton(); // Show hang-up button when calling
        })
        .catch((videoErr) => {
            console.warn('Failed to get video stream:', videoErr);

            navigator.mediaDevices.getUserMedia({video: false, audio: true})
                .then((audioStream) => {
                    mediaConnection = peer.call(remoteId, audioStream);
                    mediaConnection.on('stream', renderVideoOrAudio);
                    console.log("Connected to user with audio");
                    document.getElementById('videoContainer').style.display = 'flex'; // Show the video container
                    showHangupButton(); // Show hang-up button when calling
                })
                .catch((audioErr) => {
                    console.error('Failed to get audio stream:', audioErr);
                });
        });

    // Clear the timeout when the call is answered
    peer.once('call', (call) => {
        call.on('stream', () => {
            clearTimeout(ringingTimeout); // Clear the timeout since the call is answered
            document.getElementById('ringingPopup').style.display = 'none'; // Hide the pop-up
        });
    });

    // Clear the timeout when the call is declined
    peer.once('call', () => {
        clearTimeout(ringingTimeout); // Clear the timeout since the call is declined
        document.getElementById('ringingPopup').style.display = 'none'; // Hide the pop-up
    });
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

function answerCall() {
    navigator.mediaDevices.getUserMedia({video: true, audio: true})
        .then((stream) => {
            incomingCall.answer(stream); // Answer the call with an A/V stream.
            mediaConnection = incomingCall;
            mediaConnection.on('stream', renderVideoOrAudio);
            document.getElementById('incomingCallContainer').style.display = 'none'; // Hide incoming call message and call menu after answering
            document.getElementById('videoContainer').style.display = 'flex'; // Show the video container
            showHangupButton(); // Show hang-up button when answering
        })
        .catch((err) => {
            console.log('Failed to get local stream ' + err);
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
        document.getElementById('hangupBar').style.display = 'none'; // Hide the hang-up bar
    }
}

    // Function to show the hang-up button only if a call has been initiated
function showHangupButton() {
    if (callInitiated) {
        document.getElementById('hangupButton').style.display = 'block';
        document.getElementById('hangupBar').style.display = 'flex'; // Show the hang-up bar
    }
}
