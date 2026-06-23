// Thin wrapper around @stellar/stellar-sdk for invoking and reading the sudoku
// Soroban contract from the browser. Writes are signed by the connected wallet
// (Freighter via Stellar Wallets Kit); the player is the tx source, so a single
// envelope signature authorizes every `require_auth` in the call tree.

import {
    Account,
    Address,
    BASE_FEE,
    Contract,
    nativeToScVal,
    rpc,
    scValToNative,
    TransactionBuilder,
    xdr,
} from '@stellar/stellar-sdk';

const RPC_URL = process.env.NEXT_PUBLIC_STELLAR_RPC_URL!;
const PASSPHRASE = process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE!;
const CONTRACT = process.env.NEXT_PUBLIC_SUDOKU_CONTRACT!;
// Any well-formed account works as the read-only simulation source.
const READ_SOURCE = process.env.NEXT_PUBLIC_GAME_OWNER!;

function server() {
    return new rpc.Server(RPC_URL);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function hexToBytes(hex: string): Uint8Array {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
    return out;
}

// ---- ScVal builders ----
export const scAddress = (addr: string) => nativeToScVal(Address.fromString(addr), { type: 'address' });
export const scU64 = (n: number | bigint) => nativeToScVal(BigInt(n), { type: 'u64' });
export const scU32Vec = (arr: number[]) => xdr.ScVal.scvVec(arr.map((v) => nativeToScVal(v, { type: 'u32' })));
export const scBytes = (bytes: Uint8Array) => nativeToScVal(bytes, { type: 'bytes' });

/** Read-only call: simulate and decode the return value to a JS native value. */
export async function readContract(method: string, args: xdr.ScVal[] = []): Promise<unknown> {
    const srv = server();
    const source = new Account(READ_SOURCE, '0');
    const contract = new Contract(CONTRACT);
    const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: PASSPHRASE })
        .addOperation(contract.call(method, ...args))
        .setTimeout(30)
        .build();

    const sim = await srv.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) throw new Error(sim.error);
    const retval = sim.result?.retval;
    return retval ? scValToNative(retval) : null;
}

/**
 * Write call: build → prepare (simulate + assemble auth/footprint) → sign with
 * the wallet → submit → poll. Returns the transaction hash.
 */
export async function writeContract(
    source: string,
    signTransaction: (xdr: string) => Promise<string>,
    method: string,
    args: xdr.ScVal[] = [],
): Promise<string> {
    const srv = server();
    const account = await srv.getAccount(source);
    const contract = new Contract(CONTRACT);
    const built = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: PASSPHRASE })
        .addOperation(contract.call(method, ...args))
        .setTimeout(120)
        .build();

    const prepared = await srv.prepareTransaction(built);
    const signedXdr = await signTransaction(prepared.toXDR());
    const signedTx = TransactionBuilder.fromXDR(signedXdr, PASSPHRASE);

    const sent = await srv.sendTransaction(signedTx);
    if (sent.status === 'ERROR') {
        throw new Error(`submit failed: ${JSON.stringify(sent.errorResult)}`);
    }

    let result = await srv.getTransaction(sent.hash);
    while (result.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
        await sleep(1000);
        result = await srv.getTransaction(sent.hash);
    }
    if (result.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
        throw new Error(`tx ${sent.hash} failed: ${result.status}`);
    }
    return sent.hash;
}

export { CONTRACT as SUDOKU_CONTRACT };
