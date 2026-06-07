import assert from 'node:assert/strict';
import test from 'node:test';

import {
  generateMineLayout,
  generateMineLayoutAsync,
  isLogicallySolvable,
  neighborCoordinates,
} from '../modules/game-logic.js';

function seededRandom(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

test('generated layouts protect the first cell and all of its neighbors', () => {
  const settings = { rows: 16, cols: 16, mines: 40 };
  const safeCell = { row: 8, col: 8 };
  const layout = generateMineLayout(settings, safeCell, { random: seededRandom() });
  const mines = new Set(layout.map(([row, col]) => `${row},${col}`));
  const protectedCells = [
    [safeCell.row, safeCell.col],
    ...neighborCoordinates(safeCell.row, safeCell.col, settings.rows, settings.cols),
  ];

  assert.equal(layout.length, settings.mines);
  protectedCells.forEach(([row, col]) => assert.equal(mines.has(`${row},${col}`), false));
});

test('no-guess generation returns only a layout accepted by the solver', async () => {
  const settings = { rows: 9, cols: 9, mines: 10 };
  const safeCell = { row: 4, col: 4 };
  const layout = await generateMineLayoutAsync(settings, safeCell, {
    noGuess: true,
    maxAttempts: 500,
    random: seededRandom(42),
    yieldControl: async () => {},
  });

  assert.ok(layout);
  assert.equal(isLogicallySolvable(settings, layout, safeCell), true);
});

test('no-guess generation can be cancelled between batches', async () => {
  const layout = await generateMineLayoutAsync(
    { rows: 16, cols: 30, mines: 99 },
    { row: 8, col: 15 },
    {
      noGuess: true,
      shouldCancel: () => true,
      yieldControl: async () => {},
    },
  );

  assert.equal(layout, null);
});
