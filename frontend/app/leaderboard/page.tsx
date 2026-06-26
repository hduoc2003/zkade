'use client';

import { DECIMALS, GameAPI } from "@/api/gameAPI";
import { NeonPanel } from "@/components/cyber/NeonPanel";
import { useStellarWallet } from "@/components/provider/StellarProvider";
import { displayDenom, explorerAccount, shortAddress } from "@/utils/chain";
import useSWR from "swr";

const UNIT = 10 ** DECIMALS;
const DISPLAY = displayDenom();

interface Standing {
    address: string;
    wins: number;
    played: number;
    earned: number; // total XLM won across decided rooms
}

export default function LeaderboardPage() {
    const { address } = useStellarWallet();
    const { data: rooms } = useSWR("rooms", () => GameAPI.listRooms(), { refreshInterval: 5000 });

    // Tally standings from on-chain rooms: a room's pot (deposit × players) goes
    // to its winner; everyone who joined counts as having played.
    const byAddress = new Map<string, Standing>();
    const get = (addr: string) => {
        let s = byAddress.get(addr);
        if (!s) { s = { address: addr, wins: 0, played: 0, earned: 0 }; byAddress.set(addr, s); }
        return s;
    };
    for (const r of rooms ?? []) {
        for (const p of r.players) get(p).played += 1;
        if (r.winner) {
            const pot = (Number(r.deposit_price) / UNIT) * r.players.length;
            const w = get(r.winner);
            w.wins += 1;
            w.earned += pot;
        }
    }

    const standings = [...byAddress.values()].sort(
        (a, b) => b.earned - a.earned || b.wins - a.wins || b.played - a.played,
    );

    return (
        <div className="flex flex-col mt-6 gap-4 max-w-[1100px] mx-auto">
            <div className="flex items-end justify-between border-b border-border pb-3">
                <div>
                    <h1 className="font-mono text-xl text-primary text-neon-cyan tracking-widest">LEADERBOARD</h1>
                    <span className="font-mono text-sm text-muted">ranked by total winnings · live from chain</span>
                </div>
                <span className="font-mono text-xs text-muted tracking-wider">{standings.length} PLAYERS</span>
            </div>

            <NeonPanel accent="gold">
                {standings.length === 0 ? (
                    <span className="font-mono text-sm text-muted py-6 text-center">
                        No games played yet.
                    </span>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full font-mono text-sm">
                            <thead>
                                <tr className="text-muted text-xs tracking-widest border-b border-border">
                                    <th className="text-left py-2 pr-2 font-normal">#</th>
                                    <th className="text-left py-2 pr-2 font-normal">PLAYER</th>
                                    <th className="text-right py-2 px-2 font-normal">WON</th>
                                    <th className="text-right py-2 px-2 font-normal">PLAYED</th>
                                    <th className="text-right py-2 pl-2 font-normal">EARNED</th>
                                </tr>
                            </thead>
                            <tbody>
                                {standings.map((s, i) => {
                                    const isMe = !!address && s.address === address;
                                    return (
                                        <tr
                                            key={s.address}
                                            className={`border-b border-border/40 ${isMe ? 'bg-primary/10' : 'hover:bg-border/20'}`}
                                        >
                                            <td className="py-2 pr-2">
                                                <span className={`font-data text-base ${i === 0 ? 'text-warning' : i < 3 ? 'text-accent' : 'text-muted'}`}>
                                                    {i + 1}
                                                </span>
                                            </td>
                                            <td className="py-2 pr-2">
                                                <a
                                                    href={explorerAccount(s.address)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`hover:text-neon-cyan flex items-center gap-1.5 ${isMe ? 'text-primary' : 'text-text'}`}
                                                    title="View on stellar.expert"
                                                >
                                                    {shortAddress(s.address)}
                                                    {isMe && <span className="text-accent text-xs">[YOU]</span>}
                                                    <span className="text-[10px] text-muted">↗</span>
                                                </a>
                                            </td>
                                            <td className="py-2 px-2 text-right font-data text-base text-accent">{s.wins}</td>
                                            <td className="py-2 px-2 text-right font-data text-base text-muted">{s.played}</td>
                                            <td className="py-2 pl-2 text-right font-data text-base text-warning">
                                                {Number(s.earned.toFixed(4))} <span className="text-xs text-muted">{DISPLAY}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </NeonPanel>
        </div>
    );
}
