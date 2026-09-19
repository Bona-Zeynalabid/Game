// lib/socket.js
'use client';

import { io } from 'socket.io-client';

let socketPromise = null;
let socket = null;

export async function initializeSocket() {
  if (socket) return socket;
  if (socketPromise) return socketPromise;

  socketPromise = (async () => {
    const res = await fetch('/api/socket-token');
    if (!res.ok) throw new Error('Unauthorized');
    const data = await res.json();
    if (!data.token) throw new Error('No token');
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'https://game-v970.onrender.com/', {
      auth: { token: data.token },
    });
    return socket;
  })();

  try {
    socket = await socketPromise;
    return socket;
  } catch (err) {
    socketPromise = null;
    throw err;
  }
}