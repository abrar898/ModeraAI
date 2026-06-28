import React from 'react';
import { CATEGORY_LABELS } from '../../utils/constants';

export const OutcomeBadge = ({ outcome }) => (
  <span className={`badge badge-${outcome}`}>
    {outcome === 'flagged' ? '🚩' : outcome === 'blocked' ? '🚫' : outcome === 'approved' ? '✓' : '⟲'} {outcome}
  </span>
);

// Quick plain-word reading of an overall outcome, for at-a-glance scanning in
// tables — distinct from the full per-category AI summary used on detail pages.
export const SAFETY_READING = {
  approved: { text: 'Safe', className: 'text-cleared' },
  flagged: { text: 'Possibly unsafe', className: 'text-signal-dark dark:text-signal' },
  blocked: { text: 'Unsafe', className: 'text-rose-600 dark:text-rose-400' },
  mixed: { text: 'Mixed', className: 'text-ink/60 dark:text-paper/55' },
};

export const SafetyReading = ({ outcome }) => (
  <span className={`text-sm font-semibold ${SAFETY_READING[outcome]?.className || ''}`}>
    {SAFETY_READING[outcome]?.text || outcome}
  </span>
);

export const AppealStatusBadge = ({ status }) => (
  <span className={`badge badge-${status}`}>
    {status === 'pending' ? '⏳' : status === 'accepted' ? '✓' : '✕'} {status}
  </span>
);

/**
 * Builds a one-line, plain-English description of what the AI actually found,
 * straight from the category results — e.g. "AI found no policy violations —
 * this image is safe." or "AI detected graphic violence (92% confidence) and
 * weapons & contraband (78% confidence)." Used wherever a non-technical
 * "is this safe or not" summary is needed, distinct from the raw badge/table data.
 */
export function buildAiSummary(verdict) {
  if (!verdict) return { text: 'No AI verdict available.', tone: 'neutral' };

  const hits = (verdict.categoryResults || []).filter((r) => r.meetsThreshold);

  if (verdict.outcome === 'approved' || hits.length === 0) {
    return {
      text: 'AI found no policy violations in this image — it looks safe.',
      tone: 'safe',
    };
  }

  const hitList = hits
    .map((r) => `${CATEGORY_LABELS[r.category] || r.category} (${r.confidence}% confidence)`)
    .join(', ');

  const verb = verdict.outcome === 'blocked' ? 'AI blocked this image after detecting' : 'AI flagged this image for';

  return {
    text: `${verb} ${hitList}.`,
    tone: verdict.outcome === 'blocked' ? 'danger' : 'warning',
  };
}

const SUMMARY_STYLES = {
  safe: 'bg-cleared-light border-cleared/25 text-cleared dark:bg-cleared/10 dark:border-cleared/30 dark:text-emerald-300',
  warning: 'bg-signal-light border-signal/25 text-signal-dark dark:bg-signal/10 dark:border-signal/30 dark:text-signal',
  danger: 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300',
  neutral: 'bg-paper-dim border-mist text-ink/60 dark:bg-white/5 dark:border-dusk-line dark:text-paper/50',
};

const SUMMARY_ICON = { safe: '✓', warning: '⚠', danger: '✕', neutral: 'ℹ' };

/**
 * Renders the plain-English AI summary as a small callout, with the icon and
 * color matching the verdict (green/safe, amber/flagged, red/blocked).
 */
export const AiVerdictSummary = ({ verdict, provider }) => {
  const { text, tone } = buildAiSummary(verdict);
  return (
    <div className={`rounded-xl border px-3.5 py-2.5 text-sm flex items-start gap-2.5 ${SUMMARY_STYLES[tone]}`}>
      <span className="font-bold mt-0.5 shrink-0">{SUMMARY_ICON[tone]}</span>
      <div className="flex-1">
        <span>{text}</span>
        {provider && (
          <span className="block mt-1 font-mono text-[10px] uppercase tracking-wide opacity-60">
            analyzed via {provider}
          </span>
        )}
      </div>
    </div>
  );
};

export const CategoryBreakdown = ({ categoryResults }) => {
  if (!categoryResults?.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {categoryResults.map((r) => (
        <div
          key={r.category}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-sm ${
            r.meetsThreshold
              ? 'bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30'
              : 'bg-paper-dim dark:bg-white/5 border-mist dark:border-dusk-line'
          }`}
        >
          <span className="font-medium flex-1 text-ink/90 dark:text-paper/85">
            {CATEGORY_LABELS[r.category] || r.category}
          </span>
          <div className="w-24 h-1.5 rounded-full bg-mist dark:bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                r.confidence >= 80 ? 'bg-rose-500' : r.confidence >= 50 ? 'bg-signal' : 'bg-cleared'
              }`}
              style={{ width: `${r.confidence}%` }}
            />
          </div>
          <span className="font-mono text-xs text-ink/45 dark:text-paper/40 w-10 text-right">{r.confidence}%</span>
          {r.meetsThreshold && <span className="badge badge-blocked !text-[10px]">HIT</span>}
        </div>
      ))}
    </div>
  );
};

export const Spinner = ({ size = 20 }) => (
  <div
    className="rounded-full border-2 border-mist dark:border-dusk-line border-t-signal animate-spin"
    style={{ width: size, height: size }}
  />
);

export const LoadingCenter = ({ text = 'Loading...' }) => (
  <div className="flex items-center justify-center gap-3 py-16 text-ink/40 dark:text-paper/40">
    <Spinner size={22} />
    <span className="text-sm">{text}</span>
  </div>
);

export const EmptyState = ({ icon = '📭', title, description, action }) => (
  <div className="text-center py-16 px-6">
    <div className="text-4xl mb-3">{icon}</div>
    <h3 className="font-display text-base font-semibold text-ink/80 dark:text-paper/80 mb-1">{title}</h3>
    {description && <p className="text-sm text-ink/45 dark:text-paper/40">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const Pagination = ({ page, pages, onChange }) => {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1.5 mt-6">
      <button
        className="w-8 h-8 rounded-full border border-mist-dark dark:border-dusk-line text-sm text-ink/60 dark:text-paper/60 hover:border-signal disabled:opacity-30 transition"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
      >
        ‹
      </button>
      {Array.from({ length: Math.min(5, pages) }, (_, i) => {
        let p = i + 1;
        if (pages > 5) {
          if (page <= 3) p = i + 1;
          else if (page >= pages - 2) p = pages - 4 + i;
          else p = page - 2 + i;
        }
        return (
          <button
            key={p}
            className={`w-8 h-8 rounded-full text-sm font-semibold transition ${
              p === page
                ? 'bg-signal text-white shadow-lift'
                : 'border border-mist-dark dark:border-dusk-line text-ink/60 dark:text-paper/60 hover:border-signal'
            }`}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        );
      })}
      <button
        className="w-8 h-8 rounded-full border border-mist-dark dark:border-dusk-line text-sm text-ink/60 dark:text-paper/60 hover:border-signal disabled:opacity-30 transition"
        onClick={() => onChange(page + 1)}
        disabled={page === pages}
      >
        ›
      </button>
    </div>
  );
};

export const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
