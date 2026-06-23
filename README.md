# ZKADE

> Prove you won. Without revealing how.

ZKADE is a zero-knowledge proof gaming arcade on **Stellar**. Players compete in games with verifiable solutions, deposit funds into a Soroban smart contract, and the winner submits a ZK proof that is **verified on-chain**. The proof convinces the contract that the player knows a correct solution — **without ever revealing the solution itself** — and unlocks the entire prize pool, trustlessly.

Built for the [Stellar Hacks: Real-World ZK](https://dorahacks.io/hackathon/stellar-hacks-zk) hackathon.

---

## What it does

The core insight: a player can **prove they have a correct solution without revealing what that solution is**. This is enforced cryptographically — a RISC Zero Groth16 proof attests only to the *fact* of correctness, not the answer. A Soroban contract verifies the proof on-chain using Stellar's native **BN254** host functions (Protocol 25 "X-Ray"), then releases the pot to the winner.

The architecture is **game-agnostic**: any game whose winning condition can be expressed as a Rust program can be plugged in as a new RISC Zero guest. Sudoku is the first.

### Why ZK?

Opponents can watch every transaction on-chain, yet still cannot copy the winner's answer — the submitted proof reveals nothing about the solution. There is no oracle, no trusted judge, no admin override: correctness is decided by an on-chain pairing check.

---

## Architecture

```
Browser ──Stellar Wallets Kit / Freighter──▶ sign Soroban invoke ──▶ Stellar testnet
   │
   ├─ solve puzzle (locally; never leaves the browser)
   │
   └─ POST /api/v1/games/generate-proof ──▶ server (risc0-zkvm, Bonsai/local)
            └─ Groth16 receipt { seal, journal, image_id }
                 └─ submit_solution(seal) tx ──▶ sudoku contract
                          └─ cross-contract verify(seal, image_id, sha256(journal))
                                   └─ RISC Zero Groth16 verifier (native BN254) ──▶ ✓ / revert
```

The sudoku contract **reconstructs the proof's journal from the room's stored puzzle givens**, hashes it, and passes that digest to the verifier. This binds each proof to a specific puzzle — a proof for one room cannot be replayed in another, and `image_id` pins proofs to *our* guest program.

---

## Stack

| Component   | Tech                                                              | Location          |
|-------------|-------------------------------------------------------------------|-------------------|
| Frontend    | Next.js 15, Tailwind, Stellar Wallets Kit + Freighter, `@stellar/stellar-sdk` | `frontend/`       |
| Backend     | Rust, Axum, `risc0-zkvm` (Bonsai / local proving)                 | `server/`         |
| Game contract | Soroban (`soroban-sdk` 26), on Stellar testnet                  | `soroban/`        |
| ZK verifier | RISC Zero Groth16 verifier (BN254), vendored from [NethermindEth/stellar-risc0-verifier](https://github.com/NethermindEth/stellar-risc0-verifier) (Apache-2.0) | `risc0-verifier/` |
| ZK program  | RISC Zero zkVM guest (RISC-V, Groth16), image v3.0                | `games/sudoku/`   |

---

## Deployment (Stellar testnet)

See `soroban/deployment.json`.

| Contract            | Address                                                      |
|---------------------|--------------------------------------------------------------|
| Sudoku game         | `CAR43CM6OX2D7CFDSMY74R2B2QEA56CKGVUN32JSY3MY364LMGD6PGYM`     |
| RISC Zero verifier  | `CCEV7GX4QCM4HUOD4LSRW4IW2HS3PCY2EA5FS43FWC5Q6ZHTYDGRHCCD`     |
| Reward token        | native XLM SAC (`CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`) |

---

## Prerequisites

- Node.js 18+, pnpm
- Rust + `cargo`, with the `wasm32v1-none` target (`rustup target add wasm32v1-none`)
- [Stellar CLI](https://github.com/stellar/stellar-cli) (`stellar`)
- RISC Zero toolchain: `curl -L https://risczero.com/install | bash && rzup install`
- Docker (for local Groth16 proving — x86_64)
- [Freighter](https://www.freighter.app/) browser wallet (testnet enabled)

---

## Setup

### 1. Install

```bash
git clone <repo> && cd stellar-zkade
cd frontend && pnpm install && cd ..
```

### 2. Deploy contracts to testnet

```bash
cd soroban && ./deploy.sh        # funds a key via Friendbot, deploys verifier + game
                                 # writes addresses to soroban/deployment.json
```

### 3. Configure environment

**`server/.env`** (copy from `.env.example`) — set `GAME_CONTRACT` to the deployed sudoku id and `GAME_OWNER` to your funded `stellar` identity. Optionally set `BONSAI_API_KEY` / `BONSAI_API_URL` for hosted proving (else proves locally).

**`frontend/.env.local`** (copy from `.env.example`) — set `NEXT_PUBLIC_SUDOKU_CONTRACT` and `NEXT_PUBLIC_GAME_OWNER`.

### 4. Run

```bash
# Terminal 1 — backend
cd server && cargo run

# Terminal 2 — frontend
cd frontend && pnpm dev
# open http://localhost:3000
```

---

## How the round works

1. **Create & join** — the owner (server) creates a room; players join by depositing the entry fee (XLM) into the contract.
2. **Start** — the owner publishes the puzzle givens on-chain.
3. **Solve** — players solve locally. The solution never leaves the browser.
4. **Prove** — the first solver locks themselves as winner, then the server generates a RISC Zero Groth16 proof of their solution.
5. **Verify** — the player submits the proof; the contract cross-contract-verifies it on-chain (native BN254 pairing).
6. **Claim** — the verified winner sweeps the prize pool.

A public (reveal-the-answer) path is also available as a fallback.

---

## Build & test

```bash
# RISC Zero guest + host (dumps image_id / journal; `prove` for a full Groth16 proof)
cd games/sudoku && cargo run -p sudoku-host          # add `-- prove` for a real proof

# Soroban contract unit tests (mocked verifier + journal byte-equality vs. real guest)
cd soroban && cargo test -p sudoku

# Contracts → wasm
cd soroban && stellar contract build

# Frontend
cd frontend && pnpm build
```
