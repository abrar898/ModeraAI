import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import PageHeader from '../components/shared/PageHeader';
import ModeratedImage from '../components/shared/ModeratedImage';
import { AppealStatusBadge, OutcomeBadge, LoadingCenter, EmptyState, formatDate } from '../components/shared/Helpers';

// Splits a timestamp into separate date and time strings so table/card
// cells can show "Jun 27, 2026" on one line and "3:42 PM" on the next,
// instead of one long formatDate() string crammed into a narrow column.
function splitDateTime(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d)) return null;
  return {
    date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  };
}

function DateTimeCell({ value, dim }) {
  const parts = splitDateTime(value);
  if (!parts) return <span className="text-ink/30 dark:text-paper/25">—</span>;
  return (
    <div className="leading-tight">
      <div className={dim ? 'text-ink/55 dark:text-paper/45' : 'text-ink/75 dark:text-paper/65'}>{parts.date}</div>
      <div className="text-[11px] text-ink/35 dark:text-paper/30">{parts.time}</div>
    </div>
  );
}

// Feedback has three distinct states, not two — this was the source of the
// bug where Reviewed showed an updated date/status but the feedback column
// still said "Awaiting review": that text only checked a.adminResponse, with
// no regard for whether the appeal had actually been reviewed yet.
//   1. Not reviewed yet (status is still 'pending')   -> "Awaiting review"
//   2. Reviewed, but admin left no written feedback    -> "—"
//   3. Reviewed, with written feedback                 -> the actual text
function FeedbackCell({ appeal, className = '' }) {
  const isReviewed = appeal.status !== 'pending';
  if (!isReviewed) {
    return <span className={`text-ink/30 dark:text-paper/25 ${className}`}>Awaiting review</span>;
  }
  if (appeal.adminResponse) {
    return <span className={`text-ink/55 dark:text-paper/45 ${className}`}>{appeal.adminResponse}</span>;
  }
  return <span className={`text-ink/30 dark:text-paper/25 ${className}`}>—</span>;
}

// Single appeal rendered as a self-contained card — used on small screens
// where the 7-column table would otherwise force horizontal scrolling.
function AppealCard({ a }) {
  return (
    <div className={`rounded-xl2 border border-mist dark:border-dusk-line p-3 ${
      a.status !== 'pending' ? 'bg-paper-dim/50 dark:bg-white/[0.02]' : 'bg-paper dark:bg-transparent'
    }`}>
      <div className="flex gap-3">
        <div className="shrink-0">
          <ModeratedImage
            src={a.imageUrl}
            alt={`Appealed image ${a.imageIndex + 1}`}
            outcome="flagged"
            size="sm"
            showBadge
          />
          <div className="text-[10px] text-ink/35 dark:text-paper/30 mt-1 font-mono text-center">#{a.imageIndex + 1}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] text-ink/40 dark:text-paper/35 whitespace-nowrap">{formatDate(a.createdAt)}</span>
            <AppealStatusBadge status={a.status} />
          </div>
          {a.submission && (
            <div className="flex items-center gap-1.5 text-xs text-ink/55 dark:text-paper/45">
              <OutcomeBadge outcome={a.submission.overallOutcome} />
              <span className="truncate">submission · {formatDate(a.submission.createdAt)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-mist dark:border-dusk-line mt-3 pt-3">
        <p className="text-[11px] text-ink/35 dark:text-paper/30 mb-0.5">Feedback</p>
        <p className="text-xs"><FeedbackCell appeal={a} /></p>
        {a.reviewedAt && (
          <p className="text-[11px] text-ink/35 dark:text-paper/30 mt-1.5">Reviewed {formatDate(a.reviewedAt)}</p>
        )}
      </div>

      {a.submission?._id && (
        <Link to={`/submissions/${a.submission._id}`} className="btn-secondary btn-sm w-full mt-3 justify-center">
          View submission
        </Link>
      )}
    </div>
  );
}

export default function MyAppeals() {
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/appeals/mine')
      .then((res) => setAppeals(res.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader title="My appeals" subtitle="Track appeal status — updates also appear in the bell icon (top right)." />
      <div className="card !p-4 sm:!p-6">
        {loading ? (
          <LoadingCenter />
        ) : appeals.length === 0 ? (
          <EmptyState icon="⚖" title="No appeals yet" description="Appeals can be filed on flagged or blocked submissions." />
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <div className="sm:hidden flex flex-col gap-3">
              {appeals.map((a) => <AppealCard key={a._id} a={a} />)}
            </div>

            {/* Desktop: full table */}
            <div className="hidden sm:block overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr className="text-left">
                    {['Filed', 'Submission', 'Image', 'Status', 'Feedback', 'Reviewed', ''].map((h) => (
                      <th key={h} className="py-2.5 px-3 first:pl-2 font-semibold text-[11px] uppercase tracking-wide text-ink/40 dark:text-paper/35 border-b border-mist dark:border-dusk-line">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {appeals.map((a, i) => {
                    const isLast = i === appeals.length - 1;
                    const borderCls = isLast ? '' : 'border-b border-mist dark:border-dusk-line';
                    return (
                    <tr
                      key={a._id}
                      className={`table-row-hover ${
                        a.status !== 'pending' ? 'bg-paper-dim/40 dark:bg-white/[0.02]' : ''
                      }`}
                    >
                      <td className={`py-3 px-3 first:pl-2 ${borderCls} whitespace-nowrap`}>
                        <DateTimeCell value={a.createdAt} />
                      </td>
                      <td className={`py-3 px-3 ${borderCls}`}>
                        {a.submission && (
                          <div>
                            <OutcomeBadge outcome={a.submission.overallOutcome} />
                            <div className="mt-1"><DateTimeCell value={a.submission.createdAt} dim /></div>
                          </div>
                        )}
                      </td>
                      <td className={`py-3 px-3 ${borderCls}`}>
                        <ModeratedImage
                          src={a.imageUrl}
                          alt={`Appealed image ${a.imageIndex + 1}`}
                          outcome="flagged"
                          size="sm"
                          showBadge
                        />
                        <div className="text-[10px] text-ink/35 dark:text-paper/30 mt-1 font-mono">#{a.imageIndex + 1}</div>
                      </td>
                      <td className={`py-3 px-3 ${borderCls}`}><AppealStatusBadge status={a.status} /></td>
                      <td className={`py-3 px-3 ${borderCls} max-w-48`}>
                        <FeedbackCell appeal={a} className="line-clamp-2" />
                      </td>
                      <td className={`py-3 px-3 ${borderCls} whitespace-nowrap`}>
                        <DateTimeCell value={a.reviewedAt} dim />
                      </td>
                      <td className={`py-3 px-3 pr-2 ${borderCls} text-right`}>
                        {a.submission?._id && (
                          <Link to={`/submissions/${a.submission._id}`} className="btn-secondary btn-sm">View</Link>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}