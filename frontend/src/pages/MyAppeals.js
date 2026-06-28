import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import PageHeader from '../components/shared/PageHeader';
import ModeratedImage from '../components/shared/ModeratedImage';
import { AppealStatusBadge, OutcomeBadge, LoadingCenter, EmptyState, formatDate } from '../components/shared/Helpers';

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

      <div className="card">
        {loading ? (
          <LoadingCenter />
        ) : appeals.length === 0 ? (
          <EmptyState icon="⚖" title="No appeals yet" description="Appeals can be filed on flagged or blocked submissions." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-mist dark:border-dusk-line text-left">
                  {['Filed', 'Submission', 'Image', 'Status', 'Admin response', 'Reviewed', 'Actions'].map((h) => (
                    <th key={h} className="py-2.5 font-semibold text-[11px] uppercase tracking-wide text-ink/40 dark:text-paper/35">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {appeals.map((a) => (
                  <tr
                    key={a._id}
                    className={`table-row-hover border-b border-mist dark:border-dusk-line last:border-0 ${
                      a.status !== 'pending' ? 'bg-paper-dim/50 dark:bg-white/[0.02]' : ''
                    }`}
                  >
                    <td className="py-3 text-ink/70 dark:text-paper/60">{formatDate(a.createdAt)}</td>
                    <td className="py-3">
                      {a.submission && (
                        <div>
                          <OutcomeBadge outcome={a.submission.overallOutcome} />
                          <div className="text-[11px] text-ink/35 dark:text-paper/30 mt-1">{formatDate(a.submission.createdAt)}</div>
                        </div>
                      )}
                    </td>
                    <td className="py-3">
                      <ModeratedImage
                        src={a.imageUrl}
                        alt={`Appealed image ${a.imageIndex + 1}`}
                        outcome="flagged"
                        size="sm"
                        showBadge
                      />
                      <div className="text-[10px] text-ink/35 dark:text-paper/30 mt-1 font-mono">#{a.imageIndex + 1}</div>
                    </td>
                    <td className="py-3"><AppealStatusBadge status={a.status} /></td>
                    <td className="py-3 max-w-52">
                      {a.adminResponse ? (
                        <span className="text-ink/55 dark:text-paper/45">{a.adminResponse}</span>
                      ) : (
                        <span className="text-ink/30 dark:text-paper/25">Awaiting review</span>
                      )}
                    </td>
                    <td className="py-3 text-ink/55 dark:text-paper/45">{a.reviewedAt ? formatDate(a.reviewedAt) : '—'}</td>
                    <td className="py-3">
                      {a.submission?._id && (
                        <Link to={`/submissions/${a.submission._id}`} className="btn-secondary btn-sm">View</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
