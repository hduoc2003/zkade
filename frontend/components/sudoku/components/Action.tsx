import React from 'react';

type ActionProps = {
  action: 'undo' | 'erase' | 'hint';
  onClickAction: () => void;
};

const config: Record<string, { icon: string; label: string; color: string; hoverGlow: string }> = {
  undo:  { icon: '⟲', label: 'UNDO',  color: 'hover:border-primary hover:text-primary',   hoverGlow: '0 0 8px #00FFFF60' },
  erase: { icon: '⌫', label: 'ERASE', color: 'hover:border-secondary hover:text-secondary', hoverGlow: '0 0 8px #FF006E60' },
  hint:  { icon: '◈', label: 'HINT',  color: 'hover:border-warning hover:text-warning',    hoverGlow: '0 0 8px #FFD70060' },
};

export const Action = ({ action, onClickAction }: ActionProps) => {
  const { icon, label, color, hoverGlow } = config[action];
  return (
    <button
      onClick={onClickAction}
      className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 border border-border bg-bg text-muted transition-all duration-150 group ${color}`}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = hoverGlow; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = ''; }}
    >
      <span className="text-xl leading-none">{icon}</span>
      <span className="font-mono text-[9px] tracking-widest">{label}</span>
    </button>
  );
};
