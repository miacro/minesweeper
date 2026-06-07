import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validateGameSnapshot,
  validateHistoryPayload,
} from '../modules/validation.js';

function createSnapshot() {
  const settings = { rows: 9, cols: 9, mines: 10 };
  const lastMineLayout = [
    ...Array.from({ length: 9 }, (_, col) => [8, col]),
    [7, 8],
  ];
  const cells = [];
  for (let row = 0; row < settings.rows; row += 1) {
    for (let col = 0; col < settings.cols; col += 1) {
      cells.push({
        row,
        col,
        revealed: row === 0 && col === 0,
        flagged: false,
        questioned: false,
        exploded: false,
      });
    }
  }
  return {
    settings,
    currentLevel: 'beginner',
    elapsedMs: 4321,
    lastMineLayout,
    cells,
  };
}

test('valid snapshots are normalized without trusting derived counters', () => {
  const snapshot = createSnapshot();
  snapshot.flags = 999;
  snapshot.seconds = 999;

  const normalized = validateGameSnapshot(snapshot);
  assert.equal(normalized.elapsedMs, 4321);
  assert.equal(normalized.cells.length, 81);
  assert.equal(normalized.lastMineLayout.length, 10);
  assert.equal(normalized.noGuess, false);
  assert.equal(normalized.noFlag, false);
});

test('no-flag snapshots preserve the mode and reject marks', () => {
  const snapshot = createSnapshot();
  snapshot.noFlag = true;
  assert.equal(validateGameSnapshot(snapshot).noFlag, true);

  snapshot.cells[1].flagged = true;
  assert.throws(() => validateGameSnapshot(snapshot), /No-flag games cannot contain marks/);
});

test('no-guess snapshots preserve the mode', () => {
  const snapshot = createSnapshot();
  snapshot.noGuess = true;
  assert.equal(validateGameSnapshot(snapshot).noGuess, true);
});

test('legacy snapshots restore second-based timing', () => {
  const snapshot = createSnapshot();
  delete snapshot.elapsedMs;
  snapshot.seconds = 12;

  assert.equal(validateGameSnapshot(snapshot).elapsedMs, 12_000);
});

test('snapshot validation rejects oversized boards and duplicate coordinates', () => {
  const oversized = createSnapshot();
  oversized.settings.rows = 1000;
  assert.throws(() => validateGameSnapshot(oversized), /out of range/);

  const duplicateMine = createSnapshot();
  duplicateMine.lastMineLayout[1] = duplicateMine.lastMineLayout[0];
  assert.throws(() => validateGameSnapshot(duplicateMine), /Duplicate mine coordinates/);

  const duplicateCell = createSnapshot();
  duplicateCell.cells[1] = { ...duplicateCell.cells[0] };
  assert.throws(() => validateGameSnapshot(duplicateCell), /Duplicate cell coordinates/);

  const stringDimensions = createSnapshot();
  stringDimensions.settings.rows = '9';
  assert.throws(() => validateGameSnapshot(stringDimensions), /out of range/);
});

test('snapshot validation rejects contradictory in-progress state', () => {
  const snapshot = createSnapshot();
  const mineCell = snapshot.cells.find((cell) => cell.row === 8 && cell.col === 0);
  mineCell.revealed = true;
  assert.throws(() => validateGameSnapshot(snapshot), /revealed mine/);
});

test('history validation rejects invalid records instead of silently importing them', () => {
  const validRecord = {
    result: 'win',
    level: 'beginner',
    rows: 9,
    cols: 9,
    mines: 10,
    seconds: 12,
    time: '2026/6/7 09:00:00',
    timestamp: 1_780_822_800_000,
  };

  const [legacyRecord] = validateHistoryPayload([validRecord]);
  assert.equal(legacyRecord.noGuess, false);
  assert.equal(legacyRecord.noFlag, false);
  assert.equal(validateHistoryPayload([{ ...validRecord, noGuess: true }])[0].noGuess, true);
  assert.equal(validateHistoryPayload([{ ...validRecord, noFlag: true }])[0].noFlag, true);
  assert.throws(
    () => validateHistoryPayload([{ ...validRecord, seconds: -1 }]),
    /Invalid history time/,
  );
});
