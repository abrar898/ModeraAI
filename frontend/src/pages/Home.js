import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useAuth } from '../context/AuthContext';
import VideoDemo from '../components/home/VideoDemo';
import DemoShowcase from '../components/home/DemoShowcase';
import api from '../utils/api';
import { CATEGORY_LABELS } from '../utils/constants';

gsap.registerPlugin(ScrollTrigger);

const CATEGORIES = [
  { code: '01', name: 'Graphic Violence', desc: 'Depictions of physical harm, gore, or serious injury.' },
  { code: '02', name: 'Hate Symbols', desc: 'Imagery tied to extremist ideologies or designated groups.' },
  { code: '03', name: 'Self-Harm', desc: 'Content depicting or glorifying self-inflicted injury.' },
  { code: '04', name: 'Extremist Propaganda', desc: 'Material that recruits for or glorifies violent extremism.' },
  { code: '05', name: 'Weapons & Contraband', desc: 'Illegal weapons, drug manufacturing, or trafficking.' },
  { code: '06', name: 'Harassment & Humiliation', desc: 'Imagery meant to degrade or threaten an identifiable person.' },
];

const STEPS = [
  { n: '01', title: 'Submit your images', desc: 'Drop up to 10 images (3MB each). Each is screened independently with processing time logged.' },
  { n: '02', title: 'AI screens every category', desc: 'Groq vision AI runs first; Gemini automatically takes over if rate-limited — every category returns confidence + reasoning.' },
  { n: '03', title: 'Get a transparent verdict', desc: 'Approved, flagged, or blocked — with per-category scores and plain-language explanations frozen at decision time.' },
  { n: '04', title: 'Appeal if it feels wrong', desc: 'Flagged or blocked? File one appeal per image. Admins review with the image visible and you get an in-app notification instantly.' },
];

const STATS = [
  { value: '6', label: 'Policy categories' },
  { value: '70%', label: 'Default threshold' },
  { value: '100%', label: 'Verdicts explained' },
  { value: 'Real-time', label: 'Admin live feed' },
];

const DEFAULT_POLICY_ROWS = [
  { label: 'Graphic Violence', pct: 70, mode: 'Flag for review' },
  { label: 'Hate Symbols', pct: 70, mode: 'Flag for review' },
  { label: 'Self-Harm', pct: 70, mode: 'Flag for review' },
  { label: 'Extremist Propaganda', pct: 70, mode: 'Flag for review' },
  { label: 'Weapons & Contraband', pct: 70, mode: 'Flag for review' },
  { label: 'Harassment & Humiliation', pct: 70, mode: 'Flag for review' },
];

const FEATURES = [
  { icon: '📋', title: 'Audit log + CSV export', desc: 'Every action logged for compliance.' },
  { icon: '📡', title: 'Live admin feed', desc: 'Submissions appear instantly via WebSocket.' },
  { icon: '🔔', title: 'In-app notifications', desc: 'Users notified when appeals are resolved.' },
  { icon: '📜', title: 'Policy versioning', desc: 'Past verdicts never change when policy updates.' },
];

const ENFORCEMENT_LABELS = {
  auto_block: 'Auto-block',
  flag_for_review: 'Flag for review',
};

function policyToRows(categories) {
  return categories.map((c) => ({
    label: CATEGORY_LABELS[c.category] || c.category,
    pct: c.confidenceThreshold,
    mode: c.enabled ? (ENFORCEMENT_LABELS[c.enforcementBehavior] || c.enforcementBehavior) : 'Disabled',
    enabled: c.enabled,
  }));
}

