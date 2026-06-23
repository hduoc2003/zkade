import React from 'react';

type NeonPanelAccent = 'cyan' | 'magenta' | 'green' | 'purple' | 'gold' | 'none';

const accentStyles: Record<NeonPanelAccent, { border: string; shadow: string; title: string }> = {
    cyan:    { border: 'border-primary',   shadow: 'shadow-neon-cyan',    title: 'text-primary' },
    magenta: { border: 'border-secondary', shadow: 'shadow-neon-magenta', title: 'text-secondary' },
    green:   { border: 'border-accent',    shadow: 'shadow-neon-green',   title: 'text-accent' },
    purple:  { border: 'border-info',      shadow: 'shadow-neon-purple',  title: 'text-info' },
    gold:    { border: 'border-warning',   shadow: 'shadow-neon-gold',    title: 'text-warning' },
    none:    { border: 'border-border',    shadow: '',                    title: 'text-muted' },
};

type NeonPanelProps = {
    accent?: NeonPanelAccent;
    title?: string;
    children: React.ReactNode;
    className?: string;
};

export function NeonPanel({ accent = 'none', title, children, className = '' }: NeonPanelProps) {
    const s = accentStyles[accent];
    return (
        <div className={`border ${s.border} ${s.shadow} bg-bg-panel flex flex-col ${className}`}>
            {title && (
                <div className={`border-b ${s.border} px-3 py-1.5 text-xs tracking-widest uppercase ${s.title} font-mono`}>
                    ▸ {title}
                </div>
            )}
            <div className="p-3 flex flex-col gap-2">
                {children}
            </div>
        </div>
    );
}
