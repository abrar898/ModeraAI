import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import PageHeader from '../../components/shared/PageHeader';
import { LoadingCenter, EmptyState, formatDate } from '../../components/shared/Helpers';
import { CATEGORY_LABELS } from '../../utils/constants';

export default function AdminPolicyHistory() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get('/policy/history').then((res) => setPolicies(res.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Policy version history"
        subtitle="All policy versions, from newest to oldest. Only one version is active at a time."
      />

      <div className="mb-4 flex justify-end">
        <Link to="/admin/policy" className="btn-primary btn-sm">← Back to policy config</Link>
      </div>

      {loading ? (
        <LoadingCenter text="Loading policy history..." />
      ) : policies.length === 0 ? (
        <EmptyState icon="📋" title="No policy history" description="No policy versions found." />
      ) : (
        <div className="flex flex-col gap-3">
          {policies.map((policy) => (
            <div key={policy._id} className={`card border-l-4 ${policy.isActive ? 'border-l-cleared' : 'border-l-mist dark:border-l-dusk-line'}`}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono font-bold text-signal text-sm">v{policy.version}</span>
                  {policy.isActive && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cleared-light text-cleared-dark dark:bg-cleared/10 dark:text-cleared uppercase tracking-wide">
                      Active
                    </span>
                  )}
                  <span className="text-sm text-ink/55 dark:text-paper/45">
                    {formatDate(policy.createdAt)}
                    {policy.updatedBy && (
                      <span className="ml-1">by <strong className="text-ink dark:text-paper">{policy.updatedBy.username}</strong></span>
                    )}
                  </span>
                </div>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => setExpanded(expanded === policy._id ? null : policy._id)}
                >
                  {expanded === policy._id ? 'Hide details' : 'View details'}
                </button>
              </div>

              {expanded === policy._id && (
                <div className="mt-4 pt-4 border-t border-mist dark:border-dusk-line">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {policy.categories.map((cat) => (
                      <div
                        key={cat.category}
                        className={`px-3.5 py-2.5 rounded-xl border text-sm ${
                          cat.enabled
                            ? 'bg-paper-dim dark:bg-white/5 border-mist dark:border-dusk-line'
                            : 'bg-paper-dim/50 dark:bg-white/[0.02] border-mist/50 dark:border-dusk-line/50 opacity-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-ink dark:text-paper">{CATEGORY_LABELS[cat.category]}</span>
                          <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                            cat.enabled ? 'bg-cleared-light text-cleared-dark dark:bg-cleared/10 dark:text-cleared' : 'bg-mist dark:bg-white/5 text-ink/35 dark:text-paper/30'
                          }`}>
                            {cat.enabled ? 'On' : 'Off'}
                          </span>
                        </div>
                        <div className="text-[11px] text-ink/45 dark:text-paper/40 flex gap-3">
                          <span>Threshold: <strong>{cat.confidenceThreshold}%</strong></span>
                          <span>{cat.enforcementBehavior === 'auto_block' ? '🛑 Auto-block' : '🚩 Flag for review'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
