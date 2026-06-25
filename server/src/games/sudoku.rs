use crate::config::env_config::env;
use crate::games::{Game, Risc0Proof};
use anyhow::{anyhow, Context};
use async_trait::async_trait;
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use risc0_ethereum_contracts::encode_seal;
use risc0_zkvm::{default_prover, sha::Digest, ExecutorEnv, ProverOpts};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use sudoku_methods::{SUDOKU_ELF, SUDOKU_ID};

pub struct SudokuGame {
    pub initial_state: Vec<(u8, u8)>,
    pub solution: Vec<u8>,
}

/// Request body for the stateless remote prover (`POST {PROVER_URL}`).
#[derive(Serialize)]
struct RemoteProveReq {
    /// Guest RISC-V ELF, base64.
    elf: String,
    /// Serialized guest input as a RISC0 word stream (LE bytes), base64.
    input: String,
    receipt_kind: String,
}

/// Response from the remote prover: all hex-encoded.
#[derive(Deserialize)]
struct RemoteProveResp {
    seal: String,
    journal: String,
    image_id: String,
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
        // When a remote prover is configured, offload proving to it over HTTP.
        if let Some(url) = env().PROVER_URL.as_deref() {
            return self.prove_remote(url).await;
        }

        let initial_state = self.initial_state.clone();
        let solution = self.solution.clone();

        // Proving is CPU-heavy and blocking (local r0vm / Docker, or a blocking
        // Bonsai client), so keep it off the async runtime.
        tokio::task::spawn_blocking(move || prove(initial_state, solution))
            .await
            .context("proving task panicked")?
    }
}

impl SudokuGame {
    /// Generate the proof on a remote stateless prover. We ship the guest ELF
    /// plus the input serialized as a RISC0 word stream - byte-identical to what
    /// `ExecutorEnv::write(&initial_state).write(&solution)` builds locally - and
    /// the prover returns the Groth16 seal, journal, and image id.
    async fn prove_remote(&self, url: &str) -> anyhow::Result<Risc0Proof> {
        let mut words =
            risc0_zkvm::serde::to_vec(&self.initial_state).context("serializing initial_state")?;
        words.extend(risc0_zkvm::serde::to_vec(&self.solution).context("serializing solution")?);
        let input_bytes: Vec<u8> = words.iter().flat_map(|w| w.to_le_bytes()).collect();

        let req = RemoteProveReq {
            elf: B64.encode(SUDOKU_ELF),
            input: B64.encode(&input_bytes),
            receipt_kind: "groth16".to_string(),
        };

        let resp = reqwest::Client::builder()
            .timeout(Duration::from_secs(300))
            .build()
            .context("building http client")?
            .post(url)
            .json(&req)
            .send()
            .await
            .context("calling remote prover")?;

        let status = resp.status();
        let body = resp.text().await.context("reading prover response")?;
        anyhow::ensure!(
            status.is_success(),
            "remote prover returned {status}: {body}"
        );

        let resp: RemoteProveResp = serde_json::from_str(&body)
            .with_context(|| format!("decoding prover response: {body}"))?;

        let seal = hex::decode(resp.seal.trim()).context("decoding seal hex")?;
        let journal = hex::decode(resp.journal.trim()).context("decoding journal hex")?;
        let id_bytes = hex::decode(resp.image_id.trim()).context("decoding image_id hex")?;
        let id: [u8; 32] = id_bytes
            .as_slice()
            .try_into()
            .map_err(|_| anyhow!("image_id must be 32 bytes, got {}", id_bytes.len()))?;

        // The prover derives the image id from the ELF we uploaded; it must match
        // the guest pinned in our contract, or the on-chain verify would reject.
        anyhow::ensure!(
            id == image_id(),
            "remote image_id {} != local guest image_id {}",
            hex::encode(id),
            hex::encode(image_id())
        );

        Ok(Risc0Proof {
            seal,
            journal,
            image_id: id,
        })
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
