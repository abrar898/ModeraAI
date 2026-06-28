import React, { useState } from 'react';
import { resolveImageSrc } from '../../hooks/useAdminImageUrl';
import { useAdminImageUrl } from '../../hooks/useAdminImageUrl';
import { OutcomeBadge } from './Helpers';

const OUTCOME_RING = {
  blocked: 'ring-2 ring-rose-400 dark:ring-rose-500',
  flagged: 'ring-2 ring-signal dark:ring-signal',
  approved: 'ring-2 ring-cleared/50',
};

/**
 * Shows a moderated image thumbnail or full preview.
 * Pass `src` for user routes, or `submissionId` + `imageIndex` + `admin` for admin routes.
 */
export default function ModeratedImage({
  src,
  submissionId,
  imageIndex,
  admin = false,
  alt = 'Moderated image',
  outcome,
  size = 'md',
  showBadge = false,
  className = '',
}) {
  const needsAdminFetch = admin && submissionId != null && imageIndex != null;
  const adminFetch = useAdminImageUrl(needsAdminFetch ? submissionId : null, needsAdminFetch ? imageIndex : null);
  const resolvedSrc = needsAdminFetch
    ? resolveImageSrc(adminFetch.url) || resolveImageSrc(src)
    : resolveImageSrc(src);
  const loading = needsAdminFetch && adminFetch.loading && !resolvedSrc;
  const [imgError, setImgError] = useState(false);

  const sizeClass =
    size === 'lg'
      ? 'w-full max-w-md h-56 sm:h-64'
      : size === 'sm'
        ? 'w-16 h-16 sm:w-20 sm:h-20'
        : 'w-full sm:w-48 h-40 sm:h-44';

  const ring = outcome ? OUTCOME_RING[outcome] || '' : '';

  if (loading) {
    return (
      <div className={`${sizeClass} rounded-xl border border-mist dark:border-dusk-line bg-paper-dim dark:bg-white/5 flex items-center justify-center animate-pulse ${className}`}>
        <span className="text-xs text-ink/30 dark:text-paper/30">Loading…</span>
      </div>
    );
  }

  if (!resolvedSrc || imgError) {
    return (
      <div className={`${sizeClass} rounded-xl border border-dashed border-mist-dark dark:border-dusk-line bg-paper-dim dark:bg-white/5 flex flex-col items-center justify-center gap-1 ${className}`}>
        <span className="text-2xl opacity-40">🖼</span>
        <span className="text-[10px] text-ink/30 dark:text-paper/30 px-2 text-center">Preview unavailable</span>
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <img
        src={resolvedSrc}
        alt={alt}
        className={`${sizeClass} object-cover rounded-xl border border-mist dark:border-dusk-line block ${ring}`}
        onError={() => setImgError(true)}
      />
      {showBadge && outcome && ['flagged', 'blocked'].includes(outcome) && (
        <div className="absolute bottom-2 left-2">
          <OutcomeBadge outcome={outcome} />
        </div>
      )}
    </div>
  );
}
