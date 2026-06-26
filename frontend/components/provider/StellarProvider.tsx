'use client';

import {
    createContext,
    PropsWithChildren,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { StellarWalletsKit, Networks } from '@creit.tech/stellar-wallets-kit';
import { FreighterModule, FREIGHTER_ID } from '@creit.tech/stellar-wallets-kit/modules/freighter';
import { Keypair, TransactionBuilder } from '@stellar/stellar-sdk';

const PASSPHRASE = process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? Networks.TESTNET;
const STORAGE_KEY = 'zkade:wallet';
// Dev/test only: when set, sign locally with this testnet secret instead of
// opening Freighter. Lets the full UI flow be driven without a browser wallet.
// Leave unset in any real deployment - Freighter is the default path.
const DEV_SECRET = process.env.NEXT_PUBLIC_DEV_WALLET_SECRET;

interface StellarWalletContext {
    address: string | null;
    isConnected: boolean;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    /** Sign a transaction XDR with the connected wallet; returns the signed XDR. */
    signTransaction: (xdr: string) => Promise<string>;
}

const Ctx = createContext<StellarWalletContext | null>(null);

// The kit is a static singleton; init it once, browser-side only.
let initialized = false;
function ensureInit() {
    if (initialized) return;
    StellarWalletsKit.init({
        network: PASSPHRASE as Networks,
        selectedWalletId: FREIGHTER_ID,
        modules: [new FreighterModule()],
    });
    initialized = true;
}

export default function StellarProvider({ children }: PropsWithChildren) {
    const [address, setAddress] = useState<string | null>(null);

    // Reconnect on reload (or auto-connect the dev signer).
    useEffect(() => {
        if (DEV_SECRET) {
            setAddress(Keypair.fromSecret(DEV_SECRET).publicKey());
            return;
        }
        const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        if (!saved) return;
        ensureInit();
        StellarWalletsKit.setWallet(saved);
        StellarWalletsKit.getAddress()
            .then(({ address }) => setAddress(address))
            .catch(() => localStorage.removeItem(STORAGE_KEY));
    }, []);

    const connect = useCallback(async () => {
        if (DEV_SECRET) {
            setAddress(Keypair.fromSecret(DEV_SECRET).publicKey());
            return;
        }
        ensureInit();
        const { address } = await StellarWalletsKit.authModal();
        localStorage.setItem(STORAGE_KEY, FREIGHTER_ID);
        setAddress(address);
    }, []);

    const disconnect = useCallback(async () => {
        if (!DEV_SECRET) {
            try {
                await StellarWalletsKit.disconnect();
            } catch {
                /* ignore */
            }
            localStorage.removeItem(STORAGE_KEY);
        }
        setAddress(null);
    }, []);

    const signTransaction = useCallback(
        async (xdr: string) => {
            if (!address) throw new Error('wallet not connected');
            if (DEV_SECRET) {
                const tx = TransactionBuilder.fromXDR(xdr, PASSPHRASE);
                tx.sign(Keypair.fromSecret(DEV_SECRET));
                return tx.toXDR();
            }
            const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
                address,
                networkPassphrase: PASSPHRASE,
            });
            return signedTxXdr;
        },
        [address],
    );

    const value = useMemo<StellarWalletContext>(
        () => ({ address, isConnected: !!address, connect, disconnect, signTransaction }),
        [address, connect, disconnect, signTransaction],
    );

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStellarWallet(): StellarWalletContext {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useStellarWallet must be used within StellarProvider');
    return ctx;
}
