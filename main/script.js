// Create our peer
const peer = new Peer({
    host: 'videochat-signaling-app.ue.r.appspot.com',
    port: 443,
    secure: true,
    path: '/',
    debug: 3
});

/**
 * Here we have two lists that store different types of data
 * The onlineUsers list contains the users fetched from the server
 * The listedUsers list contains the users listed on the web client
 * I have included both to properly update the listedUsers
*/

let onlineUsers = [];
let listedUsers = [];

const SIGNALS = ["ENDED", "DECLINED"]; // Signals we can send to the remote user to have certain actions execute (update list as needed)

let callInitiated = false; // Flag to track if a call has been initiated

let incomingCall; // A media connection that comes from a remote user
let mediaConnection; // A media connection we send to a remote user
let ringingTimeout; // Used to have ther ringing popup active for a set amount of time
let dataConnection; // The data connection that is established with the remote user
let myStream; // Our stream that is sent to the remote user

// Have the web client check every second for any users who came online or offline
setInterval(() => {

    // Here, we fetch the data from the server and store it as a JSON file
    fetch('https://videochat-signaling-app.ue.r.appspot.com/key=peerjs/peers')

    .then((response) => response.json())
    .then((data) => {
        // We use the data to update the user lists
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

// This is executed when a peer receives a call
peer.on('call', (call) => {
    incomingCall = call;
    document.getElementById('incomingCallContainer').style.display = 'flex'; // Show incoming call message and call menu
    callInitiated = true;
});

// This is executed when a peer goes online into the server
peer.on('open', (id) => {
    console.log('My peer ID is: ' + id);
    document.getElementById('ownPeerId').innerText = id;
});

// This is executed when a REMOTE peer establishes a data connection to this peer
peer.on('connection', (connection) => {
    dataConnection = connection;
    dataConnection.on('open', () => console.log('Connected to: ' + dataConnection.peer));
    dataConnection.on('data', (data) => {
        handleData(data);
    });
    dataConnection.on('close', () => {
        console.log(`Disconnected from ${dataConnection.peer}`);
        closeConnections();
    });
    dataConnection.on('error', (err) => console.error(err));
});

// Function called when we establish a connection with a remote peer
function connect(id){
    dataConnection = peer.connect(id);
    dataConnection.on('open', () => console.log(`Connected to: ${id}`));
    dataConnection.on('data', (data) => {
        handleData(data);
    });
    dataConnection.on('close', () => {
        console.log(`Disconnected from ${id}`);
        closeConnections();
    });
    dataConnection.on('error', (err) => console.error(err));
}

// Function called when we send a message to a remote peer
function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    if(messageInput.value){
        const messageList = document.getElementById("messageList");
        messageList.innerHTML += `<li>You: ${messageInput.value}</li>`;
        dataConnection.send(messageInput.value);
        messageInput.value = "";
        messageList.scrollTop = messageList.scrollHeight - messageList.clientHeight;
    }
}

// Function called when we call a user
function callUser(id) {
    callInitiated = true;

    // Show ringing pop-up
    document.getElementById('ringingPopup').style.display = 'block';

    
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
                 // See if user presses enter to send a message
                document.addEventListener("keydown", event => {
                    if(event.key === "Enter"){
                        sendMessage();
                    }
                });
                renderVideoOrAudio(remoteStream);
            });
        })
        .catch((err) => {
            console.warn('Failed to get media stream: ', err);
        });

}

// Function used to render the video or audio on our side
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


// Function called when we receive a call and answer it. Similar actions from callUser() are performed 

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
                // See if user presses enter to send a message
                document.addEventListener("keydown", event => {
                    if(event.key === "Enter"){
                        sendMessage();
                    }
                });
                renderVideoOrAudio(remoteStream);
            });
        })
        .catch((err) => {
            console.log('Failed to get local stream: ', err);
        });
}
        

// Function used to send a signal to the remote user
function sendSignal(index){
    dataConnection.send([SIGNALS[index]]);
}

// Function for handling data. This can be messages or signals
function handleData(data){
    if(data[0] === SIGNALS[1]){
        closeConnections();
        window.alert("Call was declined");
    }
    else if(data[0] === SIGNALS[0]){
        closeConnections();
        window.alert("Call was ended by remote user");
    }
    else{
        const messageList = document.getElementById("messageList");
        messageList.innerHTML += `<li>Remote User: ${data}</li>`;
        messageList.scrollTop = messageList.scrollHeight - messageList.clientHeight;
    }
}

// Function used to close all connections with a peer. This necessary in order to properly update the ui
function closeConnections(){
    if(dataConnection){
        dataConnection.close();
    }
    if(mediaConnection){
        mediaConnection.close();
        hideCallUi();
    }
    messageList = document.getElementById("messageList");
    messageList.innerHTML = "";
    document.getElementById('incomingCallContainer').style.display = 'none';
    for(let conns in peer.connections){
        peer.connections[conns].forEach((dataConnection) => {
            if(dataConnection.close){
                dataConnection.close();
            }
        });
    }
}

function declinedConnection() {
    navigator.mediaDevices.enumerateDevices()
        .then((devices) => {
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            const constraints = {audio: true, video: videoDevices.length > 0};

            return navigator.mediaDevices.getUserMedia(constraints);
        })
        document.getElementById('declinedPopup').style.display = 'block';
}

function closeDeclinedPopup() {
    document.getElementById('declinedPopup').style.display = 'none';

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
        document.getElementById('ringingPopup').style.display = 'none';
        document.getElementById('videoContainer').style.display = 'flex';
        document.getElementById('incomingCallContainer').style.display = 'none';
    }
}

// Function for hiding the in-call ui
function hideCallUi(){
    document.getElementById('hangupButton').style.display = 'none'; // Hide hang-up button after hanging up
    document.getElementById('videoContainer').style.display = 'none'; // Hide the video container
    document.getElementById('optionsBar').style.display = 'none'; // Hide the hang-up bar
    stopAudioVideo();
}

// Function for adding a user to the listedUsers list
function addOnlineUser(ID){
    listedUsers.push(ID);
    const nobodyOnlineIndicator = document.getElementById("nobodyOnlineIndicator");
    if(!(nobodyOnlineIndicator.style.display == 'none')){
        nobodyOnlineIndicator.style.display = 'none';
    }
    const list = document.getElementById('userList');
    list.innerHTML += `<li id="${ID}_online">${ID}<button id="${ID}" class="onlineCallButton" onclick="callUser(this.id); connect(this.id)">Call</button></li>`;
}

// Function for removing a user from the listedUsers list
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
