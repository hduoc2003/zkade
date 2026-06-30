import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**",
            },
        ],
    },
    webpack: (config, { isServer }) => {
        config.externals.push('pino-pretty', 'lokijs', 'encoding', 'bs58', '@react-native-async-storage/async-storage');
        // Force all imports of `react`/`react-dom` to resolve to the user-installed version,
        // not Next.js's bundled canary (which lacks useEffectEvent).
        // Redirect all React imports - including Next.js's internal compiled copy -
        // to the single user-installed React 19, preventing two-instance hook crashes.
        // Client build only: the server renderer must keep Next.js's own compiled React,
        // otherwise SSR resolves React to null and crashes on hooks (e.g. useState).
        if (!isServer) {
            const r = path.resolve.bind(path, __dirname, 'node_modules');
            config.resolve.alias = {
                ...(config.resolve.alias || {}),
                react: r('react'),
                'react-dom': r('react-dom'),
                'react/jsx-runtime': r('react/jsx-runtime'),
                'react/jsx-dev-runtime': r('react/jsx-dev-runtime'),
                'next/dist/compiled/react': r('react'),
                'next/dist/compiled/react-dom': r('react-dom'),
                'next/dist/compiled/react/jsx-runtime': r('react/jsx-runtime'),
                'next/dist/compiled/react/jsx-dev-runtime': r('react/jsx-dev-runtime'),
            };
        }
        return config;
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    devIndicators: false,
};

export default nextConfig;
