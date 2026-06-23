#![no_std]
//! ZKADE Sudoku game contract (Soroban port).
//!
//! Players deposit a token to join a room; the owner (server) starts the game
//! by publishing the puzzle givens. The winner proves a valid solution and
//! claims the pot. Two solution paths:
//!  - `submit_public`: reveal the answer on-chain; the contract re-validates it.
//!  - `submit_solution` (the headline ZK path): submit a RISC Zero Groth16
//!    `seal`. The contract reconstructs the proof's journal from the room's
//!    stored givens, hashes it, and cross-contract-calls the RISC Zero verifier
//!    router. A passing proof attests "I know a valid completion of *this*
//!    puzzle" without revealing the completion.
//!
//! The journal byte layout produced here must match the guest's
//! `env::commit(&Vec<u8>)` where the committed bytes are the givens flattened
//! as `[coord_0, value_0, coord_1, value_1, ...]`. risc0 serde encodes that as
//! a little-endian u32 length (number of bytes) followed by one little-endian
//! u32 word per byte. See `reconstruct_journal`.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token, Address, Bytes, BytesN, Env,
    IntoVal, Symbol, Vec,
};

const DAY_LEDGERS: u32 = 17_280; // ~5s ledgers per day
const GAME_BUMP: u32 = 30 * DAY_LEDGERS;
const GAME_TTL: u32 = GAME_BUMP + DAY_LEDGERS;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    RoomNotFound = 1,
    GameAlreadyStarted = 2,
    GameNotStarted = 3,
    GameOver = 4,
    RoomFull = 5,
    AlreadyJoined = 6,
    NotAPlayer = 7,
    NoPlayers = 8,
    WinnerAlreadySet = 9,
    WinnerNotLocked = 10,
    NotLockedWinner = 11,
    WinnerNotPlayer = 12,
    NotSolved = 13,
    AlreadyClaimed = 14,
    NotWinner = 15,
    NoProfit = 16,
    InvalidSolution = 17,
    Overflow = 18,
}

/// A puzzle given: the value at a compressed coordinate (`coord = row*9 + col`).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GivenCell {
    pub coord: u32,
    pub value: u32,
}

#[contracttype]
#[derive(Clone)]
pub struct SudokuGame {
    pub initial_state: Option<Vec<GivenCell>>,
    pub creator: Address,
    pub deposit_price: i128,
    pub service_fee: i128,
    pub max_players: u32,
    pub players: Vec<Address>,
    pub winner: Option<Address>,
    pub solved: bool,
    pub claimed: bool,
}

#[contracttype]
pub enum DataKey {
    Owner,
    RoomCounter,
    OwnerProfit,
    ImageId,
    Verifier,
    Token,
    Game(u64),
}

#[contract]
pub struct Sudoku;

#[contractimpl]
impl Sudoku {
    /// Deploy-time configuration. `image_id` pins which guest program's proofs
    /// are accepted (the RISC Zero analogue of a verifying key). `verifier`
    /// is the RISC Zero verifier router. `token` is the deposit/reward asset.
    pub fn __constructor(
        env: Env,
        owner: Address,
        image_id: BytesN<32>,
        verifier: Address,
        token: Address,
    ) {
        let s = env.storage().instance();
        s.set(&DataKey::Owner, &owner);
        s.set(&DataKey::RoomCounter, &0u64);
        s.set(&DataKey::OwnerProfit, &0i128);
        s.set(&DataKey::ImageId, &image_id);
        s.set(&DataKey::Verifier, &verifier);
        s.set(&DataKey::Token, &token);
    }

    /// Owner-only. Allocates a new room. Returns the room id.
    pub fn create_new_room(
        env: Env,
        deposit_price: i128,
        service_fee: i128,
        max_players: u32,
        creator: Address,
    ) -> u64 {
        require_owner(&env);
        let room_id = next_room_id(&env);
        save_game(
            &env,
            room_id,
            &SudokuGame {
                initial_state: None,
                creator,
                deposit_price,
                service_fee,
                max_players,
                players: Vec::new(&env),
                winner: None,
                solved: false,
                claimed: false,
            },
        );
        room_id
    }

