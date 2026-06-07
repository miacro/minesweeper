export function neighborCoordinates(row, col, rows, cols) {
  const coordinates = [];
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (rowOffset === 0 && colOffset === 0) continue;
      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;
      if (nextRow >= 0 && nextRow < rows && nextCol >= 0 && nextCol < cols) {
        coordinates.push([nextRow, nextCol]);
      }
    }
  }
  return coordinates;
}

function coordinateKey(row, col) {
  return `${row},${col}`;
}

function createMineSet(layout) {
  return new Set(layout.map(([row, col]) => coordinateKey(row, col)));
}

function adjacentMineCount(row, col, rows, cols, mineSet) {
  return neighborCoordinates(row, col, rows, cols)
    .filter(([nextRow, nextCol]) => mineSet.has(coordinateKey(nextRow, nextCol)))
    .length;
}

function createRandomLayout({ rows, cols, mines }, safeCell, random) {
  const blocked = new Set([
    coordinateKey(safeCell.row, safeCell.col),
    ...neighborCoordinates(safeCell.row, safeCell.col, rows, cols)
      .map(([row, col]) => coordinateKey(row, col)),
  ]);
  const candidates = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!blocked.has(coordinateKey(row, col))) candidates.push([row, col]);
    }
  }

  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]];
  }

  return candidates.slice(0, mines);
}

export function isLogicallySolvable(settings, layout, startCell) {
  const { rows, cols, mines } = settings;
  const mineSet = createMineSet(layout);
  const knownSafe = new Set([coordinateKey(startCell.row, startCell.col)]);
  const flaggedMines = new Set();
  let changed = true;

  while (changed) {
    changed = false;

    [...knownSafe].forEach((key) => {
      const [row, col] = key.split(',').map(Number);
      if (adjacentMineCount(row, col, rows, cols, mineSet) !== 0) return;
      neighborCoordinates(row, col, rows, cols).forEach(([nextRow, nextCol]) => {
        const nextKey = coordinateKey(nextRow, nextCol);
        if (!mineSet.has(nextKey) && !knownSafe.has(nextKey)) {
          knownSafe.add(nextKey);
          changed = true;
        }
      });
    });

    [...knownSafe].forEach((key) => {
      const [row, col] = key.split(',').map(Number);
      const adjacent = adjacentMineCount(row, col, rows, cols, mineSet);
      if (adjacent === 0) return;

      const around = neighborCoordinates(row, col, rows, cols);
      const unknown = around.filter(([nextRow, nextCol]) => {
        const nextKey = coordinateKey(nextRow, nextCol);
        return !knownSafe.has(nextKey) && !flaggedMines.has(nextKey);
      });
      const flagCount = around.filter(([nextRow, nextCol]) => (
        flaggedMines.has(coordinateKey(nextRow, nextCol))
      )).length;

      if (unknown.length > 0 && adjacent - flagCount === unknown.length) {
        unknown.forEach(([nextRow, nextCol]) => {
          const nextKey = coordinateKey(nextRow, nextCol);
          if (mineSet.has(nextKey) && !flaggedMines.has(nextKey)) {
            flaggedMines.add(nextKey);
            changed = true;
          }
        });
      }

      if (unknown.length > 0 && flagCount === adjacent) {
        unknown.forEach(([nextRow, nextCol]) => {
          const nextKey = coordinateKey(nextRow, nextCol);
          if (!mineSet.has(nextKey) && !knownSafe.has(nextKey)) {
            knownSafe.add(nextKey);
            changed = true;
          }
        });
      }
    });
  }

  return knownSafe.size >= rows * cols - mines;
}

export function generateMineLayout(
  settings,
  safeCell,
  { noGuess = false, maxAttempts = 500, random = Math.random } = {},
) {
  const attempts = noGuess ? maxAttempts : 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const layout = createRandomLayout(settings, safeCell, random);
    if (!noGuess || isLogicallySolvable(settings, layout, safeCell)) return layout;
  }
  return null;
}

export async function generateMineLayoutAsync(
  settings,
  safeCell,
  {
    noGuess = false,
    maxAttempts = 500,
    batchSize = 20,
    random = Math.random,
    shouldCancel = () => false,
    yieldControl = () => new Promise((resolve) => window.setTimeout(resolve, 0)),
  } = {},
) {
  if (!noGuess) return createRandomLayout(settings, safeCell, random);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (shouldCancel()) return null;
    const layout = createRandomLayout(settings, safeCell, random);
    if (isLogicallySolvable(settings, layout, safeCell)) return layout;
    if ((attempt + 1) % batchSize === 0) await yieldControl();
  }

  return null;
}
