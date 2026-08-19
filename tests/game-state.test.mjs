import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyMineLayout,
  countFlags,
  countRevealedSafe,
  createCells,
  findChordCandidates,
  findChordTargets,
  revealCells,
  revealCellsAt,
} from '../src/game-state.js';

test('mine layouts calculate adjacent counts without mutating the source board', () => {
  const settings = { rows: 8, cols: 8, mines: 10 };
  const source = createCells(settings);
  const layout = [
    [0, 0], [0, 7], [1, 4], [2, 2], [3, 6],
    [4, 1], [5, 5], [6, 3], [7, 0], [7, 7],
  ];
  const board = applyMineLayout(source, settings, layout);

  assert.equal(source[0][0].mine, false);
  assert.equal(board[0][0].mine, true);
  assert.equal(board[0][1].adjacent, 1);
});

test('revealing an empty cell expands its connected safe area', () => {
  const settings = { rows: 8, cols: 8, mines: 10 };
  const layout = Array.from({ length: 8 }, (_, col) => [7, col])
    .concat([[6, 6], [6, 7]]);
  const board = applyMineLayout(createCells(settings), settings, layout);
  const result = revealCells(board, settings, 0, 0);

  assert.equal(result.exploded, false);
  assert.ok(result.revealed > 1);
  assert.equal(countRevealedSafe(result.cells), result.revealed);
});

test('flag counting reflects cell markers', () => {
  const settings = { rows: 8, cols: 8, mines: 10 };
  const board = createCells(settings);
  board[0][0].flagged = true;
  board[2][3].flagged = true;
  assert.equal(countFlags(board), 2);
});

test('chord preview shows candidates before the flag count matches', () => {
  const settings = { rows: 3, cols: 3, mines: 1 };
  const board = createCells(settings);
  board[1][1].revealed = true;
  board[1][1].adjacent = 1;
  board[0][0].flagged = true;
  board[0][1].questioned = true;
  board[0][2].revealed = true;

  const candidates = findChordCandidates(board, settings, 1, 1);

  assert.deepEqual(candidates, [[1, 0], [1, 2], [2, 0], [2, 1], [2, 2]]);
  assert.deepEqual(findChordTargets(board, settings, 1, 1), candidates);
  board[0][0].flagged = false;
  assert.deepEqual(findChordCandidates(board, settings, 1, 1), [
    [0, 0], [1, 0], [1, 2], [2, 0], [2, 1], [2, 2],
  ]);
  assert.deepEqual(findChordTargets(board, settings, 1, 1), []);
});

test('revealing multiple cells stops after the first explosion', () => {
  const settings = { rows: 8, cols: 8, mines: 10 };
  const layout = [
    [0, 0], [0, 1], [0, 2], [0, 3], [0, 4],
    [1, 0], [1, 1], [1, 2], [1, 3], [1, 4],
  ];
  const board = applyMineLayout(createCells(settings), settings, layout);
  const result = revealCellsAt(board, settings, [[0, 0], [7, 7]]);

  assert.equal(result.exploded, true);
  assert.equal(result.cells[0][0].exploded, true);
  assert.equal(result.cells[7][7].revealed, false);
});
