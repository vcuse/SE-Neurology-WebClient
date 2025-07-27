// library imports
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export function useTimedLogout() {
    // state hooks
    const [username, setUsername] = useState<string>("");
    const [logoutTimer, setLogoutTimer] = useState<NodeJS.Timeout | null>(null);
    const [error, setError] = useState<string | null>(null);
    const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);

    const router = useRouter();

    // logout handler
    const handleLogout = async () => {
        console.log("Current username:", username);
        console.log("Username from localStorage:", localStorage.getItem('username'));
        console.log("handleLogout called");
        try {
            const isProd = window.location.hostname !== 'localhost'; // use to determine whether running in production or not
            const fetchUrl = isProd ? 'https://videochat-signaling-app.ue.r.appspot.com/key=peerjs/logout' : 'http://localhost:9000/key=peerjs/logout'; // on port 3000, listen on 9000

            console.log("logging out to " + fetchUrl);

            const response = await fetch(fetchUrl, { // fetch request to /logout in server
                method: 'POST',
                credentials: 'include', // include cookies
            });

            const result = await response.text();


            if (response.ok) {
                console.log('isProd:', isProd);
                localStorage.removeItem('peerId');
                router.push('/login'); // redirect to login page

            } else {
                setError(result || 'An error occurred. Please try again.');
            }
        } catch (error) {
            console.log('Logout failed: ', error);
        }
    };

    // handler for timing logout based on JWT exp
    const setLogoutTime = (expiresAt: number) => {

        if (logoutTimerRef.current) { // clears existing timers
            clearTimeout(logoutTimerRef.current);
            logoutTimerRef.current = null;
        }

        // calculate when token will exp
        const currentTime = Math.floor(Date.now() / 1000);
        const expTime = (expiresAt - currentTime) * 1000;

        if (expTime > 0) {
            console.log(`Setting logout timer for ${expTime / 1000} seconds`);

            // logout when token expires
            logoutTimerRef.current = setTimeout(() => {
                console.log('JWT token expired');
                handleLogout();
            }, expTime);

            // save timer ref in state
            setLogoutTimer(logoutTimerRef.current);
        } else {
            // logout if already exp
            console.log('Token already expired');
            handleLogout();
        }
    }

    return {
        setLogoutTime
    }
}