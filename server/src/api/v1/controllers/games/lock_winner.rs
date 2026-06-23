use crate::api::v1::errors::AppError;
use crate::chain;
use anyhow::anyhow;
use axum::Json;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tracing::{error, info, warn};

#[derive(Serialize, Deserialize, Debug)]
pub struct LockWinnerReq {
    pub room_id: u64,
    pub winner: String,
    pub solution: Vec<u8>,
}

pub async fn lock_winner(Json(req): Json<LockWinnerReq>) -> Result<Json<String>, AppError> {
    info!(room_id = req.room_id, winner = %req.winner, "lock_winner requested");

    let initial_state = query_initial_state(req.room_id).await?;
    info!(
        room_id = req.room_id,
        givens = initial_state.len(),
        "loaded initial_state from chain"
    );

    check_solution(&initial_state, &req.solution).map_err(|e| {
        warn!(room_id = req.room_id, winner = %req.winner, err = %e, "solution rejected");
        AppError::Unknown(anyhow!("invalid solution: {}", e))
    })?;
    info!(room_id = req.room_id, winner = %req.winner, "solution valid, locking winner");

    chain::invoke(
        "lock_winner",
        &[
            ("room_id", req.room_id.to_string()),
            ("winner", req.winner.clone()),
        ],
    )
    .await
    .map_err(|e| {
        error!(room_id = req.room_id, winner = %req.winner, err = %e, "lock_winner failed");
        AppError::from(e)
    })?;

    info!(room_id = req.room_id, winner = %req.winner, "winner locked on-chain");
    Ok(Json("ok".to_string()))
}

/// Reads the room and decodes its givens (`[{coord,value}]`) into pairs.
async fn query_initial_state(room_id: u64) -> Result<Vec<(u8, u8)>, AppError> {
    let out = chain::query("query_room", &[("room_id", room_id.to_string())])
        .await
        .map_err(AppError::from)?;

    let parsed: Value = serde_json::from_str(&out)
        .map_err(|e| AppError::Unknown(anyhow!("failed to parse room query: {e}")))?;

    let initial_state = parsed
        .get("initial_state")
        .ok_or_else(|| AppError::Unknown(anyhow!("missing initial_state in room")))?;
    if initial_state.is_null() {
        return Err(AppError::Unknown(anyhow!("game has not started yet")));
    }

    let cells = initial_state
        .as_array()
        .ok_or_else(|| AppError::Unknown(anyhow!("initial_state is not an array")))?;
    let mut pairs = Vec::with_capacity(cells.len());
    for cell in cells {
        let coord = cell.get("coord").and_then(Value::as_u64);
        let value = cell.get("value").and_then(Value::as_u64);
        match (coord, value) {
            (Some(c), Some(v)) => pairs.push((c as u8, v as u8)),
            _ => return Err(AppError::Unknown(anyhow!("malformed given cell: {cell}"))),
        }
    }
    Ok(pairs)
}

fn check_solution(initial_state: &[(u8, u8)], answer: &[u8]) -> Result<(), String> {
    if initial_state.len() + answer.len() != 81 {
        return Err("sum of initial state and answer length must be 81".into());
    }
    let mut grid = [[0u8; 9]; 9];
    for (coord, value) in initial_state {
        if !(1..=9).contains(value) {
            return Err("values in initial state must be 1..9".into());
        }
        let (x, y) = ((*coord / 9) as usize, (*coord % 9) as usize);
        grid[x][y] = *value;
    }
    let mut ptr = 0usize;
    for i in 0..9 {
        for j in 0..9 {
            if grid[i][j] == 0 {
                if !(1..=9).contains(&answer[ptr]) {
                    return Err("values in answer must be 1..9".into());
                }
                grid[i][j] = answer[ptr];
                ptr += 1;
            }
        }
    }
    for row in &grid {
        if !is_valid(row) {
            return Err("invalid row".into());
        }
    }
    for j in 0..9 {
        let col = [
            grid[0][j], grid[1][j], grid[2][j], grid[3][j], grid[4][j], grid[5][j], grid[6][j],
            grid[7][j], grid[8][j],
        ];
        if !is_valid(&col) {
            return Err("invalid column".into());
        }
    }
    for bi in (0..9).step_by(3) {
        for bj in (0..9).step_by(3) {
            let mut sq = [0u8; 9];
            let mut k = 0;
            for x in 0..3 {
                for y in 0..3 {
                    sq[k] = grid[bi + x][bj + y];
                    k += 1;
                }
            }
            if !is_valid(&sq) {
                return Err("invalid 3x3 box".into());
            }
        }
    }
    Ok(())
}

fn is_valid(group: &[u8; 9]) -> bool {
    let mut seen = [false; 9];
    for &x in group {
        if x == 0 || seen[(x - 1) as usize] {
            return false;
        }
        seen[(x - 1) as usize] = true;
    }
    true
}
