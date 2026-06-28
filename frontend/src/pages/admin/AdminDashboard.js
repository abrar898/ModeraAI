import React, { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area, CartesianGrid, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
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

// Shared "no data" placeholder so empty charts don't collapse oddly on mobile
function EmptyChart({ height = 220, text }) {
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <p className="text-sm text-ink/35 dark:text-paper/30">{text}</p>
    </div>
  );
}

// ResponsiveContainer sets its height via an inline style derived from the
// `height` prop, so a Tailwind class (even with `!important`) can never win
// against it. To make chart heights actually responsive we track the `sm:`
// breakpoint (640px) in JS and pick a numeric height accordingly.
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches
  );
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 640px)');
    const onChange = (e) => setIsDesktop(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
}

export default function AdminDashboard() {
  const theme  = useSystemTheme();
  const isDesktop = useIsDesktop();
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
    name: CATEGORY_LABELS[c._id] || c._id,
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
      <div className="card mb-5 sm:mb-6 !p-4 sm:!p-5 lg:!p-6">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          {/* Preset buttons */}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/40 dark:text-paper/35 mb-1.5">Quick range</p>
            <div className="flex gap-1.5 flex-wrap">
              {PRESETS.map((p, i) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(i)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
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
            <div className="flex-1 min-w-[140px]">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-ink/40 dark:text-paper/35 block mb-1.5">From</label>
              <input
                type="date"
                className="form-input w-full sm:w-40"
                value={from}
                max={to || toLocalDateString(new Date())}
                onChange={(e) => { setFrom(e.target.value); setPreset(-1); }}
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-ink/40 dark:text-paper/35 block mb-1.5">To</label>
              <input
                type="date"
                className="form-input w-full sm:w-40"
                value={to}
                min={from}
                max={toLocalDateString(new Date())}
                onChange={(e) => { setTo(e.target.value); setPreset(-1); }}
              />
            </div>
            <button className="btn-primary btn-sm shrink-0" onClick={fetchAnalytics}>Apply</button>
          </div>

          {/* Active range label */}
          {data && (
            <span className="text-xs text-ink/35 dark:text-paper/30 lg:ml-auto lg:self-center">
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
            {statCards.map((s) => (
              <div key={s.label} className="card !p-4 sm:!p-5">
                <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-ink/40 dark:text-paper/35 mb-1.5 sm:mb-2 truncate">{s.label}</div>
                <div className={`text-2xl sm:text-3xl font-semibold font-display ${s.color}`}>{s.value}</div>
                {s.sub && <div className="text-[11px] sm:text-xs text-ink/40 dark:text-paper/35 mt-1 truncate">{s.sub}</div>}
              </div>
            ))}
          </div>

          {/* ── Charts ───────────────────────────────────────────────────── */}
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-5 mb-4 sm:mb-5">
            <div className="card !p-4 sm:!p-5 lg:!p-6">
              <h2 className="font-display font-semibold text-ink dark:text-paper mb-1">Submissions over time</h2>
              <p className="text-xs text-ink/40 dark:text-paper/35 mb-4">Daily upload volume in selected range</p>
              {submissionsChart.length === 0 ? (
                <EmptyChart height={220} text="No data for this period" />
              ) : (
                <ResponsiveContainer width="100%" height={isDesktop ? 260 : 220}>
                  <AreaChart data={submissionsChart} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: mutedColor, fontSize: 10 }} tickMargin={8} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} tick={{ fill: mutedColor, fontSize: 11 }} width={32} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="count" stroke={accent} strokeWidth={2.5} fill="url(#subGrad)" name="Submissions" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card !p-4 sm:!p-5 lg:!p-6">
              <h2 className="font-display font-semibold text-ink dark:text-paper mb-1">Verdict distribution</h2>
              <p className="text-xs text-ink/40 dark:text-paper/35 mb-4">Outcome breakdown for the period</p>
              {verdictPie.length === 0 ? (
                <EmptyChart height={220} text="No data for this period" />
              ) : (
                <ResponsiveContainer width="100%" height={isDesktop ? 260 : 220}>
                  <PieChart>
                    <Pie data={verdictPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name" paddingAngle={2}>
                      {verdictPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend formatter={(v) => <span style={{ color: axisColor, fontSize: 12 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-5 mb-4 sm:mb-5">
            <div className="card !p-4 sm:!p-5 lg:!p-6">
              <h2 className="font-display font-semibold text-ink dark:text-paper mb-1">Violations over time</h2>
              <p className="text-xs text-ink/40 dark:text-paper/35 mb-4">Flagged or blocked submissions per day</p>
              {violationsChart.length === 0 ? (
                <EmptyChart height={200} text="No violations in this period" />
              ) : (
                <ResponsiveContainer width="100%" height={isDesktop ? 240 : 200}>
                  <BarChart data={violationsChart} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="violationGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isDark ? '#FB7185' : '#E11D48'} stopOpacity={1} />
                        <stop offset="100%" stopColor={isDark ? '#FB7185' : '#E11D48'} stopOpacity={0.35} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: mutedColor, fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} tick={{ fill: mutedColor, fontSize: 11 }} width={32} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="url(#violationGrad)" name="Violations" radius={[6, 6, 0, 0]} maxBarSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card !p-4 sm:!p-5 lg:!p-6">
              <h2 className="font-display font-semibold text-ink dark:text-paper mb-1">Appeals breakdown</h2>
              <p className="text-xs text-ink/40 dark:text-paper/35 mb-4">Pending, accepted, and rejected appeals</p>
              {appealPie.length === 0 ? (
                <EmptyChart height={200} text="No appeals in this period" />
              ) : (
                <div className="flex items-center gap-4 sm:gap-6">
                  <ResponsiveContainer width="60%" height={isDesktop ? 240 : 200}>
                    <RadialBarChart
                      data={appealPie}
                      innerRadius="30%"
                      outerRadius="100%"
                      startAngle={90}
                      endAngle={-270}
                      barCategoryGap="18%"
                    >
                      <PolarAngleAxis type="number" domain={[0, Math.max(...appealPie.map((a) => a.value), 1)]} angleAxisId={0} tick={false} />
                      <RadialBar background={{ fill: gridColor }} dataKey="value" cornerRadius={6}>
                        {appealPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </RadialBar>
                      <Tooltip contentStyle={tooltipStyle} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <ul className="flex-1 space-y-2.5 min-w-0">
                    {appealPie.map((a) => (
                      <li key={a.name} className="flex items-center gap-2 text-sm">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                        <span className="capitalize flex-1 truncate" style={{ color: axisColor }}>{a.name}</span>
                        <span className="font-semibold" style={{ color: axisColor }}>{a.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-5 mb-4 sm:mb-5">
            <div className="card !p-4 sm:!p-5 lg:!p-6">
              <h2 className="font-display font-semibold text-ink dark:text-paper mb-1">New user registrations</h2>
              <p className="text-xs text-ink/40 dark:text-paper/35 mb-4">Accounts created in selected range</p>
              {registrationsChart.length === 0 ? (
                <EmptyChart height={200} text="No new users in this period" />
              ) : (
                <ResponsiveContainer width="100%" height={isDesktop ? 240 : 200}>
                  <BarChart data={registrationsChart} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: mutedColor, fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} tick={{ fill: mutedColor, fontSize: 11 }} width={32} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill={isDark ? '#5FBF8F' : '#2F6F4F'} name="Registrations" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card !p-4 sm:!p-5 lg:!p-6">
              <h2 className="font-display font-semibold text-ink dark:text-paper mb-1">Detections by category</h2>
              <p className="text-xs text-ink/40 dark:text-paper/35 mb-4">AI-detected content per policy category</p>
              {catData.length === 0 ? (
                <EmptyChart height={200} text="No data for this period" />
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, catData.length * 36)}>
                  <BarChart
                    data={catData}
                    layout="vertical"
                    margin={{ top: 0, right: 16, left: 4, bottom: 0 }}
                  >
                    <CartesianGrid stroke={gridColor} strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: mutedColor, fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: mutedColor, fontSize: 10 }}
                      width={110}
                      interval={0}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="detections" fill={isDark ? '#FB7185' : '#E11D48'} name="Detections" radius={[0, 6, 6, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── Top users table ──────────────────────────────────────────── */}
          <div className="card !p-4 sm:!p-5 lg:!p-6">
            <h2 className="font-display font-semibold text-ink dark:text-paper mb-4">Top users by submissions</h2>
            {data.topUsers.length === 0 ? (
              <p className="text-sm text-ink/35 dark:text-paper/30">No data for this period</p>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="w-full text-sm min-w-[480px]">
                  <thead>
                    <tr className="border-b border-mist dark:border-dusk-line text-left">
                      {['#', 'Username', 'Email', 'Submissions', 'Violations'].map((h) => (
                        <th key={h} className="py-2.5 font-semibold text-[11px] uppercase tracking-wide text-ink/40 dark:text-paper/35 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.topUsers.map((u, i) => (
                      <tr key={u._id} className="table-row-hover border-b border-mist dark:border-dusk-line last:border-0">
                        <td className="py-3 font-mono text-xs text-ink/35 dark:text-paper/30">{i + 1}</td>
                        <td className="py-3 font-medium text-ink dark:text-paper whitespace-nowrap">{u.username}</td>
                        <td className="py-3 text-ink/55 dark:text-paper/45 whitespace-nowrap">{u.email}</td>
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