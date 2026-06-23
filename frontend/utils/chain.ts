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
