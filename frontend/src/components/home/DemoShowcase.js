import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const DEMOS = [
  {
    title: 'Upload & AI screening',
    desc: 'Drop images and watch Groq + Gemini score every policy category in seconds.',
    poster: '/demos/demo-upload-moderation.png',
    tag: 'Step 1',
  },
  {
    title: 'Appeals with context',
    desc: 'Admins review appealed images side-by-side with the original verdict and user note.',
    poster: '/demos/demo-appeals-review.png',
    tag: 'Step 2',
  },
  {
    title: 'Analytics dashboard',
    desc: 'Track verdicts, violations, registrations, and category detections over any date range.',
    poster: '/demos/demo-analytics-dashboard.png',
    tag: 'Step 3',
  },
];

function DemoCard({ demo, active, onSelect }) {
  const imgRef = useRef(null);

  useEffect(() => {
    if (!active || !imgRef.current) return undefined;
    const tween = gsap.to(imgRef.current, {
      scale: 1.08,
      duration: 8,
      ease: 'none',
      yoyo: true,
      repeat: -1,
    });
    return () => tween.kill();
  }, [active]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left w-full rounded-xl2 overflow-hidden border-2 transition-all duration-300 ${
        active
          ? 'border-signal shadow-card dark:shadow-card-dark scale-[1.02]'
          : 'border-mist dark:border-dusk-line opacity-80 hover:opacity-100 hover:border-signal/40'
      }`}
    >
      <div className="relative aspect-video overflow-hidden bg-ink/5 dark:bg-black/30">
        <img
          ref={imgRef}
          src={demo.poster}
          alt={demo.title}
          className="w-full h-full object-cover origin-center"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent pointer-events-none" />
        <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-signal text-white">
          {demo.tag}
        </span>
        {active && (
          <span className="absolute top-3 right-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-white/90 dark:bg-dusk/90 text-signal">
            <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
            Playing
          </span>
        )}
      </div>
      <div className="p-4 sm:p-5 bg-white dark:bg-dusk-raised">
        <h3 className="font-display font-bold text-ink dark:text-paper mb-1">{demo.title}</h3>
        <p className="text-sm text-ink/50 dark:text-paper/45 leading-relaxed">{demo.desc}</p>
      </div>
    </button>
  );
}

export default function DemoShowcase() {
  const [active, setActive] = useState(0);
  const heroRef = useRef(null);

  useEffect(() => {
    if (!heroRef.current) return undefined;
    const tween = gsap.to(heroRef.current, {
      scale: 1.06,
      duration: 10,
      ease: 'none',
      yoyo: true,
      repeat: -1,
    });
    return () => tween.kill();
  }, [active]);

  const featured = DEMOS[active];

  return (
    <div className="grid lg:grid-cols-5 gap-6 lg:gap-8 items-start">
      <div className="lg:col-span-3 reveal">
        <div className="relative rounded-2xl overflow-hidden border border-mist dark:border-dusk-line shadow-card dark:shadow-card-dark aspect-video bg-ink/5 dark:bg-black/40">
          <img
            ref={heroRef}
            key={featured.poster}
            src={featured.poster}
            alt={featured.title}
            className="w-full h-full object-cover origin-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-ink/20 pointer-events-none" />
          <div className="absolute bottom-0 inset-x-0 p-5 sm:p-7">
            <span className="text-[10px] font-bold uppercase tracking-widest text-signal-light mb-2 block">
              Gemini-generated product preview
            </span>
            <h3 className="font-display font-bold text-xl sm:text-2xl text-white mb-2">{featured.title}</h3>
            <p className="text-sm text-white/75 max-w-lg leading-relaxed">{featured.desc}</p>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 flex flex-col gap-4">
        {DEMOS.map((demo, i) => (
          <DemoCard key={demo.title} demo={demo} active={i === active} onSelect={() => setActive(i)} />
        ))}
      </div>
    </div>
  );
}
