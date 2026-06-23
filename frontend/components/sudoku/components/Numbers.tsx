import React from 'react';
import { useSudokuContext } from '../context/SudokuContext';

type NumbersProps = {
  onClickNumber: (number: string) => void;
};

const RING_R = 20;
const RING_C = 2 * Math.PI * RING_R;

export const Numbers = ({ onClickNumber }: NumbersProps) => {
  const { numberSelected, gameArray } = useSudokuContext();

  function countPlaced(n: number) {
    return gameArray.filter(v => v === String(n)).length;
  }

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
        const selected  = numberSelected === String(n);
        const placed    = countPlaced(n);
        const exhausted = placed >= 9;
        const pct       = placed / 9;
        const dash      = RING_C * pct;
        const ringColor = exhausted ? '#00FF41' : selected ? '#00FFFF' : '#1A1A2E';
        const ringGlow  = exhausted ? '0 0 6px #00FF41' : selected ? '0 0 6px #00FFFF' : 'none';

        return (
          <button
            key={n}
            onClick={() => !exhausted && onClickNumber(String(n))}
            disabled={exhausted}
            className={`relative h-14 w-full border font-data text-3xl transition-all duration-150 overflow-hidden ${
              exhausted
                ? 'border-accent/60 text-accent/60 cursor-not-allowed bg-bg'
                : selected
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border/70 bg-bg text-text hover:border-primary/60 hover:text-primary/80 hover:bg-primary/5'
            }`}
            style={selected && !exhausted ? {
              boxShadow: '0 0 8px #00FFFF80, 0 0 20px #00FFFF40',
            } : exhausted ? {
              boxShadow: '0 0 6px #00FF4140',
            } : undefined}
          >
            {/* SVG ring progress indicator in corner */}
            <svg
              className="absolute top-0.5 right-0.5"
              width="16" height="16"
              viewBox="0 0 48 48"
              style={{ opacity: placed > 0 ? 1 : 0.3 }}
            >
              <circle cx="24" cy="24" r={RING_R} fill="none" stroke="#1A1A2E" strokeWidth="6" />
              <circle
                cx="24" cy="24" r={RING_R}
                fill="none"
                stroke={ringColor}
                strokeWidth="6"
                strokeDasharray={`${dash} ${RING_C}`}
                strokeLinecap="butt"
                transform="rotate(-90 24 24)"
                style={{ filter: `drop-shadow(${ringGlow})`, transition: 'stroke-dasharray 0.4s ease' }}
              />
            </svg>

            {exhausted ? (
              <span className="text-neon-green" style={{ textShadow: '0 0 8px #00FF41' }}>{n}</span>
            ) : (
              <span>{n}</span>
            )}

            {/* remaining count */}
            {!exhausted && (
              <span className={`absolute bottom-0.5 left-1.5 font-mono text-[8px] leading-none ${selected ? 'text-primary/70' : 'text-muted/60'}`}>
                {9 - placed}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
