use crate::api::v1::errors::AppError;
use crate::chain;
use axum::Json;
use serde::{Deserialize, Serialize};
use serde_json::{json, to_string};
use sudoku::Sudoku;
use tracing::{error, info};

#[derive(Serialize, Deserialize, Debug)]
pub struct StartGameReq {
    room_id: u64,
}

/// Generate a puzzle as `(compressed_coord, value)` givens, ordered by coord.
/// The contract stores these as `GivenCell { coord, value }`; the same ordering
/// is used by the prover so the committed journal matches on-chain.
fn generate_puzzle() -> Vec<(u8, u8)> {
    let bytes = Sudoku::generate().to_bytes();
    bytes
        .iter()
        .enumerate()
        .filter_map(|(i, &v)| if v != 0 { Some((i as u8, v)) } else { None })
        .collect()
}

pub async fn start_game(Json(req): Json<StartGameReq>) -> Result<Json<String>, AppError> {
    info!(room_id = req.room_id, "start_game requested");
    let initial_state = generate_puzzle();
    info!(
        room_id = req.room_id,
        givens = initial_state.len(),
        "puzzle generated"
    );

    // Soroban `Vec<GivenCell>` is encoded as a JSON array of {coord, value}.
    let givens_json = to_string(
        &initial_state
            .iter()
            .map(|(coord, value)| json!({ "coord": coord, "value": value }))
            .collect::<Vec<_>>(),
    )
    .map_err(|e| AppError::Unknown(anyhow::anyhow!("failed to encode givens: {e}")))?;

    chain::invoke(
        "start_game",
        &[
            ("room_id", req.room_id.to_string()),
            ("initial_state", givens_json),
        ],
    )
    .await
    .map_err(|e| {
        error!(room_id = req.room_id, err = %e, "start_game failed");
        AppError::from(e)
    })?;

    info!(room_id = req.room_id, "game started on-chain");
    Ok(Json("ok".to_string()))
}
