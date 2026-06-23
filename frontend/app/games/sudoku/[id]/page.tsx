'use client';

import { SudokuProvider } from "@/components/sudoku/context/SudokuContext";
import { SudokuGame } from "@/components/sudoku/Game";
import { useStellarWallet } from "@/components/provider/StellarProvider";
import { displayDenom, shortAddress } from "@/utils/chain";
import { use, useState } from "react";
import useSWR from "swr";
import { toast } from "react-toastify";
import { GameAPI } from "@/api/gameAPI";
import { NeonPanel } from "@/components/cyber/NeonPanel";
import { NeonButton } from "@/components/cyber/NeonButton";
import Image from "next/image";

const DISPLAY = displayDenom();
const SUDOKU_CONTRACT = process.env.NEXT_PUBLIC_SUDOKU_CONTRACT ?? '';
const DECIMALS = 7;
const UNIT = 10 ** DECIMALS;


export default function SudokuGamePage({ params }: { params: Promise<{ id: string }> }) {
    const { id: room_id } = use(params);
    const { address, signTransaction } = useStellarWallet();

    const [currentPage, setCurrentPage] = useState('game');
    const { data: roomInfo, mutate: refreshRoom } = useSWR(
        `room-${room_id}`,
        () => GameAPI.queryRoom(parseInt(room_id)),
        { refreshInterval: 1000, refreshWhenHidden: true, refreshWhenOffline: true }
    );
    const [txHashes, setTxHashes] = useState<{ description: string; txHash: string }[]>(() => {
        if (typeof window === 'undefined') return [];
        return [
            { description: "Create Room", txHash: localStorage.getItem("createRoomTxHash") || "" },
            { description: "Join Room", txHash: localStorage.getItem("joinRoomHash") || "" },
        ].filter(t => t.txHash);
    });
    const [gameStarted, setGameStarted] = useState(false);
    const [waitForStartingGame, setWaitForStartingGame] = useState(false);

    const players = roomInfo?.players ?? [];
    const depositPrice = roomInfo ? Number(roomInfo.deposit_price) / UNIT : 0;
    const serviceFee = roomInfo ? Number(roomInfo.service_fee) / UNIT : 0;
    const prizePool = Number((depositPrice * players.length).toFixed(6));
    const gameIsStarted = !!roomInfo?.initial_state;
    const iAmWinner = !!address && address === roomInfo?.winner;
    // winner (not yet claimed) keeps seeing the game to finish prove + claim flow
    const gameIsFinished = !!roomInfo?.winner && (roomInfo?.claimed || !iAmWinner);
    const maxPlayers = roomInfo?.max_players ?? 0;
    const isFull = maxPlayers > 0 && players.length >= maxPlayers;
    const isOwner = !!address && address === roomInfo?.creator;
    const isPlayer = !!address && players.includes(address ?? '');
    const tabs = ['game', 'rank'] as const;

    return (
        <main className="flex flex-col mt-6 gap-4 max-w-[1920px] mx-auto">
            {/* Page header */}
            <div className="flex items-center gap-3 border-b border-border pb-3">
                <Image
                    src="https://brainium.com/wp-content/uploads/2021/11/sudoku-Mobile-hero-asset@2x.png"
                    alt=""
                    width={28}
                    height={28}
                />
                <h1 className="font-mono text-xl text-primary text-neon-cyan tracking-widest">
                    SUDOKU <span className="text-accent">#{room_id}</span>
                </h1>
                <span
                    className="font-mono text-xs text-muted ml-auto cursor-pointer hover:text-primary transition-colors break-all"
                    onClick={() => navigator.clipboard.writeText(SUDOKU_CONTRACT)}
                    title="Click to copy contract address"
                >
                    CONTRACT: {SUDOKU_CONTRACT}
                </span>
            </div>

            <div className="flex flex-col lg:flex-row gap-4">
                {/* Left sidebar */}
                <div className="flex flex-col gap-3 w-full lg:w-[480px] shrink-0">
                    <NeonPanel title="ROOM INFO" accent="cyan">
                        <div className="flex flex-col gap-1.5">
                            <InfoRow label="DEPOSIT">{depositPrice} {DISPLAY}</InfoRow>
                            <InfoRow label="POOL">{prizePool} {DISPLAY}</InfoRow>
                            <InfoRow label="PLAYERS">{players.length}/{roomInfo?.max_players ?? '?'}P</InfoRow>
                            {roomInfo?.winner && <InfoRow label="WINNER"><span className="text-accent cursor-pointer" onClick={() => navigator.clipboard.writeText(roomInfo.winner!)} title={`${roomInfo.winner} — click to copy`}>{shortAddress(roomInfo.winner)}</span></InfoRow>}
                        </div>
                        <button
                            onClick={() => {
                                const url = typeof window !== 'undefined' ? window.location.href : '';
                                navigator.clipboard.writeText(url);
                                toast.success('Invite link copied');
                            }}
                            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 border border-primary/60 text-primary font-mono text-[10px] tracking-[0.2em] hover:bg-primary/10 hover:border-primary transition-all"
                            style={{ boxShadow: '0 0 6px #00FFFF40' }}
                            title="Copy this room's invite link"
                        >
                            <span className="text-base leading-none">⎘</span>
                            COPY INVITE LINK
                        </button>
                    </NeonPanel>

                    <NeonPanel title={`PLAYERS (${players.length})`} accent="green">
                        {players.length === 0 ? (
                            <span className="font-mono text-xs text-muted">NO PLAYERS YET</span>
                        ) : (
                            players.map((addr) => {
                                const isMe = addr === address;
                                return (
                                    <div
                                        key={addr}
                                        className={`font-mono text-xs cursor-pointer transition-colors py-0.5 flex items-center gap-1.5 min-w-0 ${isMe ? 'text-primary' : 'text-muted hover:text-accent'}`}
                                        onClick={() => navigator.clipboard.writeText(addr)}
                                        title={addr}
                                    >
                                        <span className="truncate flex-1 min-w-0">{addr}</span>
                                        {isMe && <span className="text-accent shrink-0">[YOU]</span>}
                                    </div>
                                );
                            })
                        )}
                    </NeonPanel>

                    <NeonPanel title="TX LOG" accent="none">
                        {txHashes.length === 0 ? (
                            <span className="font-mono text-xs text-muted">NONE YET</span>
                        ) : (
                            txHashes.map(({ txHash, description }) => (
                                <div key={txHash} className="flex justify-between py-0.5">
                                    <span className="font-mono text-xs text-muted">{description.toUpperCase()}</span>
                                    <span
                                        className="font-mono text-xs text-primary cursor-pointer hover:text-neon-cyan"
                                        onClick={() => navigator.clipboard.writeText(txHash)}
                                        title="Click to copy"
                                    >
                                        {shortAddress(txHash, 4)}
                                    </span>
                                </div>
                            ))
                        )}
                    </NeonPanel>
                </div>

                {/* Right — game area */}
                <SudokuProvider>
                    <div className="flex flex-col gap-4 flex-1">
                        {/* Tabs */}
                        <div className="flex gap-0 border-b border-border">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setCurrentPage(tab)}
                                    className={`font-mono text-xs tracking-widest px-5 py-2 border-r border-border transition-colors ${
                                        currentPage === tab
                                            ? 'bg-primary/10 text-primary border-b border-primary'
                                            : 'text-muted hover:text-text hover:bg-border/20'
                                    }`}
                                >
                                    {tab.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {/* Game content */}
                        <div className="flex flex-col items-center justify-center flex-1 pt-6">
                            {gameIsFinished ? (
                                <GameOverScreen
                                    winner={roomInfo!.winner!}
                                    myAddress={address ?? undefined}
                                />
                            ) : (gameStarted || gameIsStarted) && (!roomInfo?.initial_state || roomInfo.initial_state.length === 0) ? (
                                <PuzzleLoadingScreen />
                            ) : gameStarted || gameIsStarted ? (
                                <SudokuGame
                                    room_id={parseInt(room_id)}
                                    initial_state={roomInfo?.initial_state ?? null}
                                    currentWinner={roomInfo?.winner ?? null}
                                    onVerifySuccess={(tx) => setTxHashes(prev => [...prev, { description: "Submit Solution", txHash: tx }])}
                                    onClaimSuccess={(tx) => setTxHashes(prev => [...prev, { description: "Claim Reward", txHash: tx }])}
                                />
                            ) : (
                                <WaitingScreen
                                    players={players.length}
                                    maxPlayers={maxPlayers}
                                    isFull={isFull}
                                    isOwner={isOwner}
                                    isPlayer={isPlayer}
                                    depositPrice={depositPrice}
                                    serviceFee={serviceFee}
                                    display={DISPLAY}
                                    loading={waitForStartingGame}
                                    onStart={handleStartGame}
                                    onJoin={handleJoinRoom}
                                />
                            )}
                        </div>

                        {/* ZK proof explainer */}
                        <ZkExplainer />
                    </div>
                </SudokuProvider>
            </div>
        </main>
    );

    async function handleStartGame() {
        if (!address) { toast.error("Please connect your wallet first"); return; }
        try {
            setWaitForStartingGame(true);
            await GameAPI.startGame(parseInt(room_id));
            await refreshRoom();
            setGameStarted(true);
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Unknown error");
        }
        setWaitForStartingGame(false);
    }

    async function handleJoinRoom() {
        if (!address) { toast.error("Please connect your wallet first"); return; }
        try {
            const txHash = await GameAPI.joinRoom(address, signTransaction, parseInt(room_id));
            setTxHashes(prev => [...prev, { description: "Join Room", txHash }]);
            await refreshRoom();
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Unknown error");
        }
    }
}

