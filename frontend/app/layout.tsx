import type { Metadata } from "next";
import "./globals.css";
import "react-toastify/dist/ReactToastify.css";
import { IBM_Plex_Mono, IBM_Plex_Sans, Share_Tech_Mono } from "next/font/google";
import RetroHeader from "@/components/layout/RetroHeader";
import StellarProvider from "@/components/provider/StellarProvider";
import { ToastContainer } from "react-toastify";

// Wallet/contract code touches browser-only APIs; skip static prerendering.
export const dynamic = 'force-dynamic';

const monoFont = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
});

const dataFont = Share_Tech_Mono({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-data',
});

// Body/prose face — pairs with IBM Plex Mono (same superfamily) so reading text
// is clean sans while labels, data and addresses stay mono.
const sansFont = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: "ZKADE - Prove you won. Without revealing how.",
  description: "ZK battle arcade on Stellar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${monoFont.variable} ${dataFont.variable} ${sansFont.variable}`}>
      <body className="text-text px-4 md:px-10 xl:px-24 font-mono" suppressHydrationWarning>
        <StellarProvider>
          <RetroHeader />
          {children}
          <ToastContainer position="bottom-right" theme="dark" />
        </StellarProvider>
      </body>
    </html>
  );
}
