import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

function getSocketUrl() {
  if (process.env.REACT_APP_SOCKET_URL) return process.env.REACT_APP_SOCKET_URL;
  // Dev frontend runs on :3000, Socket.io server on :5000 — connect directly
  if (process.env.NODE_ENV === 'development') return 'http://localhost:5000';
  return undefined;
}

export default function useSocket(onEvent) {
  const { user, loading } = useAuth();
  const handlerRef = useRef(onEvent);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (loading) return;

    const token = localStorage.getItem('token');
    if (!token || user?.role !== 'admin') {
      setConnected(false);
      return;
    }

    setError(null);

    const socket = io(getSocketUrl(), {
      auth: { token },
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      setConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('connect_error', (err) => {
      setConnected(false);
      setError(err.message || 'Connection failed');
    });

    const events = ['submission:processed', 'appeal:filed'];
    events.forEach((event) => {
      socket.on(event, (data) => handlerRef.current?.(event, data));
    });

    return () => {
      events.forEach((event) => socket.off(event));
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.disconnect();
      setConnected(false);
    };
  }, [user?.role, user?._id, loading]);

  return { connected, error };
}
