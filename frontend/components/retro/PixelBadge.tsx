import React from 'react';
import { RoomStatus, roomStatusColor } from '@/types/room';

interface PixelBadgeProps {
    status: RoomStatus;
}

const statusLabel: Record<RoomStatus, string> = {
    [RoomStatus.Playing]: '▶ PLAYING',
    [RoomStatus.Pending]: '… WAITING',
    [RoomStatus.Finished]: '■ FINISHED',
};

export function PixelBadge({ status }: PixelBadgeProps) {
    const color = roomStatusColor[status];
    return (
        <span
            className="font-pixel text-[6px] px-2 py-1 border tracking-widest"
            style={{ color, borderColor: color, backgroundColor: `${color}18` }}
        >
            {statusLabel[status]}
        </span>
    );
}
