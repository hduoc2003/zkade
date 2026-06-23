use crate::api::v1::routes::games;
use axum::routing::Router;
use tower_http::cors::{AllowHeaders, AllowMethods, Any, CorsLayer};

pub fn get_all_routes() -> Router {
    Router::new()
        .nest("/api/v1", Router::new().merge(games::router()))
        .layer(
            CorsLayer::new()
                .allow_methods(AllowMethods::any())
                .allow_headers(AllowHeaders::any())
                .allow_origin(Any),
        )
}
