import React from 'react';

type NeonPanelAccent = 'cyan' | 'magenta' | 'green' | 'purple' | 'gold' | 'none';

// Colored borders carry the neon identity; the ambient box-shadow glow is left
// to the hero alone, so panels stay quiet and the page has a single focal point.
const accentStyles: Record<NeonPanelAccent, { border: string; title: string }> = {
    cyan:    { border: 'border-primary',   title: 'text-primary' },
    magenta: { border: 'border-secondary', title: 'text-secondary' },
    green:   { border: 'border-accent',    title: 'text-accent' },
    purple:  { border: 'border-info',      title: 'text-info' },
    gold:    { border: 'border-warning',   title: 'text-warning' },
    none:    { border: 'border-border',    title: 'text-muted' },
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
        <div className={`border ${s.border} bg-bg-panel flex flex-col ${className}`}>
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
