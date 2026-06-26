'use client';

import { RoomInfo, RoomStatus } from '@/types/room';
import { NeonBadge } from '@/components/cyber/NeonBadge';
import { NeonButton } from '@/components/cyber/NeonButton';
import { displayDenom, shortAddress } from '@/utils/chain';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const DISPLAY = displayDenom(process.env.NEXT_PUBLIC_DENOM ?? 'min');

export function ArcadeRoomCard(room: RoomInfo) {
    const router = useRouter();
    const { idByGame, creator, status, playerCount, maxPlayers, gameInfo, depositPrice } = room;
    const prizePool = depositPrice * playerCount;

    const actionLabel =
        status === RoomStatus.Pending ? 'JOIN ROOM' :
        status === RoomStatus.Playing ? 'VIEW' :
        'VIEW';
    const actionVariant =
        status === RoomStatus.Pending ? 'primary' :
        status === RoomStatus.Playing ? 'secondary' :
        'ghost';

    const fillPct = Math.min((playerCount / maxPlayers) * 100, 100);

    return (
        <div className="border border-border bg-bg-panel flex flex-col hover:border-primary hover:shadow-neon-cyan transition-all duration-200">
            {/* Splash */}
            <div className="relative h-28 overflow-hidden border-b border-border">
                <Image
                    src={gameInfo.splashImg}
                    alt={gameInfo.name}
                    fill
                    className="object-cover opacity-40"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-panel via-transparent to-transparent" />
                <div className="absolute bottom-2 left-2">
                    <NeonBadge status={status} />
                </div>
                <div className="absolute top-2 right-2 font-mono text-xs text-primary text-neon-cyan">
                    #{idByGame}
                </div>
            </div>

            {/* Body */}
            <div className="p-3 flex flex-col gap-2.5">
                <div className="font-mono text-sm text-text tracking-wider">
                    {gameInfo.name.toUpperCase()}
                </div>

                <div className="font-mono text-xs text-muted">
                    {shortAddress(creator)}
                </div>

                {/* Player fill bar */}
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 border border-border bg-bg">
                        <div
                            className="h-full bg-accent transition-all"
                            style={{ width: `${fillPct}%`, boxShadow: '0 0 4px #00FF41' }}
                        />
                    </div>
                    <span className="font-mono text-xs text-muted whitespace-nowrap">
                        {playerCount}/{maxPlayers}
                    </span>
                </div>

                {/* Stats */}
                <div className="flex gap-3 font-mono text-xs text-muted">
                    <span>DEP: <span className="text-warning">{depositPrice} {DISPLAY}</span></span>
                    <span>POOL: <span className="text-accent">{prizePool} {DISPLAY}</span></span>
                </div>

                <NeonButton
                    variant={actionVariant as any}
                    size="sm"
                    className="w-full text-center"
                    onClick={() => router.push(`/games/${gameInfo.slug}/${idByGame}`)}
                >
                    {actionLabel}
                </NeonButton>
            </div>
        </div>
    );
}
