use dotenv::dotenv;
use tokio::sync::OnceCell;

#[allow(non_snake_case)]
pub struct Env {
    pub SERVER_HOST: String,
    pub SERVER_PORT: u32,
    /// Soroban sudoku contract id (`C...`).
    pub GAME_CONTRACT: String,
    /// Stellar CLI identity alias (or `S...` secret) the server signs owner txs with.
    pub GAME_OWNER: String,
    /// Soroban RPC endpoint.
    pub RPC_URL: String,
    /// Stellar network passphrase.
    pub NETWORK_PASSPHRASE: String,
    /// Service fee added to each room, in token base units (stroops for XLM).
    pub SERVICE_FEE: u128,
    /// Remote RISC Zero prover endpoint (full `/generate-proof` URL). When set,
    /// proofs are generated there instead of locally. `None` → local/Bonsai.
    pub PROVER_URL: Option<String>,
}

static ENV: OnceCell<Env> = OnceCell::const_new();

fn read_env(key: &'static str) -> String {
    std::env::var(key).unwrap_or_else(|_| panic!("{} must be set", key))
}

/// Optional env var: `None` when unset or empty/whitespace.
fn read_env_opt(key: &'static str) -> Option<String> {
    std::env::var(key).ok().filter(|s| !s.trim().is_empty())
}

pub async fn config_env() {
    dotenv().ok();
    ENV.get_or_init(|| async {
        Env {
            SERVER_HOST: read_env("SERVER_HOST"),
            SERVER_PORT: read_env("SERVER_PORT")
                .parse()
                .expect("SERVER_PORT must be a number"),
            GAME_CONTRACT: read_env("GAME_CONTRACT"),
            GAME_OWNER: read_env("GAME_OWNER"),
            RPC_URL: read_env("RPC_URL"),
            NETWORK_PASSPHRASE: read_env("NETWORK_PASSPHRASE"),
            SERVICE_FEE: read_env("SERVICE_FEE")
                .parse()
                .expect("SERVICE_FEE must be a number"),
            PROVER_URL: read_env_opt("PROVER_URL"),
        }
    })
    .await;
}

pub fn env() -> &'static Env {
    ENV.get().expect("env not initialized")
}
