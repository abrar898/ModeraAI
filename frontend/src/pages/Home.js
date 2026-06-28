import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { CATEGORY_LABELS } from '../utils/constants';

gsap.registerPlugin(ScrollTrigger);

const CATEGORIES = [
  { code: '01', name: 'Graphic Violence',        desc: 'Depictions of physical harm, gore, or serious injury to humans or animals.' },
  { code: '02', name: 'Hate Symbols',             desc: 'Imagery associated with extremist ideologies or designated terrorist organizations.' },
  { code: '03', name: 'Self-Harm',                desc: 'Visual content depicting or glorifying acts of self-inflicted injury.' },
  { code: '04', name: 'Extremist Propaganda',     desc: 'Content that promotes, recruits for, or glorifies violent extremist movements.' },
  { code: '05', name: 'Weapons & Contraband',     desc: 'Imagery depicting illegal weapons, drug manufacturing, or trafficking-related content.' },
  { code: '06', name: 'Harassment & Humiliation', desc: 'Imagery intended to degrade, threaten, or publicly humiliate an identifiable individual.' },
];

const STEPS = [
  {
    n: '01',
    title: 'Submit images',
    desc: 'Drop up to 10 images per batch. Each image is screened independently — never grouped into a single verdict.',
    icon: '⬆',
  },
  {
    n: '02',
    title: 'Dual-AI screening',
    desc: 'Groq vision runs first. Gemini takes over automatically if rate-limited. Every category returns a confidence score and plain-language reasoning.',
    icon: '🤖',
  },
  {
    n: '03',
    title: 'Transparent verdict',
    desc: 'Approved, flagged, or blocked — with a per-category breakdown and the exact policy version active at decision time.',
    icon: '📋',
  },
  {
    n: '04',
    title: 'Appeal if it feels wrong',
    desc: 'One appeal per image. Admins review with the image and original verdict visible. You get notified the moment it\'s resolved.',
    icon: '⚖',
  },
];

const ENFORCEMENT_LABELS = { auto_block: 'Auto-block', flag_for_review: 'Flag for review' };

function policyToRows(categories) {
  return categories.map((c) => ({
    label: CATEGORY_LABELS[c.category] || c.category,
    pct: c.confidenceThreshold,
    mode: c.enabled ? (ENFORCEMENT_LABELS[c.enforcementBehavior] || c.enforcementBehavior) : 'Disabled',
    enabled: c.enabled,
  }));
}

const DEFAULT_POLICY_ROWS = CATEGORIES.map((c) => ({
  label: c.name, pct: 70, mode: 'Flag for review', enabled: true,
}));

