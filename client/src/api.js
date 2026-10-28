import axios from 'axios';

// Single source of truth for the backend origin (axios + Socket.io WebRTC signaling)
export const SERVER_URL = import.meta.env?.VITE_SOCKET_URL || 'http://localhost:5000';

const API = axios.create({
    baseURL: `${SERVER_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default API;
