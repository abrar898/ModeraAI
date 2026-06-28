import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../../utils/api';
import PageHeader from '../../components/shared/PageHeader';
import { OutcomeBadge, formatDate } from '../../components/shared/Helpers';
import useSystemTheme from '../../hooks/useSystemTheme';

const OUTCOME_COLORS_LIGHT = { approved: '#2F6F4F', flagged: '#E8743B', blocked: '#E11D48', mixed: '#9B9685' };
const OUTCOME_COLORS_DARK = { approved: '#5FBF8F', flagged: '#F0935F', blocked: '#FB7185', mixed: '#7D8579' };
const OUTCOME_ORDER = ['approved', 'flagged', 'blocked', 'mixed'];
const OUTCOME_LABEL = { approved: 'Approved', flagged: 'Flagged', blocked: 'Blocked', mixed: 'Mixed' };

// Icon chips for stat cards — plain inline SVGs, no icon library dependency
const ICONS = {
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  pulse: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  image: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  ),
  flag: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  ),
};

function StatSkeleton() {
  return (
    <div className="card !p-5 sm:!p-6 lg:!p-7 animate-pulse">
      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl2 bg-mist dark:bg-white/10 mb-5" />
      <div className="h-3 w-24 bg-mist dark:bg-white/10 rounded mb-3" />
      <div className="h-10 w-20 bg-mist dark:bg-white/10 rounded mb-2" />
      <div className="h-3 w-32 bg-mist dark:bg-white/10 rounded" />
    </div>
  );
}

function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-11 rounded-lg bg-mist/60 dark:bg-white/5 animate-pulse" />
      ))}
    </div>
  );
}

// Renders a small callout bubble above the highest point on the area chart,
// similar to the "$64,214" peak labels in the reference design. Recharts
// calls this once per data point via the `dot` prop; it only draws
// something for the point matching the chart's max value.
function makePeakDot(data, dataKey, accent) {
  const maxVal = data.length ? Math.max(...data.map((d) => d[dataKey])) : null;
  let drawn = false;
  return (props) => {
    const { cx, cy, payload } = props;
    if (drawn || payload[dataKey] !== maxVal || cx == null || cy == null) {
      return <circle cx={cx} cy={cy} r={0} fill="none" />;
    }
    drawn = true;
    const label = String(maxVal);
    const labelWidth = Math.max(34, label.length * 7 + 16);
    return (
      <g>
        <circle cx={cx} cy={cy} r={4} fill={accent} stroke="white" strokeWidth={1.5} />
        <g transform={`translate(${cx - labelWidth / 2}, ${cy - 34})`}>
          <rect width={labelWidth} height={22} rx={11} fill={accent} />
          <text x={labelWidth / 2} y={15} textAnchor="middle" fontSize={11} fontWeight={600} fill="#fff">
            {label}
          </text>
        </g>
      </g>
    );
  };
}

