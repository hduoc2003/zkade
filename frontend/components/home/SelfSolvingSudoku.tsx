'use client';

import { useEffect, useRef, useState } from 'react';

// A fixed valid solution + a scattered "givens" mask. The non-given cells fill
// in one-by-one on a loop, so the hero shows a puzzle solving itself — the one
// thing this product is actually about.
const SOLUTION = [
  1, 2, 3, 4, 5, 6, 7, 8, 9,
  4, 5, 6, 7, 8, 9, 1, 2, 3,
  7, 8, 9, 1, 2, 3, 4, 5, 6,
  2, 3, 4, 5, 6, 7, 8, 9, 1,
  5, 6, 7, 8, 9, 1, 2, 3, 4,
  8, 9, 1, 2, 3, 4, 5, 6, 7,
  3, 4, 5, 6, 7, 8, 9, 1, 2,
  6, 7, 8, 9, 1, 2, 3, 4, 5,
  9, 1, 2, 3, 4, 5, 6, 7, 8,
];
const GIVEN = new Set([
  0, 3, 7, 10, 14, 17, 19, 22, 26, 28, 31, 34, 39, 41,
  46, 49, 52, 54, 58, 61, 63, 66, 70, 74, 77, 80,
]);
const ORDER = Array.from({ length: 81 }, (_, i) => i).filter((i) => !GIVEN.has(i));
const HOLD = 16; // ticks to linger on the solved board before restarting

export function SelfSolvingSudoku() {
  const [step, setStep] = useState(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduced.current) { setStep(ORDER.length); return; }
    let s = 0;
    const id = setInterval(() => {
      s += 1;
      if (s > ORDER.length + HOLD) s = 0;
      setStep(Math.min(s, ORDER.length));
    }, 110);
    return () => clearInterval(id);
  }, []);

  const revealed = new Set(ORDER.slice(0, step));
  const lastIdx = step > 0 && step <= ORDER.length ? ORDER[step - 1] : -1;
  const solved = step >= ORDER.length;

  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <div
        className="grid grid-cols-9 gap-px bg-border border border-primary/60 p-px"
        style={{ boxShadow: '0 0 24px #00FFFF55' }}
      >
        {SOLUTION.map((v, i) => {
          const isGiven = GIVEN.has(i);
          const shown = isGiven || revealed.has(i);
          const isLast = i === lastIdx;
          return (
            <div
              key={i}
              className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-bg font-data text-xs sm:text-sm"
              style={{
                color: isLast ? '#0A0E0E' : isGiven ? '#BEC8C8' : '#3DFFB9',
                background: isLast ? '#3DFFB9' : undefined,
                textShadow: !isGiven && shown && !isLast ? '0 0 6px #3DFFB9' : undefined,
                transition: 'color .15s, background .15s',
              }}
            >
              {shown ? v : ''}
            </div>
          );
        })}
      </div>
      <span
        className="font-mono text-[10px] tracking-[0.3em]"
        style={{ color: solved ? '#3DFFB9' : '#11DAF4' }}
      >
        {solved ? '✓ SOLVED' : '▸ SOLVING…'}
      </span>
    </div>
  );
}
