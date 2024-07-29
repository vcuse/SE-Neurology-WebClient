function submit(){
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if(username.length === 0 || password.length === 0){
        window.alert("Please fill in all fields");
    }
    else{
        const data = {username: username, password: password};
        fetch("http://localhost:9000/key=peerjs/post", {
            method: "POST",
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            },
        })
        .then((response) => response.text())
        .then((result) => {
            window.alert(result);
            if(result === "ACCESS GRANTED"){
                window.location.href = "../index.html?username=" + encodeURIComponent(username);
            }
        })
        .catch((err) => console.log(err));
    }
}