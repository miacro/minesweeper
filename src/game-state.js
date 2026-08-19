import { neighborCoordinates } from '../modules/game-logic.js';

export function createCells(settings) {
  return Array.from({ length: settings.rows }, (_, row) => (
    Array.from({ length: settings.cols }, (_, col) => ({
      row,
      col,
      mine: false,
      exploded: false,
      adjacent: 0,
      revealed: false,
      flagged: false,
      questioned: false,
    }))
  ));
}

export function cloneCells(cells) {
  return cells.map((row) => row.map((cell) => ({ ...cell })));
}

export function applyMineLayout(cells, settings, layout) {
  const next = cloneCells(cells);
  next.flat().forEach((cell) => {
    cell.mine = false;
    cell.adjacent = 0;
  });
  layout.forEach(([row, col]) => {
    next[row][col].mine = true;
  });
  next.flat().forEach((cell) => {
    cell.adjacent = neighborCoordinates(cell.row, cell.col, settings.rows, settings.cols)
      .filter(([row, col]) => next[row][col].mine).length;
  });
  return next;
}

export function revealCells(cells, settings, startRow, startCol) {
  const next = cloneCells(cells);
  const queue = [[startRow, startCol]];
  let revealed = 0;
  let exploded = false;

  while (queue.length > 0) {
    const [row, col] = queue.shift();
    const cell = next[row]?.[col];
    if (!cell || cell.revealed || cell.flagged || cell.questioned) continue;
    cell.revealed = true;
    revealed += 1;
    if (cell.mine) {
      cell.exploded = true;
      exploded = true;
      break;
    }
    if (cell.adjacent === 0) {
      neighborCoordinates(row, col, settings.rows, settings.cols)
        .forEach((coordinate) => queue.push(coordinate));
    }
  }

  return { cells: next, revealed, exploded };
}

export function revealCellsAt(cells, settings, coordinates) {
  let next = cells;
  let revealed = 0;

  for (const [row, col] of coordinates) {
    const result = revealCells(next, settings, row, col);
    next = result.cells;
    revealed += result.revealed;
    if (result.exploded) return { cells: next, revealed, exploded: true };
  }

  return { cells: next, revealed, exploded: false };
}

export function findChordCandidates(cells, settings, row, col) {
  const cell = cells[row]?.[col];
  if (!cell?.revealed || cell.adjacent === 0) return [];

  const around = neighborCoordinates(row, col, settings.rows, settings.cols);
  return around.filter(([nextRow, nextCol]) => {
    const target = cells[nextRow][nextCol];
    return !target.revealed && !target.flagged && !target.questioned;
  });
}

export function findChordTargets(cells, settings, row, col) {
  const cell = cells[row]?.[col];
  if (!cell?.revealed || cell.adjacent === 0) return [];

  const around = neighborCoordinates(row, col, settings.rows, settings.cols);
  const flagCount = around.filter(([nextRow, nextCol]) => (
    cells[nextRow][nextCol].flagged
  )).length;
  return flagCount === cell.adjacent
    ? findChordCandidates(cells, settings, row, col)
    : [];
}

export function revealAllMines(cells) {
  const next = cloneCells(cells);
  next.flat().forEach((cell) => {
    if (cell.mine) cell.revealed = true;
  });
  return next;
}

export function countRevealedSafe(cells) {
  return cells.flat().filter((cell) => cell.revealed && !cell.mine).length;
}

export function countFlags(cells) {
  return cells.flat().filter((cell) => cell.flagged).length;
}
