#![cfg(test)]
use crate::{Error, GivenCell, Sudoku, SudokuClient};
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{contract, contractimpl, token, vec, Address, Bytes, BytesN, Env, Vec};

// A stand-in for the RISC Zero verifier router. Unit tests can't run real BN254
// pairing, so this mimics the router's contract: it *panics* (reverting the
// caller's tx) on an invalid proof. Convention: a single 0x00 byte == invalid.
#[contract]
pub struct MockVerifier;

#[contractimpl]
impl MockVerifier {
    pub fn verify(env: Env, seal: Bytes, _image_id: BytesN<32>, _journal_digest: BytesN<32>) {
        let _ = &env;
        if seal.len() == 1 && seal.get(0) == Some(0) {
            panic!("invalid proof");
        }
    }
}

struct Fixture {
    env: Env,
    client: SudokuClient<'static>,
    owner: Address,
    token: Address,
    players: Vec<Address>,
}

const DEPOSIT: i128 = 5;
const FEE: i128 = 1;

fn setup(num_players: u32) -> Fixture {
    let env = Env::default();
    env.mock_all_auths();

    let owner = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let sac = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token = sac.address();
    let token_admin_client = token::StellarAssetClient::new(&env, &token);

    let mut players = Vec::new(&env);
    for _ in 0..num_players {
        let p = Address::generate(&env);
        token_admin_client.mint(&p, &1000);
        players.push_back(p);
    }

    let verifier = env.register(MockVerifier, ());
    let image_id = BytesN::from_array(&env, &[7u8; 32]);
    let contract_id = env.register(Sudoku, (owner.clone(), image_id, verifier, token.clone()));
    let client = SudokuClient::new(&env, &contract_id);

    Fixture {
        env,
        client,
        owner,
        token,
        players,
    }
}

fn balance(env: &Env, token: &Address, who: &Address) -> i128 {
    token::TokenClient::new(env, token).balance(who)
}

/// The 81-cell solved board used by the guest's host sample (a valid sudoku).
fn full_solution(env: &Env) -> Vec<u32> {
    vec![
        env, //
        1, 2, 3, 4, 5, 6, 7, 8, 9, //
        4, 5, 6, 7, 8, 9, 1, 2, 3, //
        7, 8, 9, 1, 2, 3, 4, 5, 6, //
        2, 3, 4, 5, 6, 7, 8, 9, 1, //
        5, 6, 7, 8, 9, 1, 2, 3, 4, //
        8, 9, 1, 2, 3, 4, 5, 6, 7, //
        3, 4, 5, 6, 7, 8, 9, 1, 2, //
        6, 7, 8, 9, 1, 2, 3, 4, 5, //
        9, 1, 2, 3, 4, 5, 6, 7, 8, //
    ]
}

#[test]
fn private_zk_flow() {
    let f = setup(5);
    let players = &f.players;

    let room_id = f
        .client
        .create_new_room(&DEPOSIT, &FEE, &5, &players.get(0).unwrap());
    for p in players.iter() {
        f.client.join_room(&p, &room_id);
    }
    // Empty givens: the proof attests the whole board. Reconstructed journal is
    // the 4-byte zero length; the mock verifier accepts any non-"invalid" seal.
    f.client.start_game(&room_id, &Vec::new(&f.env));
    f.client.lock_winner(&room_id, &players.get(0).unwrap());

    let seal = Bytes::from_array(&f.env, &[1u8, 2, 3, 4]);
    f.client
        .submit_solution(&players.get(0).unwrap(), &room_id, &seal);

    f.client.claim_reward(&players.get(0).unwrap(), &room_id);
    f.client.owner_withdraw();

    // 5 deposits of 5 to the winner; 5 fees of 1 to the owner.
    assert_eq!(
        balance(&f.env, &f.token, &players.get(0).unwrap()),
        1000 - DEPOSIT - FEE + DEPOSIT * 5
    );
    assert_eq!(
        balance(&f.env, &f.token, &players.get(1).unwrap()),
        1000 - DEPOSIT - FEE
    );
    assert_eq!(balance(&f.env, &f.token, &f.owner), FEE * 5);
    assert_eq!(balance(&f.env, &f.token, &f.client.address), 0);
}

