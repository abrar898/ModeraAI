import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/shared/PageHeader';
import { Spinner } from '../components/shared/Helpers';

const CATEGORIES = [
  { code: '01', name: 'Graphic Violence' },
  { code: '02', name: 'Hate Symbols' },
  { code: '03', name: 'Self-Harm' },
  { code: '04', name: 'Extremist Propaganda' },
  { code: '05', name: 'Weapons & Contraband' },
  { code: '06', name: 'Harassment & Humiliation' },
];

const REJECTION_MESSAGES = {
  'file-too-large': 'File exceeds the 3MB size limit',
  'file-invalid-type': 'Only JPG, PNG, GIF, and WEBP images are accepted',
  'too-many-files': 'Maximum 10 files per submission',
};

function getRejectionMessage(rejection) {
  const code = rejection.errors?.[0]?.code;
  return REJECTION_MESSAGES[code] || rejection.errors?.[0]?.message || 'File rejected';
}

export default function Submit() {
  const [files, setFiles] = useState([]);
  const [rejections, setRejections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  const onDrop = useCallback((acceptedFiles) => {
    setRejections([]);
    setError(null);
    setFiles((prev) =>
      [...prev, ...acceptedFiles.map((f) => Object.assign(f, { preview: URL.createObjectURL(f) }))].slice(0, 10)
    );
  }, []);

  const onDropRejected = useCallback((rejectedFiles) => {
    const msgs = rejectedFiles.map((r) => ({
      name: r.file.name,
      message: getRejectionMessage(r),
    }));
    setRejections(msgs);
    if (msgs.length === 1) {
      toast.error('File rejected', msgs[0].message);
    } else {
      toast.error('Some files rejected', `${msgs.length} file(s) could not be added.`);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    onDropRejected,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'] },
    maxFiles: 10,
    maxSize: 3 * 1024 * 1024,
    disabled: loading,
  });

  const removeFile = (idx) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('images', f));
      const res = await api.post('/submissions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      toast.success('Submission processed', `${files.length} image(s) screened in ${res.data.processingTimeMs ?? '—'}ms.`);
      navigate(`/submissions/${res.data._id}`);
    } catch (err) {
      const msg = err.response?.data?.message || (err.code === 'ECONNABORTED' ? 'Request timed out — try fewer images' : 'An error occurred');
      setError(msg);
      toast.error('Submission failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Submit images" subtitle="Upload up to 10 images for automated policy compliance screening." />

      {loading && (
        <div className="card mb-4 border-signal/30 bg-signal-light/20 dark:bg-signal/10">
          <div className="flex items-center gap-3">
            <Spinner size={22} />
            <div>
              <p className="text-sm font-semibold text-ink dark:text-paper">Screening in progress…</p>
              <p className="text-xs text-ink/50 dark:text-paper/45">Each image is being analyzed against all active policy categories. This may take a moment.</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="card mb-4 border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10">
          <p className="text-sm font-semibold text-rose-600 dark:text-rose-300 mb-1">Submission failed</p>
          <p className="text-sm text-rose-600/80 dark:text-rose-300/80">{error}</p>
        </div>
      )}

      <div className="card">
        <div
          {...getRootProps()}
          className={`rounded-xl2 border-2 border-dashed p-12 text-center cursor-pointer transition ${
            loading ? 'opacity-50 cursor-not-allowed' :
            isDragReject ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-500/10 text-rose-600' :
            isDragActive
              ? 'border-signal bg-signal-light/30 text-signal-dark'
              : 'border-mist-dark dark:border-dusk-line text-ink/40 dark:text-paper/35 hover:border-signal hover:bg-signal-light/10'
          }`}
        >
          <input {...getInputProps()} />
          <span className="text-4xl block mb-3">{isDragReject ? '✕' : '⬆'}</span>
          <p className="text-sm font-medium mb-1">
            {isDragReject ? 'Some files are not allowed' : isDragActive ? 'Drop images here…' : 'Drag & drop images here, or click to select'}
          </p>
          <span className="text-xs">JPG, PNG, GIF, WEBP · Max 3MB each · Up to 10 files</span>
        </div>

        {rejections.length > 0 && (
          <div className="mt-4 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-300 mb-2">Rejected files</p>
            <ul className="flex flex-col gap-1.5">
              {rejections.map((r, i) => (
                <li key={i} className="text-sm text-rose-600/90 dark:text-rose-300/90">
                  <span className="font-medium">{r.name}</span> — {r.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {files.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-sm font-semibold text-ink dark:text-paper">
                {files.length} file{files.length !== 1 ? 's' : ''} selected
                {files.length >= 10 && <span className="text-signal ml-2 text-xs">(maximum reached)</span>}
              </h3>
              <button className="btn-secondary btn-sm" onClick={() => { setFiles([]); setRejections([]); }} disabled={loading}>Clear all</button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {files.map((file, idx) => (
                <div key={idx} className="relative rounded-xl overflow-hidden bg-paper-dim dark:bg-white/5 border border-mist dark:border-dusk-line">
                  <img src={file.preview} alt={file.name} className="w-full h-24 object-cover block" />
                  <div className="px-2 py-1.5">
                    <div className="text-[11px] text-ink/40 dark:text-paper/35 truncate">{file.name}</div>
                    <div className="text-[11px] text-ink/30 dark:text-paper/25">{(file.size / 1024).toFixed(0)} KB</div>
                  </div>
                  {!loading && (
                    <button
                      onClick={() => removeFile(idx)}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80 transition"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-4 flex-wrap">
              <button className="btn-primary btn-lg" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Processing…' : 'Screen images'}
              </button>
              <p className="text-sm text-ink/40 dark:text-paper/35">Images are screened against all active moderation categories.</p>
            </div>
          </div>
        )}
      </div>

      <div className="card mt-4">
        <h3 className="font-display font-semibold text-ink dark:text-paper mb-4">Screening categories</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.name}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-paper-dim dark:bg-white/5 border border-mist dark:border-dusk-line"
            >
              <span className="font-mono text-xs text-signal font-semibold">{cat.code}</span>
              <span className="text-sm font-medium text-ink/80 dark:text-paper/75">{cat.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
