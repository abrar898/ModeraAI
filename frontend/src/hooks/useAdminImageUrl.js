import { useEffect, useState } from 'react';
import api from '../utils/api';

/** Normalize MongoDB id objects / strings for API paths. */
export function normalizeId(id) {
  if (id == null) return null;
  if (typeof id === 'object' && id._id != null) return String(id._id);
  return String(id);
}

/** Fetch an admin image via authenticated request (MongoDB blob or S3 presigned URL). */
export function useAdminImageUrl(submissionId, imageIndex) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const sid = normalizeId(submissionId);
    if (!sid || imageIndex == null) {
      setLoading(false);
      return undefined;
    }

    let objectUrl = null;
    let cancelled = false;

    setLoading(true);
    setError(false);
    setUrl(null);

    (async () => {
      try {
        const tokenRes = await api.get(`/admin/submissions/${sid}/images/${imageIndex}/token`);
        const signedUrl = tokenRes.data?.url;

        if (signedUrl?.startsWith('http')) {
          if (!cancelled) setUrl(signedUrl);
          return;
        }

        const res = await api.get(`/admin/submissions/${sid}/images/${imageIndex}`, {
          responseType: 'blob',
        });
        if (!res.data?.type?.startsWith('image/')) {
          throw new Error('Not an image');
        }
        objectUrl = URL.createObjectURL(res.data);
        if (!cancelled) setUrl(objectUrl);
      } catch {
        try {
          const tokenRes = await api.get(`/admin/submissions/${sid}/images/${imageIndex}/token`);
          if (tokenRes.data?.url && !cancelled) {
            setUrl(tokenRes.data.url);
            return;
          }
        } catch {
          /* ignore */
        }
        if (!cancelled) {
          setUrl(null);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [submissionId, imageIndex]);

  return { url, loading, error };
}

/** Resolve user-facing image src (relative /api paths work via dev proxy). */
export function resolveImageSrc(imageUrl) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('blob:') || imageUrl.startsWith('http')) return imageUrl;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
}
