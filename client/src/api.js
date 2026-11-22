import axios from 'axios';

// Single source of truth for the backend origin (axios + Socket.io WebRTC signaling)
export const SERVER_URL = (
    import.meta.env?.VITE_API_URL ||
    import.meta.env?.VITE_SERVER_URL ||
    import.meta.env?.VITE_SOCKET_URL ||
    'http://localhost:5000'
).replace(/\/+$/, ''); // Strip any trailing slashes to avoid double-slash URL bugs

const API = axios.create({
    baseURL: `${SERVER_URL}/api`,
    timeout: 45000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach the signed-in Clerk identity or stored session token to every API request.
API.interceptors.request.use(async (config) => {
    // 1. Check custom JWT token first
    const customToken = localStorage.getItem('primecare_token');
    if (customToken) {
        config.headers.Authorization = `Bearer ${customToken}`;
    }

    // 2. Resolve email from Clerk or localStorage
    let email = '';
    const clerk = window.Clerk;

    if (clerk?.loaded && clerk?.user) {
        email = clerk.user.primaryEmailAddress?.emailAddress || '';
        try {
            const token = await clerk.session?.getToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch {
            // Optional token retrieval
        }
    }

    if (!email) {
        try {
            const saved = JSON.parse(localStorage.getItem('primecare_user') || '{}');
            email = saved.email || '';
        } catch {
            email = '';
        }
    }

    if (email) {
        config.headers['x-user-email'] = email;
    }

    return config;
});


export default API;
