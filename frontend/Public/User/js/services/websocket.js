import { io } from 'https://cdn.socket.io/4.7.2/socket.io.esm.min.js';

let socket;

export function connectWebSocket() {
  // Connect to backend WebSocket server using same host as API
  const apiBase = CONFIG.API.BASE_URL || 'http://3.110.40.57:3000/api';
  const wsBase = apiBase.replace(/\/api$/, '');
  socket = io(wsBase);
  return socket;
}

export function joinSeatRoom(eventId) {
  if (socket) {
    socket.emit('join-seat-room', eventId);
  }
}

export function listenSeatUpdates(callback) {
  if (socket) {
    socket.on('seat-update', (data) => {
      callback(data);
    });
  }
}

export function leaveSeatRoom(eventId) {
  if (socket) {
    socket.emit('leave-seat-room', eventId);
  }
}