export default function Home() {
  const { user } = useAuth();
  const root = useRef(null);
  const dest = user ? (user.role === 'admin' ? '/admin/dashboard' : '/dashboard') : '/register';
  const [policyRows, setPolicyRows] = useState(DEFAULT_POLICY_ROWS);
  const [policyVersion, setPolicyVersion] = useState(null);

  useEffect(() => {
    api.get('/policy/public')
      .then((res) => {
        if (res.data?.categories?.length) {
          setPolicyRows(policyToRows(res.data.categories));
          setPolicyVersion(res.data.version);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-fade', { y: 24, opacity: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' });

      gsap.utils.toArray('.reveal').forEach((el) => {
        gsap.from(el, { y: 36, opacity: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 86%' } });
      });

      // Step rows reveal with their stamp number rotating in
      gsap.utils.toArray('.step-row').forEach((el, i) => {
        const stamp = el.querySelector('.step-stamp');
        gsap.from(el, { y: 30, opacity: 0, duration: 0.6, delay: i * 0.04, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
        if (stamp) {
          gsap.from(stamp, {
            rotate: -25,
            scale: 0.7,
            opacity: 0,
            duration: 0.5,
            delay: i * 0.04 + 0.1,
            ease: 'back.out(2.2)',
            scrollTrigger: { trigger: el, start: 'top 88%' },
          });
        }
      });

      // Category ledger rows
      gsap.utils.toArray('.ledger-row').forEach((el, i) => {
        gsap.from(el, { x: -16, opacity: 0, duration: 0.5, delay: i * 0.05, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%' } });
      });

      // Parallax: film strip in hero drifts slower than text on scroll
      gsap.to('.parallax-slow', {
        y: -60,
        ease: 'none',
        scrollTrigger: { trigger: '.hero-section', start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.to('.parallax-fast', {
        y: -140,
        ease: 'none',
        scrollTrigger: { trigger: '.hero-section', start: 'top top', end: 'bottom top', scrub: true },
      });

      // Policy preview card: gentle parallax rise
      gsap.to('.policy-preview', {
        y: -30,
        ease: 'none',
        scrollTrigger: { trigger: '.policy-section', start: 'top bottom', end: 'bottom top', scrub: true },
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="bg-paper dark:bg-dusk overflow-x-hidden">
      {/* ---------------- NAV ---------------- */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-paper/90 dark:bg-dusk/90 border-b border-mist dark:border-dusk-line">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full border-2 border-signal flex items-center justify-center text-signal font-display font-bold text-xs rotate-[-6deg]">
              M
            </div>
            <span className="font-display font-semibold text-lg text-ink dark:text-paper">
              Modera<span className="text-signal">AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to={dest} className="btn-primary btn-sm">Go to dashboard →</Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-ink/60 dark:text-paper/60 hover:text-ink dark:hover:text-paper transition">
                  Sign in
                </Link>
                <Link to="/register" className="btn-primary btn-sm">Get started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ---------------- HERO ---------------- */}
      <section className="hero-section relative pt-40 pb-20 px-6 grain overflow-hidden">
        <div className="parallax-fast absolute top-24 -left-16 w-64 h-64 rounded-full bg-signal-light/40 blur-3xl pointer-events-none" />
        <div className="parallax-slow absolute bottom-0 right-10 w-72 h-72 rounded-full bg-cleared-light/50 blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="hero-fade eyebrow inline-block mb-5">Moderation Desk · Est. for transparent review</span>
            <h1 className="hero-fade text-4xl sm:text-5xl font-display font-semibold text-ink dark:text-paper leading-[1.08] mb-5">
              Every image gets a <span className="text-highlight">verdict</span> — and a{' '}
              <span className="text-highlight-ink highlight-bar">reason why</span>.
            </h1>
            <p className="hero-fade text-base text-ink/55 dark:text-paper/50 max-w-md mb-8 leading-relaxed">
              Submit images, get a <span className="font-display font-bold text-ink dark:text-paper">confidence score</span> per
              policy category with plain-language reasoning — not just a yes or no.
              If a call looks wrong, <span className="text-highlight">appeal it</span> and a real admin reviews the case.
            </p>
            <div className="hero-fade flex items-center gap-3 flex-wrap">
              <Link to={dest} className="btn-primary btn-lg">
                {user ? 'Go to dashboard' : 'Create free account'} →
              </Link>
              <a href="#product-demos" className="btn-secondary btn-lg">Watch demos</a>
              <a href="#how-it-works" className="btn-secondary btn-lg hidden sm:inline-flex">How it works</a>
            </div>
          </div>

          <div className="hero-fade">
            <VideoDemo />
          </div>
        </div>
      </section>

      {/* ---------------- STATS STRIP ---------------- */}
      <section className="border-y border-mist dark:border-dusk-line bg-white dark:bg-dusk-raised">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center sm:text-left">
              <div className="font-display text-3xl font-semibold text-signal">{s.value}</div>
              <div className="text-xs uppercase tracking-wide text-ink/45 dark:text-paper/40 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- FEATURES ---------------- */}
      <section className="py-16 px-6 border-b border-mist dark:border-dusk-line">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="reveal card !p-4 hover:border-signal/30 transition-colors">
              <span className="text-2xl mb-2 block">{f.icon}</span>
              <h3 className="font-display font-semibold text-sm text-ink dark:text-paper mb-1">{f.title}</h3>
              <p className="text-xs text-ink/45 dark:text-paper/40 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- PRODUCT DEMOS (Gemini visuals) ---------------- */}
      <section id="product-demos" className="relative py-24 sm:py-28 px-6 bg-white dark:bg-dusk-raised border-y border-mist dark:border-dusk-line">
        <div className="max-w-6xl mx-auto">
          <div className="reveal mb-12 sm:mb-14 max-w-2xl">
            <span className="eyebrow">See ModeraAI in action</span>
            <h2 className="text-3xl sm:text-4xl font-display font-semibold text-ink dark:text-paper mt-3 mb-4">
              From <span className="text-highlight">upload</span> to{' '}
              <span className="text-highlight">appeal</span> — visually
            </h2>
            <p className="text-ink/55 dark:text-paper/50 leading-relaxed">
              Product walkthrough frames generated with <span className="font-display font-bold text-ink dark:text-paper">Gemini</span>,
              showcasing how transparent moderation, appeals, and analytics work together.
            </p>
          </div>
          <DemoShowcase />
        </div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section id="how-it-works" className="relative py-28 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="reveal mb-16">
            <span className="eyebrow">How it works</span>
            <h2 className="text-3xl font-display font-semibold text-ink dark:text-paper mt-3 mb-3">
              From upload to verdict, <span className="text-highlight">transparently</span>
            </h2>
            <p className="text-ink/50 dark:text-paper/45 max-w-xl">
              Four steps connect every submission to an <span className="font-display font-bold text-ink/70 dark:text-paper/70">explainable outcome</span> — and a way to challenge it.
            </p>
          </div>

          <div>
            {STEPS.map((step, i) => (
              <div key={step.n} className={`step-row flex gap-6 items-start py-7 ${i !== 0 ? 'border-t border-mist dark:border-dusk-line' : ''}`}>
                <div className="step-stamp shrink-0 w-14 h-14 rounded-full border-2 border-signal flex items-center justify-center font-display font-bold text-signal text-lg rotate-[-8deg]">
                  {step.n}
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg text-ink dark:text-paper mb-1.5">{step.title}</h3>
                  <p className="text-sm text-ink/50 dark:text-paper/45 leading-relaxed max-w-md">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CATEGORIES (ledger style) ---------------- */}
      <section className="relative py-28 px-6 bg-white dark:bg-dusk-raised border-y border-mist dark:border-dusk-line">
        <div className="max-w-3xl mx-auto">
          <div className="reveal mb-14">
            <span className="eyebrow">The ledger</span>
            <h2 className="text-3xl font-display font-semibold text-ink dark:text-paper mt-3 mb-3">
              <span className="text-highlight">Six categories</span>, screened independently
            </h2>
            <p className="text-ink/50 dark:text-paper/45 max-w-xl">
              Every image is checked against all active categories — each with its own confidence score and reasoning.
            </p>
          </div>

          <div>
            {CATEGORIES.map((cat, i) => (
              <div
                key={cat.code}
                className={`ledger-row flex items-center gap-5 py-5 group hover:bg-paper-dim dark:hover:bg-white/[0.03] transition-colors px-3 -mx-3 rounded-lg ${
                  i !== 0 ? 'border-t border-mist dark:border-dusk-line' : ''
                }`}
              >
                <span className="font-mono text-xs text-ink/30 dark:text-paper/25 w-7 shrink-0">{cat.code}</span>
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-ink dark:text-paper">{cat.name}</h3>
                  <p className="text-sm text-ink/45 dark:text-paper/40 mt-0.5">{cat.desc}</p>
                </div>
                <span className="font-mono text-[11px] text-ink/25 dark:text-paper/20 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  configurable →
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- ADMIN CONTROL ---------------- */}
      <section className="policy-section relative py-28 px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto relative grid lg:grid-cols-2 gap-16 items-center">
          <div className="reveal order-2 lg:order-1">
            <div className="policy-preview card space-y-2 max-h-80 overflow-y-auto">
              <p className="text-[10px] uppercase tracking-wide text-ink/35 dark:text-paper/30 mb-2">
                Live active policy{policyVersion != null ? ` · v${policyVersion}` : ''}
              </p>
              {policyRows.map((row) => (
                <div key={row.label} className={`flex items-center gap-3 py-2 border-t border-mist dark:border-dusk-line first:border-t-0 ${row.enabled === false ? 'opacity-50' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink dark:text-paper truncate">{row.label}</div>
                    <div className="w-full h-1.5 rounded-full bg-mist dark:bg-white/10 mt-1.5 overflow-hidden">
                      <div className="h-full rounded-full bg-signal" style={{ width: `${row.pct}%` }} />
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-ink/40 dark:text-paper/35 shrink-0">{row.pct}%</span>
                  <span className="badge badge-mixed shrink-0 !text-[9px]">{row.mode}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <span className="reveal eyebrow">For administrators</span>
            <h2 className="reveal text-3xl font-display font-semibold text-ink dark:text-paper mt-3 mb-4">
              Admins set the bar, category by category
            </h2>
            <p className="reveal text-ink/55 dark:text-paper/50 leading-relaxed mb-6">
              Enable or disable any category, dial in its confidence threshold, and choose whether a hit gets
              auto-blocked or flagged for human review. Policy changes only apply going forward — past verdicts
              stay exactly as they were decided.
            </p>
            <ul className="reveal space-y-2.5 text-sm text-ink/60 dark:text-paper/50">
              <li className="flex items-center gap-2"><span className="text-signal font-bold">✓</span> Analytics with date-range filters (7 / 30 / 90 days)</li>
              <li className="flex items-center gap-2"><span className="text-signal font-bold">✓</span> Manual verdict overrides with audit trail</li>
              <li className="flex items-center gap-2"><span className="text-signal font-bold">✓</span> Appeals queue with image preview + notifications</li>
              <li className="flex items-center gap-2"><span className="text-signal font-bold">✓</span> Per-category threshold &amp; auto-block / flag toggle</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="relative py-28 px-6 bg-ink dark:bg-dusk-raised">
        <div className="reveal max-w-2xl mx-auto text-center">
          <span className="eyebrow">Ready when you are</span>
          <h2 className="text-3xl font-display font-semibold text-paper mt-3 mb-4">
            Ready to see it on your own images?
          </h2>
          <p className="text-paper/55 mb-8">Free to try. No credit card. Just an account and your first upload.</p>
          <Link to={dest} className="btn-primary btn-lg">
            {user ? 'Go to dashboard' : 'Create your free account'} →
          </Link>
        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="bg-paper dark:bg-dusk px-6 pt-16 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-mist dark:border-dusk-line">
            <div className="lg:col-span-2">
              <Link to="/" className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-full border-2 border-signal flex items-center justify-center text-signal font-display font-bold text-xs rotate-[-6deg]">
                  M
                </div>
                <span className="font-display font-semibold text-lg text-ink dark:text-paper">
                  Modera<span className="text-signal">AI</span>
                </span>
              </Link>
              <p className="text-sm text-ink/45 dark:text-paper/40 max-w-xs leading-relaxed">
                Transparent, appealable content moderation. Every verdict comes with a reason — and a way to challenge it.
              </p>
            </div>

            <div>
              <h4 className="eyebrow !text-ink/40 dark:!text-paper/35 !text-[11px] mb-3.5">Product</h4>
              <ul className="space-y-2.5 text-sm text-ink/55 dark:text-paper/45">
                <li><a href="#how-it-works" className="hover:text-signal transition">How it works</a></li>
                <li><Link to="/register" className="hover:text-signal transition">Get started</Link></li>
                <li><Link to="/login" className="hover:text-signal transition">Sign in</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="eyebrow !text-ink/40 dark:!text-paper/35 !text-[11px] mb-3.5">All 6 categories</h4>
              <ul className="space-y-2.5 text-sm text-ink/55 dark:text-paper/45">
                {CATEGORIES.map((c) => (
                  <li key={c.code}>{c.name}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="eyebrow !text-ink/40 dark:!text-paper/35 !text-[11px] mb-3.5">For teams</h4>
              <ul className="space-y-2.5 text-sm text-ink/55 dark:text-paper/45">
                <li>Policy configuration</li>
                <li>Appeals queue</li>
                <li>Analytics dashboard</li>
                <li>Manual overrides</li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink/35 dark:text-paper/30">
            <span>© {new Date().getFullYear()} ModeraAI. Built for transparent, appealable content moderation.</span>
            <span className="font-mono">v2.0 · all verdicts logged</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
