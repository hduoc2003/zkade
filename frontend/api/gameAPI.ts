import { httpService } from './httpService';
import {
    readContract,
    writeContract,
    scAddress,
    scU64,
    scU32Vec,
    scBytes,
    hexToBytes,
} from './soroban';

/** XLM (and the SAC token) use 7 decimals. */
export const DECIMALS = 7;
const UNIT = 10 ** DECIMALS;

type SignFn = (xdr: string) => Promise<string>;

export interface RoomState {
    creator: string;
    deposit_price: string;
    service_fee: string;
    max_players: number;
    players: string[];
    initial_state: [number, number][] | null;
    winner: string | null;
    solved: boolean;
    claimed: boolean;
}

interface RawGivenCell {
    coord: number;
    value: number;
}
interface RawRoom {
    creator: string;
    deposit_price: bigint;
    service_fee: bigint;
    max_players: number;
    players: string[];
    initial_state: RawGivenCell[] | null;
    winner: string | null;
    solved: boolean;
    claimed: boolean;
}

export class GameAPI {
    // ---- server-proxied (owner-signed) ----

    static async getServiceFee(): Promise<number> {
        const fee = await httpService.get<unknown, number>('/games/service-fee');
        return fee / UNIT;
    }

    static async createNewRoom(
        deposit_price: number,
        creator: string,
        max_players: number,
    ): Promise<{ room_id: number }> {
        return httpService.post<unknown, { room_id: number }>('/games/new-room', {
            deposit_price: Math.round(deposit_price * UNIT),
            max_players,
            creator,
        });
    }

    static async startGame(room_id: number): Promise<string> {
        return httpService.post<unknown, string>('/games/start-game', { room_id });
    }

    static async lockWinner(room_id: number, winner: string, solution: number[]): Promise<string> {
        return httpService.post<unknown, string>('/games/lock-winner', { room_id, winner, solution });
    }

    static async generateProof(
        initial_state: [number, number][],
        solution: number[],
    ): Promise<{ seal: string; journal: string; image_id: string }> {
        return httpService.post('/games/generate-proof', { initial_state, solution });
    }

    // ---- on-chain reads ----

    static async queryRoom(room_id: number): Promise<RoomState> {
        const raw = (await readContract('query_room', [scU64(room_id)])) as RawRoom;
        return {
            creator: raw.creator,
            deposit_price: raw.deposit_price.toString(),
            service_fee: raw.service_fee.toString(),
            max_players: raw.max_players,
            players: raw.players,
            initial_state: raw.initial_state
                ? raw.initial_state.map((c) => [c.coord, c.value] as [number, number])
                : null,
            winner: raw.winner ?? null,
            solved: raw.solved,
            claimed: raw.claimed,
        };
    }

    // ---- on-chain writes (wallet-signed) ----

    static joinRoom(source: string, sign: SignFn, room_id: number): Promise<string> {
        return writeContract(source, sign, 'join_room', [scAddress(source), scU64(room_id)]);
    }

    static submitPublic(source: string, sign: SignFn, room_id: number, answer: number[]): Promise<string> {
        return writeContract(source, sign, 'submit_public', [
            scAddress(source),
            scU64(room_id),
            scU32Vec(answer),
        ]);
    }

    static submitSolution(source: string, sign: SignFn, room_id: number, sealHex: string): Promise<string> {
        return writeContract(source, sign, 'submit_solution', [
            scAddress(source),
            scU64(room_id),
            scBytes(hexToBytes(sealHex)),
        ]);
    }

    static claimReward(source: string, sign: SignFn, room_id: number): Promise<string> {
        return writeContract(source, sign, 'claim_reward', [scAddress(source), scU64(room_id)]);
    }
}
