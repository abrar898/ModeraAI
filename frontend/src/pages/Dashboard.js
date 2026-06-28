import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import PageHeader from '../components/shared/PageHeader';
import { OutcomeBadge, LoadingCenter, formatDate } from '../components/shared/Helpers';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch recent (last 5) and full stats in parallel
    Promise.all([
      api.get('/submissions?limit=5'),
      api.get('/submissions?limit=1&outcome=approved'),
      api.get('/submissions?limit=1&outcome=flagged'),
      api.get('/submissions?limit=1&outcome=blocked'),
    ])
      .then(([recentRes, approvedRes, flaggedRes, blockedRes]) => {
        setRecent(recentRes.data.submissions);
        setStats({
          total: recentRes.data.total,
          approved: approvedRes.data.total,
          flagged: flaggedRes.data.total,
          blocked: blockedRes.data.total,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingCenter text="Loading dashboard..." />;

  const statCards = [
    { label: 'Total submissions', value: stats?.total ?? 0, sub: 'All time', color: 'text-signal' },
    { label: 'Approved', value: stats?.approved ?? 0, sub: 'All time', color: 'text-cleared' },
    { label: 'Flagged', value: stats?.flagged ?? 0, sub: 'Pending review', color: 'text-signal-dark' },
    { label: 'Blocked', value: stats?.blocked ?? 0, sub: 'Policy violations', color: 'text-rose-600 dark:text-rose-400' },
  ];

  return (
    <div>
      <PageHeader title={`Welcome back, ${user?.username}`} subtitle="Here's an overview of your recent moderation activity." />

      {user?.reputationScore != null && (
        <div className="card mb-6 border-signal/20 bg-signal-light/10 dark:bg-signal/5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-ink/40 dark:text-paper/35 mb-1">Reputation score</div>
              <div className="text-2xl font-display font-semibold text-signal">{user.reputationScore}</div>
              <div className="text-xs text-ink/45 dark:text-paper/40 mt-0.5">
                {user.reputationTier?.label || 'Good standing'} — builds with approved submissions, decreases with violations
              </div>
            </div>
            <div className="flex gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-cleared">{user.approvedCount ?? 0}</div>
                <div className="text-[10px] uppercase tracking-wide text-ink/35">Approved</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-signal">{user.flaggedCount ?? 0}</div>
                <div className="text-[10px] uppercase tracking-wide text-ink/35">Flagged</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-rose-500">{user.blockedCount ?? 0}</div>
                <div className="text-[10px] uppercase tracking-wide text-ink/35">Blocked</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {statCards.map((s) => (
          <div key={s.label} className="card">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink/40 dark:text-paper/35 mb-2">{s.label}</div>
            <div className={`text-3xl font-semibold font-display ${s.color}`}>{s.value}</div>
            <div className="text-xs text-ink/40 dark:text-paper/35 mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-semibold text-ink dark:text-paper">Recent submissions</h2>
          <Link to="/submit" className="btn-primary btn-sm">+ New submission</Link>
        </div>

        {recent.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">⬆</div>
            <h3 className="font-display font-semibold text-ink/80 dark:text-paper/80 mb-1">No submissions yet</h3>
            <p className="text-sm text-ink/45 dark:text-paper/40 mb-4">Submit your first images for moderation screening.</p>
            <Link to="/submit" className="btn-primary inline-flex">Submit images</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-mist dark:border-dusk-line text-left">
                  <th className="py-2.5 font-semibold text-[11px] uppercase tracking-wide text-ink/40 dark:text-paper/35">Submitted</th>
                  <th className="py-2.5 font-semibold text-[11px] uppercase tracking-wide text-ink/40 dark:text-paper/35">Images</th>
                  <th className="py-2.5 font-semibold text-[11px] uppercase tracking-wide text-ink/40 dark:text-paper/35">Outcome</th>
                  <th className="py-2.5 font-semibold text-[11px] uppercase tracking-wide text-ink/40 dark:text-paper/35">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s._id} className="table-row-hover border-b border-mist dark:border-dusk-line last:border-0">
                    <td className="py-3 text-ink/70 dark:text-paper/60">{formatDate(s.createdAt)}</td>
                    <td className="py-3 text-ink/70 dark:text-paper/60">{s.images?.length} image{s.images?.length !== 1 ? 's' : ''}</td>
                    <td className="py-3"><OutcomeBadge outcome={s.overallOutcome} /></td>
                    <td className="py-3">
                      <Link to={`/submissions/${s._id}`} className="btn-secondary btn-sm">View details</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {recent.length > 0 && (
          <div className="text-center mt-5">
            <Link to="/submissions" className="btn-secondary btn-sm">View all submissions →</Link>
          </div>
        )}
      </div>
    </div>
  );
}
