export const BOARD_LIMITS = {
  minRows: 8,
  maxRows: 30,
  minCols: 8,
  maxCols: 40,
  minMines: 10,
};

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_HISTORY_RECORDS = 5000;
const LEVEL_IDS = new Set(['beginner', 'intermediate', 'expert', 'custom']);
const LEVEL_LABELS = new Set(['beginner', 'intermediate', 'expert', 'custom']);
const STANDARD_LEVELS = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
};

function isIntegerInRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function validateSettings(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Missing board settings');
  }

  const { rows, cols, mines } = value;
  if (!isIntegerInRange(rows, BOARD_LIMITS.minRows, BOARD_LIMITS.maxRows)
    || !isIntegerInRange(cols, BOARD_LIMITS.minCols, BOARD_LIMITS.maxCols)
    || !isIntegerInRange(mines, BOARD_LIMITS.minMines, rows * cols - 9)) {
    throw new Error('Board size or mine count is out of range');
  }

  return { rows, cols, mines };
}

function validateBoolean(value) {
  if (typeof value !== 'boolean') throw new Error('Invalid cell state');
  return value;
}

export function validateGameSnapshot(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Game state must be an object');
  }

  const settings = validateSettings(input.settings);
  const { rows, cols, mines } = settings;
  const currentLevel = input.currentLevel === undefined ? 'custom' : input.currentLevel;
  if (!LEVEL_IDS.has(currentLevel)) throw new Error('Invalid difficulty');
  const standard = STANDARD_LEVELS[currentLevel];
  if (standard && (
    rows !== standard.rows || cols !== standard.cols || mines !== standard.mines
  )) {
    throw new Error('Board settings do not match the selected difficulty');
  }

  if (!Array.isArray(input.lastMineLayout) || input.lastMineLayout.length !== mines) {
    throw new Error('Incorrect mine count');
  }

  const mineKeys = new Set();
  const lastMineLayout = input.lastMineLayout.map((coordinate) => {
    if (!Array.isArray(coordinate) || coordinate.length !== 2) {
      throw new Error('Invalid mine coordinates');
    }
    const [row, col] = coordinate;
    if (!isIntegerInRange(row, 0, rows - 1) || !isIntegerInRange(col, 0, cols - 1)) {
      throw new Error('Mine coordinates are outside the board');
    }
    const key = `${row},${col}`;
    if (mineKeys.has(key)) throw new Error('Duplicate mine coordinates');
    mineKeys.add(key);
    return [row, col];
  });

  if (!Array.isArray(input.cells) || input.cells.length !== rows * cols) {
    throw new Error('Cell count does not match the board');
  }

  const cellKeys = new Set();
  let revealedSafeCells = 0;
  const cells = input.cells.map((cell) => {
    if (!cell || typeof cell !== 'object' || Array.isArray(cell)) {
      throw new Error('Invalid cell data');
    }
    const { row, col } = cell;
    if (!isIntegerInRange(row, 0, rows - 1) || !isIntegerInRange(col, 0, cols - 1)) {
      throw new Error('Cell coordinates are outside the board');
    }
    const key = `${row},${col}`;
    if (cellKeys.has(key)) throw new Error('Duplicate cell coordinates');
    cellKeys.add(key);

    const revealed = validateBoolean(cell.revealed);
    const flagged = validateBoolean(cell.flagged);
    const questioned = validateBoolean(cell.questioned);
    const exploded = validateBoolean(cell.exploded);
    if (flagged && questioned) throw new Error('A cell cannot be both flagged and questioned');
    if (revealed && (flagged || questioned)) throw new Error('A revealed cell cannot be marked');
    if (revealed && mineKeys.has(key)) throw new Error('An active game cannot contain a revealed mine');
    if (exploded) throw new Error('An active game cannot contain an exploded cell');
    if (revealed) revealedSafeCells += 1;

    return { row, col, revealed, flagged, questioned, exploded: false };
  });

  if (revealedSafeCells >= rows * cols - mines) {
    throw new Error('A completed game cannot be imported as active');
  }

  const legacySeconds = input.seconds;
  const rawElapsedMs = input.elapsedMs === undefined ? legacySeconds * 1000 : input.elapsedMs;
  if (!Number.isFinite(rawElapsedMs) || rawElapsedMs < 0 || rawElapsedMs > 999_999) {
    throw new Error('Invalid timer data');
  }

  return {
    settings,
    currentLevel,
    elapsedMs: Math.floor(rawElapsedMs),
    lastMineLayout,
    cells,
  };
}

function validateHistoryRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error('Invalid history record');
  }
  if (record.result !== 'win' || !LEVEL_LABELS.has(record.level)) {
    throw new Error('Invalid result or difficulty');
  }

  const settings = validateSettings(record);
  const { seconds } = record;
  const timestamp = Number.isFinite(record.timestamp) ? record.timestamp : Date.parse(record.time);
  if (!isIntegerInRange(seconds, 0, 999)
    || typeof record.time !== 'string'
    || record.time.length === 0
    || record.time.length > 100
    || !Number.isFinite(timestamp)
    || timestamp < 0) {
    throw new Error('Invalid history time');
  }

  return {
    result: 'win',
    level: record.level,
    ...settings,
    seconds,
    time: record.time,
    timestamp,
  };
}

export function validateHistoryPayload(input) {
  const records = Array.isArray(input) ? input : input?.records;
  if (!Array.isArray(records) || records.length > MAX_HISTORY_RECORDS) {
    throw new Error('Invalid history list');
  }
  return records.map(validateHistoryRecord);
}

export async function readJsonFile(file) {
  if (!file || file.size > MAX_FILE_BYTES) {
    throw new Error('The file is empty or larger than 2 MB');
  }
  return JSON.parse(await file.text());
}
