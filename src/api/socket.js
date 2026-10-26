import { io } from 'socket.io-client';

// Connects to the same origin; Vite's dev proxy forwards /socket.io to the backend.
export const socket = io({ autoConnect: true, transports: ['websocket', 'polling'] });
