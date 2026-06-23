use axum::http::StatusCode;
use axum::response::IntoResponse;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("unknown error")]
    Unknown(#[from] anyhow::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match self {
            AppError::Unknown(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
        };
        (status, message).into_response()
    }
}
