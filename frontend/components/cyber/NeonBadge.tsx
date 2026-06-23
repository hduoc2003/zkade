import { RoomStatus, roomStatusColor } from '@/types/room';

const statusConfig: Record<RoomStatus, { label: string; color: string; glow: string }> = {
    [RoomStatus.Pending]:  { label: '◈ WAIT',  color: 'border-warning text-warning',  glow: 'shadow-neon-gold' },
    [RoomStatus.Playing]:  { label: '▶ LIVE',  color: 'border-accent text-accent',    glow: 'shadow-neon-green' },
    [RoomStatus.Finished]: { label: '■ DONE',  color: 'border-muted text-muted',      glow: '' },
};

export function NeonBadge({ status }: { status: RoomStatus }) {
    const cfg = statusConfig[status];
    return (
        <span className={`border text-xs px-2 py-0.5 font-mono tracking-widest ${cfg.color} ${cfg.glow}`}>
            {cfg.label}
        </span>
    );
}