// Combined "Activity overview" panel: a clean gradient area chart of
// registrations on the left, with a trend badge showing the change vs the
// prior period, and a "Verdict split" hero percentage + segmented bar on
// the right, sharing one card so the dashboard reads as one cohesive
// overview rather than disconnected boxes.
function ActivityOverviewPanel({ regChart, outcomeSplit, accent, mutedColor, gridColor, tooltipStyle, loading }) {
  const outcomeTotal = outcomeSplit.reduce((sum, o) => sum + o.value, 0);
  const approvedCount = outcomeSplit.find((o) => o.name === 'approved')?.value ?? 0;
  const approvalRate = outcomeTotal > 0 ? Math.round((approvedCount / outcomeTotal) * 100) : 0;

  const orderedSegments = OUTCOME_ORDER
    .map((key) => outcomeSplit.find((o) => o.name === key))
    .filter(Boolean)
    .map((o) => ({ ...o, pct: outcomeTotal > 0 ? (o.value / outcomeTotal) * 100 : 0 }));

  // Trend badge: compare totals across the two halves of the registrations
  // series so the panel shows momentum, not just a static line.
  const regTrend = (() => {
    if (regChart.length === 0) return null;
    const n = regChart.length;
    const mid = Math.floor(n / 2);
    const sum = (arr) => arr.reduce((s, d) => s + d.users, 0);
    const firstTotal = sum(regChart.slice(0, mid));
    const secondTotal = sum(regChart.slice(mid));
    const total = sum(regChart);
    const pctChange = firstTotal > 0
      ? Math.round(((secondTotal - firstTotal) / firstTotal) * 100)
      : (secondTotal > 0 ? 100 : 0);
    return { total, pctChange };
  })();

  return (
    <div className="card !p-5 sm:!p-6 lg:!p-8">
      <div className="flex flex-col lg:flex-row lg:items-stretch gap-6 lg:gap-8">
        {/* Registrations trend — gradient area chart with momentum badge */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between mb-1 gap-2">
            <h2 className="font-display font-semibold text-lg sm:text-xl text-ink dark:text-paper">Activity overview</h2>
            <Link to="/admin/analytics" className="text-xs sm:text-sm text-signal font-semibold hover:underline shrink-0">
              Full analytics →
            </Link>
          </div>
          <div className="flex items-center justify-between gap-2 mb-5 sm:mb-6">
            <p className="text-xs sm:text-sm text-ink/40 dark:text-paper/35">New signups over the last 30 days</p>
            {regTrend && (
              <span
                className={`shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                  regTrend.pctChange >= 0
                    ? 'text-cleared bg-cleared/10'
                    : 'text-rose-500 bg-rose-500/10'
                }`}
              >
                {regTrend.pctChange >= 0 ? '▲' : '▼'} {Math.abs(regTrend.pctChange)}% vs prior period
              </span>
            )}
          </div>

          {loading ? (
            <div className="h-[220px] rounded-xl bg-mist/50 dark:bg-white/5 animate-pulse" />
          ) : regChart.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center">
              <p className="text-sm text-ink/35 dark:text-paper/30">No new registrations in this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={regChart} margin={{ top: 28, right: 4, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="pulseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: mutedColor, fontSize: 11 }} tickMargin={8} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: mutedColor, fontSize: 11 }} width={28} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="users"
                  name="New users"
                  stroke={accent}
                  strokeWidth={2.5}
                  fill="url(#pulseGrad)"
                  isAnimationActive
                  animationDuration={900}
                  dot={makePeakDot(regChart, 'users', accent)}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px bg-mist dark:bg-dusk-line shrink-0" />
        <div className="lg:hidden h-px bg-mist dark:bg-dusk-line" />

        {/* Verdict split — hero approval rate + segmented bar */}
        <div className="lg:w-[260px] shrink-0 flex flex-col">
          <h3 className="font-display font-semibold text-base text-ink dark:text-paper mb-1">Verdict split</h3>
          <p className="text-xs text-ink/40 dark:text-paper/35 mb-4">All-time outcomes</p>

          {loading ? (
            <div className="h-[140px] rounded-xl bg-mist/50 dark:bg-white/5 animate-pulse" />
          ) : orderedSegments.length === 0 || outcomeTotal === 0 ? (
            <p className="text-sm text-ink/35 dark:text-paper/30 py-6">No submissions yet</p>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-semibold font-display" style={{ color: orderedSegments.find((s) => s.name === 'approved')?.color }}>
                  {approvalRate}%
                </span>
                <span className="text-xs text-ink/40 dark:text-paper/35">approved</span>
              </div>

              <div className="flex w-full h-2.5 rounded-full overflow-hidden bg-paper-dim dark:bg-white/5 mb-4">
                {orderedSegments.map((s) => (
                  <div key={s.name} style={{ width: `${s.pct}%`, backgroundColor: s.color }} title={`${OUTCOME_LABEL[s.name]}: ${s.value}`} />
                ))}
              </div>

              <div className="flex flex-col gap-2">
                {orderedSegments.map((s) => (
                  <div key={s.name} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs text-ink/55 dark:text-paper/45 truncate">
                      <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                      {OUTCOME_LABEL[s.name]}
                    </span>
                    <span className="text-sm font-semibold text-ink dark:text-paper shrink-0">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
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
  const gridColor = isDark ? 'rgba(250,248,243,0.08)' : 'rgba(27,37,33,0.08)';
  const tooltipBg = isDark ? '#181E17' : '#FFFFFF';
  const tooltipBorder = isDark ? '#2A332B' : '#E4E1D6';
  const outcomeColors = isDark ? OUTCOME_COLORS_DARK : OUTCOME_COLORS_LIGHT;

  useEffect(() => {
    api.get('/admin/overview')
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  const statCards = data ? [
    { label: 'Registered users', value: data.users.total, sub: `+${data.users.newLast30Days} last 30 days`, link: '/admin/users', icon: 'users', positive: data.users.newLast30Days > 0 },
    { label: 'Active accounts', value: data.users.active, sub: `${data.users.suspended} suspended`, link: '/admin/users', icon: 'pulse', positive: data.users.suspended === 0 },
    { label: 'Total submissions', value: data.submissions.total, sub: `+${data.submissions.last30Days} last 30 days`, link: '/admin/submissions', icon: 'image', positive: true },
    { label: 'Pending appeals', value: data.appeals.pending, sub: `${data.appeals.total} total appeals`, link: '/admin/appeals', icon: 'flag', positive: data.appeals.pending === 0 },
  ] : [];

  const regChart = data?.users.registrationsOverTime.map((d) => ({ date: d._id, users: d.count })) ?? [];
  const outcomeSplit = data?.submissions.outcomeBreakdown.map((o) => ({
    name: o._id,
    value: o.count,
    color: outcomeColors[o._id] || accent,
  })) ?? [];

  const tooltipStyle = { background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, fontSize: 12, color: axisColor };

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Platform overview — users, submissions, and appeals at a glance." />

      {/* ── Stat cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-10">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          : statCards.map((s) => (
            <Link
              key={s.label}
              to={s.link}
              className="card !p-5 sm:!p-6 lg:!p-7 hover:border-signal/40 hover:-translate-y-0.5 transition-all group"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl2 bg-signal/10 text-signal flex items-center justify-center mb-4 sm:mb-5">
                <span className="w-5 h-5">{ICONS[s.icon]}</span>
              </div>
              <div className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-ink/40 dark:text-paper/35 mb-2">{s.label}</div>
              <div className="text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold font-display text-ink dark:text-paper tabular-nums leading-none">{s.value}</div>
              <div className={`text-xs sm:text-sm mt-2.5 sm:mt-3 ${s.positive ? 'text-cleared' : 'text-signal-dark'}`}>{s.sub}</div>
            </Link>
          ))}
      </div>

      {/* ── Combined chart panel ────────────────────────────────────── */}
      <div className="mb-6 sm:mb-10">
        <ActivityOverviewPanel
          regChart={regChart}
          outcomeSplit={outcomeSplit}
          accent={accent}
          mutedColor={mutedColor}
          gridColor={gridColor}
          tooltipStyle={tooltipStyle}
          loading={loading}
        />
      </div>

      {/* ── Recent activity tables ──────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-5 sm:gap-6">
        <div className="card !p-5 sm:!p-6 lg:!p-7">
          <div className="flex items-center justify-between mb-5 sm:mb-6 gap-2">
            <h2 className="font-display font-semibold text-lg text-ink dark:text-paper">Recent registrations</h2>
            <Link to="/admin/users" className="text-xs sm:text-sm text-signal font-semibold hover:underline shrink-0">All users</Link>
          </div>
          {loading ? (
            <TableSkeleton />
          ) : data.recentUsers.length === 0 ? (
            <p className="text-sm text-ink/35 dark:text-paper/30">No registrations yet</p>
          ) : (
            <div className="overflow-x-auto -mx-5 sm:mx-0 px-5 sm:px-0">
              <table className="w-full text-sm min-w-[420px]">
                <thead>
                  <tr className="border-b border-mist dark:border-dusk-line text-left">
                    {['User', 'Role', 'Joined'].map((h) => (
                      <th key={h} className="py-2.5 font-semibold text-[11px] uppercase tracking-wide text-ink/40 dark:text-paper/35 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.recentUsers.map((u) => (
                    <tr key={u._id} className="table-row-hover border-b border-mist dark:border-dusk-line last:border-0">
                      <td className="py-3">
                        <div className="font-medium text-ink dark:text-paper whitespace-nowrap">{u.username}</div>
                        <div className="text-xs text-ink/45 dark:text-paper/40 whitespace-nowrap">{u.email}</div>
                      </td>
                      <td className="py-3">
                        <span className="inline-block capitalize text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-mist dark:bg-white/10 text-ink/60 dark:text-paper/55">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-ink/40 dark:text-paper/35 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card !p-5 sm:!p-6 lg:!p-7">
          <div className="flex items-center justify-between mb-5 sm:mb-6 gap-2">
            <h2 className="font-display font-semibold text-lg text-ink dark:text-paper">Recent submissions</h2>
            <Link to="/admin/submissions" className="text-xs sm:text-sm text-signal font-semibold hover:underline shrink-0">All submissions</Link>
          </div>
          {loading ? (
            <TableSkeleton />
          ) : data.recentSubmissions.length === 0 ? (
            <p className="text-sm text-ink/35 dark:text-paper/30">No submissions yet</p>
          ) : (
            <div className="overflow-x-auto -mx-5 sm:mx-0 px-5 sm:px-0">
              <table className="w-full text-sm min-w-[420px]">
                <thead>
                  <tr className="border-b border-mist dark:border-dusk-line text-left">
                    {['User', 'Outcome', 'Date'].map((h) => (
                      <th key={h} className="py-2.5 font-semibold text-[11px] uppercase tracking-wide text-ink/40 dark:text-paper/35 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.recentSubmissions.map((s) => (
                    <tr key={s._id} className="table-row-hover border-b border-mist dark:border-dusk-line last:border-0">
                      <td className="py-3">
                        <div className="font-medium text-ink dark:text-paper whitespace-nowrap">{s.user?.username || 'Unknown user'}</div>
                        <div className="text-xs text-ink/45 dark:text-paper/40 whitespace-nowrap">
                          {s.imageCount} image{s.imageCount !== 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="py-3"><OutcomeBadge outcome={s.overallOutcome} /></td>
                      <td className="py-3 whitespace-nowrap">
                        <Link to={`/admin/submissions/${s._id}`} className="text-xs text-signal font-medium hover:underline">
                          {formatDate(s.createdAt)}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {!loading && data && (
        <div className="mt-8 sm:mt-10 flex flex-wrap gap-2 sm:gap-3">
          <Link to="/admin/analytics" className="btn-secondary btn-sm">Open analytics →</Link>
          <Link to="/admin/live-feed" className="btn-secondary btn-sm">Live feed</Link>
          <Link to="/admin/appeals" className="btn-primary btn-sm">Review appeals ({data.appeals.pending})</Link>
        </div>
      )}
    </div>
  );
}