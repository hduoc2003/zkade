import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variantStyles: Record<Variant, string> = {
    primary:   'border-primary text-primary hover:bg-primary/10 hover:shadow-neon-cyan active:bg-primary/20',
    secondary: 'border-secondary text-secondary hover:bg-secondary/10 hover:shadow-neon-magenta active:bg-secondary/20',
    ghost:     'border-border text-muted hover:border-muted hover:text-text active:bg-border/30',
    danger:    'border-error text-error hover:bg-error/10 hover:shadow-neon-magenta active:bg-error/20',
};

const sizeStyles: Record<Size, string> = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
};

type NeonButtonProps = {
    variant?: Variant;
    size?: Size;
    disabled?: boolean;
    onClick?: () => void;
    children: React.ReactNode;
    className?: string;
};

export function NeonButton({ variant = 'primary', size = 'md', disabled, onClick, children, className = '' }: NeonButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                border font-mono tracking-widest uppercase transition-all duration-150
                ${variantStyles[variant]}
                ${sizeStyles[size]}
                ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}
                ${className}
            `}
        >
            {children}
        </button>
    );
}
