import React, { useState, useEffect } from 'react';
import { useSudokuContext } from '../context/SudokuContext';
import moment from 'moment';

export const Timer = () => {
  const [currentTime, setCurrentTime] = useState(moment());
  const { timeGameStarted, won } = useSudokuContext();

  useEffect(() => {
    if (!won) {
      const id = setTimeout(() => setCurrentTime(moment()), 1000);
      return () => clearTimeout(id);
    }
  });

  function getTimer() {
    const secs = Math.max(0, currentTime.diff(timeGameStarted, 'seconds'));
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  const digits = getTimer();

  return (
    <div className="border border-border bg-bg-panel px-3 py-2 flex flex-col items-center gap-0.5">
      <span className="font-mono text-[9px] text-muted tracking-[0.2em] uppercase">Time</span>
      <div className="flex items-center gap-0.5">
        {digits.split('').map((ch, i) => (
          <span
            key={i}
            className={
              ch === ':'
                ? 'font-data text-2xl text-accent/60 leading-none blink mx-0.5'
                : 'font-data text-2xl text-accent leading-none'
            }
            style={ch !== ':' ? { textShadow: '0 0 10px #00FF41, 0 0 20px #00FF4160' } : undefined}
          >
            {ch}
          </span>
        ))}
      </div>
    </div>
  );
};
