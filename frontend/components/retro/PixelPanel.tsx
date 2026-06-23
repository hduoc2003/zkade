import React from 'react';

interface PixelPanelProps {
    children: React.ReactNode;
    className?: string;
    accent?: 'yellow' | 'cyan' | 'green' | 'magenta' | 'none';
    title?: string;
}

export function PixelPanel({ children, className = '', accent = 'none', title }: PixelPanelProps) {
    const borderColors = {
        yellow: 'border-primary',
        cyan: 'border-info',
        green: 'border-accent',
        magenta: 'border-secondary',
        none: 'border-border',
    };
    return (
        <div className={`bg-bg-elevated border-2 ${borderColors[accent]} p-4 shadow-pixel ${className}`}>
            {title && (
                <div className={`font-pixel text-[8px] mb-3 pb-2 border-b-2 ${borderColors[accent]} tracking-wider ${accent !== 'none' ? `text-${accent === 'yellow' ? 'primary' : accent === 'cyan' ? 'info' : accent === 'green' ? 'accent' : 'secondary'}` : 'text-muted'}`}>
                    {title}
                </div>
            )}
            {children}
        </div>
    );
}
