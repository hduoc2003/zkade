//! Dev/verification host for the Sudoku RISC Zero guest.
//!
//! Usage:
//!   cargo run -p sudoku-host            # fast: execute only, dump image_id + journal
//!   cargo run -p sudoku-host -- prove   # full Groth16 proof (needs Docker/x86 or Bonsai)
//!
//! This is a developer tool to pin the journal byte layout and confirm the
//! proof pipeline. The production prover lives in the server.

use anyhow::{Context, Result};
use risc0_ethereum_contracts::encode_seal;
use risc0_zkvm::{default_executor, default_prover, sha::Digest, ExecutorEnv, ProverOpts};
use sudoku_methods::{SUDOKU_ELF, SUDOKU_ID};

/// A tiny fully-solved board with NO givens (initial_state empty): the answer
/// is the entire 81-cell solution. Keeps the dev path independent of a puzzle
/// generator. (initial_state.len() + answer.len() must equal 81.)
fn sample_input() -> (Vec<(u8, u8)>, Vec<u8>) {
    let initial_state: Vec<(u8, u8)> = vec![];
    let answer: Vec<u8> = vec![
        1, 2, 3, 4, 5, 6, 7, 8, 9, //
        4, 5, 6, 7, 8, 9, 1, 2, 3, //
        7, 8, 9, 1, 2, 3, 4, 5, 6, //
        2, 3, 4, 5, 6, 7, 8, 9, 1, //
        5, 6, 7, 8, 9, 1, 2, 3, 4, //
        8, 9, 1, 2, 3, 4, 5, 6, 7, //
        3, 4, 5, 6, 7, 8, 9, 1, 2, //
        6, 7, 8, 9, 1, 2, 3, 4, 5, //
        9, 1, 2, 3, 4, 5, 6, 7, 8, //
    ];
    (initial_state, answer)
}

/// Same solved board, but the first three cells (coords 0,1,2 -> values 1,2,3)
/// are givens; the answer is the remaining 78 cells in row-major order.
fn givens_sample() -> (Vec<(u8, u8)>, Vec<u8>) {
    let (_, full) = sample_input();
    let initial_state = vec![(0u8, 1u8), (1u8, 2u8), (2u8, 3u8)];
    let answer = full[3..].to_vec();
    (initial_state, answer)
}

fn image_id_hex() -> String {
    let digest = Digest::from(SUDOKU_ID);
    hex::encode(digest.as_bytes())
}

fn main() -> Result<()> {
    let prove = std::env::args().nth(1).as_deref() == Some("prove");

    let (initial_state, answer) = sample_input();
    let env = ExecutorEnv::builder()
        .write(&initial_state)?
        .write(&answer)?
        .build()?;

    println!("image_id (SUDOKU_ID) = 0x{}", image_id_hex());

    if !prove {
        // Fast path: execute to obtain the journal without proving.
        let session = default_executor()
            .execute(env, SUDOKU_ELF)
            .context("guest execution failed")?;
        let journal = session.journal.bytes;
        println!("[empty givens] journal.len = {}", journal.len());
        println!("[empty givens] journal     = 0x{}", hex::encode(&journal));

        // Non-empty givens: move the first 3 solved cells into initial_state so
        // we can observe the exact byte packing the contract must reproduce.
        let (gs, ans) = givens_sample();
        let env2 = ExecutorEnv::builder().write(&gs)?.write(&ans)?.build()?;
        let session2 = default_executor().execute(env2, SUDOKU_ELF)?;
        let j2 = session2.journal.bytes;
        println!("[givens {:?}] journal.len = {}", gs, j2.len());
        println!("[givens] journal     = 0x{}", hex::encode(&j2));
        return Ok(());
    }

    // Full proof path.
    let receipt = default_prover()
        .prove_with_opts(env, SUDOKU_ELF, &ProverOpts::groth16())
        .context("proving failed (Groth16 needs x86+Docker locally, or Bonsai)")?
        .receipt;

    receipt
        .verify(SUDOKU_ID)
        .context("receipt verification failed")?;

    let journal = receipt.journal.bytes.clone();
    let seal = encode_seal(&receipt).context("failed to encode seal")?;

    println!("journal     = 0x{}", hex::encode(&journal));
    println!("seal        = 0x{}", hex::encode(&seal));
    println!("seal.len    = {}", seal.len());
    Ok(())
}
