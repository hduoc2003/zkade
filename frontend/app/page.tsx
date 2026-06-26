'use client';

import { ArcadeRoomCard } from "@/components/home/ArcadeRoomCard";
import { SelfSolvingSudoku } from "@/components/home/SelfSolvingSudoku";
import { NeonButton } from "@/components/cyber/NeonButton";
import { NeonPanel } from "@/components/cyber/NeonPanel";
import { DECIMALS, GameAPI, roomStatus } from "@/api/gameAPI";
import { RoomInfo, RoomStatus } from "@/types/room";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";

const UNIT = 10 ** DECIMALS;

const SORT_OPTIONS = {
  recent: "RECENT",
  oldest: "OLDEST",
  pool: "PRIZE POOL",
  players: "PLAYERS",
} as const;
type SortKey = keyof typeof SORT_OPTIONS;

// Sudoku is the only deployed game; its splash/slug live here.
const SUDOKU_GAME = { splashImg: "/sudoku-preview.png", name: "Sudoku", slug: "sudoku" };

export default function Home() {
  const router = useRouter();
  const { data: rawRooms } = useSWR("rooms", () => GameAPI.listRooms(), { refreshInterval: 5000 });

  const rooms: RoomInfo[] = (rawRooms ?? []).map((r) => ({
    idByGame: r.room_id,
    creator: r.creator,
    status: roomStatus(r),
    playerCount: r.players.length,
    maxPlayers: r.max_players,
    gameInfo: SUDOKU_GAME,
    depositPrice: Number(r.deposit_price) / UNIT,
  }));

  const [sortBy, setSortBy] = useState<SortKey>("recent");
  const pool = (r: RoomInfo) => r.depositPrice * r.playerCount;
  const sortedRooms = [...rooms].sort((a, b) => {
    switch (sortBy) {
      case "oldest": return a.idByGame - b.idByGame;
      case "pool": return pool(b) - pool(a);
      case "players": return b.playerCount - a.playerCount;
      case "recent":
      default: return b.idByGame - a.idByGame;
    }
  });

  const statusCounts = {
    [RoomStatus.Playing]: rooms.filter((r) => r.status === RoomStatus.Playing).length,
    [RoomStatus.Pending]: rooms.filter((r) => r.status === RoomStatus.Pending).length,
    [RoomStatus.Finished]: rooms.filter((r) => r.status === RoomStatus.Finished).length,
  };

  const allGames = [
    { icon: "/sudoku-icon.svg", playingRooms: statusCounts[RoomStatus.Playing], name: "Sudoku" },
  ];

  const totalPrizePool = rooms.reduce((sum, r) => sum + r.depositPrice * r.playerCount, 0);
  const activeRooms = statusCounts[RoomStatus.Pending] + statusCounts[RoomStatus.Playing];
  const distinctPlayers = new Set((rawRooms ?? []).flatMap((r) => r.players)).size;
  const gamesSolved = (rawRooms ?? []).filter((r) => r.solved).length;

  const networkStats = [
    { label: 'TOTAL PRIZE POOL', value: `${totalPrizePool.toLocaleString()} XLM`, color: 'text-warning' },
    { label: 'ACTIVE ROOMS',     value: `${activeRooms}`,                         color: 'text-accent' },
    { label: 'TOTAL PLAYERS',    value: `${distinctPlayers}`,                     color: 'text-primary' },
    { label: 'GAMES SOLVED',     value: `${gamesSolved}`,                         color: 'text-secondary' },
  ];

  return (
    <div className="flex flex-col gap-6 pt-6 max-w-[1920px] mx-auto">
      {/* Hero banner */}
      <div className="border border-border bg-bg-panel p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="flex flex-col gap-4 flex-1">
          <h2 className="font-mono font-bold text-2xl text-primary text-neon-cyan tracking-widest">
            ZKADE
          </h2>
          <p className="font-sans text-sm text-muted leading-relaxed max-w-xl">
            Your move is your proof. No trust required —{' '}
            <span className="text-accent">mathematics enforces the rules</span>,
            the chain holds the stakes, and the winner takes all.
          </p>
          <NeonButton variant="primary" size="md" className="w-fit" onClick={() => router.push('/new-room')}>
            + NEW ROOM
          </NeonButton>
        </div>
        <SelfSolvingSudoku />
      </div>

      {/* Network stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {networkStats.map(({ label, value, color }) => (
          <div key={label} className="border border-border bg-bg-panel px-3 py-2 flex flex-col gap-0.5">
            <span className="font-mono text-xs text-muted tracking-widest">{label}</span>
            <span className={`font-data text-xl ${color}`}>{value}</span>
          </div>
        ))}
      </div>

      <section className="flex flex-col md:flex-row md:gap-6">
        {/* Sidebar */}
        <div className="flex flex-col gap-3 w-full md:w-52 md:sticky md:top-[56px] md:h-[calc(100vh-72px)] md:overflow-auto shrink-0">
          <NeonPanel title="GAMES" accent="cyan">
            {allGames.map((game) => (
              <div key={game.name} className="flex items-center gap-2 text-muted cursor-pointer hover:text-text transition-colors py-1">
                <Image src={game.icon} alt="" width={20} height={20} unoptimized className="shrink-0 w-5 h-5" />
                <span className="flex-1 font-mono text-xs tracking-wider">{game.name.toUpperCase()}</span>
                <span className="font-data text-base text-primary">{game.playingRooms}</span>
              </div>
            ))}
          </NeonPanel>

          <NeonPanel title="STATUS" accent="none">
            {([RoomStatus.Playing, RoomStatus.Pending, RoomStatus.Finished] as const).map((s) => (
              <div key={s} className="flex items-center gap-2 text-muted cursor-pointer hover:text-text transition-colors py-1">
                <span className="flex-1 font-mono text-xs tracking-wider">{s.toUpperCase()}</span>
                <span className="font-data text-base text-accent">{statusCounts[s]}</span>
              </div>
            ))}
          </NeonPanel>

          <NeonPanel title="HOW TO PLAY" accent="green">
            {[
              ['01', 'Create or join a room'],
              ['02', 'Deposit funds to enter'],
              ['03', 'Solve the Sudoku puzzle'],
              ['04', 'Submit ZK proof on-chain'],
              ['05', 'Claim the prize pool'],
            ].map(([n, step]) => (
              <div key={n} className="flex items-start gap-2 py-0.5">
                <span className="font-data text-sm text-accent shrink-0">{n}</span>
                <span className="font-mono text-xs text-muted leading-relaxed">{step}</span>
              </div>
            ))}
          </NeonPanel>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex items-end justify-between border-b border-border pb-2">
            <div>
              <h1 className="font-mono text-base text-primary text-neon-cyan tracking-widest">SELECT A ROOM</h1>
              <span className="font-mono text-sm text-muted">{sortedRooms.length} rooms available</span>
            </div>
            <label className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted tracking-wider">SORT:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="bg-bg border border-border font-mono text-xs text-text tracking-wider px-2 py-1 focus:outline-none focus:border-primary cursor-pointer"
              >
                {(Object.keys(SORT_OPTIONS) as SortKey[]).map((k) => (
                  <option key={k} value={k} className="bg-bg-panel">{SORT_OPTIONS[k]}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 mb-8">
            {sortedRooms.map((room) => (
              <ArcadeRoomCard key={`${room.idByGame}-${room.gameInfo.name}`} {...room} />
            ))}
          </div>
          {sortedRooms.length === 0 && (
            <div className="font-mono text-sm text-muted py-8 text-center">
              No rooms yet — create the first one.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
