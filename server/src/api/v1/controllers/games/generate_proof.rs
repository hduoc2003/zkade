use crate::api::v1::errors::AppError;
use crate::games::sudoku::SudokuGame;
use crate::games::Game;
use axum::Json;
use serde::{Deserialize, Serialize};
use std::time::Instant;
use tracing::{error, info};

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateProofReq {
    initial_state: Vec<(u8, u8)>,
    solution: Vec<u8>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateProofRes {
    /// Groth16 seal (selector-prefixed), hex.
    seal: String,
    /// Committed journal bytes (the givens), hex.
    journal: String,
    /// Guest image id, hex.
    image_id: String,
}

pub async fn generate_proof(
    Json(game): Json<GenerateProofReq>,
) -> Result<Json<GenerateProofRes>, AppError> {
    info!(
        givens = game.initial_state.len(),
        solution_len = game.solution.len(),
        "generate_proof requested"
    );
    let started = Instant::now();
    let game = SudokuGame {
        initial_state: game.initial_state,
        solution: game.solution,
    };
    let proof = game.generate_proof().await.map_err(|e| {
        error!(err = %e, "proof generation failed");
        AppError::from(e)
    })?;
    info!(
        elapsed_ms = started.elapsed().as_millis(),
        "proof generation complete"
    );
    Ok(Json(GenerateProofRes {
        seal: hex::encode(proof.seal),
        journal: hex::encode(proof.journal),
        image_id: hex::encode(proof.image_id),
    }))
}