    /// A player deposits `deposit_price + service_fee` to join a not-yet-started
    /// room. The service fee accrues to the owner; the deposit funds the pot.
    pub fn join_room(env: Env, player: Address, room_id: u64) -> Result<(), Error> {
        player.require_auth();
        let mut game = load_game(&env, room_id)?;
        if game.winner.is_some() {
            return Err(Error::GameOver);
        }
        if game.initial_state.is_some() {
            return Err(Error::GameAlreadyStarted);
        }
        if game.players.len() >= game.max_players {
            return Err(Error::RoomFull);
        }
        if player_in(&game.players, &player) {
            return Err(Error::AlreadyJoined);
        }

        let total = game
            .deposit_price
            .checked_add(game.service_fee)
            .ok_or(Error::Overflow)?;
        token_client(&env).transfer(&player, &env.current_contract_address(), &total);

        add_owner_profit(&env, game.service_fee)?;
        game.players.push_back(player);
        save_game(&env, room_id, &game);
        Ok(())
    }

    /// Owner-only. Publishes the puzzle givens and locks joining.
    pub fn start_game(env: Env, room_id: u64, initial_state: Vec<GivenCell>) -> Result<(), Error> {
        require_owner(&env);
        let mut game = load_game(&env, room_id)?;
        if game.initial_state.is_some() {
            return Err(Error::GameAlreadyStarted);
        }
        if game.players.is_empty() {
            return Err(Error::NoPlayers);
        }
        game.initial_state = Some(initial_state);
        save_game(&env, room_id, &game);
        Ok(())
    }

    /// Owner-only. Pre-declares the winner. Required before the private (ZK)
    /// submission: only the locked winner may submit the proof.
    pub fn lock_winner(env: Env, room_id: u64, winner: Address) -> Result<(), Error> {
        require_owner(&env);
        let mut game = load_game(&env, room_id)?;
        if game.initial_state.is_none() {
            return Err(Error::GameNotStarted);
        }
        if game.winner.is_some() {
            return Err(Error::WinnerAlreadySet);
        }
        if !player_in(&game.players, &winner) {
            return Err(Error::WinnerNotPlayer);
        }
        game.winner = Some(winner);
        save_game(&env, room_id, &game);
        Ok(())
    }

    /// Public path: reveal the answer; the contract re-validates it. First valid
    /// submitter wins.
    pub fn submit_public(
        env: Env,
        caller: Address,
        room_id: u64,
        answer: Vec<u32>,
    ) -> Result<(), Error> {
        caller.require_auth();
        let mut game = load_game(&env, room_id)?;
        if !player_in(&game.players, &caller) {
            return Err(Error::NotAPlayer);
        }
        let initial_state = game.initial_state.clone().ok_or(Error::GameNotStarted)?;
        if game.winner.is_some() {
            return Err(Error::GameOver);
        }
        check_solution(&initial_state, &answer)?;
        game.winner = Some(caller);
        game.solved = true;
        save_game(&env, room_id, &game);
        Ok(())
    }

