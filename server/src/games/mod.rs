use async_trait::async_trait;

pub mod sudoku;

/// A RISC Zero proof bundle for on-chain verification.
///
/// - `seal`: the Groth16 seal (selector-prefixed, from `encode_seal`).
/// - `journal`: the committed public values (the puzzle givens).
/// - `image_id`: the guest program's image id (its cryptographic identity).
#[derive(Debug, Clone)]
pub struct Risc0Proof {
    pub seal: Vec<u8>,
    pub journal: Vec<u8>,
    pub image_id: [u8; 32],
}

#[async_trait]
pub trait Game {
    async fn generate_proof(&self) -> anyhow::Result<Risc0Proof>;
}