function PuzzleLoadingScreen() {
    return (
        <div className="flex flex-col items-center gap-6 py-16">
            <div className="relative">
                <div className="w-16 h-16 border-2 border-primary/20 rounded-full" />
                <div
                    className="absolute inset-0 w-16 h-16 border-2 border-transparent border-t-primary rounded-full animate-spin"
                    style={{ filter: 'drop-shadow(0 0 6px #00FFFF)' }}
                />
            </div>
            <div className="flex flex-col items-center gap-1">
                <span className="font-mono text-sm text-primary text-neon-cyan tracking-widest">
                    GENERATING PUZZLE…
                </span>
                <span className="font-mono text-[10px] text-muted tracking-wider">
                    waiting for server & on-chain confirmation
                </span>
            </div>
            <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                    <div
                        key={i}
                        className="w-2 h-2 bg-primary"
                        style={{ animation: `blink-caret 1s step-end ${i * 0.33}s infinite`, boxShadow: '0 0 4px #00FFFF' }}
                    />
                ))}
            </div>
        </div>
    );
}

function GameOverScreen({ winner, myAddress }: {
    winner: string; myAddress: string | undefined;
}) {
    const iWon = !!myAddress && winner === myAddress;
    return (
        <div className="flex flex-col items-center gap-6 py-16">
            <div
                className="border px-8 py-4 font-mono text-lg tracking-widest"
                style={iWon
                    ? { borderColor: '#00FF41', color: '#00FF41', boxShadow: '0 0 16px #00FF4160' }
                    : { borderColor: '#FF006E', color: '#FF006E', boxShadow: '0 0 16px #FF006E60' }
                }
            >
                {iWon ? '▶ YOU WIN ◀' : '▶ GAME OVER ◀'}
            </div>
        </div>
    );
}

