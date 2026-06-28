import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LogoutIcon from './LogoutIcon';

const userNav = [
  { to: '/dashboard', icon: '◈', label: 'Dashboard' },
  { to: '/submit', icon: '⬆', label: 'Submit images' },
  { to: '/submissions', icon: '☐', label: 'My submissions' },
  { to: '/appeals', icon: '⚖', label: 'My appeals' },
];

const adminNav = [
  { to: '/admin/dashboard', icon: '◈', label: 'Dashboard' },
  { to: '/admin/analytics', icon: '◉', label: 'Analytics' },
  { to: '/admin/live-feed', icon: '📡', label: 'Live feed' },
  { to: '/admin/submissions', icon: '☷', label: 'All submissions' },
  { to: '/admin/appeals', icon: '⚖', label: 'Appeals queue' },
  { to: '/admin/audit-log', icon: '📋', label: 'Audit log' },
  { to: '/admin/policy', icon: '⚙', label: 'Policy config' },
  { to: '/admin/policy/history', icon: '🕐', label: 'Policy history' },
  { to: '/admin/users', icon: '👤', label: 'Users' },
  { to: '/submit', icon: '⬆', label: 'Submit test image' },
];

export default function Sidebar({ mobileOpen = false, onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navClass = ({ isActive }) => `nav-item ${isActive ? 'active' : ''}`;

  const items = isAdmin ? adminNav : userNav;

  return (
    <aside
      className={`w-64 sm:w-60 shrink-0 fixed top-0 left-0 bottom-0 z-40 flex flex-col bg-paper dark:bg-dusk border-r border-mist dark:border-dusk-line shadow-xl md:shadow-none transition-transform duration-200 ease-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
    >
      <Link to="/" className="flex items-center gap-2.5 px-5 py-5 border-b border-mist dark:border-dusk-line" onClick={onNavigate}>
        <div className="w-9 h-9 rounded-full border-2 border-signal flex items-center justify-center text-signal font-display font-bold text-sm rotate-[-6deg]">
          M
        </div>
        <span className="font-display font-semibold text-lg text-ink dark:text-paper">
          Modera<span className="text-signal">AI</span>
        </span>
      </Link>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} className={navClass} onClick={onNavigate}>
            <span className="w-5 text-center shrink-0">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-mist dark:border-dusk-line">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-paper-dim dark:bg-white/5">
          <div className="w-8 h-8 rounded-full bg-signal flex items-center justify-center text-xs font-bold text-white shrink-0">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate text-ink dark:text-paper">{user?.username}</div>
            <div className="text-[11px] text-ink/40 dark:text-paper/40 capitalize">
              {isAdmin ? 'Administrator' : user?.role}
              {!isAdmin && user?.reputationScore != null && (
                <span className="font-mono text-signal"> · {user.reputationScore} rep</span>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            aria-label="Log out"
            className="shrink-0 text-ink/50 dark:text-paper/50 hover:text-rose-500 dark:hover:text-rose-400 transition-colors p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10"
          >
            <LogoutIcon />
          </button>
        </div>
      </div>
    </aside>
  );
}
