'use client';

import Link from 'next/link';
import Image from 'next/image';
import { NeonButton } from '@/components/cyber/NeonButton';
import { shortAddress } from '@/utils/chain';
import { useStellarWallet } from '@/components/provider/StellarProvider';
import { Horizon } from '@stellar/stellar-sdk';
import { useEffect, useState } from 'react';

const HORIZON_URL = process.env.NEXT_PUBLIC_HORIZON_URL ?? 'https://horizon-testnet.stellar.org';

export default function RetroHeader() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-bg/95 backdrop-blur">
            <div className="flex items-center gap-8 h-20 w-full max-w-[1920px] mx-auto">
                <Link href="/" className="flex items-center">
                    <Image src="/logo.png" alt="ZKADE" width={200} height={60} className="object-contain" />
                </Link>

                <div className="w-px h-6 bg-border" />

                <nav className="hidden md:flex items-center gap-1">
                    <NavLink href="/" icon="◈">GAMES</NavLink>
                    <NavLink href="/leaderboard" icon="◆">LEADERBOARD</NavLink>
                </nav>

                <div className="ml-auto">
                    <WalletButton />
                </div>
            </div>
        </header>
    );
}

function NavLink({ href, icon, children }: { href: string; icon?: string; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className="group flex items-center gap-1.5 font-mono font-bold text-xs text-muted hover:text-primary transition-colors tracking-widest px-3 py-1.5 border border-transparent hover:border-border hover:bg-border/10"
            style={{ ['--hover-shadow' as any]: '0 0 8px #00FFFF40' }}
        >
            {icon && <span className="text-border group-hover:text-primary transition-colors">{icon}</span>}
            {children}
        </Link>
    );
}

function WalletButton() {
    const { address, isConnected, connect, disconnect } = useStellarWallet();
    const [balance, setBalance] = useState<string | null>(null);

    useEffect(() => {
        if (!address) { setBalance(null); return; }
        let cancelled = false;
        async function fetchBalance() {
            try {
                const server = new Horizon.Server(HORIZON_URL);
                const account = await server.loadAccount(address!);
                const native = account.balances.find((b) => b.asset_type === 'native');
                if (!cancelled) setBalance(native ? Number(native.balance).toFixed(2) : '0.00');
            } catch { if (!cancelled) setBalance(null); }
        }
        fetchBalance();
        const id = setInterval(fetchBalance, 10000);
        return () => { cancelled = true; clearInterval(id); };
    }, [address]);

    if (isConnected && address) {
        return (
            <button
                onClick={disconnect}
                className="flex items-center gap-2 font-mono text-xs text-accent border border-accent px-3 py-1.5 hover:bg-accent/10 transition-all tracking-wider"
                title="Click to disconnect"
            >
                <span className="w-2 h-2 bg-accent rounded-full blink" />
                {shortAddress(address)}
                {balance !== null && (
                    <>
                        <span className="w-px h-3 bg-accent/30" />
                        <span className="text-accent/80">{balance} XLM</span>
                    </>
                )}
            </button>
        );
    }

    return (
        <NeonButton variant="primary" size="sm" onClick={connect}>
            CONNECT WALLET
        </NeonButton>
    );
}
