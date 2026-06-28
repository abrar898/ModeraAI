import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import PageHeader from '../../components/shared/PageHeader';
import ModeratedImage from '../../components/shared/ModeratedImage';
import { normalizeId } from '../../hooks/useAdminImageUrl';
import { AppealStatusBadge, OutcomeBadge, LoadingCenter, EmptyState, Pagination, formatDate } from '../../components/shared/Helpers';
import { useToast } from '../../context/ToastContext';

const TABS = ['pending', 'accepted', 'rejected', 'all'];

function AppealCard({ appeal, reviewing, reviewForm, setReviewForm, setReviewing, onReview }) {
  const submissionId = normalizeId(appeal.submission?._id ?? appeal.submission);
  const imageIdx = appeal.imageIndex;

  return (
    <div className="rounded-xl2 border border-mist dark:border-dusk-line bg-paper-dim/60 dark:bg-white/[0.02] overflow-hidden">
      <div className="flex flex-col lg:flex-row">
        <div className="lg:w-56 shrink-0 p-4 bg-ink/[0.02] dark:bg-black/20 border-b lg:border-b-0 lg:border-r border-mist dark:border-dusk-line flex flex-col items-center justify-center gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40 dark:text-paper/35">Appealed image</p>
          <ModeratedImage
            admin
            src={appeal.imageUrl}
            submissionId={submissionId}
            imageIndex={imageIdx}
            alt={`Appeal image ${imageIdx + 1}`}
            outcome="flagged"
            size="md"
            showBadge
            className="w-full flex justify-center"
          />
          <span className="font-mono text-xs text-ink/35 dark:text-paper/30">Image #{imageIdx + 1}</span>
        </div>

        <div className="flex-1 p-4 sm:p-[18px]">
          <div className="flex justify-between items-start gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                <AppealStatusBadge status={appeal.status} />
                {appeal.submission?.overallOutcome && <OutcomeBadge outcome={appeal.submission.overallOutcome} />}
              </div>
              <div className="font-medium text-ink dark:text-paper mb-1">
                {appeal.user?.username}{' '}
                <span className="text-ink/35 dark:text-paper/30 font-normal text-sm">({appeal.user?.email})</span>
              </div>
              <div className="text-sm text-ink/55 dark:text-paper/45 italic mb-2.5">"{appeal.justification}"</div>
              <div className="text-xs text-ink/35 dark:text-paper/30">Filed {formatDate(appeal.createdAt)}</div>
              {appeal.reviewedBy && (
                <div className="text-xs text-ink/35 dark:text-paper/30 mt-1">
                  Reviewed by {appeal.reviewedBy.username} · {formatDate(appeal.reviewedAt)}
                </div>
              )}
              {appeal.adminResponse && (
                <div className="mt-2 text-sm text-ink/55 dark:text-paper/45">
                  Response: <em>{appeal.adminResponse}</em>
                </div>
              )}
            </div>

            <div className="flex gap-2 shrink-0 flex-wrap">
              {submissionId && (
                <Link to={`/admin/submissions/${submissionId}`} className="btn-secondary btn-sm">Full submission</Link>
              )}
              {appeal.status === 'pending' && (
                <button
                  className="btn-primary btn-sm"
                  onClick={() => { setReviewing(appeal._id); setReviewForm({ decision: '', adminResponse: '' }); }}
                >
                  Review
                </button>
              )}
            </div>
          </div>

          {reviewing === appeal._id && (
            <div className="mt-4 pt-4 border-t border-mist dark:border-dusk-line">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 min-w-0">
                  <label className="form-label">Decision *</label>
                  <select className="form-input" value={reviewForm.decision} onChange={(e) => setReviewForm({ ...reviewForm, decision: e.target.value })}>
                    <option value="">Select decision...</option>
                    <option value="accepted">Accept – Override to approved</option>
                    <option value="rejected">Reject – Maintain verdict</option>
                  </select>
                </div>
                <div className="flex-[2] min-w-0">
                  <label className="form-label">Response to user (optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Brief explanation for the user..."
                    value={reviewForm.adminResponse}
                    onChange={(e) => setReviewForm({ ...reviewForm, adminResponse: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className={reviewForm.decision === 'accepted' ? 'btn-success btn-sm' : reviewForm.decision === 'rejected' ? 'btn-danger btn-sm' : 'btn-primary btn-sm'}
                  onClick={() => onReview(appeal._id)}
                  disabled={!reviewForm.decision}
                >
                  Confirm {reviewForm.decision || 'decision'}
                </button>
                <button className="btn-secondary btn-sm" onClick={() => setReviewing(null)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminAppeals() {
  const [data, setData] = useState({ appeals: [], total: 0, pages: 1 });
  const [filters, setFilters] = useState({ status: 'pending', page: 1 });
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null);
  const [reviewForm, setReviewForm] = useState({ decision: '', adminResponse: '' });
  const toast = useToast();

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ status: filters.status, page: filters.page, limit: 15 });
    api.get(`/appeals?${params}`).then((res) => setData(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, [filters]);

  const handleReview = async (appealId) => {
    if (!reviewForm.decision) return toast.error('Required', 'Select a decision.');
    try {
      const res = await api.patch(`/appeals/${appealId}/review`, reviewForm);
      toast.success(
        'Appeal reviewed',
        res.data.emailSent
          ? 'User notified in-app and by email.'
          : 'User notified in-app.'
      );
      setReviewing(null);
      setReviewForm({ decision: '', adminResponse: '' });
      load();
    } catch (err) {
      toast.error('Failed', err.response?.data?.message || 'Error');
    }
  };

  return (
    <div>
      <PageHeader title="Appeals queue" subtitle="Review appealed images with full visual context." />

      <div className="card">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-1 bg-paper-dim dark:bg-white/5 rounded-full p-1 overflow-x-auto max-w-full">
            {TABS.map((s) => (
              <button
                key={s}
                className={`px-3 sm:px-3.5 py-1.5 text-xs font-semibold rounded-full transition whitespace-nowrap ${
                  filters.status === s
                    ? 'bg-white dark:bg-dusk-raised text-signal shadow'
                    : 'text-ink/45 dark:text-paper/40 hover:text-ink dark:hover:text-paper'
                }`}
                onClick={() => setFilters({ status: s, page: 1 })}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <span className="text-sm text-ink/40 dark:text-paper/35">{data.total} appeals</span>
        </div>

        {loading ? (
          <LoadingCenter />
        ) : data.appeals.length === 0 ? (
          <EmptyState icon="⚖" title="No appeals found" description="No appeals in this category." />
        ) : (
          <div className="flex flex-col gap-4">
            {data.appeals.map((a) => (
              <AppealCard
                key={a._id}
                appeal={a}
                reviewing={reviewing}
                reviewForm={reviewForm}
                setReviewForm={setReviewForm}
                setReviewing={setReviewing}
                onReview={handleReview}
              />
            ))}
          </div>
        )}
        <Pagination page={filters.page} pages={data.pages} onChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
      </div>
    </div>
  );
}
