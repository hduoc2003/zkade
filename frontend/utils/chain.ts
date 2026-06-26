export function shortAddress(address: string, length: number = 6) {
    if (!address) return '';
    return `${address.slice(0, length)}...${address.slice(-length)}`;
}

/** Display ticker for the deposit/reward asset. */
export function displayDenom(_denom?: string): string {
    return 'XLM';
}

/** Convert stroops to XLM for display (7 decimals). */
export function toDisplayAmount(stroops: number, decimals = 7): number {
    return stroops / Math.pow(10, decimals);
}

/** stellar.expert network segment, derived from the configured passphrase. */
const EXPLORER_NETWORK =
    (process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? '').includes('Test') ? 'testnet' : 'public';

/** Link to a transaction on the stellar.expert block explorer. */
export function explorerTx(hash: string): string {
    return `https://stellar.expert/explorer/${EXPLORER_NETWORK}/tx/${hash}`;
}

/** Link to an account on the stellar.expert block explorer. */
export function explorerAccount(address: string): string {
    return `https://stellar.expert/explorer/${EXPLORER_NETWORK}/account/${address}`;
}
