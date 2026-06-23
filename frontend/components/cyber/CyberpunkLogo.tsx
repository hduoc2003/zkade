export function CyberpunkLogo() {
    return (
        <span className="select-none flex items-baseline gap-0 leading-none">
            <span
                className="font-mono font-bold tracking-widest text-xl text-primary"
                style={{ textShadow: '0 0 8px #00FFFF, 0 0 24px #00FFFF80, 0 0 48px #00FFFF40' }}
            >
                ZK
            </span>
            <span
                className="font-mono font-bold tracking-widest text-xl"
                style={{ color: '#FF006E', textShadow: '0 0 8px #FF006E, 0 0 24px #FF006E80, 0 0 48px #FF006E40' }}
            >
                ARCADE
            </span>
            <span
                className="font-mono font-bold text-sm ml-0.5 blink"
                style={{ color: '#00FF41', textShadow: '0 0 6px #00FF41' }}
            >
                █
            </span>
        </span>
    );
}
