import axios from 'axios';

// Single source of truth for the backend origin (axios + Socket.io WebRTC signaling)
export const SERVER_URL = import.meta.env?.VITE_API_URL || import.meta.env?.VITE_SERVER_URL || import.meta.env?.VITE_SOCKET_URL || 'http://localhost:5000';

const API = axios.create({
    baseURL: `${SERVER_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach the signed-in Clerk identity to every API request.
// This keeps backend authorization scoped to the current account.
API.interceptors.request.use(async (config) => {
    const clerk = window.Clerk;
    let email = clerk?.user?.primaryEmailAddress?.emailAddress;

    if (!email) {
        try {
            const saved = JSON.parse(localStorage.getItem('primecare_user') || '{}');
            email = saved.email;
        } catch {
            email = '';
        }
    }

    if (email) config.headers['x-user-email'] = email;

    try {
        const token = await clerk?.session?.getToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch {
        // Token is optional; the email header is the main identity for this project.
    }

    return config;
});

export default API;
