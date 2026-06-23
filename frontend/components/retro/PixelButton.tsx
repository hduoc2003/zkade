import React from 'react';

interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    children: React.ReactNode;
}

export function PixelButton({
    variant = 'primary',
    size = 'md',
    children,
    className = '',
    disabled,
    ...props
}: PixelButtonProps) {
    const base = 'font-pixel tracking-wider border-2 transition-all active:translate-y-0.5 active:translate-x-0.5 active:shadow-none cursor-pointer select-none';

    const variants = {
        primary: 'bg-primary text-bg border-primary shadow-pixel hover:brightness-110 disabled:opacity-40',
        secondary: 'bg-bg-elevated text-info border-info shadow-pixel-cyan hover:brightness-110 disabled:opacity-40',
        ghost: 'bg-transparent text-muted border-border shadow-pixel hover:text-text hover:border-muted disabled:opacity-40',
        danger: 'bg-bg-elevated text-secondary border-secondary shadow-pixel-magenta hover:brightness-110 disabled:opacity-40',
    };

    const sizes = {
        sm: 'text-[7px] px-3 py-1.5',
        md: 'text-[8px] px-4 py-2',
        lg: 'text-[9px] px-6 py-3',
    };

    return (
        <button
            disabled={disabled}
            className={`${base} ${variants[variant]} ${sizes[size]} ${disabled ? 'cursor-not-allowed' : ''} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
