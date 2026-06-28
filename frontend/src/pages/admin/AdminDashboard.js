import React, { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area, CartesianGrid } from 'recharts';
import api from '../../utils/api';
import PageHeader from '../../components/shared/PageHeader';
import { LoadingCenter } from '../../components/shared/Helpers';
import { CATEGORY_LABELS } from '../../utils/constants';
import useSystemTheme from '../../hooks/useSystemTheme';

const APPEAL_COLORS_LIGHT = { pending: '#E8743B', accepted: '#2F6F4F', rejected: '#E11D48' };
const APPEAL_COLORS_DARK = { pending: '#F0935F', accepted: '#5FBF8F', rejected: '#FB7185' };
const COLORS_LIGHT = { approved: '#2F6F4F', flagged: '#E8743B', blocked: '#E11D48', mixed: '#9B9685' };
const COLORS_DARK  = { approved: '#5FBF8F', flagged: '#F0935F', blocked: '#FB7185', mixed: '#7D8579' };

// Quick-select presets so the admin doesn't have to type dates manually
const PRESETS = [
  { label: 'Last 7 days',  days: 7  },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'All time',     days: 0  },
];

function toLocalDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalDateString(d);
}

export default function AdminDashboard() {
  const theme  = useSystemTheme();
  const isDark = theme === 'dark';

  const axisColor   = isDark ? '#D9D6CB' : '#1B2521';
  const mutedColor  = isDark ? 'rgba(250,248,243,0.4)' : 'rgba(27,37,33,0.4)';
  const accent      = isDark ? '#F0935F' : '#E8743B';
  const colors      = isDark ? COLORS_DARK : COLORS_LIGHT;
  const appealColors = isDark ? APPEAL_COLORS_DARK : APPEAL_COLORS_LIGHT;
  const gridColor   = isDark ? 'rgba(250,248,243,0.08)' : 'rgba(27,37,33,0.08)';
  const tooltipBg   = isDark ? '#181E17' : '#FFFFFF';
  const tooltipBorder = isDark ? '#2A332B' : '#E4E1D6';

  // Date range state — default to last 30 days
  const [from, setFrom]           = useState(daysAgo(30));
  const [to,   setTo]             = useState(toLocalDateString(new Date()));
  const [activePreset, setPreset] = useState(1); // index in PRESETS
  const [data,    setData]        = useState(null);
  const [loading, setLoading]     = useState(true);

  const fetchAnalytics = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to)   params.set('to',   to);
    api.get(`/admin/analytics?${params}`)
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [from, to]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const applyPreset = (idx) => {
    setPreset(idx);
    const { days } = PRESETS[idx];
    if (days === 0) {
      setFrom('');
      setTo('');
    } else {
      setFrom(daysAgo(days));
      setTo(toLocalDateString(new Date()));
    }
  };

  const tooltipStyle = { background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, fontSize: 12, color: axisColor };

  const verdictPie   = data ? data.verdictDistribution.map((v) => ({ name: v._id, value: v.count, color: colors[v._id] || accent })) : [];
  const catData      = data ? data.categoryStats.map((c) => ({
    name: (CATEGORY_LABELS[c._id] || c._id).replace(' & ', ' &\n'),
    detections: c.detections,
  })) : [];
  const submissionsChart = data ? data.submissionsOverTime.map((d) => ({ date: d._id, count: d.count })) : [];
  const violationsChart = data ? (data.violationsOverTime || []).map((d) => ({ date: d._id, count: d.count })) : [];
  const registrationsChart = data ? (data.userRegistrations || []).map((d) => ({ date: d._id, count: d.count })) : [];
  const appealPie = data ? data.appeals.breakdown.map((a) => ({
    name: a._id,
    value: a.count,
    color: appealColors[a._id] || accent,
  })) : [];

  const totalAppeals    = data?.appeals.total ?? 0;
  const acceptedAppeals = data?.appeals.breakdown.find((a) => a._id === 'accepted')?.count ?? 0;
  const approvedCount   = data?.verdictDistribution.find((v) => v._id === 'approved')?.count ?? 0;

  const statCards = data ? [
    { label: 'Total submissions', value: data.totalSubmissions, color: 'text-signal' },
    {
      label: 'Approval rate',
      value: `${data.totalSubmissions > 0 ? Math.round((approvedCount / data.totalSubmissions) * 100) : 0}%`,
      color: 'text-cleared',
    },
    { label: 'Total appeals', value: totalAppeals, sub: `${data.appeals.resolutionRate}% resolved`, color: 'text-signal-dark' },
    { label: 'Appeals accepted', value: acceptedAppeals, sub: 'Verdicts overturned', color: 'text-ink/70 dark:text-paper/70' },
  ] : [];

  return (
    <div>
      <PageHeader title="Analytics dashboard" subtitle="Platform-wide moderation activity overview." />

      {/* ── Date range controls ─────────────────────────────────────────── */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-end gap-4">
          {/* Preset buttons */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/40 dark:text-paper/35 mb-1.5">Quick range</p>
            <div className="flex gap-1.5 flex-wrap">
              {PRESETS.map((p, i) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    activePreset === i
                      ? 'bg-signal text-white'
                      : 'bg-paper-dim dark:bg-white/5 text-ink/60 dark:text-paper/50 hover:bg-mist dark:hover:bg-white/10'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom date inputs */}
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-ink/40 dark:text-paper/35 block mb-1.5">From</label>
              <input
                type="date"
                className="form-input w-40"
                value={from}
                max={to || toLocalDateString(new Date())}
                onChange={(e) => { setFrom(e.target.value); setPreset(-1); }}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-ink/40 dark:text-paper/35 block mb-1.5">To</label>
              <input
                type="date"
                className="form-input w-40"
                value={to}
                min={from}
                max={toLocalDateString(new Date())}
                onChange={(e) => { setTo(e.target.value); setPreset(-1); }}
              />
            </div>
            <button className="btn-primary btn-sm" onClick={fetchAnalytics}>Apply</button>
          </div>

          {/* Active range label */}
          {data && (
            <span className="text-xs text-ink/35 dark:text-paper/30 ml-auto self-center">
              {from && to ? `${from} → ${to}` : 'All time'} · {data.totalSubmissions} submissions
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingCenter text="Loading analytics…" />
      ) : !data ? null : (
        <>
          {/* ── Stat cards ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {statCards.map((s) => (
              <div key={s.label} className="card">
                <div className="text-xs font-semibold uppercase tracking-wide text-ink/40 dark:text-paper/35 mb-2">{s.label}</div>
                <div className={`text-3xl font-semibold font-display ${s.color}`}>{s.value}</div>
                {s.sub && <div className="text-xs text-ink/40 dark:text-paper/35 mt-1">{s.sub}</div>}
              </div>
            ))}
          </div>

          {/* ── Charts ───────────────────────────────────────────────────── */}
          <div className="grid lg:grid-cols-2 gap-5 mb-5">
            <div className="card">
              <h2 className="font-display font-semibold text-ink dark:text-paper mb-1">Submissions over time</h2>
              <p className="text-xs text-ink/40 dark:text-paper/35 mb-4">Daily upload volume in selected range</p>
              {submissionsChart.length === 0 ? (
                <p className="text-sm text-ink/35 dark:text-paper/30">No data for this period</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={submissionsChart}>
                    <defs>
                      <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: mutedColor, fontSize: 10 }} tickMargin={8} />
                    <YAxis allowDecimals={false} tick={{ fill: mutedColor, fontSize: 11 }} width={36} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="count" stroke={accent} strokeWidth={2.5} fill="url(#subGrad)" name="Submissions" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <h2 className="font-display font-semibold text-ink dark:text-paper mb-1">Verdict distribution</h2>
              <p className="text-xs text-ink/40 dark:text-paper/35 mb-4">Outcome breakdown for the period</p>
              {verdictPie.length === 0 ? (
                <p className="text-sm text-ink/35 dark:text-paper/30">No data for this period</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={verdictPie} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name" paddingAngle={2}>
                      {verdictPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend formatter={(v) => <span style={{ color: axisColor, fontSize: 12 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-5 mb-5">
            <div className="card">
              <h2 className="font-display font-semibold text-ink dark:text-paper mb-1">Violations over time</h2>
              <p className="text-xs text-ink/40 dark:text-paper/35 mb-4">Flagged or blocked submissions per day</p>
              {violationsChart.length === 0 ? (
                <p className="text-sm text-ink/35 dark:text-paper/30">No violations in this period</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={violationsChart}>
                    <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: mutedColor, fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fill: mutedColor, fontSize: 11 }} width={36} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="count" stroke={isDark ? '#FB7185' : '#E11D48'} strokeWidth={2.5} dot={{ r: 3 }} name="Violations" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <h2 className="font-display font-semibold text-ink dark:text-paper mb-1">Appeals breakdown</h2>
              <p className="text-xs text-ink/40 dark:text-paper/35 mb-4">Pending, accepted, and rejected appeals</p>
              {appealPie.length === 0 ? (
                <p className="text-sm text-ink/35 dark:text-paper/30">No appeals in this period</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={appealPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name" paddingAngle={3}>
                      {appealPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend formatter={(v) => <span style={{ color: axisColor, fontSize: 12 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-5 mb-5">
            <div className="card">
              <h2 className="font-display font-semibold text-ink dark:text-paper mb-1">New user registrations</h2>
              <p className="text-xs text-ink/40 dark:text-paper/35 mb-4">Accounts created in selected range</p>
              {registrationsChart.length === 0 ? (
                <p className="text-sm text-ink/35 dark:text-paper/30">No new users in this period</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={registrationsChart} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: mutedColor, fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fill: mutedColor, fontSize: 11 }} width={36} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill={isDark ? '#5FBF8F' : '#2F6F4F'} name="Registrations" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <h2 className="font-display font-semibold text-ink dark:text-paper mb-1">Detections by category</h2>
              <p className="text-xs text-ink/40 dark:text-paper/35 mb-4">AI-detected content per policy category</p>
              {catData.length === 0 ? (
                <p className="text-sm text-ink/35 dark:text-paper/30">No data for this period</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={catData} margin={{ top: 0, right: 0, left: -20, bottom: 40 }}>
                    <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: mutedColor, fontSize: 10 }} angle={-20} textAnchor="end" interval={0} />
                    <YAxis allowDecimals={false} tick={{ fill: mutedColor, fontSize: 11 }} width={36} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="detections" fill={isDark ? '#FB7185' : '#E11D48'} name="Detections" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── Top users table ──────────────────────────────────────────── */}
          <div className="card">
            <h2 className="font-display font-semibold text-ink dark:text-paper mb-4">Top users by submissions</h2>
            {data.topUsers.length === 0 ? (
              <p className="text-sm text-ink/35 dark:text-paper/30">No data for this period</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-mist dark:border-dusk-line text-left">
                      {['#', 'Username', 'Email', 'Submissions', 'Violations'].map((h) => (
                        <th key={h} className="py-2.5 font-semibold text-[11px] uppercase tracking-wide text-ink/40 dark:text-paper/35">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.topUsers.map((u, i) => (
                      <tr key={u._id} className="table-row-hover border-b border-mist dark:border-dusk-line last:border-0">
                        <td className="py-3 font-mono text-xs text-ink/35 dark:text-paper/30">{i + 1}</td>
                        <td className="py-3 font-medium text-ink dark:text-paper">{u.username}</td>
                        <td className="py-3 text-ink/55 dark:text-paper/45">{u.email}</td>
                        <td className="py-3 font-semibold text-signal">{u.count}</td>
                        <td className={`py-3 font-semibold ${u.violations > 0 ? 'text-rose-500' : 'text-cleared'}`}>{u.violations}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
