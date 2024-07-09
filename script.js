const peer = new Peer({
    host: 'videochat-signaling-app.ue.r.appspot.com',
    port: 443,
    secure: true,
    path: '/',
});

let onlineUsers = [];
let listedUsers = [];
let callInitiated = false; // Flag to track if a call has been initiated
let incomingCall = null;
let mediaConnection = null;
let ringingTimeout = null;
let dataConnection = null;
let myStream = null; // Store stream globally to allow muting

// Have the web client check every 3 seconds for any users who came online or offline
setInterval(() => {
    fetch('https://videochat-signaling-app.ue.r.appspot.com/key=peerjs/peers')
    .then((response) => response.json())
    .then((data) => { 
        onlineUsers = data;
        onlineUsers.forEach((ID) => {
            if(!(listedUsers.includes(ID)) && ID != peer.id){
                addOnlineUser(ID);
            }
        });
        listedUsers.forEach((ID) => {
            if(!(onlineUsers.includes(ID))){
                removeOfflineUser(ID);
            }
        });
    })
    .catch((error) => console.log(error));
}, 1000);

peer.on('call', (call) => {
    incomingCall = call;
    document.getElementById('incomingCallContainer').style.display = 'flex'; // Show incoming call message and call menu
    callInitiated = true; // Set the flag to true when a call is initiated
});

peer.on('open', (id) => {
    console.log('My peer ID is: ' + id);
    document.getElementById('ownPeerId').innerText = id;
});

peer.on('connection', (connection) => {
    dataConnection = connection;
    dataConnection.on('open', () => console.log('Connected to: ' + dataConnection.peer));
    dataConnection.on('data', (data) => {
        const messageList = document.getElementById("messageList");
        messageList.innerHTML += `<li>Remote User: ${data}</li>`;
    });
    dataConnection.on('close', () => {
        console.log(`Disconnected from ${dataConnection.peer}`);
        closeConnections();
        window.alert("Call has ended");
    });
    dataConnection.on('error', (err) => console.error(err));
});

function connect(id){
    dataConnection = peer.connect(id);
    dataConnection.on('open', () => console.log(`Connected to: ${id}`));
    dataConnection.on('data', (data) => {
        const messageList = document.getElementById("messageList");
        messageList.innerHTML += `<li>Remote User: ${data}</li>`;
    });
    dataConnection.on('close', () => {
        console.log(`Disconnected from ${id}`);
        closeConnections();
        window.alert("Call has ended");
    });
    dataConnection.on('error', (err) => console.error(err));
}

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    if(messageInput.value){
        const messageList = document.getElementById("messageList");
        messageList.innerHTML += `<li>You: ${messageInput.value}</li>`;
        dataConnection.send(messageInput.value);
        messageInput.value = "";
    }
}

function callUser(id) {
    callInitiated = true;

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
            myStream = stream;
            mediaConnection = peer.call(id, stream);
            mediaConnection.on('stream', (remoteStream) => {
                renderVideoOrAudio(remoteStream);
            });
            document.getElementById('videoContainer').style.display = 'flex';
            showCallUi();
        })
        .catch((err) => {
            console.warn('Failed to get media stream: ', err);
        });
}

function renderVideoOrAudio(remoteStream){
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

    showCallUi();
}

function answerCall() {
    navigator.mediaDevices.enumerateDevices()
        .then((devices) => {
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            const constraints = {audio: true, video: videoDevices.length > 0};

            return navigator.mediaDevices.getUserMedia(constraints);
        })
        .then((stream) => {
            myStream = stream;
            incomingCall.answer(stream);
            mediaConnection = incomingCall;
            mediaConnection.on('stream', (remoteStream) => {
                renderVideoOrAudio(remoteStream);
            });
            document.getElementById('incomingCallContainer').style.display = 'none';
            document.getElementById('videoContainer').style.display = 'flex';
            showCallUi();
        })
        .catch((err) => {
            console.log('Failed to get local stream: ', err);
        });
}

function declineCall(){
    dataConnection.close();
    document.getElementById('incomingCallContainer').style.display = 'none'; // Hide incoming call message and call menu after declining
}

function closeConnections(){
    if(mediaConnection){
        mediaConnection.close();
        hideCallUi();
    }
    messageList = document.getElementById("messageList");
    messageList.innerHTML = "";
    for(let conns in peer.connections){
        peer.connections[conns].forEach((dataConnection) => {
            if(dataConnection.close){
                dataConnection.close();
            }
        });
    }
}

// Function for stopping the audio and video after user presses end call button
function stopAudioVideo(){
    myStream.getAudioTracks().forEach((track) => {
        track.stop();
    });

    myStream.getVideoTracks().forEach((track) => {
        track.stop();
    });
}

// Function that mutes and unmutes the user
function muteCall(){
    let muteButton = document.getElementById('muteButton');
    let muteImage = document.getElementById('muteImage');
    if(!myStream.getAudioTracks()[0].enabled){
        myStream.getAudioTracks()[0].enabled = true;
        muteImage.src = 'icons/mic.png';
        muteButton.title = "Mute";
    }
    else{
        myStream.getAudioTracks()[0].enabled = false;
        muteImage.src = 'icons/mic_off.png';
        muteButton.title = "Unmute";
    }
}

// Function to show the hang-up and mute buttons only if a call has been initiated
function showCallUi() {
    if (callInitiated) {
        document.getElementById('hangupButton').style.display = 'block';
        document.getElementById('muteButton').style.display = 'block';
        document.getElementById('optionsBar').style.display = 'flex'; // Show the hang-up bar
    }
}

function hideCallUi(){
    document.getElementById('hangupButton').style.display = 'none'; // Hide hang-up button after hanging up
    document.getElementById('videoContainer').style.display = 'none'; // Hide the video container
    document.getElementById('optionsBar').style.display = 'none'; // Hide the hang-up bar
    stopAudioVideo();
}

function addOnlineUser(ID){
    listedUsers.push(ID);
    const nobodyOnlineIndicator = document.getElementById("nobodyOnlineIndicator");
    if(!(nobodyOnlineIndicator.style.display == 'none')){
        nobodyOnlineIndicator.style.display = 'none';
    }
    const list = document.getElementById('userList');
    list.innerHTML += `<li id="${ID}_online">${ID}<button id="${ID}" class="onlineCallButton" onclick="callUser(this.id); connect(this.id)">Call</button></li>`;
}

function removeOfflineUser(ID){
    const index = listedUsers.indexOf(ID);
    listedUsers.splice(index, 1);
    const removeButton = document.getElementById(ID);
    const removeId = document.getElementById(`${ID}_online`);
    removeButton.remove();
    removeId.remove();
    if(listedUsers.length === 0){
        const nobodyOnlineIndicator = document.getElementById("nobodyOnlineIndicator");
        nobodyOnlineIndicator.style.display = 'block';
    }
}