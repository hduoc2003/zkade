use crate::api::v1::controllers::games::service_fee::get_service_fee;
use axum::routing::get;
use axum::Router;

pub fn router() -> Router {
    Router::new().route("/service-fee", get(get_service_fee))
}
