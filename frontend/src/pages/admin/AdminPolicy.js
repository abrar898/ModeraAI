import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import PageHeader from '../../components/shared/PageHeader';
import { LoadingCenter } from '../../components/shared/Helpers';
import { useToast } from '../../context/ToastContext';
import { CATEGORY_LABELS } from '../../utils/constants';

const CATEGORY_DESCRIPTIONS = {
  graphic_violence: 'Depictions of physical harm, gore, or serious injury.',
  hate_symbols: 'Imagery associated with extremist ideologies or terrorist organizations.',
  self_harm: 'Visual content depicting or glorifying self-inflicted injury.',
  extremist_propaganda: 'Content promoting or glorifying violent extremist movements.',
  weapons_contraband: 'Illegal weapons, drug manufacturing, or trafficking content.',
  harassment_humiliation: 'Imagery intended to degrade or threaten identifiable individuals.',
};

export default function AdminPolicy() {
  const [policy, setPolicy] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get('/policy').then((res) => {
      setPolicy(res.data);
      setCategories(JSON.parse(JSON.stringify(res.data.categories)));
    }).finally(() => setLoading(false));
  }, []);

  const updateCat = (idx, field, value) => {
    setCategories((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/policy', { categories });
      setPolicy(res.data);
      setCategories(JSON.parse(JSON.stringify(res.data.categories)));
      setDirty(false);
      toast.success('Policy saved', `Policy v${res.data.version} is now active.`);
    } catch (err) {
      toast.error('Save failed', err.response?.data?.message || 'Error saving policy');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setCategories(JSON.parse(JSON.stringify(policy.categories)));
    setDirty(false);
  };

  if (loading) return <LoadingCenter text="Loading policy..." />;

  return (
    <div>
      <PageHeader
        title="Policy configuration"
        subtitle={
          <>
            Configure moderation behavior per category. Changes apply to new submissions only.
            {policy && <span className="ml-2 text-signal font-semibold font-mono">Active: v{policy.version}</span>}
          </>
        }
      />

      <div className="flex justify-end mb-5">
        <Link to="/admin/policy/history" className="btn-secondary btn-sm">📋 View version history</Link>
      </div>

      {dirty && (
        <div className="bg-signal-light/60 dark:bg-signal/10 border border-signal/30 text-signal-dark dark:text-signal px-4 py-3 rounded-xl text-sm mb-5">
          You have unsaved changes. Save to apply the new policy to future submissions.
        </div>
      )}

      <div className="flex flex-col gap-3.5">
        {categories.map((cat, idx) => (
          <div key={cat.category} className={`card transition-opacity ${cat.enabled ? '' : 'opacity-55'}`}>
            <div className="flex items-start gap-5 flex-wrap">
              <label className="relative inline-flex items-center mt-1 cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={cat.enabled}
                  onChange={(e) => updateCat(idx, 'enabled', e.target.checked)}
                />
                <span className="toggle-track" />
              </label>

              <div className="flex-1 min-w-48">
                <div className="font-display font-semibold text-ink dark:text-paper mb-1">{CATEGORY_LABELS[cat.category]}</div>
                <div className="text-xs text-ink/40 dark:text-paper/35">{CATEGORY_DESCRIPTIONS[cat.category]}</div>
              </div>

              <div className="flex gap-6 items-center flex-wrap">
                <div className="min-w-44">
                  <div className="flex justify-between mb-2">
                    <label className="form-label !mb-0">Confidence threshold</label>
                    <span className="font-mono font-bold text-signal text-sm">{cat.confidenceThreshold}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={cat.confidenceThreshold}
                    onChange={(e) => updateCat(idx, 'confidenceThreshold', Number(e.target.value))}
                    disabled={!cat.enabled}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[11px] text-ink/35 dark:text-paper/30 mt-1">
                    <span>Lenient</span>
                    <span>Strict</span>
                  </div>
                </div>

                <div className="min-w-40">
                  <label className="form-label">Enforcement</label>
                  <select
                    className="form-input"
                    value={cat.enforcementBehavior}
                    onChange={(e) => updateCat(idx, 'enforcementBehavior', e.target.value)}
                    disabled={!cat.enabled}
                  >
                    <option value="flag_for_review">Flag for review</option>
                    <option value="auto_block">Auto-block</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button className="btn-primary btn-lg" onClick={handleSave} disabled={saving || !dirty}>
          {saving ? 'Saving…' : 'Save policy'}
        </button>
        {dirty && <button className="btn-secondary btn-lg" onClick={handleReset}>Reset changes</button>}
      </div>

      {policy?.updatedBy && (
        <p className="mt-3.5 text-xs text-ink/35 dark:text-paper/30">Last updated by {policy.updatedBy.username}</p>
      )}
    </div>
  );
}
