use crate::config::env_config::config_env;

pub mod env_config;

pub async fn config_app() {
    config_env().await;
}
