use axum::Router;

pub mod generate_proof;
pub mod lock_winner;
pub mod new_room;
pub mod service_fee;
pub mod start_game;

pub fn router() -> Router {
    Router::new().nest(
        "/games",
        Router::new()
            .merge(new_room::router())
            .merge(generate_proof::router())
            .merge(service_fee::router())
            .merge(start_game::router())
            .merge(lock_winner::router()),
    )
}
