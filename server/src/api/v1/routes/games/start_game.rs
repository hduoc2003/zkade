use crate::api::v1::controllers::games::start_game::start_game;
use axum::routing::post;
use axum::Router;

pub fn router() -> Router {
    Router::new().route("/start-game", post(start_game))
}