// ── Animated verdict card shown in hero ──────────────────────────────────────
function VerdictCard() {
  const categories = [
    { label: 'Graphic Violence',    confidence: 4,  detected: false },
    { label: 'Hate Symbols',        confidence: 2,  detected: false },
    { label: 'Self-Harm',           confidence: 91, detected: true  },
    { label: 'Extremist Propaganda',confidence: 5,  detected: false },
    { label: 'Weapons & Contraband',confidence: 7,  detected: false },
    { label: 'Harassment',          confidence: 12, detected: false },
  ];

  return (
    <div className="relative">
      {/* Glow behind card */}
      <div className="absolute -inset-4 bg-signal/10 rounded-3xl blur-2xl pointer-events-none" />
      <div className="relative bg-white dark:bg-dusk-raised border border-mist dark:border-dusk-line rounded-2xl shadow-card dark:shadow-card-dark overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-mist dark:border-dusk-line bg-paper-dim dark:bg-dusk">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            <span className="font-mono text-[11px] text-ink/40 dark:text-paper/35">verdict · image_003.jpg</span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
            🚫 Blocked
          </span>
        </div>

        {/* Category rows */}
        <div className="divide-y divide-mist dark:divide-dusk-line">
          {categories.map((cat, i) => (
            <div
              key={cat.label}
              className="flex items-center gap-3 px-5 py-3"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="w-28 shrink-0">
                <div className="text-[11px] font-medium text-ink/70 dark:text-paper/60 truncate">{cat.label}</div>
              </div>
              <div className="flex-1 h-1.5 rounded-full bg-mist dark:bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${cat.detected ? 'bg-rose-500' : 'bg-cleared'}`}
                  style={{ width: `${cat.confidence}%` }}
                />
              </div>
              <div className="w-10 text-right font-mono text-[11px] text-ink/45 dark:text-paper/35">
                {cat.confidence}%
              </div>
              <div className="w-4 text-center">
                {cat.detected
                  ? <span className="text-rose-500 text-xs font-bold">✕</span>
                  : <span className="text-cleared text-xs font-bold">✓</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Reasoning footer */}
        <div className="px-5 py-3.5 bg-rose-50 dark:bg-rose-500/10 border-t border-rose-200 dark:border-rose-500/25">
          <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-300 uppercase tracking-wide mb-1">AI reasoning</div>
          <div className="text-[12px] text-rose-700/80 dark:text-rose-200/70 leading-relaxed">
            Self-harm content detected with 91% confidence — exceeds 70% threshold. Enforcement: auto-block.
          </div>
        </div>
      </div>

      {/* Floating audit chip */}
      <div className="absolute -bottom-4 -right-4 bg-white dark:bg-dusk-raised border border-mist dark:border-dusk-line rounded-xl px-3.5 py-2.5 shadow-card dark:shadow-card-dark flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
        <span className="font-mono text-[11px] text-ink/50 dark:text-paper/45">logged · 142ms · Groq</span>
      </div>
    </div>
  );
}

// ── Animated appeal timeline shown in appeal section ─────────────────────────
function AppealTimeline() {
  const events = [
    { time: '09:14', actor: 'system',  label: 'Submission created',       icon: '📥', color: 'text-ink/50 dark:text-paper/40' },
    { time: '09:14', actor: 'system',  label: 'AI verdict: blocked',       icon: '🚫', color: 'text-rose-500' },
    { time: '09:31', actor: 'user',    label: 'Appeal filed',              icon: '✍',  color: 'text-signal' },
    { time: '10:05', actor: 'admin',   label: 'Appeal accepted',           icon: '✓',  color: 'text-cleared' },
    { time: '10:05', actor: 'system',  label: 'Verdict overridden → Approved', icon: '🔄', color: 'text-cleared' },
  ];

  return (
    <div className="bg-white dark:bg-dusk-raised border border-mist dark:border-dusk-line rounded-2xl overflow-hidden shadow-card dark:shadow-card-dark">
      <div className="px-5 py-4 border-b border-mist dark:border-dusk-line bg-paper-dim dark:bg-dusk flex items-center justify-between">
        <span className="font-mono text-[11px] text-ink/40 dark:text-paper/35">audit log · submission_6a3f</span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-cleared-light text-cleared dark:bg-cleared/15 dark:text-emerald-300">
          ✓ Approved
        </span>
      </div>
      <div className="p-5">
        <div className="relative">
          {/* vertical line */}
          <div className="absolute left-3 top-2 bottom-2 w-px bg-mist dark:bg-dusk-line" />
          <div className="flex flex-col gap-4">
            {events.map((ev, i) => (
              <div key={i} className="flex items-start gap-3 pl-1">
                <div className="w-6 h-6 rounded-full bg-paper-dim dark:bg-dusk border border-mist dark:border-dusk-line flex items-center justify-center text-[11px] shrink-0 z-10">
                  {ev.icon}
                </div>
                <div className="flex-1 pt-0.5">
                  <div className={`text-[13px] font-medium ${ev.color}`}>{ev.label}</div>
                  <div className="text-[11px] text-ink/30 dark:text-paper/25 font-mono mt-0.5">{ev.time} · {ev.actor}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stat counter with animated number ────────────────────────────────────────
function StatCard({ value, label, sub }) {
  return (
    <div className="card text-center group hover:border-signal/30 transition-colors">
      <div className="font-display text-3xl sm:text-4xl font-semibold text-signal mb-1">{value}</div>
      <div className="text-sm font-medium text-ink dark:text-paper">{label}</div>
      {sub && <div className="text-xs text-ink/40 dark:text-paper/35 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const root = useRef(null);
  const dest = user ? (user.role === 'admin' ? '/admin/dashboard' : '/dashboard') : '/register';
  const [policyRows, setPolicyRows] = useState(DEFAULT_POLICY_ROWS);
  const [policyVersion, setPolicyVersion] = useState(null);

  useEffect(() => {
    api.get('/policy/public').then((res) => {
      if (res.data?.categories?.length) {
        setPolicyRows(policyToRows(res.data.categories));
        setPolicyVersion(res.data.version);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero entrance
      gsap.from('.hero-fade', {
        y: 28, opacity: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out', delay: 0.1,
      });
      // Verdict card slides in from right
      gsap.from('.verdict-card-wrap', {
        x: 40, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.4,
      });

      // Scroll reveals
      gsap.utils.toArray('.reveal').forEach((el) => {
        gsap.from(el, {
          y: 32, opacity: 0, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 87%' },
        });
      });

      // Step rows
      gsap.utils.toArray('.step-row').forEach((el, i) => {
        const stamp = el.querySelector('.step-stamp');
        gsap.from(el, {
          y: 28, opacity: 0, duration: 0.55, delay: i * 0.06, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 89%' },
        });
        if (stamp) {
          gsap.from(stamp, {
            scale: 0.6, rotate: -20, opacity: 0, duration: 0.5, delay: i * 0.06 + 0.12,
            ease: 'back.out(2)', scrollTrigger: { trigger: el, start: 'top 89%' },
          });
        }
      });

      // Category ledger rows slide in from left
      gsap.utils.toArray('.ledger-row').forEach((el, i) => {
        gsap.from(el, {
          x: -20, opacity: 0, duration: 0.5, delay: i * 0.05, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 92%' },
        });
      });

      // Policy card parallax lift
      gsap.to('.policy-preview', {
        y: -28, ease: 'none',
        scrollTrigger: { trigger: '.policy-section', start: 'top bottom', end: 'bottom top', scrub: true },
      });

      // Floating blobs in hero
      gsap.to('.blob-1', { y: -50, ease: 'none', scrollTrigger: { trigger: '.hero-section', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.blob-2', { y: -90, ease: 'none', scrollTrigger: { trigger: '.hero-section', start: 'top top', end: 'bottom top', scrub: true } });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="bg-paper dark:bg-dusk overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-paper/90 dark:bg-dusk/90 border-b border-mist dark:border-dusk-line">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full border-2 border-signal flex items-center justify-center text-signal font-display font-bold text-sm rotate-[-6deg]">
              M
            </div>
            <span className="font-display font-semibold text-lg text-ink dark:text-paper">
              Modera<span className="text-signal">AI</span>
            </span>
          </Link>
          <div className="hidden sm:flex items-center gap-6">
            <a href="#how-it-works" className="text-sm text-ink/50 dark:text-paper/45 hover:text-ink dark:hover:text-paper transition">How it works</a>
            <a href="#categories" className="text-sm text-ink/50 dark:text-paper/45 hover:text-ink dark:hover:text-paper transition">Categories</a>
            <a href="#for-admins" className="text-sm text-ink/50 dark:text-paper/45 hover:text-ink dark:hover:text-paper transition">For admins</a>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to={dest} className="btn-primary btn-sm">Dashboard →</Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-ink/55 dark:text-paper/50 hover:text-ink dark:hover:text-paper transition">Sign in</Link>
                <Link to="/register" className="btn-primary btn-sm">Get started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero-section relative min-h-screen flex items-center pt-24 pb-20 px-6 overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(232,116,59,0.07),transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(47,111,79,0.06),transparent_55%)] pointer-events-none" />
        <div className="blob-1 absolute top-32 -left-20 w-72 h-72 rounded-full bg-signal/8 blur-3xl pointer-events-none" />
        <div className="blob-2 absolute bottom-20 right-0 w-96 h-96 rounded-full bg-cleared/6 blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto w-full relative grid lg:grid-cols-2 gap-16 xl:gap-24 items-center">
          {/* Left copy */}
          <div>
            <div className="hero-fade inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-signal-light border border-signal/20 text-signal-dark text-[11px] font-semibold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
              AI-powered · appeal-ready · fully audited
            </div>
            <h1 className="hero-fade font-display font-semibold text-4xl sm:text-5xl xl:text-6xl text-ink dark:text-paper leading-[1.06] mb-6">
              Every image gets<br />
              a verdict{' '}
              <span className="relative inline-block">
                <span className="relative z-10 text-signal">and a reason</span>
                <span className="absolute bottom-1 left-0 right-0 h-[6px] bg-signal/15 rounded-full" />
              </span>{' '}
              why.
            </h1>
            <p className="hero-fade text-base sm:text-lg text-ink/55 dark:text-paper/50 leading-relaxed max-w-lg mb-8">
              Submit images for automated policy screening. Get a{' '}
              <strong className="font-semibold text-ink dark:text-paper">per-category confidence score</strong>{' '}
              with plain-language reasoning — not just a yes or no. Dispute any call with a built-in appeal.
            </p>
            <div className="hero-fade flex flex-wrap items-center gap-3 mb-10">
              <Link to={dest} className="btn-primary btn-lg">
                {user ? 'Go to dashboard' : 'Start for free'} →
              </Link>
              <a href="#how-it-works" className="btn-secondary btn-lg">See how it works</a>
            </div>
            {/* Trust badges */}
            <div className="hero-fade flex flex-wrap items-center gap-4 text-[12px] text-ink/40 dark:text-paper/35">
              {['6 policy categories', 'Dual-AI fallback', 'Immutable audit log', 'S3 image storage'].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <span className="text-signal font-bold">✓</span> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right — verdict card */}
          <div className="verdict-card-wrap hidden lg:block">
            <VerdictCard />
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <section className="border-y border-mist dark:border-dusk-line bg-white dark:bg-dusk-raised">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { value: '6',        label: 'Policy categories',   sub: 'All independently configurable' },
            { value: '70%',      label: 'Default threshold',   sub: 'Adjustable per category' },
            { value: '2-layer',  label: 'AI fallback',         sub: 'Groq → Gemini automatically' },
            { value: '100%',     label: 'Verdicts explained',  sub: 'Confidence + reasoning every time' },
          ].map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-28 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="reveal mb-16">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-widest text-signal mb-3">How it works</span>
            <h2 className="font-display font-semibold text-3xl sm:text-4xl text-ink dark:text-paper mb-4">
              From upload to verdict,{' '}
              <span className="text-ink/50 dark:text-paper/45">transparently</span>
            </h2>
            <p className="text-ink/50 dark:text-paper/45 text-base leading-relaxed max-w-xl">
              Four steps connect every submission to an explainable outcome — and a structured way to challenge it.
            </p>
          </div>

          <div>
            {STEPS.map((step, i) => (
              <div
                key={step.n}
                className={`step-row flex gap-6 sm:gap-8 items-start py-8 ${i !== 0 ? 'border-t border-mist dark:border-dusk-line' : ''}`}
              >
                <div className="step-stamp shrink-0 w-14 h-14 rounded-full border-2 border-signal bg-signal-light dark:bg-signal/15 flex items-center justify-center font-display font-bold text-signal text-lg rotate-[-6deg] shadow-stamp">
                  {step.n}
                </div>
                <div className="pt-1">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-xl">{step.icon}</span>
                    <h3 className="font-display font-semibold text-lg text-ink dark:text-paper">{step.title}</h3>
                  </div>
                  <p className="text-sm text-ink/50 dark:text-paper/45 leading-relaxed max-w-md">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── APPEAL + AUDIT SECTION ── */}
      <section className="py-28 px-6 bg-white dark:bg-dusk-raised border-y border-mist dark:border-dusk-line">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="reveal order-2 lg:order-1">
            <AppealTimeline />
          </div>
          <div className="order-1 lg:order-2">
            <span className="reveal inline-block text-[11px] font-semibold uppercase tracking-widest text-signal mb-3">Appeals & audit</span>
            <h2 className="reveal font-display font-semibold text-3xl sm:text-4xl text-ink dark:text-paper mb-5">
              Every action is logged.<br />Nothing disappears.
            </h2>
            <p className="reveal text-ink/55 dark:text-paper/50 leading-relaxed mb-7">
              Every submission creates an immutable audit trail — from the moment it's uploaded to every verdict change and appeal decision. Admins see it. Users see it. Nothing is hidden.
            </p>
            <ul className="reveal space-y-3.5 text-sm">
              {[
                { icon: '✍', text: 'File one appeal per image with a written justification' },
                { icon: '👁', text: 'Admins review the original image, confidence scores, and your note side-by-side' },
                { icon: '🔔', text: 'Email notification sent the moment your appeal is resolved' },
                { icon: '📋', text: 'Every state change logged with actor, role, and timestamp' },
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-3 text-ink/65 dark:text-paper/55">
                  <span className="text-base mt-0.5 shrink-0">{item.icon}</span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section id="categories" className="py-28 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="reveal mb-14">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-widest text-signal mb-3">Screening categories</span>
            <h2 className="font-display font-semibold text-3xl sm:text-4xl text-ink dark:text-paper mb-4">
              Six categories, screened independently
            </h2>
            <p className="text-ink/50 dark:text-paper/45 leading-relaxed max-w-xl">
              Every image is checked against all active categories — each producing its own confidence score, detection flag, and reasoning string.
            </p>
          </div>

          <div className="border border-mist dark:border-dusk-line rounded-2xl overflow-hidden">
            {CATEGORIES.map((cat, i) => (
              <div
                key={cat.code}
                className={`ledger-row flex items-start gap-5 px-6 py-5 group hover:bg-paper-dim dark:hover:bg-white/[0.03] transition-colors ${
                  i !== 0 ? 'border-t border-mist dark:border-dusk-line' : ''
                }`}
              >
                <span className="font-mono text-xs text-ink/30 dark:text-paper/25 w-7 mt-0.5 shrink-0">{cat.code}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-ink dark:text-paper mb-1">{cat.name}</h3>
                  <p className="text-sm text-ink/45 dark:text-paper/40 leading-relaxed">{cat.desc}</p>
                </div>
                <span className="font-mono text-[10px] text-signal opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1">
                  configurable →
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR ADMINS / POLICY ── */}
      <section id="for-admins" className="policy-section py-28 px-6 bg-white dark:bg-dusk-raised border-y border-mist dark:border-dusk-line overflow-hidden">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          {/* Live policy card */}
          <div className="reveal order-2 lg:order-1">
            <div className="policy-preview border border-mist dark:border-dusk-line rounded-2xl overflow-hidden shadow-card dark:shadow-card-dark">
              <div className="px-5 py-3.5 bg-paper-dim dark:bg-dusk border-b border-mist dark:border-dusk-line flex items-center justify-between">
                <span className="font-mono text-[11px] text-ink/40 dark:text-paper/30">
                  active policy{policyVersion != null ? ` · v${policyVersion}` : ''}
                </span>
                <span className="w-2 h-2 rounded-full bg-cleared animate-pulse" />
              </div>
              <div className="divide-y divide-mist dark:divide-dusk-line">
                {policyRows.map((row) => (
                  <div
                    key={row.label}
                    className={`flex items-center gap-3 px-5 py-3.5 ${row.enabled === false ? 'opacity-40' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-ink dark:text-paper truncate mb-1.5">{row.label}</div>
                      <div className="w-full h-1 rounded-full bg-mist dark:bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-signal transition-all duration-700" style={{ width: `${row.pct}%` }} />
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-ink/40 dark:text-paper/35 shrink-0 w-8 text-right">{row.pct}%</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      row.mode === 'Auto-block'
                        ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300'
                        : row.mode === 'Disabled'
                        ? 'bg-mist text-ink/40 dark:bg-dusk-line dark:text-paper/40'
                        : 'bg-signal-light text-signal-dark dark:bg-signal/15 dark:text-signal'
                    }`}>
                      {row.mode}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <span className="reveal inline-block text-[11px] font-semibold uppercase tracking-widest text-signal mb-3">For administrators</span>
            <h2 className="reveal font-display font-semibold text-3xl sm:text-4xl text-ink dark:text-paper mb-5">
              Admins set the bar, category by category
            </h2>
            <p className="reveal text-ink/55 dark:text-paper/50 leading-relaxed mb-7">
              Enable or disable any category, dial in its confidence threshold, and choose whether a detection gets auto-blocked or queued for human review. Policy changes only apply going forward — past verdicts are frozen at decision time.
            </p>
            <ul className="reveal space-y-3 text-sm text-ink/60 dark:text-paper/50">
              {[
                'Analytics with date-range filters (7 / 30 / 90 days / custom)',
                'Real-time submission feed via WebSocket',
                'Manual verdict overrides with full audit trail',
                'CSV export of any filtered submission view',
                'User reputation scoring based on violation history',
                'Per-category threshold and auto-block / flag toggle',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="text-signal font-bold mt-0.5">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── FEATURE GRID ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="reveal text-center mb-14">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-widest text-signal mb-3">Built for production</span>
            <h2 className="font-display font-semibold text-3xl text-ink dark:text-paper">
              Industrial-grade foundations
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: '🔒', title: 'HMAC image tokens',         desc: 'Short-lived signed tokens per image — your JWT never appears in a URL or server log.' },
              { icon: '☁',  title: 'S3 object storage',         desc: 'Images stored in S3 / Cloudflare R2. MongoDB stays lean, images load from CDN.' },
              { icon: '📡', title: 'WebSocket live feed',        desc: 'Admin dashboard receives new submissions in real time via Socket.io.' },
              { icon: '🛡', title: 'Input validation everywhere', desc: 'Every endpoint validated with Zod schemas — no unchecked input reaches the database.' },
              { icon: '⏱', title: 'Rate limiting',              desc: '10 submission batches per user per 15 minutes — keeps free-tier AI APIs protected.' },
              { icon: '📊', title: 'Processing time tracked',    desc: 'AI latency recorded per verdict. Provider and ms shown in analytics.' },
              { icon: '📜', title: 'Policy versioning',          desc: 'Every save creates a new immutable version. Past verdicts never change.' },
              { icon: '🏅', title: 'User reputation score',      desc: 'Computed from violation rate and appeal acceptance. Shown on admin user list.' },
              { icon: '📥', title: 'CSV export',                 desc: 'Download any filtered submission view as a spreadsheet-ready CSV.' },
            ].map((f) => (
              <div key={f.title} className="reveal card hover:border-signal/25 transition-colors group">
                <span className="text-2xl mb-3 block">{f.icon}</span>
                <h3 className="font-display font-semibold text-sm text-ink dark:text-paper mb-1.5">{f.title}</h3>
                <p className="text-xs text-ink/45 dark:text-paper/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28 px-6 bg-ink dark:bg-dusk-raised">
        <div className="reveal max-w-2xl mx-auto text-center">
          <span className="inline-block text-[11px] font-semibold uppercase tracking-widest text-signal mb-4">Ready when you are</span>
          <h2 className="font-display font-semibold text-3xl sm:text-4xl text-paper mb-5">
            See it on your own images
          </h2>
          <p className="text-paper/50 text-base mb-8 leading-relaxed">
            Free to try. No credit card. Just an account and your first upload — results in under 3 seconds.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to={dest} className="btn-primary btn-lg">
              {user ? 'Go to dashboard' : 'Create free account'} →
            </Link>
            <a href="#how-it-works" className="btn text-paper/70 hover:text-paper border border-paper/20 hover:border-paper/40 btn-lg">
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-paper dark:bg-dusk border-t border-mist dark:border-dusk-line px-6 pt-16 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-mist dark:border-dusk-line">
            <div className="lg:col-span-2">
              <Link to="/" className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-full border-2 border-signal flex items-center justify-center text-signal font-display font-bold text-sm rotate-[-6deg]">
                  M
                </div>
                <span className="font-display font-semibold text-lg text-ink dark:text-paper">
                  Modera<span className="text-signal">AI</span>
                </span>
              </Link>
              <p className="text-sm text-ink/45 dark:text-paper/40 max-w-xs leading-relaxed">
                Transparent, appealable, fully-audited content moderation. Every verdict comes with a reason — and a way to challenge it.
              </p>
            </div>
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-widest text-ink/35 dark:text-paper/30 mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm text-ink/55 dark:text-paper/45">
                <li><a href="#how-it-works" className="hover:text-signal transition">How it works</a></li>
                <li><a href="#categories"   className="hover:text-signal transition">Categories</a></li>
                <li><a href="#for-admins"   className="hover:text-signal transition">For admins</a></li>
                <li><Link to="/register"    className="hover:text-signal transition">Get started</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-widest text-ink/35 dark:text-paper/30 mb-4">6 categories</h4>
              <ul className="space-y-2 text-sm text-ink/55 dark:text-paper/45">
                {CATEGORIES.map((c) => (
                  <li key={c.code}>{c.name}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink/30 dark:text-paper/25">
            <span>© {new Date().getFullYear()} ModeraAI · Transparent, appealable content moderation</span>
            <span className="font-mono">v2.0 · all verdicts logged · audit trail immutable</span>
          </div>
        </div>
      </footer>

    </div>
  );
}