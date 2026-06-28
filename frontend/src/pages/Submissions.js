import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import PageHeader from '../components/shared/PageHeader';
import ModeratedImage from '../components/shared/ModeratedImage';
import { OutcomeBadge, SafetyReading, LoadingCenter, EmptyState, Pagination, formatDate } from '../components/shared/Helpers';
import { CATEGORY_LABELS, MODERATION_CATEGORIES } from '../utils/constants';

function pickPreviewIndex(images) {
  if (!images?.length) return 0;
  const idx = images.findIndex((img) => ['flagged', 'blocked'].includes(img.verdict?.outcome));
  return idx >= 0 ? idx : 0;
}

export default function Submissions() {
  const [data, setData] = useState({ submissions: [], total: 0, pages: 1 });
  const [filters, setFilters] = useState({ outcome: '', category: '', from: '', to: '', page: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: filters.page, limit: 15 });
    if (filters.outcome) params.set('outcome', filters.outcome);
    if (filters.category) params.set('category', filters.category);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    api.get(`/submissions?${params}`).then((res) => setData(res.data)).finally(() => setLoading(false));
  }, [filters]);

  const setFilter = (field, value) => setFilters((f) => ({ ...f, [field]: value, page: 1 }));
  const clearFilters = () => setFilters({ outcome: '', category: '', from: '', to: '', page: 1 });
  const hasFilters = filters.outcome || filters.category || filters.from || filters.to;

  return (
    <div>
      <PageHeader
        title="My submissions"
        subtitle="Track all your submitted images and their moderation outcomes."
        action={<Link to="/submit" className="btn-primary btn-sm w-full sm:w-auto justify-center">+ New submission</Link>}
      />

      <div className="card">
        {/* Filter bar — all controls sized to their content and wrapped in
            a single flex row; only wraps to a new line if the viewport is
            too narrow to fit everything (handled by flex-wrap). */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <select
            className="form-input w-auto"
            value={filters.outcome}
            onChange={(e) => setFilter('outcome', e.target.value)}
          >
            <option value="">All outcomes</option>
            <option value="approved">Approved</option>
            <option value="flagged">Flagged</option>
            <option value="blocked">Blocked</option>
            <option value="mixed">Mixed</option>
          </select>

          <select
            className="form-input w-auto"
            value={filters.category}
            onChange={(e) => setFilter('category', e.target.value)}
          >
            <option value="">All categories</option>
            {MODERATION_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
            ))}
          </select>

          <input
            type="date"
            className="form-input w-auto text-sm"
            value={filters.from}
            onChange={(e) => setFilter('from', e.target.value)}
          />
          <span className="text-ink/35 text-xs hidden sm:inline">to</span>
          <input
            type="date"
            className="form-input w-auto text-sm"
            value={filters.to}
            onChange={(e) => setFilter('to', e.target.value)}
          />

          {hasFilters && <button className="btn-secondary btn-sm" onClick={clearFilters}>Clear</button>}

          <span className="text-sm text-ink/40 dark:text-paper/35 sm:ml-auto">{data.total} total</span>
        </div>

        {loading ? (
          <LoadingCenter />
        ) : data.submissions.length === 0 ? (
          <EmptyState icon="☐" title="No submissions found" description="Try adjusting your filters or submit some images." />
        ) : (
          <div className="flex flex-col gap-3">
            {data.submissions.map((s) => {
              const previewIdx = pickPreviewIndex(s.images);
              const previewImg = s.images?.[previewIdx];
              const previewSrc = previewImg?.imageUrl;
              return (
                <div
                  key={s._id}
                  className={`rounded-xl border p-3 sm:p-4 flex gap-3 sm:gap-4 ${
                    ['flagged', 'blocked', 'mixed'].includes(s.overallOutcome)
                      ? 'border-signal/25 bg-signal-light/5 dark:bg-signal/5'
                      : 'border-mist dark:border-dusk-line'
                  }`}
                >
                  <ModeratedImage
                    src={previewSrc}
                    alt="Submission preview"
                    outcome={previewImg?.verdict?.outcome || s.overallOutcome}
                    size="sm"
                    showBadge={['flagged', 'blocked'].includes(s.overallOutcome)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <OutcomeBadge outcome={s.overallOutcome} />
                      <span className="text-[11px] text-ink/35 dark:text-paper/30">{formatDate(s.createdAt)}</span>
                    </div>
                    <div className="text-sm text-ink/70 dark:text-paper/60 mb-1">
                      {s.images?.length} image{s.images?.length !== 1 ? 's' : ''}
                    </div>
                    <div className="text-sm mb-3"><SafetyReading outcome={s.overallOutcome} /></div>
                    <Link to={`/submissions/${s._id}`} className="btn-secondary btn-sm">View details →</Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Pagination page={filters.page} pages={data.pages} onChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
      </div>
    </div>
  );
}