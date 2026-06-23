//! Generated guest artifacts.
//!
//! `risc0_build::embed_methods()` writes `methods.rs` into `OUT_DIR` exposing,
//! for the guest binary named `sudoku`:
//! - `SUDOKU_ELF: &[u8]`   — the compiled guest RISC-V ELF
//! - `SUDOKU_ID: [u32; 8]` — the image id (the program's cryptographic identity;
//!   the on-chain verifier checks proofs against this id)
//! - `SUDOKU_PATH: &str`   — path to the ELF on disk
include!(concat!(env!("OUT_DIR"), "/methods.rs"));