    /// Private (ZK) path: the locked winner submits a RISC Zero Groth16 `seal`.
    /// The contract reconstructs the journal from the room's givens, hashes it,
    /// and asks the verifier router to verify. The router panics (reverting this
    /// tx) if the proof is invalid, so reaching the end means a valid proof for
    /// exactly this puzzle.
    pub fn submit_solution(
        env: Env,
        caller: Address,
        room_id: u64,
        seal: Bytes,
    ) -> Result<(), Error> {
        caller.require_auth();
        let mut game = load_game(&env, room_id)?;
        let initial_state = game.initial_state.clone().ok_or(Error::GameNotStarted)?;
        let locked = game.winner.clone().ok_or(Error::WinnerNotLocked)?;
        if caller != locked {
            return Err(Error::NotLockedWinner);
        }
        if game.solved {
            return Err(Error::GameOver);
        }

        let journal = reconstruct_journal(&env, &initial_state);
        let journal_digest: BytesN<32> = env.crypto().sha256(&journal).into();
        let image_id: BytesN<32> = env.storage().instance().get(&DataKey::ImageId).unwrap();
        let verifier: Address = env.storage().instance().get(&DataKey::Verifier).unwrap();

        // RiscZeroVerifierRouter::verify(seal, image_id, journal_digest).
        // Reverts on an invalid proof.
        let args = (seal, image_id, journal_digest).into_val(&env);
        env.invoke_contract::<()>(&verifier, &Symbol::new(&env, "verify"), args);

        game.solved = true;
        save_game(&env, room_id, &game);
        Ok(())
    }

    /// The winner claims the pot (`deposit_price * players`). Requires the game
    /// to be solved (public answer accepted, or proof verified).
    pub fn claim_reward(env: Env, caller: Address, room_id: u64) -> Result<(), Error> {
        caller.require_auth();
        let mut game = load_game(&env, room_id)?;
        let winner = game.winner.clone().ok_or(Error::NotSolved)?;
        if !game.solved {
            return Err(Error::NotSolved);
        }
        if game.claimed {
            return Err(Error::AlreadyClaimed);
        }
        if caller != winner {
            return Err(Error::NotWinner);
        }
        game.claimed = true;
        save_game(&env, room_id, &game);

        let count = game.players.len() as i128;
        let total_reward = game
            .deposit_price
            .checked_mul(count)
            .ok_or(Error::Overflow)?;
        token_client(&env).transfer(&env.current_contract_address(), &winner, &total_reward);
        Ok(())
    }

    /// Owner-only. Withdraws accrued service fees.
    pub fn owner_withdraw(env: Env) -> Result<(), Error> {
        let owner = require_owner(&env);
        let profit: i128 = env.storage().instance().get(&DataKey::OwnerProfit).unwrap();
        if profit <= 0 {
            return Err(Error::NoProfit);
        }
        env.storage().instance().set(&DataKey::OwnerProfit, &0i128);
        token_client(&env).transfer(&env.current_contract_address(), &owner, &profit);
        Ok(())
    }

    /// Owner-only. Updates the accepted guest image id (e.g. after rebuilding the
    /// guest). New proofs must come from this image.
    pub fn set_image_id(env: Env, image_id: BytesN<32>) {
        require_owner(&env);
        env.storage().instance().set(&DataKey::ImageId, &image_id);
    }

    // ---- read-only views ----

    pub fn query_room(env: Env, room_id: u64) -> Result<SudokuGame, Error> {
        load_game(&env, room_id)
    }

    pub fn room_count(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::RoomCounter).unwrap()
    }

    pub fn image_id(env: Env) -> BytesN<32> {
        env.storage().instance().get(&DataKey::ImageId).unwrap()
    }

    pub fn verifier(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Verifier).unwrap()
    }

    pub fn token(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Token).unwrap()
    }
}

// ---- helpers ----

fn require_owner(env: &Env) -> Address {
    let owner: Address = env.storage().instance().get(&DataKey::Owner).unwrap();
    owner.require_auth();
    owner
}

fn token_client(env: &Env) -> token::TokenClient<'_> {
    let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
    token::TokenClient::new(env, &token)
}

fn next_room_id(env: &Env) -> u64 {
    let s = env.storage().instance();
    let id: u64 = s.get(&DataKey::RoomCounter).unwrap_or(0) + 1;
    s.set(&DataKey::RoomCounter, &id);
    id
}

