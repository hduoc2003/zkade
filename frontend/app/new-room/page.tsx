'use client';

import { DECIMALS, GameAPI, roomStatus } from "@/api/gameAPI";
import { NeonButton } from "@/components/cyber/NeonButton";
import { NeonPanel } from "@/components/cyber/NeonPanel";
import { RoomStatus } from "@/types/room";
import { displayDenom, shortAddress } from "@/utils/chain";
import { useStellarWallet } from "@/components/provider/StellarProvider";
import { isUndefined } from "lodash";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import useSWR from "swr";

const DENOM = process.env.NEXT_PUBLIC_DENOM ?? 'min';
const DISPLAY = displayDenom(DENOM);
const SUDOKU_CONTRACT = process.env.NEXT_PUBLIC_SUDOKU_CONTRACT ?? '';
const UNIT = 10 ** DECIMALS;

// Sudoku is the only deployed game.
const allGames = [
    {
        name: "Sudoku",
        slug: "sudoku",
        icon: "/sudoku-preview.png",
        contractAddress: SUDOKU_CONTRACT,
        splashImg: "/sudoku-preview.png",
    },
];

export default function NewRoomPage() {
    const { data: serviceFee } = useSWR("service-fee", GameAPI.getServiceFee);
    const { data: rawRooms } = useSWR("rooms", () => GameAPI.listRooms(), { refreshInterval: 5000 });
    const router = useRouter();
    const { address, signTransaction } = useStellarWallet();

    // Real on-chain pool stats for the selected game (all rooms are Sudoku).
    const pools = (rawRooms ?? []).map((r) => (Number(r.deposit_price) / UNIT) * r.players.length);
    const gameStats = {
        totalPrizePool: pools.reduce((a, b) => a + b, 0),
        largestPrizePool: pools.length ? Math.max(...pools) : 0,
        playingRooms: (rawRooms ?? []).filter((r) => roomStatus(r) === RoomStatus.Playing).length,
    };

    const [depositPrice, setDepositPrice] = useState(0);
    const [maxPlayers, setMaxPlayers] = useState(1);
    const [difficulty, setDifficulty] = useState('Easy');
    const [selectedGame, setSelectedGame] = useState(0);
    const [creatingRoom, setCreatingRoom] = useState(false);
    const [joiningRoom, setJoiningRoom] = useState(false);

    const game = allGames[selectedGame];
    const total = depositPrice + (serviceFee ?? 0);
    const busy = creatingRoom || joiningRoom;

    return (
        <div className="flex flex-col mt-6 gap-4 max-w-[1920px] mx-auto">
            <div className="flex items-center gap-3 border-b border-border pb-3">
                <button onClick={() => router.back()} className="font-mono text-xs text-muted hover:text-primary transition-colors tracking-widest">
                    ◀ BACK
                </button>
                <h1 className="font-mono text-base text-primary text-neon-cyan tracking-widest">SETUP ROOM</h1>
            </div>

            <div className="flex flex-col lg:flex-row gap-4">
                {/* Left — settings + summary */}
                <div className="flex flex-col gap-4 flex-1">
                    <NeonPanel title="ROOM SETTINGS" accent="cyan">
                        <div className="flex flex-col gap-4">
                            <label className="flex flex-col gap-1">
                                <span className="font-mono text-xs text-muted tracking-wider">DEPOSIT PRICE</span>
                                <div className="flex items-center border border-border bg-bg">
                                    <input
                                        type="number"
                                        min={0}
                                        placeholder="0"
                                        className="flex-1 bg-transparent px-3 py-2 font-data text-lg text-primary focus:outline-none focus:border-primary"
                                        onChange={(e) => setDepositPrice(parseFloat(e.target.value) || 0)}
                                    />
                                    <span className="px-3 font-mono text-xs text-muted uppercase border-l border-border py-2">{DISPLAY}</span>
                                </div>
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="font-mono text-xs text-muted tracking-wider">MAX PLAYERS</span>
                                <input
                                    type="number"
                                    min={1}
                                    value={maxPlayers}
                                    className="border border-border bg-bg px-3 py-2 font-data text-lg text-primary focus:outline-none focus:border-primary w-full"
                                    onChange={(e) => setMaxPlayers(Math.max(1, parseInt(e.target.value) || 1))}
                                />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="font-mono text-xs text-muted tracking-wider">DIFFICULTY</span>
                                <select
                                    className="border border-border bg-bg px-3 py-2 font-mono text-sm text-text focus:outline-none focus:border-primary"
                                    value={difficulty}
                                    onChange={(e) => setDifficulty(e.target.value)}
                                >
                                    {['Easy', 'Medium', 'Hard'].map((d) => (
                                        <option key={d} value={d} className="bg-bg-panel">{d.toUpperCase()}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    </NeonPanel>

                    {/* Summary */}
                    <NeonPanel title="MISSION BRIEF" accent="gold">
                        <div className="flex flex-col gap-2 border-b border-dashed border-border pb-3 mb-2">
                            <TicketRow label="GAME">{game.name.toUpperCase()}</TicketRow>
                            <TicketRow label="DIFF">{difficulty.toUpperCase()}</TicketRow>
                            <TicketRow label="DEPOSIT">{depositPrice} <span className="text-xs">{DISPLAY}</span></TicketRow>
                            <TicketRow label="PLAYERS">{maxPlayers}P</TicketRow>
                            <TicketRow label="PRIZE POOL">
                                <span className="text-warning" style={{ textShadow: '0 0 8px #FFD70080' }}>
                                    {depositPrice * maxPlayers}
                                </span>{' '}
                                <span className="text-xs">{DISPLAY}</span>
                            </TicketRow>
                            <TicketRow label="SERVICE FEE">{serviceFee ?? '…'} <span className="text-xs">{DISPLAY}</span></TicketRow>
                        </div>
                        <TicketRow label="TOTAL" highlight>{total} {DISPLAY}</TicketRow>

                        <NeonButton
                            variant="primary"
                            size="lg"
                            className="w-full mt-3"
                            disabled={depositPrice === 0 || maxPlayers < 1 || busy}
                            onClick={handleConfirm}
                        >
                            {creatingRoom ? 'CREATING…' : joiningRoom ? 'JOINING…' : 'CONFIRM & JOIN'}
                        </NeonButton>
                    </NeonPanel>
                </div>

                {/* Right — game selector */}
                <NeonPanel title="SELECT GAME" accent="green" className="flex-1 flex flex-col gap-4">
                    <div className="flex flex-wrap gap-3">
                        {allGames.map((g, i) => (
                            <button
                                key={g.name}
                                onClick={() => setSelectedGame(i)}
                                className={`border overflow-hidden w-24 h-24 transition-all duration-200 ${
                                    selectedGame === i
                                        ? 'border-accent shadow-neon-green'
                                        : 'border-border hover:border-muted'
                                }`}
                            >
                                <Image src={g.icon} alt={g.name} width={96} height={96} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                            </button>
                        ))}
                    </div>

                    <div className="font-mono text-sm text-text tracking-wider">{game.name.toUpperCase()}</div>

                    <div className="flex gap-4">
                        <div className="w-36 h-28 overflow-hidden border border-border shrink-0">
                            <Image src={game.splashImg} alt="" width={144} height={112} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <StatRow label="CONTRACT">
                                <span
                                    className="text-muted cursor-pointer hover:text-primary transition-colors"
                                    onClick={() => navigator.clipboard.writeText(game.contractAddress)}
                                    title="Click to copy"
                                >
                                    {shortAddress(game.contractAddress)}
                                </span>
                            </StatRow>
                            <StatRow label="TOTAL POOL">
                                <span className="text-warning">{gameStats.totalPrizePool.toLocaleString()} {DISPLAY}</span>
                            </StatRow>
                            <StatRow label="LARGEST">
                                <span className="text-warning">{gameStats.largestPrizePool.toLocaleString()} {DISPLAY}</span>
                            </StatRow>
                            <StatRow label="ACTIVE">
                                <span className="text-accent">{gameStats.playingRooms} ROOMS</span>
                            </StatRow>
                        </div>
                    </div>
                </NeonPanel>
            </div>
        </div>
    );

    async function handleConfirm() {
        if (isUndefined(serviceFee)) { toast.error("Service fee unavailable"); return; }
        if (!address) { toast.error("Please connect your wallet first"); return; }
        try {
            // Owner (server) creates the room, then the creator joins it (deposit).
            setCreatingRoom(true);
            const { room_id } = await GameAPI.createNewRoom(depositPrice, address, maxPlayers);
            setCreatingRoom(false);

            setJoiningRoom(true);
            await GameAPI.joinRoom(address, signTransaction, room_id);
            setJoiningRoom(false);

            router.push(`/games/sudoku/${room_id}`);
        } catch (error) {
            setCreatingRoom(false);
            setJoiningRoom(false);
            console.error(error); toast.error(error instanceof Error ? error.message : 'Unknown error');
        }
    }
}

function TicketRow({ label, children, highlight }: { label: string; children: React.ReactNode; highlight?: boolean }) {
    return (
        <div className="flex items-center">
            <span className={`font-mono text-xs tracking-widest flex-1 ${highlight ? 'text-warning' : 'text-muted'}`}>{label}</span>
            <span className={`font-data text-lg ${highlight ? 'text-warning' : 'text-text'}`}>{children}</span>
        </div>
    );
}

function StatRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted tracking-wider w-20 shrink-0">{label}:</span>
            <span className="font-mono text-xs">{children}</span>
        </div>
    );
}
