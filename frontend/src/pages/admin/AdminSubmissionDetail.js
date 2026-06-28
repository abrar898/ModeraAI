import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../utils/api';
import ModeratedImage from '../../components/shared/ModeratedImage';
import { OutcomeBadge, AppealStatusBadge, CategoryBreakdown, AiVerdictSummary, LoadingCenter, formatDate } from '../../components/shared/Helpers';
import { useToast } from '../../context/ToastContext';
import { CATEGORY_LABELS } from '../../utils/constants';

export default function AdminSubmissionDetail() {
  const { id } = useParams();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [overriding, setOverriding] = useState(null);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/submissions/${id}`);
      setSubmission(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleOverride = async (imageIndex, outcome) => {
    try {
      await api.patch(`/admin/submissions/${id}/images/${imageIndex}/override`, { outcome });
      toast.success('Verdict overridden', `Image ${imageIndex + 1} verdict set to ${outcome}.`);
      setOverriding(null);
      load();
    } catch (err) {
      toast.error('Override failed', err.response?.data?.message || 'Error');
    }
  };

  if (loading) return <LoadingCenter text="Loading submission..." />;
  if (!submission) return <div className="card"><p>Not found.</p></div>;

  const overrideBtnClass = (o) => (
    o === 'approved' ? 'btn-success btn-sm' : o === 'blocked' ? 'btn-danger btn-sm' : 'btn-secondary btn-sm'
  );

  return (
    <div>
      <div className="mb-6 sm:mb-7">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
          <Link to="/admin/submissions" className="text-sm text-ink/40 dark:text-paper/35 hover:text-signal transition">← Back</Link>
          <h1 className="text-xl sm:text-2xl font-display font-semibold text-ink dark:text-paper">Submission review</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <OutcomeBadge outcome={submission.overallOutcome} />
          <span className="text-xs sm:text-sm text-ink/40 dark:text-paper/35">
            by <strong className="text-ink dark:text-paper">{submission.user?.username}</strong> · {formatDate(submission.createdAt)}
          </span>
        </div>
      </div>

      {submission.images.map((img, idx) => {
        const isViolation = ['flagged', 'blocked'].includes(img.verdict?.outcome);
        const imageSrc = img.imageUrl || submission.imageUrls?.[idx];

        return (
          <div key={idx} className={`card mb-4 ${isViolation ? 'border-signal/25' : ''}`}>
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
              <div className="shrink-0 w-full lg:w-auto flex flex-col items-center lg:items-start">
                <ModeratedImage
                  src={imageSrc}
                  admin={!imageSrc}
                  submissionId={id}
                  imageIndex={idx}
                  alt={img.originalName}
                  outcome={img.verdict?.outcome}
                  size="lg"
                  showBadge={isViolation}
                />
                <p className="text-[11px] text-ink/35 dark:text-paper/30 mt-2 truncate max-w-full lg:max-w-md">{img.originalName}</p>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 mb-4 flex-wrap">
                  <h3 className="font-display font-semibold text-ink dark:text-paper">Image {idx + 1}</h3>
                  <OutcomeBadge outcome={img.verdict?.outcome} />
                  {img.verdict?.originalOutcome && (
                    <span className="text-[11px] text-ink/35 dark:text-paper/30">overridden from {img.verdict.originalOutcome}</span>
                  )}
                  <div className="sm:ml-auto flex flex-wrap gap-2">
                    {overriding === idx ? (
                      <>
                        {['approved', 'flagged', 'blocked'].filter((o) => o !== img.verdict?.outcome).map((o) => (
                          <button key={o} className={overrideBtnClass(o)} onClick={() => handleOverride(idx, o)}>
                            Set {o}
                          </button>
                        ))}
                        <button className="btn-secondary btn-sm" onClick={() => setOverriding(null)}>Cancel</button>
                      </>
                    ) : (
                      <button className="btn-secondary btn-sm" onClick={() => setOverriding(idx)}>Override verdict</button>
                    )}
                  </div>
                </div>

                <div className="mb-3.5">
                  <AiVerdictSummary verdict={img.verdict} provider={img.verdict?.aiProvider} />
                </div>

                <CategoryBreakdown categoryResults={img.verdict?.categoryResults} />

                {img.appeal && (
                  <div className="mt-3.5 rounded-xl p-3.5 text-sm bg-signal-light/20 dark:bg-signal/10 border border-signal/25 dark:border-signal/30">
                    <div className="font-semibold flex items-center gap-2 text-ink dark:text-paper">
                      Appeal <AppealStatusBadge status={img.appeal.status} />
                    </div>
                    <p className="mt-1.5 italic text-ink/60 dark:text-paper/50">"{img.appeal.justification}"</p>
                    {img.appeal.adminResponse && (
                      <p className="mt-1 text-xs text-ink/45 dark:text-paper/40">Response: {img.appeal.adminResponse}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {img.verdict?.categoryResults?.filter((r) => r.detected).length > 0 && (
              <div className="mt-5 pt-5 border-t border-mist dark:border-dusk-line">
                <h4 className="text-sm font-semibold text-ink/70 dark:text-paper/60 mb-2.5">AI reasoning</h4>
                <div className="flex flex-col gap-2">
                  {img.verdict.categoryResults.filter((r) => r.detected).map((r) => (
                    <div
                      key={r.category}
                      className={`px-3.5 py-2.5 rounded-xl text-sm border ${
                        r.meetsThreshold
                          ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/25'
                          : 'bg-paper-dim dark:bg-white/5 border-mist dark:border-dusk-line'
                      }`}
                    >
                      <strong className={r.meetsThreshold ? 'text-rose-600 dark:text-rose-300' : 'text-signal-dark dark:text-signal'}>
                        {CATEGORY_LABELS[r.category]}
                      </strong>
                      <span className="ml-2 font-mono text-xs text-ink/40 dark:text-paper/35">{r.confidence}% confidence</span>
                      <p className="text-ink/55 dark:text-paper/45 mt-1">{r.reasoning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
