import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import PageHeader from '../../components/shared/PageHeader';
import ModeratedImage from '../../components/shared/ModeratedImage';
import { OutcomeBadge, SafetyReading, LoadingCenter, EmptyState, Pagination, formatDate } from '../../components/shared/Helpers';

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function pickPreviewIndex(images) {
  if (!images?.length) return 0;
  const idx = images.findIndex((img) => ['flagged', 'blocked'].includes(img.verdict?.outcome));
  return idx >= 0 ? idx : 0;
}

export default function AdminSubmissions() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [data, setData] = useState({ submissions: [], total: 0, pages: 1 });
  const [filters, setFilters] = useState({ outcome: '', search: initialSearch, page: 1 });
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [loading, setLoading] = useState(true);

  const debouncedSearch = useDebounce(searchInput);

  useEffect(() => {
    setFilters((f) => ({ ...f, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: filters.page, limit: 20 });
    if (filters.outcome) params.set('outcome', filters.outcome);
    if (filters.search) params.set('search', filters.search);
    api.get(`/admin/submissions?${params}`).then((res) => setData(res.data)).finally(() => setLoading(false));
  }, [filters]);

  return (
    <div>
      <PageHeader title="All submissions" subtitle="Review submissions with image previews for flagged and blocked content." />

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <select
              className="form-input w-full sm:w-40"
              value={filters.outcome}
              onChange={(e) => setFilters((f) => ({ ...f, outcome: e.target.value, page: 1 }))}
            >
              <option value="">All outcomes</option>
              <option value="approved">Approved</option>
              <option value="flagged">Flagged</option>
              <option value="blocked">Blocked</option>
              <option value="mixed">Mixed</option>
            </select>

            <input
              type="text"
              className="form-input w-full sm:w-56"
              placeholder="Search username or email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button className="btn-secondary btn-sm" onClick={() => setSearchInput('')}>Clear</button>
            )}
            <span className="text-sm text-ink/40 dark:text-paper/35">{data.total} total</span>
          </div>
        </div>

        {loading ? (
          <LoadingCenter />
        ) : data.submissions.length === 0 ? (
          <EmptyState icon="☐" title="No submissions found" description="Try adjusting your filters." />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-mist dark:border-dusk-line text-left">
                    {['Preview', 'Date', 'User', 'Images', 'Reading', 'Outcome', 'Actions'].map((h) => (
                      <th key={h} className="py-2.5 pr-3 font-semibold text-[11px] uppercase tracking-wide text-ink/40 dark:text-paper/35">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.submissions.map((s) => {
                    const previewIdx = pickPreviewIndex(s.images);
                    const previewOutcome = s.images?.[previewIdx]?.verdict?.outcome;
                    return (
                      <tr key={s._id} className="table-row-hover border-b border-mist dark:border-dusk-line last:border-0">
                        <td className="py-3 pr-3">
                          <ModeratedImage
                            admin
                            submissionId={s._id}
                            imageIndex={previewIdx}
                            outcome={previewOutcome}
                            size="sm"
                            alt="Preview"
                          />
                        </td>
                        <td className="py-3 pr-3 text-ink/70 dark:text-paper/60 whitespace-nowrap">{formatDate(s.createdAt)}</td>
                        <td className="py-3 pr-3">
                          <div className="font-medium text-ink dark:text-paper">{s.user?.username}</div>
                          <div className="text-[11px] text-ink/35 dark:text-paper/30">{s.user?.email}</div>
                        </td>
                        <td className="py-3 pr-3 text-ink/70 dark:text-paper/60">{s.images?.length}</td>
                        <td className="py-3 pr-3"><SafetyReading outcome={s.overallOutcome} /></td>
                        <td className="py-3 pr-3"><OutcomeBadge outcome={s.overallOutcome} /></td>
                        <td className="py-3"><Link to={`/admin/submissions/${s._id}`} className="btn-secondary btn-sm">Review →</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-3">
              {data.submissions.map((s) => {
                const previewIdx = pickPreviewIndex(s.images);
                const previewOutcome = s.images?.[previewIdx]?.verdict?.outcome;
                return (
                  <div key={s._id} className="rounded-xl border border-mist dark:border-dusk-line p-3 flex gap-3">
                    <ModeratedImage admin submissionId={s._id} imageIndex={previewIdx} outcome={previewOutcome} size="sm" alt="Preview" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <OutcomeBadge outcome={s.overallOutcome} />
                        <span className="text-[10px] text-ink/35">{formatDate(s.createdAt)}</span>
                      </div>
                      <div className="font-medium text-sm text-ink dark:text-paper truncate">{s.user?.username}</div>
                      <div className="text-xs text-ink/45 mb-2"><SafetyReading outcome={s.overallOutcome} /></div>
                      <Link to={`/admin/submissions/${s._id}`} className="btn-secondary btn-sm">Review →</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        <Pagination page={filters.page} pages={data.pages} onChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
      </div>
    </div>
  );
}
