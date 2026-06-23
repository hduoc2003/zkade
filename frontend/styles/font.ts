import { Press_Start_2P, VT323 } from "next/font/google";

export const pixelFont = Press_Start_2P({
    subsets: ['latin'],
    weight: '400',
    variable: '--font-pixel',
});

export const vt323Font = VT323({
    subsets: ['latin'],
    weight: '400',
    variable: '--font-vt323',
});
