use crate::games::{Game, Risc0Proof};
use anyhow::{anyhow, Context};
use async_trait::async_trait;
use risc0_ethereum_contracts::encode_seal;
use risc0_zkvm::{default_prover, sha::Digest, ExecutorEnv, ProverOpts};
use sudoku_methods::{SUDOKU_ELF, SUDOKU_ID};

pub struct SudokuGame {
    pub initial_state: Vec<(u8, u8)>,
    pub solution: Vec<u8>,
}

/// The guest image id as 32 bytes (matches the value pinned in the contract).
pub fn image_id() -> [u8; 32] {
    *Digest::from(SUDOKU_ID)
        .as_bytes()
        .first_chunk::<32>()
        .unwrap()
}

#[async_trait]
impl Game for SudokuGame {
    async fn generate_proof(&self) -> anyhow::Result<Risc0Proof> {
        let initial_state = self.initial_state.clone();
        let solution = self.solution.clone();

        // Proving is CPU-heavy and blocking (local r0vm / Docker, or a blocking
        // Bonsai client), so keep it off the async runtime.
        tokio::task::spawn_blocking(move || prove(initial_state, solution))
            .await
            .context("proving task panicked")?
    }
}

fn prove(initial_state: Vec<(u8, u8)>, solution: Vec<u8>) -> anyhow::Result<Risc0Proof> {
    let env = ExecutorEnv::builder()
        .write(&initial_state)?
        .write(&solution)?
        .build()?;

    // `default_prover()` routes to Bonsai when BONSAI_API_KEY + BONSAI_API_URL
    // are set, else proves locally. Groth16 is required for on-chain verification.
    let receipt = default_prover()
        .prove_with_opts(env, SUDOKU_ELF, &ProverOpts::groth16())
        .context("proof generation failed")?
        .receipt;

    receipt
        .verify(SUDOKU_ID)
        .context("generated receipt failed self-verification")?;

    let journal = receipt.journal.bytes.clone();
    let seal = encode_seal(&receipt).map_err(|e| anyhow!("failed to encode seal: {e}"))?;

    Ok(Risc0Proof {
        seal,
        journal,
        image_id: image_id(),
    })
}
