use crate::api::v1::routes::all_routes::get_all_routes;
use crate::config::config_app;
use crate::config::env_config::env;
use tower_http::trace::{DefaultMakeSpan, DefaultOnRequest, DefaultOnResponse, TraceLayer};
use tracing::{info, Level};
use tracing_subscriber::EnvFilter;

pub mod api;
pub mod chain;
pub mod config;
pub mod games;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| "info,tower_http=info".into()),
        )
        .with_target(false)
        .init();

    config_app().await;
    let app = get_all_routes().layer(
        TraceLayer::new_for_http()
            .make_span_with(DefaultMakeSpan::new().level(Level::INFO))
            .on_request(DefaultOnRequest::new().level(Level::INFO))
            .on_response(DefaultOnResponse::new().level(Level::INFO)),
    );
    let addr = format!("{}:{}", env().SERVER_HOST, env().SERVER_PORT);
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    info!("server listening on {}", addr);
    axum::serve(listener, app).await.unwrap();
}
