import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

const SLIDES = [
  { light: 'bg-cleared-light', dark: 'dark:bg-[#2a4a38]', icon: '🏞️' },
  { light: 'bg-signal-light', dark: 'dark:bg-[#4a3528]', icon: '🎬' },
  { light: 'bg-paper-dim', dark: 'dark:bg-[#2f3830]', icon: '📷' },
  { light: 'bg-cleared-light', dark: 'dark:bg-[#2a4a38]', icon: '🖼️' },
  { light: 'bg-rose-100', dark: 'dark:bg-[#4a2830]', icon: '🎞️' },
  { light: 'bg-paper-dim', dark: 'dark:bg-[#2f3830]', icon: '📸' },
];

export default function StampHero() {
  const stampRef = useRef(null);
  const strokeRef = useRef(null);
  const filmRef = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.4 });

    // Film strip drifts in from the side
    tl.from(filmRef.current, { x: 40, opacity: 0, duration: 0.8, ease: 'power3.out' });

    // Stamp slams down like a rubber inspection stamp
    tl.fromTo(
      stampRef.current,
      { scale: 2.2, opacity: 0, rotate: -18 },
      { scale: 1, opacity: 1, rotate: -10, duration: 0.45, ease: 'back.in(3)' },
      0.6
    ).to(stampRef.current, { scale: 1.06, duration: 0.08 }).to(stampRef.current, { scale: 1, duration: 0.12 });

    // Stamp outline draws itself
    if (strokeRef.current) {
      const len = strokeRef.current.getTotalLength();
      gsap.set(strokeRef.current, { strokeDasharray: len, strokeDashoffset: len });
      tl.to(strokeRef.current, { strokeDashoffset: 0, duration: 0.6, ease: 'power2.out' }, 0.65);
    }

    return () => tl.kill();
  }, []);

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div
        ref={filmRef}
        className="relative bg-ink dark:bg-[#1a2118] rounded-2xl p-3 shadow-card dark:shadow-card-dark rotate-1 border border-ink/10 dark:border-paper/15"
      >
        <div className="grid grid-cols-3 gap-2">
          {SLIDES.map((s, i) => (
            <div
              key={i}
              className={`aspect-[3/4] rounded-lg ${s.light} ${s.dark} flex items-center justify-center text-2xl border-2 border-dashed border-white/30 dark:border-paper/35 shadow-inner`}
            >
              {s.icon}
            </div>
          ))}
        </div>
        <div className="absolute -left-1.5 top-3 bottom-3 w-3 flex flex-col justify-between">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-full bg-paper dark:bg-dusk border border-mist dark:border-dusk-line" />
          ))}
        </div>
        <div className="absolute -right-1.5 top-3 bottom-3 w-3 flex flex-col justify-between">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-full bg-paper dark:bg-dusk border border-mist dark:border-dusk-line" />
          ))}
        </div>
      </div>

      {/* The verdict stamp */}
      <div
        ref={stampRef}
        className="absolute -bottom-6 -right-6 sm:-right-10 w-32 h-32 sm:w-36 sm:h-36"
        style={{ transform: 'rotate(-10deg)' }}
      >
        <svg viewBox="0 0 140 140" className="w-full h-full">
          <circle cx="70" cy="70" r="62" fill="none" stroke="currentColor" strokeWidth="3" className="text-signal" opacity="0.15" />
          <circle ref={strokeRef} cx="70" cy="70" r="62" fill="none" stroke="currentColor" strokeWidth="3" className="text-signal" />
          <text x="70" y="64" textAnchor="middle" className="fill-signal font-display font-bold" style={{ fontSize: 17 }}>
            VERDICT
          </text>
          <text x="70" y="84" textAnchor="middle" className="fill-signal font-display font-bold" style={{ fontSize: 13 }}>
            LOGGED
          </text>
        </svg>
      </div>
    </div>
  );
}
