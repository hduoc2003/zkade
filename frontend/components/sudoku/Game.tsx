'use client';

import React, { useState, useEffect, useRef } from 'react';
import moment from 'moment';
import { GameSection } from './components/layout/GameSection';
import { StatusSection } from './components/layout/StatusSection';
import { getSudoku } from './solver/sudoku';
import { useSudokuContext } from './context/SudokuContext';
import { useStellarWallet } from '@/components/provider/StellarProvider';
import { toast } from 'react-toastify';
import { GameAPI } from '@/api/gameAPI';
import { getUniqueSudoku } from './solver/UniqueSudoku';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { NeonButton } from '@/components/cyber/NeonButton';
import { NeonPanel } from '@/components/cyber/NeonPanel';

function initialStateToBoard(initial_state: [number, number][]): string[] {
  const board = Array(81).fill('0');
  for (const [idx, val] of initial_state) board[idx] = String(val);
  return board;
}

function solveBoard(board: string[]): string[] {
  const sudoku = getSudoku();
  const str = board.map(v => v === '0' ? '.' : v).join('');
  const solved = sudoku.solve(str);
  if (!solved) return board;
  return [...solved];
}

export const SudokuGame = ({
  room_id = 0,
  initial_state = null,
  currentWinner = null,
  alreadyClaimed = false,
  onVerifySuccess = () => {},
  onClaimSuccess = () => {},
  testMode = false,
}: {
  room_id?: number;
  initial_state?: [number, number][] | null;
  currentWinner?: string | null;
  alreadyClaimed?: boolean;
  onVerifySuccess?: (txHash: string) => void;
  onClaimSuccess?: (txHash: string) => void;
  testMode?: boolean;
}) => {
  const {
    numberSelected, setNumberSelected,
    gameArray, setGameArray,
    difficulty, setDifficulty,
    setTimeGameStarted,
    fastMode, setFastMode,
    cellSelected, setCellSelected,
    initArray, setInitArray,
    setWon,
  } = useSudokuContext();

  const [mistakesMode, setMistakesMode] = useState(false);
  const [history, setHistory] = useState<string[][]>([]);
  const [solvedArray, setSolvedArray] = useState<string[]>([]);
  const [gameSolved, setGameSolved] = useState(false);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [generatingProof, setGeneratingProof] = useState(false);
  const [lockingWinner, setLockingWinner] = useState(false);
  const [winnerLocked, setWinnerLocked] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [proofSubmitted, setProofSubmitted] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const privateProof = useRef(false);
  const initializedPuzzleKey = useRef<string | null>(null);
  const router = useRouter();

  const PROGRESS_KEY = `sudoku-progress-${room_id}`;

  const { address, signTransaction } = useStellarWallet();

  // If chain already shows me as winner (e.g. after reload), skip lockWinner on retry
  useEffect(() => {
    if (address && currentWinner && currentWinner === address) setWinnerLocked(true);
  }, [currentWinner, address]);

  // If I'm the winner and the chain already shows the reward claimed (e.g. after a
  // page reload), re-open the success modal in its claimed state.
  useEffect(() => {
    if (address && currentWinner === address && alreadyClaimed) {
      setProofSubmitted(true);
      setClaimed(true);
      setGameSolved(true);
    }
  }, [currentWinner, address, alreadyClaimed]);

  // In test mode, generate a local puzzle immediately (no chain needed).
  useEffect(() => {
    if (!testMode) return;
    const [init, solved] = getUniqueSudoku('Easy', undefined);
    setInitArray(init);
    setGameArray(init.slice());
    setSolvedArray(solved);
    setNumberSelected('0');
    setTimeGameStarted(moment());
    setCellSelected(-1);
    setHistory([]);
    setWon(false);
    setGameSolved(false);
  }, [testMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize board from contract initial_state (only once per puzzle).
  // Restores player's in-progress cells from localStorage on reload.
  useEffect(() => {
    if (testMode) return;
    if (!initial_state || initial_state.length === 0) return; // wait for real puzzle from chain

    const puzzleKey = initial_state.map(([i, v]) => `${i}:${v}`).sort().join(',');
    if (initializedPuzzleKey.current === puzzleKey) return; // already loaded this puzzle
    initializedPuzzleKey.current = puzzleKey;

    const init = initialStateToBoard(initial_state);
    const solved = solveBoard(init);

    // Restore saved progress for this room (survives reload)
    let restored = init.slice();
    try {
      const saved = localStorage.getItem(PROGRESS_KEY);
      if (saved) {
        const parsed: string[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 81) restored = parsed;
      }
    } catch {}

    setInitArray(init);
    setGameArray(restored);
    setSolvedArray(solved);
    setNumberSelected('0');
    setTimeGameStarted(moment());
    setCellSelected(-1);
    setHistory([]);

    // If restored state is already solved, mark won immediately
    const alreadySolved = solved.length === 81 && restored.every((v, i) => v === solved[i]);
    if (alreadySolved) { setGameSolved(true); setWon(true); }
    else setWon(false);
  }, [initial_state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist player progress whenever gameArray changes
  useEffect(() => {
    if (!initial_state || gameArray.every(v => v === '0')) return;
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(gameArray)); } catch {}
  }, [gameArray]); // eslint-disable-line react-hooks/exhaustive-deps

  function _isSolved(index: number, value: string) {
    return gameArray.every((cell: string, i: number) =>
      i === index ? value === solvedArray[i] : cell === solvedArray[i]
    );
  }

  function _fillCell(index: number, value: string) {
    if (initArray[index] === '0') {
      const tempHistory = history.slice();
      tempHistory.push(gameArray.slice());
      setHistory(tempHistory);
      const tempArray = gameArray.slice();
      tempArray[index] = value;
      setGameArray(tempArray);
      if (_isSolved(index, value)) {
        setGameSolved(true);
        setWon(true);
      }
    }
  }

  function _userFillCell(index: number, value: string) {
    if (mistakesMode) {
      if (value === solvedArray[index]) _fillCell(index, value);
    } else {
      _fillCell(index, value);
    }
  }

  function onClickCell(i: number) {
    if (fastMode && numberSelected !== '0') _userFillCell(i, numberSelected);
    setCellSelected(i);
  }

  function onChangeDifficulty(e: React.ChangeEvent<HTMLSelectElement>) {
    // Difficulty is fixed when puzzle comes from contract
    if (initial_state && initial_state.length > 0) return;
    setDifficulty(e.target.value);
  }

  function onClickNumber(number: string) {
    if (fastMode) setNumberSelected(number);
    else if (cellSelected !== -1) _userFillCell(cellSelected, number);
  }

  function onClickUndo() {
    if (!history.length) return;
    const tempHistory = history.slice();
    const tempArray = tempHistory.pop();
    setHistory(tempHistory);
    if (tempArray) setGameArray(tempArray);
  }

  function onClickErase() {
    if (cellSelected !== -1 && gameArray[cellSelected] !== '0') _fillCell(cellSelected, '0');
  }

  function onClickHint() {
    if (cellSelected !== -1) _fillCell(cellSelected, solvedArray[cellSelected]);
  }

  // answer = values for empty (non-initial) cells only, in row-major order
  function extractAnswer(): number[] {
    const out: number[] = [];
    for (let i = 0; i < 81; i++) {
      if (initArray[i] === '0') out.push(Number(gameArray[i]));
    }
    return out;
  }

  async function handlePublicSolution() {
    privateProof.current = false;
    if (!address) { toast.error('Please connect your wallet first'); return; }
    try {
      setSubmittingProof(true);
      const solution = extractAnswer();
      const txHash = await GameAPI.submitPublic(address, signTransaction, room_id, solution);
      setProofSubmitted(true);
      onVerifySuccess(txHash);
    } catch (e) {
      console.error(e); toast.error(e instanceof Error ? e.message : 'Unknown error');
    }
    setSubmittingProof(false);
  }

  async function handleProveSolution() {
    privateProof.current = true;
    if (!address) { toast.error('Please connect your wallet first'); return; }
    const solution = extractAnswer();
    try {
      // Step 1: lock winner on chain via server (fast) - beats slower public submitters
      if (!winnerLocked) {
        setLockingWinner(true);
        await GameAPI.lockWinner(room_id, address, solution);
        setWinnerLocked(true);
        setLockingWinner(false);
      }

      // Step 2: generate RISC Zero proof (slow, ~1-2 min)
      setGeneratingProof(true);
      const proof = await GameAPI.generateProof(initial_state ?? [], solution);
      setGeneratingProof(false);

      // Step 3: submit the Groth16 seal - sender must equal the locked winner.
      // The contract reconstructs the journal from the room's givens, hashes it,
      // and cross-contract-verifies via the RISC Zero verifier.
      setSubmittingProof(true);
      const txHash = await GameAPI.submitSolution(address, signTransaction, room_id, proof.seal);
      setProofSubmitted(true);
      onVerifySuccess(txHash);
    } catch (e) {
      console.error(e); toast.error(e instanceof Error ? e.message : 'Unknown error');
    }
    setLockingWinner(false);
    setSubmittingProof(false);
    setGeneratingProof(false);
  }

  function onClickAutoSolve() {
    if (!solvedArray.length) return;
    const tempHistory = history.slice();
    tempHistory.push(gameArray.slice());
    setHistory(tempHistory);
    setGameArray(solvedArray.slice());
    setGameSolved(true);
    setWon(true);
  }

  async function handleClaimReward() {
    if (!address) { toast.error('Please connect your wallet first'); return; }
    try {
      setClaiming(true);
      const txHash = await GameAPI.claimReward(address, signTransaction, room_id);
      setClaimed(true);
      try { localStorage.removeItem(PROGRESS_KEY); } catch {}
      onClaimSuccess(txHash);
    } catch (e) {
      console.error(e); toast.error(e instanceof Error ? e.message : 'Unknown error');
    }
    setClaiming(false);
  }

  const isBusy = lockingWinner || generatingProof || submittingProof || claiming;

  function busyLabel() {
    if (lockingWinner)   return 'LOCKING WINNER ON-CHAIN…';
    if (generatingProof) return 'LOCKED IN - GENERATING ZK PROOF…';
    if (submittingProof) return 'SUBMITTING PROOF TO CHAIN…';
    if (claiming)        return 'CLAIMING REWARD…';
    return '';
  }

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <GameSection onClick={onClickCell} />
        <StatusSection
          onClickNumber={onClickNumber}
          onChange={onChangeDifficulty}
          onClickUndo={onClickUndo}
          onClickErase={onClickErase}
          onClickHint={onClickHint}
          onClickMistakesMode={() => setMistakesMode(!mistakesMode)}
          onClickFastMode={() => { if (fastMode) setNumberSelected('0'); setCellSelected(-1); setFastMode(!fastMode); }}
          onClickAutoSolve={onClickAutoSolve}
        />
      </div>

      {/* Win modal */}
      {gameSolved && testMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85">
          <NeonPanel accent="cyan" className="w-full max-w-md mx-4 flex flex-col items-center gap-5">
            <div className="font-mono text-sm text-primary text-neon-cyan tracking-widest text-center">
              ▶ PUZZLE CLEARED ◀
            </div>
            <NeonButton variant="primary" size="lg" className="w-full" onClick={() => {
              const [init, solved] = getUniqueSudoku('Easy', undefined);
              setInitArray(init);
              setGameArray(init.slice());
              setSolvedArray(solved);
              setNumberSelected('0');
              setTimeGameStarted(moment());
              setCellSelected(-1);
              setHistory([]);
              setWon(false);
              setGameSolved(false);
            }}>
              PLAY AGAIN
            </NeonButton>
          </NeonPanel>
        </div>
      )}
      {gameSolved && !testMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85">
          <NeonPanel accent="cyan" className="w-full max-w-md mx-4 flex flex-col items-center gap-5">
            <div className="font-mono text-sm text-primary text-neon-cyan tracking-widest text-center">
              ▶ PUZZLE CLEARED ◀
            </div>

            <Image
              src="/congratulations.jpg"
              alt="Congratulations"
              width={360}
              height={160}
              className="border border-primary w-full object-cover max-h-40"
            />

            {claimed ? (
              <div className="flex flex-col items-center gap-4 w-full">
                <p className="font-mono text-sm text-accent text-neon-green text-center tracking-wider">REWARD CLAIMED!</p>
                <div className="flex gap-3 w-full">
                  <NeonButton variant="ghost" size="md" className="flex-1" onClick={() => router.push('/')}>
                    HOME
                  </NeonButton>
                  <NeonButton variant="primary" size="md" className="flex-1" onClick={() => router.push('/new-room')}>
                    NEW GAME
                  </NeonButton>
                </div>
              </div>
            ) : proofSubmitted ? (
              claiming ? (
                <p className="font-mono text-xs text-muted text-center">CLAIMING REWARD…</p>
              ) : (
                <div className="flex flex-col items-center gap-4 w-full">
                  <p className="font-mono text-sm text-accent text-neon-green text-center tracking-wider">SOLUTION VERIFIED ON-CHAIN!</p>
                  <NeonButton variant="primary" size="lg" className="w-full" onClick={handleClaimReward}>
                    CLAIM REWARD ▶
                  </NeonButton>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center gap-4 w-full">
                <p className="font-mono text-sm text-text text-center">
                  PROVE WITH <span className="text-accent text-neon-green">ZKVM</span>?
                </p>
                {isBusy ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-2 h-2 bg-primary"
                          style={{ animation: `blink-caret 1s step-end ${i * 0.33}s infinite`, boxShadow: '0 0 4px #00FFFF' }}
                        />
                      ))}
                    </div>
                    <p className="font-mono text-xs text-muted text-center">
                      {busyLabel()}
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-3 w-full">
                    <NeonButton variant="ghost" size="md" className="flex-1" onClick={handlePublicSolution}>
                      NO, PUBLIC
                    </NeonButton>
                    <NeonButton variant="primary" size="md" className="flex-1" onClick={handleProveSolution}>
                      YES, PROVE IT
                    </NeonButton>
                  </div>
                )}
                <p className="font-mono text-xs text-muted text-center">
                  * ZK PROOF TAKES ~1-2 MIN VIA RISC ZERO / BONSAI
                </p>
              </div>
            )}
          </NeonPanel>
        </div>
      )}
    </>
  );
};
