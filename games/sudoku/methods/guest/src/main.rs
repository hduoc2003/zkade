use risc0_zkvm::guest::env;

/// Sudoku winning-condition circuit (RISC Zero zkVM guest).
///
/// Private witness: the player's `answer` (the values for the empty cells).
/// Public statement (committed to the journal): the puzzle's `initial_state`
/// (the givens). Proving this receipt attests "I know a valid completion of
/// this exact puzzle" without revealing the completion.
///
/// Journal layout (canonical, must match the Soroban contract's
/// `reconstruct_journal`): the givens flattened to bytes as
/// `[coord_0, value_0, coord_1, value_1, ...]`, length `2 * givens`,
/// serialized with `env::commit` (risc0 serde).
fn main() {
    let initial_state: Vec<(u8, u8)> = env::read();
    let answer: Vec<u8> = env::read();

    assert_eq!(
        initial_state.len() + answer.len(),
        81,
        "wrong answer or initial state"
    );

    let mut grid = [[0u8; 9]; 9];
    for (compressed_coordinate, value) in initial_state.iter().copied() {
        assert!((1..=9).contains(&value), "invalid initial state");
        let x = compressed_coordinate / 9;
        let y = compressed_coordinate % 9;
        grid[x as usize][y as usize] = value;
    }
    let mut ptr = 0;
    for i in 0..9 {
        for j in 0..9 {
            if grid[i][j] == 0 {
                assert!((1..=9).contains(&answer[ptr]), "invalid answer");
                grid[i][j] = answer[ptr];
                ptr += 1;
            }
        }
    }

    // rows
    for (i, row) in grid.iter().enumerate() {
        assert!(is_valid_group(row), "invalid row {}", i + 1);
    }
    // columns
    for j in 0..9 {
        let mut column = [0u8; 9];
        for i in 0..9 {
            column[i] = grid[i][j];
        }
        assert!(is_valid_group(&column), "invalid column {}", j + 1);
    }
    // 3x3 squares
    for i in (0..9).step_by(3) {
        for j in (0..9).step_by(3) {
            let mut square = [0u8; 9];
            let mut ptr = 0;
            for x in 0..3 {
                for y in 0..3 {
                    square[ptr] = grid[i + x][j + y];
                    ptr += 1;
                }
            }
            assert!(
                is_valid_group(&square),
                "invalid square at ({}, {})",
                i + 1,
                j + 1
            );
        }
    }

    // Commit the givens (and only the givens) to the journal.
    let mut journal_bytes = Vec::with_capacity(initial_state.len() * 2);
    for (coord, value) in initial_state.iter().copied() {
        journal_bytes.push(coord);
        journal_bytes.push(value);
    }
    env::commit(&journal_bytes);
}

fn is_valid_group(group: &[u8; 9]) -> bool {
    let mut seen = [false; 9];
    for &x in group {
        if seen[(x - 1) as usize] {
            return false;
        }
        seen[(x - 1) as usize] = true;
    }
    true
}
