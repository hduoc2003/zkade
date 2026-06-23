use crate::api::v1::controllers::games::new_room::create_new_room;
use axum::{routing::post, Router};

pub fn router() -> Router {
    Router::new().route("/new-room", post(create_new_room))
}
