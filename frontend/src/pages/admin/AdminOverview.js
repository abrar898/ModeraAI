import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../../utils/api';
import PageHeader from '../../components/shared/PageHeader';
import { OutcomeBadge, formatDate } from '../../components/shared/Helpers';
import useSystemTheme from '../../hooks/useSystemTheme';

const OUTCOME_COLORS_LIGHT = { approved: '#2F6F4F', flagged: '#E8743B', blocked: '#E11D48', mixed: '#9B9685' };
const OUTCOME_COLORS_DARK = { approved: '#5FBF8F', flagged: '#F0935F', blocked: '#FB7185', mixed: '#7D8579' };

function StatSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="h-3 w-24 bg-mist dark:bg-white/10 rounded mb-3" />
      <div className="h-9 w-16 bg-mist dark:bg-white/10 rounded mb-2" />
      <div className="h-3 w-32 bg-mist dark:bg-white/10 rounded" />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-20 rounded-xl bg-mist/60 dark:bg-white/5 animate-pulse" />
      ))}
    </div>
  );
}

export default function AdminOverview() {
  const theme = useSystemTheme();
  const isDark = theme === 'dark';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const axisColor = isDark ? '#D9D6CB' : '#1B2521';
  const mutedColor = isDark ? 'rgba(250,248,243,0.4)' : 'rgba(27,37,33,0.4)';
  const accent = isDark ? '#F0935F' : '#E8743B';
  const tooltipBg = isDark ? '#181E17' : '#FFFFFF';
  const tooltipBorder = isDark ? '#2A332B' : '#E4E1D6';
  const outcomeColors = isDark ? OUTCOME_COLORS_DARK : OUTCOME_COLORS_LIGHT;

  useEffect(() => {
    api.get('/admin/overview')
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  const statCards = data ? [
    { label: 'Registered users', value: data.users.total, sub: `${data.users.newLast30Days} joined last 30 days`, link: '/admin/users', color: 'text-signal' },
    { label: 'Active accounts', value: data.users.active, sub: `${data.users.suspended} suspended`, link: '/admin/users', color: 'text-cleared' },
    { label: 'Total submissions', value: data.submissions.total, sub: `${data.submissions.last30Days} last 30 days`, link: '/admin/submissions', color: 'text-ink dark:text-paper' },
    { label: 'Pending appeals', value: data.appeals.pending, sub: `${data.appeals.total} total appeals`, link: '/admin/appeals', color: 'text-signal-dark' },
  ] : [];

  const regChart = data?.users.registrationsOverTime.map((d) => ({ date: d._id, users: d.count })) ?? [];
  const outcomePie = data?.submissions.outcomeBreakdown.map((o) => ({
    name: o._id,
    value: o.count,
    color: outcomeColors[o._id] || accent,
  })) ?? [];

  const tooltipStyle = { background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, fontSize: 12, color: axisColor };

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Platform overview — users, submissions, and appeals at a glance." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6 sm:mb-8">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          : statCards.map((s) => (
            <Link key={s.label} to={s.link} className="card !p-5 sm:!p-6 hover:border-signal/40 transition-colors group">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink/40 dark:text-paper/35 mb-3">{s.label}</div>
              <div className={`text-3xl sm:text-4xl font-semibold font-display ${s.color}`}>{s.value}</div>
              <div className="text-sm text-ink/45 dark:text-paper/40 mt-2">{s.sub}</div>
              <div className="text-xs text-signal mt-3 opacity-0 group-hover:opacity-100 transition-opacity">View details →</div>
            </Link>
          ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5 sm:gap-6 mb-6 sm:mb-8">
        <div className="card !p-5 sm:!p-6">
          <h2 className="font-display font-semibold text-lg text-ink dark:text-paper mb-1">New user registrations</h2>
          <p className="text-sm text-ink/40 dark:text-paper/35 mb-5">Last 30 days</p>
          {loading ? (
            <div className="h-[240px] rounded-xl bg-mist/50 dark:bg-white/5 animate-pulse" />
          ) : regChart.length === 0 ? (
            <p className="text-sm text-ink/35 dark:text-paper/30 py-8">No new registrations in this period</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={regChart}>
                <defs>
                  <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: mutedColor, fontSize: 10 }} tickMargin={8} />
                <YAxis allowDecimals={false} tick={{ fill: mutedColor, fontSize: 11 }} width={32} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="users" stroke={accent} strokeWidth={2.5} fill="url(#regGrad)" name="New users" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card !p-5 sm:!p-6">
          <h2 className="font-display font-semibold text-lg text-ink dark:text-paper mb-1">All-time verdict split</h2>
          <p className="text-sm text-ink/40 dark:text-paper/35 mb-5">Submission outcomes across the platform</p>
          {loading ? (
            <div className="h-[240px] rounded-xl bg-mist/50 dark:bg-white/5 animate-pulse" />
          ) : outcomePie.length === 0 ? (
            <p className="text-sm text-ink/35 dark:text-paper/30 py-8">No submissions yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={outcomePie} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" nameKey="name" paddingAngle={2}>
                  {outcomePie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend formatter={(v) => <span style={{ color: axisColor, fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 sm:gap-6">
        <div className="card !p-5 sm:!p-6">
          <div className="flex items-center justify-between mb-5 sm:mb-6">
            <div>
              <h2 className="font-display font-semibold text-lg text-ink dark:text-paper">Recent registrations</h2>
              <p className="text-sm text-ink/40 dark:text-paper/35 mt-1">Latest accounts on the platform</p>
            </div>
            <Link to="/admin/users" className="text-sm text-signal font-semibold hover:underline shrink-0">All users</Link>
          </div>
          {loading ? (
            <ListSkeleton />
          ) : (
            <ul className="space-y-3">
              {data.recentUsers.map((u) => (
                <li
                  key={u._id}
                  className="flex items-center gap-4 p-4 sm:p-5 rounded-xl2 border border-mist dark:border-dusk-line bg-paper-dim/40 dark:bg-white/[0.02] hover:border-signal/25 transition-colors"
                >
                  <div className="w-11 h-11 rounded-full bg-signal/15 text-signal font-display font-bold flex items-center justify-center shrink-0 text-lg">
                    {u.username?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ink dark:text-paper truncate">{u.username}</div>
                    <div className="text-sm text-ink/50 dark:text-paper/45 truncate mt-0.5">{u.email}</div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <span className="inline-block capitalize text-xs font-semibold px-2.5 py-1 rounded-full bg-mist dark:bg-white/10 text-ink/60 dark:text-paper/55">
                      {u.role}
                    </span>
                    <div className="text-xs text-ink/40 dark:text-paper/35">{formatDate(u.createdAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card !p-5 sm:!p-6">
          <div className="flex items-center justify-between mb-5 sm:mb-6">
            <div>
              <h2 className="font-display font-semibold text-lg text-ink dark:text-paper">Recent submissions</h2>
              <p className="text-sm text-ink/40 dark:text-paper/35 mt-1">Latest moderated uploads</p>
            </div>
            <Link to="/admin/submissions" className="text-sm text-signal font-semibold hover:underline shrink-0">All submissions</Link>
          </div>
          {loading ? (
            <ListSkeleton />
          ) : (
            <ul className="space-y-3">
              {data.recentSubmissions.map((s) => (
                <li
                  key={s._id}
                  className="flex items-center gap-4 p-4 sm:p-5 rounded-xl2 border border-mist dark:border-dusk-line bg-paper-dim/40 dark:bg-white/[0.02] hover:border-signal/25 transition-colors"
                >
                  <div className="w-11 h-11 rounded-xl bg-ink/5 dark:bg-white/5 flex items-center justify-center shrink-0 text-xl">
                    🖼
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ink dark:text-paper truncate">{s.user?.username || 'Unknown user'}</div>
                    <div className="text-sm text-ink/50 dark:text-paper/45 mt-0.5">
                      {s.imageCount} image{s.imageCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-2">
                    <OutcomeBadge outcome={s.overallOutcome} />
                    <Link to={`/admin/submissions/${s._id}`} className="block text-xs text-signal font-medium hover:underline">
                      {formatDate(s.createdAt)}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {!loading && data && (
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/admin/analytics" className="btn-secondary btn-sm">Open analytics →</Link>
          <Link to="/admin/live-feed" className="btn-secondary btn-sm">Live feed</Link>
          <Link to="/admin/appeals" className="btn-primary btn-sm">Review appeals ({data.appeals.pending})</Link>
        </div>
      )}
    </div>
  );
}
