import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import PageHeader from '../../components/shared/PageHeader';
import { LoadingCenter, EmptyState, formatDate } from '../../components/shared/Helpers';
import { useToast } from '../../context/ToastContext';

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const toast = useToast();

  const debouncedSearch = useDebounce(searchInput);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (roleFilter) params.set('role', roleFilter);
    if (statusFilter) params.set('status', statusFilter);
    return params;
  }, [debouncedSearch, roleFilter, statusFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildParams();
      const res = await api.get(`/admin/users?${params}`);
      setUsers(res.data);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => { load(); }, [load]);

  const handleToggleStatus = async (user) => {
    setToggling(user._id);
    try {
      const res = await api.patch(`/admin/users/${user._id}/status`, { isActive: !user.isActive });
      setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, isActive: res.data.isActive } : u)));
      toast.success(
        res.data.isActive ? 'User activated' : 'User suspended',
        `${user.username} has been ${res.data.isActive ? 'reactivated' : 'suspended'}.`
      );
    } catch (err) {
      toast.error('Failed', err.response?.data?.message || 'Could not update user status');
    } finally {
      setToggling(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = buildParams();
      const res = await api.get(`/admin/users/export?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Export complete', 'User list downloaded as CSV.');
    } catch {
      toast.error('Export failed', 'Could not download user list.');
    } finally {
      setExporting(false);
    }
  };

  const hasFilters = searchInput || roleFilter || statusFilter;

  return (
    <div>
      <PageHeader title="User management" subtitle="Search users, review activity, and manage account status." />

      <div className="card mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            className="form-input w-56"
            placeholder="Search username or email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <select
            className="form-input w-36"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <select
            className="form-input w-36"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          {hasFilters && (
            <button
              className="btn-secondary btn-sm"
              onClick={() => { setSearchInput(''); setRoleFilter(''); setStatusFilter(''); }}
            >
              Clear filters
            </button>
          )}
          <button className="btn-primary btn-sm ml-auto" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : '↓ Export CSV'}
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <LoadingCenter text="Loading users..." />
        ) : users.length === 0 ? (
          <EmptyState
            icon="👤"
            title={hasFilters ? 'No users match your search' : 'No users found'}
            description={hasFilters ? 'Try a different search term or clear the filters.' : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-mist dark:border-dusk-line text-left">
                  {['Username', 'Email', 'Role', 'Reputation', 'Submissions', 'Violations', 'Joined', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="py-2.5 font-semibold text-[11px] uppercase tracking-wide text-ink/40 dark:text-paper/35 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="table-row-hover border-b border-mist dark:border-dusk-line last:border-0">
                    <td className="py-3 font-medium text-ink dark:text-paper pr-4">{u.username}</td>
                    <td className="py-3 text-ink/55 dark:text-paper/45 pr-4">{u.email}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${
                        u.role === 'admin'
                          ? 'bg-signal-light text-signal-dark dark:bg-signal/15 dark:text-signal'
                          : 'bg-paper-dim dark:bg-white/5 text-ink/55 dark:text-paper/40'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-mono font-semibold text-signal">{u.reputationScore ?? 100}</span>
                      {u.reputationTier && (
                        <span className="block text-[10px] text-ink/35 dark:text-paper/30">{u.reputationTier.label}</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-semibold text-signal">{u.totalSubmissions ?? 0}</span>
                      <Link
                        to={`/admin/submissions?search=${encodeURIComponent(u.username)}`}
                        className="block text-[10px] text-ink/35 dark:text-paper/30 hover:text-signal transition"
                      >
                        View submissions →
                      </Link>
                    </td>
                    <td className={`py-3 font-semibold pr-4 ${u.violationCount > 0 ? 'text-rose-500' : 'text-cleared'}`}>
                      {u.violationCount ?? 0}
                    </td>
                    <td className="py-3 text-ink/55 dark:text-paper/45 pr-4">{formatDate(u.createdAt)}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        u.isActive
                          ? 'bg-cleared-light text-cleared-dark dark:bg-cleared/10 dark:text-cleared'
                          : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-cleared' : 'bg-rose-500'}`} />
                        {u.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="py-3">
                      {u.role !== 'admin' ? (
                        <button
                          className={`btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                          onClick={() => handleToggleStatus(u)}
                          disabled={toggling === u._id}
                        >
                          {toggling === u._id ? '…' : u.isActive ? 'Suspend' : 'Activate'}
                        </button>
                      ) : (
                        <span className="text-xs text-ink/25 dark:text-paper/20">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 text-xs text-ink/35 dark:text-paper/30">
          {users.length} user{users.length !== 1 ? 's' : ''} shown
          {hasFilters ? ' (filtered)' : ''} · Submission counts from user profile stats.
        </div>
      </div>
    </div>
  );
}
