import { GameInfo } from "./game";

export enum RoomStatus {
    Playing = "Playing",
    Pending = "Pending",
    Finished = "Finished"
}

export interface RoomInfo {
    idByGame: number;
    creator: string;
    status: RoomStatus;
    playerCount: number;
    maxPlayers: number;
    gameInfo: Pick<GameInfo, "splashImg" | "name" | "slug">;
    depositPrice: number;
}

export const roomStatusColor: Record<RoomStatus, string> = {
    [RoomStatus.Playing]: "#3DFFB9",
    [RoomStatus.Pending]: "#11DAF4",
    [RoomStatus.Finished]: "#BEC8C8"
}