function WaitingScreen({ players, maxPlayers, isFull, isOwner, isPlayer, depositPrice, serviceFee, display, loading, onStart, onJoin }: {
    players: number; maxPlayers: number; isFull: boolean;
    isOwner: boolean; isPlayer: boolean;
    depositPrice: number; serviceFee: number; display: string;
    loading: boolean; onStart: () => void; onJoin: () => void;
}) {
    const segmentCount = maxPlayers > 0 ? maxPlayers : 10;
    const filledSegments = Math.min(players, segmentCount);

    return (
        <div className="flex flex-col items-center gap-8 py-16">
            {/* Player slots */}
            <div className="flex flex-col items-center gap-3">
                <span className="font-mono text-xs text-muted tracking-widest">PLAYERS READY</span>
                <div className="flex gap-1">
                    {Array.from({ length: segmentCount }).map((_, i) => (
                        <div
                            key={i}
                            className={`w-5 h-8 border transition-all duration-300 ${
                                i < filledSegments
                                    ? 'bg-accent border-accent'
                                    : 'bg-bg border-border'
                            }`}
                            style={i < filledSegments ? { boxShadow: '0 0 6px #00FF41' } : undefined}
                        />
                    ))}
                </div>
                <span className="font-data text-xl text-primary text-neon-cyan">
                    {players}{maxPlayers > 0 ? `/${maxPlayers}` : ''} JOINED
                </span>
            </div>

            {/* Role-based action */}
            {isOwner ? (
                <div className="flex flex-col items-center gap-3">
                    <p className="font-mono text-xs text-muted tracking-widest text-center">
                        {isFull ? '▶ ROOM FULL — READY TO START' : '… WAITING FOR MORE PLAYERS'}
                    </p>
                    <NeonButton
                        variant="primary"
                        size="lg"
                        disabled={!isFull || loading}
                        onClick={onStart}
                    >
                        {loading ? 'INITIALIZING…' : 'START GAME ▶'}
                    </NeonButton>
                    {!isFull && (
                        <span className="font-mono text-[10px] text-muted">
                            Need {maxPlayers - players} more player{maxPlayers - players !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            ) : isPlayer ? (
                <div className="flex flex-col items-center gap-3">
                    <p className="font-mono text-xs text-muted tracking-widest text-center">
                        {isFull ? '▶ ROOM FULL — WAITING FOR OWNER TO START' : '… WAITING FOR MORE PLAYERS'}
                    </p>
                    <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                            <div
                                key={i}
                                className="w-2 h-2 bg-primary"
                                style={{ animation: `blink-caret 1s step-end ${i * 0.33}s infinite`, boxShadow: '0 0 4px #00FFFF' }}
                            />
                        ))}
                    </div>
                </div>
            ) : isFull ? (
                <div className="flex flex-col items-center gap-3">
                    <div
                        className="border border-secondary px-5 py-3 font-mono text-sm text-secondary tracking-widest"
                        style={{ boxShadow: '0 0 8px #FF006E40' }}
                    >
                        ROOM FULL
                    </div>
                    <p className="font-mono text-xs text-muted text-center">This room is no longer accepting players.</p>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-3">
                    <p className="font-mono text-xs text-muted tracking-widest text-center">
                        … WAITING FOR PLAYERS
                    </p>
                    {/* Fee breakdown */}
                    <div className="border border-border bg-bg-panel px-5 py-3 flex flex-col gap-1.5 w-56">
                        <div className="flex justify-between items-center">
                            <span className="font-mono text-[10px] text-muted tracking-wider">DEPOSIT</span>
                            <span className="font-data text-sm text-text">{depositPrice} {display}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-mono text-[10px] text-muted tracking-wider">SERVICE FEE</span>
                            <span className="font-data text-sm text-text">{serviceFee} {display}</span>
                        </div>
                        <div className="border-t border-border/50 mt-1 pt-1.5 flex justify-between items-center">
                            <span className="font-mono text-[10px] text-primary tracking-wider">TOTAL</span>
                            <span className="font-data text-sm text-primary" style={{ textShadow: '0 0 8px #00FFFF' }}>
                                {Number((depositPrice + serviceFee).toFixed(6))} {display}
                            </span>
                        </div>
                    </div>
                    <NeonButton variant="primary" size="lg" onClick={onJoin}>
                        JOIN ROOM ▶
                    </NeonButton>
                </div>
            )}
        </div>
    );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-xs text-muted tracking-wider shrink-0">{label}</span>
            <span className="font-data text-base text-text truncate min-w-0 ml-auto">{children}</span>
        </div>
    );
}

