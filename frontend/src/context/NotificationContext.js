import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import api from '../utils/api';

const NotificationContext = createContext(null);

function getSocketUrl() {
  if (process.env.REACT_APP_SOCKET_URL) return process.env.REACT_APP_SOCKET_URL;
  if (process.env.NODE_ENV === 'development') return 'http://localhost:5000';
  return undefined;
}

export function NotificationProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [listRes, countRes] = await Promise.all([
        api.get('/notifications?limit=20'),
        api.get('/notifications/unread-count'),
      ]);
      setNotifications(listRes.data.notifications);
      setUnreadCount(countRes.data.count);
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) refresh();
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, authLoading, refresh]);

  useEffect(() => {
    if (authLoading || !user) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io(getSocketUrl(), {
      auth: { token },
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    socket.on('notification:new', (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 20));
      setUnreadCount((c) => c + 1);
      toast.info(notification.title, notification.message);
    });

    return () => socket.disconnect();
  }, [user?._id, authLoading, toast]);

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        open,
        setOpen,
        refresh,
        markRead,
        markAllRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
