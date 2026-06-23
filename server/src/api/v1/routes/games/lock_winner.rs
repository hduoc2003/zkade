use crate::api::v1::controllers::games::lock_winner::lock_winner;
use axum::routing::post;
use axum::Router;

pub fn router() -> Router {
    Router::new().route("/lock-winner", post(lock_winner))
}
