'use client';

import { ArcadeRoomCard } from "@/components/home/ArcadeRoomCard";
import { NeonButton } from "@/components/cyber/NeonButton";
import { NeonPanel } from "@/components/cyber/NeonPanel";
import { GameInfo } from "@/types/game";
import { RoomInfo, RoomStatus } from "@/types/room";
import Image from "next/image";
import { useRouter } from "next/navigation";

// Mock — swap for on-chain query later
const GAME_OWNER = process.env.NEXT_PUBLIC_GAME_OWNER ?? '';

const GAME_INFO = {
  sudoku:      { splashImg: "/sudoku-preview.png",      name: "Sudoku",      slug: "sudoku"      },
  sokoban:     { splashImg: "/sokoban-preview.jpg",     name: "Sokoban",     slug: "sokoban"     },
  minesweeper: { splashImg: "/minesweeper-preview.jpg", name: "Minesweeper", slug: "minesweeper" },
};

// Mock game list
const allGames: Pick<GameInfo, 'playingRooms' | 'icon' | 'name'>[] = [
  { icon: "https://brainium.com/wp-content/uploads/2021/11/sudoku-Mobile-hero-asset@2x.png", playingRooms: 42, name: "Sudoku"      },
  { icon: "/sokoban-preview.jpg",                                                              playingRooms: 13, name: "Sokoban"     },
  { icon: "/minesweeper-preview.jpg",                                                          playingRooms: 8,  name: "Minesweeper" },
];

// Mock room list — mix of games and statuses
const allRooms: RoomInfo[] = [
  { idByGame: 2,  creator: GAME_OWNER, status: RoomStatus.Playing,  playerCount: 2, maxPlayers: 2, gameInfo: GAME_INFO.sudoku,      depositPrice: 50  },
  { idByGame: 3,  creator: GAME_OWNER, status: RoomStatus.Pending,  playerCount: 1, maxPlayers: 4, gameInfo: GAME_INFO.sudoku,      depositPrice: 10  },
  { idByGame: 11, creator: GAME_OWNER, status: RoomStatus.Playing,  playerCount: 2, maxPlayers: 2, gameInfo: GAME_INFO.sokoban,     depositPrice: 200 },
  { idByGame: 4,  creator: GAME_OWNER, status: RoomStatus.Pending,  playerCount: 3, maxPlayers: 4, gameInfo: GAME_INFO.sudoku,      depositPrice: 25  },
  { idByGame: 21, creator: GAME_OWNER, status: RoomStatus.Pending,  playerCount: 1, maxPlayers: 2, gameInfo: GAME_INFO.minesweeper, depositPrice: 15  },
  { idByGame: 5,  creator: GAME_OWNER, status: RoomStatus.Finished, playerCount: 2, maxPlayers: 2, gameInfo: GAME_INFO.sudoku,      depositPrice: 100 },
  { idByGame: 12, creator: GAME_OWNER, status: RoomStatus.Finished, playerCount: 2, maxPlayers: 2, gameInfo: GAME_INFO.sokoban,     depositPrice: 500 },
  { idByGame: 22, creator: GAME_OWNER, status: RoomStatus.Playing,  playerCount: 2, maxPlayers: 4, gameInfo: GAME_INFO.minesweeper, depositPrice: 30  },
];

// Mock status counts
const statusCounts = { Playing: 63, Pending: 52, Finished: 41 };

// Mock network stats
const networkStats = [
  { label: 'TOTAL PRIZE POOL',    value: '12,840 XLM', color: 'text-warning' },
  { label: 'PLAYERS ONLINE',      value: '108',         color: 'text-accent' },
  { label: 'GAMES TODAY',         value: '319',         color: 'text-primary' },
  { label: 'ZK PROOFS VERIFIED',  value: '87',          color: 'text-secondary' },
];

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6 pt-6 max-w-[1920px] mx-auto">
      {/* Hero banner */}
      <div className="border border-border bg-bg-panel p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1 flex-1">
          <h2 className="font-mono font-bold text-lg text-primary text-neon-cyan tracking-widest">
            ZKADE
          </h2>
          <p className="font-mono text-xs text-muted leading-relaxed max-w-xl">
            Your move is your proof. No trust required —{' '}
            <span className="text-accent">mathematics enforces the rules</span>,
            the chain holds the stakes, and the winner takes all.
          </p>
        </div>
        <NeonButton variant="primary" size="md" onClick={() => router.push('/new-room')}>
          + NEW ROOM
        </NeonButton>
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
                <Image src={game.icon} alt="" width={16} height={16} className="shrink-0" />
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
              <span className="font-mono text-sm text-muted">{allRooms.length} rooms available</span>
            </div>
            <span className="font-mono text-xs text-muted tracking-wider">SORT: RECENT ▼</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 mb-8">
            {allRooms.map((room) => (
              <ArcadeRoomCard key={`${room.idByGame}-${room.gameInfo.name}`} {...room} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
