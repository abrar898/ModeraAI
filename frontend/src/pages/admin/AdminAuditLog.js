import React, { useCallback, useEffect, useState } from 'react';
import api from '../../utils/api';
import PageHeader from '../../components/shared/PageHeader';
import { LoadingCenter, Pagination, formatDate } from '../../components/shared/Helpers';
import { useToast } from '../../context/ToastContext';

const ACTION_LABELS = {
  submission_created: 'Submission created',
  verdict_override: 'Verdict override',
  appeal_filed: 'Appeal filed',
  appeal_reviewed: 'Appeal reviewed',
  policy_updated: 'Policy updated',
  user_status_changed: 'User status changed',
};

function formatDetails(details) {
  if (!details || typeof details !== 'object') return '—';
  const parts = [];
  if (details.overallOutcome) parts.push(`Outcome: ${details.overallOutcome}`);
  if (details.imageCount != null) parts.push(`${details.imageCount} image(s)`);
  if (details.processingTimeMs != null) parts.push(`${details.processingTimeMs}ms`);
  if (details.previousOutcome && details.newOutcome) {
    parts.push(`${details.previousOutcome} → ${details.newOutcome}`);
  }
  if (details.decision) parts.push(`Decision: ${details.decision}`);
  if (details.targetUsername) parts.push(`User: ${details.targetUsername}`);
  if (details.previousStatus != null) parts.push(`${details.previousStatus ? 'active' : 'suspended'} → ${details.newStatus ? 'active' : 'suspended'}`);
  return parts.length ? parts.join(' · ') : JSON.stringify(details);
}

export default function AdminAuditLog() {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [action, setAction] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 50 });
    if (action) params.set('action', action);
    api.get(`/admin/audit-log?${params}`)
      .then((res) => {
        setLogs(res.data.logs);
        setPages(res.data.pages);
      })
      .finally(() => setLoading(false));
  }, [page, action]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (action) params.set('action', action);
      const res = await api.get(`/admin/audit-log/export?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Export complete', 'Audit log downloaded as CSV.');
    } catch {
      toast.error('Export failed', 'Could not download audit log.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Audit log"
        subtitle="Immutable record of every moderation action — who did what, when, and why."
      />

      <div className="card mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="form-input !w-auto"
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
          >
            <option value="">All actions</option>
            {Object.entries(ACTION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <button className="btn-secondary btn-sm" onClick={fetchLogs}>Refresh</button>
          <button className="btn-primary btn-sm ml-auto" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : '↓ Export CSV'}
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <LoadingCenter text="Loading audit log..." />
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-ink/40 dark:text-paper/40 text-sm">No audit entries yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-mist dark:border-dusk-line text-left">
                  <th className="py-2.5 font-semibold text-[11px] uppercase tracking-wide text-ink/40 dark:text-paper/35">Timestamp</th>
                  <th className="py-2.5 font-semibold text-[11px] uppercase tracking-wide text-ink/40 dark:text-paper/35">Action</th>
                  <th className="py-2.5 font-semibold text-[11px] uppercase tracking-wide text-ink/40 dark:text-paper/35">Actor</th>
                  <th className="py-2.5 font-semibold text-[11px] uppercase tracking-wide text-ink/40 dark:text-paper/35">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} className="table-row-hover border-b border-mist dark:border-dusk-line last:border-0">
                    <td className="py-3 text-ink/60 dark:text-paper/55 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="py-3">
                      <span className="badge badge-mixed !text-[10px]">{ACTION_LABELS[log.action] || log.action}</span>
                    </td>
                    <td className="py-3 font-medium text-ink/80 dark:text-paper/75">{log.actorUsername}</td>
                    <td className="py-3 text-ink/60 dark:text-paper/55 text-xs">{formatDetails(log.details)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pages={pages} onChange={setPage} />
      </div>

      <p className="text-xs text-ink/35 dark:text-paper/30 mt-4">
        Audit entries are append-only and cannot be edited. Export to CSV for compliance reporting or offline review.
      </p>
    </div>
  );
}
