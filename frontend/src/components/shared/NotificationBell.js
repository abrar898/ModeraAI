import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { formatDate } from './Helpers';

export default function NotificationBell() {
  const { notifications, unreadCount, open, setOpen, markRead, markAllRead, refresh } = useNotifications();
  const panelRef = useRef(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, setOpen]);

  const handleToggle = async () => {
    if (!open) {
      setLoading(true);
      await refresh();
      setLoading(false);
    }
    setOpen(!open);
  };

  const handleOpen = async (notification) => {
    if (!notification.read) await markRead(notification._id);
    setOpen(false);
  };

  return (
    <div className="relative shrink-0" ref={panelRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative flex items-center justify-center w-10 h-10 rounded-full border border-mist dark:border-dusk-line bg-white dark:bg-dusk-raised hover:border-signal transition-colors shadow-sm"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-ink/60 dark:text-paper/60">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-signal text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed sm:absolute right-3 sm:right-0 left-auto top-[4.25rem] sm:top-12 w-[min(24rem,calc(100vw-1.5rem))] sm:w-96 bg-white dark:bg-dusk-raised border border-mist dark:border-dusk-line rounded-xl2 shadow-card dark:shadow-card-dark z-[100] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-mist dark:border-dusk-line bg-paper-dim/50 dark:bg-white/[0.02]">
            <span className="text-sm font-semibold text-ink dark:text-paper">
              Notifications {unreadCount > 0 && <span className="text-signal">({unreadCount} new)</span>}
            </span>
            {unreadCount > 0 && (
              <button type="button" className="text-xs text-signal font-semibold hover:underline" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-10 text-center text-sm text-ink/40 dark:text-paper/40">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="text-2xl mb-2 opacity-50">🔔</div>
                <p className="text-sm text-ink/50 dark:text-paper/45">No notifications yet</p>
                <p className="text-xs text-ink/35 dark:text-paper/35 mt-1">Appeal updates will appear here</p>
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n._id}
                  to={n.link || '/appeals'}
                  onClick={() => handleOpen(n)}
                  className={`block px-4 py-3.5 border-b border-mist dark:border-dusk-line last:border-0 hover:bg-paper-dim dark:hover:bg-white/5 transition active:bg-mist/50 ${
                    !n.read ? 'bg-signal-light/25 dark:bg-signal/10 border-l-4 border-l-signal' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg shrink-0 mt-0.5">{n.type === 'appeal_resolved' ? '⚖' : 'ℹ'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-ink dark:text-paper">{n.title}</div>
                      <div className="text-xs text-ink/55 dark:text-paper/45 mt-1 leading-relaxed">{n.message}</div>
                      <div className="text-[10px] text-ink/35 dark:text-paper/30 mt-1.5">{formatDate(n.createdAt)}</div>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-signal shrink-0 mt-2" />}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
