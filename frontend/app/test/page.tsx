'use client';

import { SudokuProvider } from "@/components/sudoku/context/SudokuContext";
import { SudokuGame } from "@/components/sudoku/Game";

export default function TestPage() {
    return (
        <main className="flex flex-col gap-6 pt-6 max-w-[1920px] mx-auto">
            <div className="font-mono text-xs text-muted border border-border px-3 py-1.5 w-fit">
                TEST MODE — UI only, no wallet or server
            </div>
            <SudokuProvider>
                <SudokuGame testMode />
            </SudokuProvider>
        </main>
    );
}
