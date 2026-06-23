import React, { useState } from 'react';

type ModeProps = {
  mode: 'mistakes' | 'fast';
  onClickMode: () => void;
};

const config = {
  mistakes: { label: 'MISTAKES', icon: '⚠', activeColor: '#FF006E', activeCls: 'border-secondary text-secondary' },
  fast:     { label: 'FAST MODE', icon: '⚡', activeColor: '#00FF41', activeCls: 'border-accent text-accent' },
};

export const Mode = ({ mode, onClickMode }: ModeProps) => {
  const [on, setOn] = useState(false);
  const { label, icon, activeColor, activeCls } = config[mode];

  function handleToggle() {
    setOn(p => !p);
    onClickMode();
  }

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-2.5 px-3 py-2 border w-full transition-all duration-200 ${
        on ? `${activeCls} bg-transparent` : 'border-border text-muted hover:border-border/80 hover:text-text'
      }`}
      style={on ? { boxShadow: `0 0 8px ${activeColor}40` } : undefined}
    >
      {/* Toggle track */}
      <div className={`relative w-9 h-5 border flex-shrink-0 transition-all ${on ? `border-current` : 'border-border'}`}>
        <div
          className="absolute top-0.5 w-3.5 h-3.5 transition-all duration-200"
          style={{
            left: on ? 'calc(100% - 1rem)' : '2px',
            background: on ? activeColor : '#606080',
            boxShadow: on ? `0 0 6px ${activeColor}` : 'none',
          }}
        />
      </div>
      <span className="font-mono text-[10px] tracking-widest">{icon} {label}</span>
    </button>
  );
};
