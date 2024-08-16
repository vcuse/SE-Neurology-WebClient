function submit(){
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if(username.length === 0 || password.length === 0){
        window.alert("Please fill in all fields");
    }
    else{
        const data = { username: username, password: password };
        fetch("https://videochat-signaling-app.ue.r.appspot.com/key=peerjs/post", {
            method: "POST",
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
                'Action': 'login'
            },
        })
        .then((response) => response.text())
        .then((result) => {
            if(!(result === 'Invalid username or password' || result === 'No more than one active session per user is allowed')){
                window.alert('Login success');
                window.location.href = "../index.html?username=" + encodeURIComponent(username);
            }
            else{
                window.alert(result);
            }
        })
        .catch((err) => console.log(err));
    }
}

function create(){
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if(username.length === 0 || password.length === 0){
        window.alert("Please fill in all fields");
    }
    else{
        const data = { username: username, password: password };
        fetch("https://videochat-signaling-app.ue.r.appspot.com/key=peerjs/post", {
            method: "POST",
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
                'Action': 'create'
            },
        })
        .then((response) => response.text())
        .then((result) => {
            if(!(result === 'Account already in use')){
                window.alert(`${result}. You may now log in`);
            }
            else{
                window.alert(result);
            }
        })
        .catch((err) => console.log(err));
    }
}