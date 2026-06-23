use crate::api::v1::controllers::games::generate_proof::generate_proof;
use axum::{routing::post, Router};

pub fn router() -> Router {
    Router::new().route("/generate-proof", post(generate_proof))
}
