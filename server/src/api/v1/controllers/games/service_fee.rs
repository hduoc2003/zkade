use crate::api::v1::errors::AppError;
use crate::config::env_config::env;
use axum::Json;

pub async fn get_service_fee() -> Result<Json<u128>, AppError> {
    Ok(Json(env().SERVICE_FEE))
}