/// Full private flow against a *real* puzzle (non-empty givens). Unlike
/// `private_zk_flow` (empty givens -> a constant journal), this exercises
/// `reconstruct_journal` over actual givens, so the puzzle-bound journal digest
/// passed to the verifier is non-trivial - the anti-replay binding is actually
/// run, not just built.
#[test]
fn private_flow_with_real_givens() {
    let f = setup(2);
    let players = &f.players;
    let room_id = f
        .client
        .create_new_room(&DEPOSIT, &FEE, &2, &players.get(0).unwrap());
    for p in players.iter() {
        f.client.join_room(&p, &room_id);
    }

    let givens = vec![
        &f.env,
        GivenCell { coord: 0, value: 1 },
        GivenCell { coord: 1, value: 2 },
        GivenCell { coord: 2, value: 3 },
    ];
    f.client.start_game(&room_id, &givens);
    f.client.lock_winner(&room_id, &players.get(0).unwrap());

    let seal = Bytes::from_array(&f.env, &[1u8, 2, 3, 4]);
    f.client
        .submit_solution(&players.get(0).unwrap(), &room_id, &seal);
    f.client.claim_reward(&players.get(0).unwrap(), &room_id);

    // The room stored the real puzzle (not the empty default), the proof path
    // ran against it, and the winner swept the pot.
    let room = f.client.query_room(&room_id);
    assert_eq!(room.initial_state, Some(givens));
    assert!(room.solved);
    assert_eq!(
        balance(&f.env, &f.token, &players.get(0).unwrap()),
        1000 - DEPOSIT - FEE + DEPOSIT * 2
    );
}

#[test]
fn public_flow() {
    let f = setup(3);
    let players = &f.players;
    let room_id = f
        .client
        .create_new_room(&DEPOSIT, &FEE, &3, &players.get(0).unwrap());
    for p in players.iter() {
        f.client.join_room(&p, &room_id);
    }
    f.client.start_game(&room_id, &Vec::new(&f.env));
    f.client
        .submit_public(&players.get(1).unwrap(), &room_id, &full_solution(&f.env));
    f.client.claim_reward(&players.get(1).unwrap(), &room_id);

    assert_eq!(
        balance(&f.env, &f.token, &players.get(1).unwrap()),
        1000 - DEPOSIT - FEE + DEPOSIT * 3
    );
}

#[test]
fn invalid_proof_reverts() {
    let f = setup(2);
    let players = &f.players;
    let room_id = f
        .client
        .create_new_room(&DEPOSIT, &FEE, &2, &players.get(0).unwrap());
    for p in players.iter() {
        f.client.join_room(&p, &room_id);
    }
    f.client.start_game(&room_id, &Vec::new(&f.env));
    f.client.lock_winner(&room_id, &players.get(0).unwrap());

    // "invalid" seal marker -> mock verifier panics -> cross-contract call reverts.
    let bad = Bytes::from_array(&f.env, &[0u8]);
    let res = f
        .client
        .try_submit_solution(&players.get(0).unwrap(), &room_id, &bad);
    assert!(res.is_err());
}

#[test]
fn wrong_player_cannot_submit() {
    let f = setup(2);
    let players = &f.players;
    let room_id = f
        .client
        .create_new_room(&DEPOSIT, &FEE, &2, &players.get(0).unwrap());
    for p in players.iter() {
        f.client.join_room(&p, &room_id);
    }
    f.client.start_game(&room_id, &Vec::new(&f.env));
    f.client.lock_winner(&room_id, &players.get(0).unwrap());

    let seal = Bytes::from_array(&f.env, &[1u8, 2, 3, 4]);
    let res = f
        .client
        .try_submit_solution(&players.get(1).unwrap(), &room_id, &seal);
    assert_eq!(res, Err(Ok(Error::NotLockedWinner)));
}

#[test]
fn double_join_rejected() {
    let f = setup(2);
    let players = &f.players;
    let room_id = f
        .client
        .create_new_room(&DEPOSIT, &FEE, &2, &players.get(0).unwrap());
    f.client.join_room(&players.get(0).unwrap(), &room_id);
    let res = f.client.try_join_room(&players.get(0).unwrap(), &room_id);
    assert_eq!(res, Err(Ok(Error::AlreadyJoined)));
}

// Pins the journal byte layout to the *real* guest output. The bytes below were
// produced by `cargo run -p sudoku-host` for givens [(0,1),(1,2),(2,3)]:
//   journal = 0x06000000 00000000 01000000 01000000 02000000 02000000 03000000
// If risc0 serde or the guest's commit changes, this test catches the drift.
#[test]
fn journal_reconstruction_matches_guest() {
    let env = Env::default();

    let givens = vec![
        &env,
        GivenCell { coord: 0, value: 1 },
        GivenCell { coord: 1, value: 2 },
        GivenCell { coord: 2, value: 3 },
    ];
    let expected = Bytes::from_array(
        &env,
        &[
            0x06, 0, 0, 0, // byte count = 6
            0, 0, 0, 0, // coord 0
            1, 0, 0, 0, // value 1
            1, 0, 0, 0, // coord 1
            2, 0, 0, 0, // value 2
            2, 0, 0, 0, // coord 2
            3, 0, 0, 0, // value 3
        ],
    );
    assert_eq!(crate::reconstruct_journal(&env, &givens), expected);

    // Empty givens -> 4-byte zero length (matches host's `0x00000000`).
    let empty = crate::reconstruct_journal(&env, &Vec::new(&env));
    assert_eq!(empty, Bytes::from_array(&env, &[0u8, 0, 0, 0]));
}