const ZK_STEPS = [
    {
        icon: '⊞',
        color: '#00FFFF',
        title: 'SOLVE PUZZLE',
        desc: 'Fill in the 9×9 Sudoku grid. Your solution stays local — never sent to any server.',
    },
    {
        icon: '⬡',
        color: '#7D00FF',
        title: 'GENERATE ZK PROOF',
        desc: 'The RISC Zero zkVM compiles your solution into a Groth16 proof (via Bonsai). Proves correctness without revealing the answer.',
    },
    {
        icon: '⬢',
        color: '#FF006E',
        title: 'SUBMIT ON-CHAIN',
        desc: 'The proof is sent to the Sudoku contract on Stellar, which verifies it via the RISC Zero verifier using native BN254 host functions.',
    },
    {
        icon: '◆',
        color: '#00FF41',
        title: 'CLAIM REWARD',
        desc: 'Proof accepted → you are the verified winner. Call ClaimReward to sweep the prize pool to your wallet.',
    },
];

function ZkExplainer() {
    return (
        <div className="w-full border-t border-border mt-8 pt-6">
            <div className="font-mono text-xs text-muted tracking-widest mb-4">
                ▶ HOW ZK PROOF WORKS
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {ZK_STEPS.map((step, i) => (
                    <div
                        key={step.title}
                        className="border border-border bg-bg-panel p-3 flex flex-col gap-2 relative"
                        style={{ borderColor: `${step.color}30` }}
                    >
                        <div className="flex items-center gap-2">
                            <span className="font-data text-xl" style={{ color: step.color, textShadow: `0 0 8px ${step.color}` }}>
                                {step.icon}
                            </span>
                            <span className="font-data text-xs text-muted">0{i + 1}</span>
                        </div>
                        <div className="font-mono text-xs tracking-widest" style={{ color: step.color }}>
                            {step.title}
                        </div>
                        <p className="font-mono text-xs text-muted leading-relaxed">
                            {step.desc}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