fn add_owner_profit(env: &Env, amount: i128) -> Result<(), Error> {
    let s = env.storage().instance();
    let cur: i128 = s.get(&DataKey::OwnerProfit).unwrap_or(0);
    s.set(
        &DataKey::OwnerProfit,
        &cur.checked_add(amount).ok_or(Error::Overflow)?,
    );
    Ok(())
}

fn load_game(env: &Env, room_id: u64) -> Result<SudokuGame, Error> {
    env.storage()
        .persistent()
        .get(&DataKey::Game(room_id))
        .ok_or(Error::RoomNotFound)
}

fn save_game(env: &Env, room_id: u64, game: &SudokuGame) {
    let key = DataKey::Game(room_id);
    env.storage().persistent().set(&key, game);
    env.storage()
        .persistent()
        .extend_ttl(&key, GAME_BUMP, GAME_TTL);
}

fn player_in(players: &Vec<Address>, who: &Address) -> bool {
    players.iter().any(|p| &p == who)
}

/// Rebuild the proof journal from the stored givens, matching the guest's
/// `env::commit(&[coord_0, value_0, ...])`: a LE u32 byte-count, then one LE
/// u32 word per committed byte. coord/value are < 256 so each promotes cleanly.
fn reconstruct_journal(env: &Env, givens: &Vec<GivenCell>) -> Bytes {
    let mut j = Bytes::new(env);
    let byte_count: u32 = givens.len() * 2;
    j.extend_from_array(&byte_count.to_le_bytes());
    for cell in givens.iter() {
        j.extend_from_array(&cell.coord.to_le_bytes());
        j.extend_from_array(&cell.value.to_le_bytes());
    }
    j
}

/// Full 9x9 sudoku validation (used by the public-reveal path).
fn check_solution(initial_state: &Vec<GivenCell>, answer: &Vec<u32>) -> Result<(), Error> {
    if initial_state.len() + answer.len() != 81 {
        return Err(Error::InvalidSolution);
    }
    let mut grid = [[0u32; 9]; 9];
    for cell in initial_state.iter() {
        if !(1..=9).contains(&cell.value) || cell.coord >= 81 {
            return Err(Error::InvalidSolution);
        }
        let x = (cell.coord / 9) as usize;
        let y = (cell.coord % 9) as usize;
        grid[x][y] = cell.value;
    }
    let mut ptr: u32 = 0;
    for i in 0..9 {
        for j in 0..9 {
            if grid[i][j] == 0 {
                let v = answer.get(ptr).ok_or(Error::InvalidSolution)?;
                if !(1..=9).contains(&v) {
                    return Err(Error::InvalidSolution);
                }
                grid[i][j] = v;
                ptr += 1;
            }
        }
    }
    // rows
    for i in 0..9 {
        if !is_valid_group(&grid[i]) {
            return Err(Error::InvalidSolution);
        }
    }
    // columns
    for j in 0..9 {
        let mut col = [0u32; 9];
        for i in 0..9 {
            col[i] = grid[i][j];
        }
        if !is_valid_group(&col) {
            return Err(Error::InvalidSolution);
        }
    }
    // 3x3 squares
    for bi in (0..9).step_by(3) {
        for bj in (0..9).step_by(3) {
            let mut sq = [0u32; 9];
            let mut p = 0;
            for x in 0..3 {
                for y in 0..3 {
                    sq[p] = grid[bi + x][bj + y];
                    p += 1;
                }
            }
            if !is_valid_group(&sq) {
                return Err(Error::InvalidSolution);
            }
        }
    }
    Ok(())
}

fn is_valid_group(group: &[u32; 9]) -> bool {
    let mut seen = [false; 9];
    for &x in group.iter() {
        if !(1..=9).contains(&x) {
            return false;
        }
        let idx = (x - 1) as usize;
        if seen[idx] {
            return false;
        }
        seen[idx] = true;
    }
    true
}

#[cfg(test)]
mod test;
