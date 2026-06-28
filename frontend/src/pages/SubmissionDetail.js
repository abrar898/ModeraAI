import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import ModeratedImage from '../components/shared/ModeratedImage';
import { OutcomeBadge, AppealStatusBadge, CategoryBreakdown, AiVerdictSummary, LoadingCenter, formatDate } from '../components/shared/Helpers';
import { useToast } from '../context/ToastContext';
import { CATEGORY_LABELS } from '../utils/constants';

export default function SubmissionDetail() {
  const { id } = useParams();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appealing, setAppealing] = useState(null);
  const [justification, setJustification] = useState('');
  const [appealLoading, setAppealLoading] = useState(false);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    api.get(`/submissions/${id}`).then((res) => setSubmission(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleAppeal = async (imageIndex) => {
    if (justification.length < 20) return toast.error('Too short', 'Justification must be at least 20 characters.');
    setAppealLoading(true);
    try {
      await api.post('/appeals', { submissionId: id, imageIndex, justification });
      toast.success('Appeal filed', 'Your appeal has been submitted for admin review.');
      setAppealing(null);
      setJustification('');
      load();
    } catch (err) {
      toast.error('Appeal failed', err.response?.data?.message || 'Error filing appeal');
    } finally {
      setAppealLoading(false);
    }
  };

  if (loading) return <LoadingCenter text="Loading submission..." />;
  if (!submission) return <div className="card"><p>Submission not found.</p></div>;

  return (
    <div>
      <div className="mb-6 sm:mb-7">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
          <Link to="/submissions" className="text-sm text-ink/40 dark:text-paper/35 hover:text-signal transition">← Back</Link>
          <h1 className="text-xl sm:text-2xl font-display font-semibold text-ink dark:text-paper">Submission details</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <OutcomeBadge outcome={submission.overallOutcome} />
          <span className="text-xs sm:text-sm text-ink/40 dark:text-paper/35">{formatDate(submission.createdAt)}</span>
          {submission.processingTimeMs != null && (
            <span className="text-xs font-mono text-ink/35 dark:text-paper/30">Processed in {submission.processingTimeMs}ms</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:gap-5">
        {submission.images.map((img, idx) => {
          const imageSrc = img.imageUrl || submission.imageUrls?.[idx];
          const isViolation = ['flagged', 'blocked'].includes(img.verdict?.outcome);

          return (
            <div
              key={idx}
              className={`card ${isViolation ? 'border-signal/30 dark:border-signal/20' : ''}`}
            >
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <div className="shrink-0 w-full sm:w-auto">
                  <ModeratedImage
                    src={imageSrc}
                    alt={img.originalName}
                    outcome={img.verdict?.outcome}
                    size="lg"
                    showBadge={isViolation}
                    className="mx-auto sm:mx-0"
                  />
                  <p className="text-[11px] text-ink/35 dark:text-paper/30 mt-2 text-center sm:text-left truncate max-w-full sm:max-w-md">
                    {img.originalName}
                  </p>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-3 sm:mb-4 flex-wrap">
                    <h3 className="font-display font-semibold text-ink dark:text-paper">Image {idx + 1}</h3>
                    <OutcomeBadge outcome={img.verdict?.outcome} />
                    {img.verdict?.originalOutcome && (
                      <span className="text-[11px] text-ink/35 dark:text-paper/30">(overridden from {img.verdict.originalOutcome})</span>
                    )}
                  </div>

                  <div className="mb-3.5">
                    <AiVerdictSummary verdict={img.verdict} provider={img.verdict?.aiProvider} />
                  </div>

                  <CategoryBreakdown categoryResults={img.verdict?.categoryResults} />

                  <div className="mt-4">
                    {img.appeal ? (
                      <div className={`rounded-xl p-3.5 text-sm border ${
                        img.appeal.status === 'accepted'
                          ? 'bg-cleared-light border-cleared/25 dark:bg-cleared/10 dark:border-cleared/30'
                          : img.appeal.status === 'rejected'
                          ? 'bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30'
                          : 'bg-signal-light border-signal/25 dark:bg-signal/10 dark:border-signal/30'
                      }`}>
                        <div className="font-semibold flex items-center gap-2 text-ink dark:text-paper">
                          Appeal <AppealStatusBadge status={img.appeal.status} />
                        </div>
                        {img.appeal.adminResponse && (
                          <p className="mt-1.5 text-ink/60 dark:text-paper/50">Admin: {img.appeal.adminResponse}</p>
                        )}
                      </div>
                    ) : isViolation ? (
                      appealing === idx ? (
                        <div>
                          <textarea
                            className="form-input"
                            placeholder="Explain why you believe this verdict is incorrect (min. 20 characters)..."
                            value={justification}
                            onChange={(e) => setJustification(e.target.value)}
                            rows={3}
                          />
                          <div className="flex flex-wrap gap-2 mt-2">
                            <button className="btn-primary btn-sm" onClick={() => handleAppeal(idx)} disabled={appealLoading}>
                              {appealLoading ? 'Submitting…' : 'Submit appeal'}
                            </button>
                            <button className="btn-secondary btn-sm" onClick={() => { setAppealing(null); setJustification(''); }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button className="btn-secondary btn-sm w-full sm:w-auto" onClick={() => setAppealing(idx)}>File appeal</button>
                      )
                    ) : null}
                  </div>
                </div>
              </div>

              {img.verdict?.categoryResults?.some((r) => r.meetsThreshold) && (
                <div className="mt-5 pt-5 border-t border-mist dark:border-dusk-line">
                  <h4 className="text-sm font-semibold text-ink/70 dark:text-paper/60 mb-2.5">Detection reasoning</h4>
                  <div className="flex flex-col gap-2">
                    {img.verdict.categoryResults.filter((r) => r.meetsThreshold).map((r) => (
                      <div key={r.category} className="px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/25 text-sm">
                        <strong className="text-rose-600 dark:text-rose-300">{CATEGORY_LABELS[r.category]}</strong>
                        <p className="text-ink/55 dark:text-paper/50 mt-1">{r.reasoning}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
