//! Thin wrapper around the `stellar` CLI for owner-signed Soroban invocations
//! and read-only queries against the sudoku contract.
//!
//! `stellar contract invoke` writes the contract's return value (JSON) to
//! stdout and progress/log lines to stderr, so we capture stdout as the result.

use anyhow::{anyhow, Result};
use tokio::process::Command;

use crate::config::env_config::env;

/// Invoke a contract function as the game owner and submit it on-chain.
/// Returns the function's JSON-encoded return value (stdout, trimmed).
pub async fn invoke(function: &str, args: &[(&str, String)]) -> Result<String> {
    run(function, args, true).await
}

/// Simulate a read-only call (no transaction submitted). Returns the JSON result.
pub async fn query(function: &str, args: &[(&str, String)]) -> Result<String> {
    run(function, args, false).await
}

async fn run(function: &str, args: &[(&str, String)], send: bool) -> Result<String> {
    let e = env();
    let mut cmd = Command::new("stellar");
    cmd.args([
        "contract",
        "invoke",
        "--id",
        &e.GAME_CONTRACT,
        "--source",
        &e.GAME_OWNER,
        "--rpc-url",
        &e.RPC_URL,
        "--network-passphrase",
        &e.NETWORK_PASSPHRASE,
        if send { "--send=yes" } else { "--send=no" },
        "--",
        function,
    ]);
    for (name, value) in args {
        cmd.arg(format!("--{name}"));
        cmd.arg(value);
    }

    let output = cmd
        .output()
        .await
        .map_err(|e| anyhow!("failed to spawn `stellar` (is the CLI installed?): {e}"))?;

    if !output.status.success() {
        return Err(anyhow!(
            "stellar invoke `{function}` failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}
