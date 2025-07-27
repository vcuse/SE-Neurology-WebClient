export const validateAuth = async () => {
    try {
        const isProd = window.location.hostname !== 'localhost'; // use to determine whether running in production or not
        const fetchUrl = isProd ? 'https://videochat-signaling-app.ue.r.appspot.com/key=peerjs/post' : 'http://localhost:9000/key=peerjs/post'
        // const fetchUrl = 'https://videochat-signaling-app.ue.r.appspot.com/key=peerjs/post'
        console.log("Authenticating... ");

        const response = await fetch(fetchUrl, {
            method: 'POST',
            credentials: 'include', // must be set to omit (for firefox)
            headers: {
                'Content-Type': 'application/json',
                Action: 'validate',
            },
            body: JSON.stringify({}),
        });

        console.log("Response status: " + response.status);

        if (response.status === 401) {
            localStorage.removeItem('peerId');
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error during authentication:', error);
        return false;
    }
};