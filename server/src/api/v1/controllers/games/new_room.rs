use crate::api::v1::errors::AppError;
use crate::chain;
use crate::config::env_config::env;
use anyhow::anyhow;
use axum::Json;
use serde::{Deserialize, Serialize};
use tracing::{error, info};

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateNewRoomReq {
    deposit_price: u128,
    max_players: u32,
    creator: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateNewRoomRes {
    room_id: u64,
}

pub async fn create_new_room(
    Json(room_info): Json<CreateNewRoomReq>,
) -> Result<Json<CreateNewRoomRes>, AppError> {
    info!(
        creator = %room_info.creator,
        deposit_price = room_info.deposit_price,
        max_players = room_info.max_players,
        "create_new_room requested"
    );

    // Soroban returns the new room id as the call's return value (stdout).
    let out = chain::invoke(
        "create_new_room",
        &[
            ("deposit_price", room_info.deposit_price.to_string()),
            ("service_fee", env().SERVICE_FEE.to_string()),
            ("max_players", room_info.max_players.to_string()),
            ("creator", room_info.creator.clone()),
        ],
    )
    .await
    .map_err(|e| {
        error!(err = %e, "create_new_room failed");
        AppError::from(e)
    })?;

    let room_id: u64 = out
        .trim()
        .parse()
        .map_err(|_| AppError::Unknown(anyhow!("unexpected room id from contract: {out}")))?;
    info!(room_id, "room created on-chain");
    Ok(Json(CreateNewRoomRes { room_id }))
}
