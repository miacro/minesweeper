import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createSoundPlayer } from '../modules/audio.js';
import { generateMineLayoutAsync } from '../modules/game-logic.js';
import {
  readJson,
  readText,
  removeStored,
  STORAGE_KEYS,
  storedKeys,
  writeJson,
  writeText,
} from '../modules/storage.js';
import {
  BOARD_LIMITS,
  MAX_HISTORY_RECORDS,
  validateGameSnapshot,
  validateHistoryPayload,
} from '../modules/validation.js';
import {
  applyMineLayout,
  cloneCells,
  countFlags,
  countRevealedSafe,
  createCells,
  findChordTargets,
  revealAllMines,
  revealCells,
  revealCellsAt,
} from './game-state.js';

export const LEVELS = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
};

function readHistory() {
  try {
    return validateHistoryPayload(readJson(STORAGE_KEYS.history, []));
  } catch {
    return [];
  }
}

function createInitialGame(
  settings = LEVELS.expert,
  level = 'expert',
  noGuess = false,
  noFlag = false,
) {
  return {
    settings,
    level,
    noGuess,
    noFlag,
    cells: createCells(settings),
    status: 'notStarted',
    firstClick: true,
    paused: false,
    gameOver: false,
    elapsedMs: 0,
    result: null,
    mineLayout: null,
  };
}

function readVolume() {
  const stored = Number(readText(STORAGE_KEYS.volume, '65'));
  return Number.isFinite(stored) ? Math.min(Math.max(Math.round(stored), 0), 100) : 65;
}

function readTouchMode() {
  const stored = readText(STORAGE_KEYS.touchMode, 'open');
  return stored === 'flag' ? 'flag' : 'open';
}

export function useMinesweeper({ t }) {
  const [game, setGame] = useState(() => createInitialGame(
    LEVELS.expert,
    'expert',
    readText(STORAGE_KEYS.noGuess) === '1',
    readText(STORAGE_KEYS.noFlag) === '1',
  ));
  const [seconds, setSeconds] = useState(0);
  const [history, setHistory] = useState(readHistory);
  const [bestVersion, setBestVersion] = useState(0);
  const [sound, setSound] = useState(() => readText(STORAGE_KEYS.sound, '1') !== '0');
  const [volume, setVolumeState] = useState(readVolume);
  const [touchMode, setTouchMode] = useState(readTouchMode);
  const gameRef = useRef(game);
  const soundRef = useRef(sound);
  const volumeRef = useRef(volume);
  const startedAtRef = useRef(null);
  const generationRef = useRef(0);
  const soundPlayerRef = useRef(null);

  gameRef.current = game;
  soundRef.current = sound;
  volumeRef.current = volume;
  if (!soundPlayerRef.current) {
    soundPlayerRef.current = createSoundPlayer(
      () => soundRef.current,
      () => volumeRef.current / 100,
    );
  }

  const elapsedMs = useCallback(() => {
    const running = startedAtRef.current === null ? 0 : Date.now() - startedAtRef.current;
    return Math.min(gameRef.current.elapsedMs + Math.max(0, running), 999_999);
  }, []);

  const serialize = useCallback(() => {
    const current = gameRef.current;
    if (current.firstClick || current.gameOver || !current.mineLayout) return null;
    return {
      settings: current.settings,
      currentLevel: current.level,
      noGuess: current.noGuess,
      noFlag: current.noFlag,
      elapsedMs: elapsedMs(),
      lastMineLayout: current.mineLayout,
      cells: current.cells.flat().map((cell) => ({
        row: cell.row,
        col: cell.col,
        revealed: cell.revealed,
        flagged: cell.flagged,
        questioned: cell.questioned,
        exploded: cell.exploded,
      })),
    };
  }, [elapsedMs]);

  const saveCurrentGame = useCallback(() => {
    const snapshot = serialize();
    if (snapshot) writeJson(STORAGE_KEYS.currentGame, snapshot);
  }, [serialize]);

  useEffect(() => {
    if (game.firstClick || game.gameOver || game.paused) return undefined;
    if (startedAtRef.current === null) startedAtRef.current = Date.now();
    const tick = () => {
      setSeconds(Math.min(Math.floor(elapsedMs() / 1000), 999));
      saveCurrentGame();
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [elapsedMs, game.firstClick, game.gameOver, game.paused, saveCurrentGame]);

  useEffect(() => {
    const save = () => saveCurrentGame();
    window.addEventListener('pagehide', save);
    return () => window.removeEventListener('pagehide', save);
  }, [saveCurrentGame]);

  const bestKey = useMemo(() => {
    const { rows, cols, mines } = game.settings;
    const base = `minesweeperBest:${rows}x${cols}:${mines}`;
    return [
      base,
      game.noGuess && 'noGuess',
      game.noFlag && 'noFlag',
    ].filter(Boolean).join(':');
  }, [game.noFlag, game.noGuess, game.settings]);

  const bestTime = useMemo(() => {
    const stored = readText(bestKey);
    if (stored === null) return null;
    const value = Number(stored);
    return Number.isInteger(value) && value >= 0 && value <= 999 ? value : null;
  }, [bestKey, bestVersion]);

  const bestList = useMemo(() => storedKeys()
    .filter((key) => key.startsWith('minesweeperBest:'))
    .map((key) => {
      const value = key.replace('minesweeperBest:', '');
      const parts = value.split(':');
      const board = parts.slice(0, 2).join(':');
      const options = parts.slice(2);
      const seconds = Number(readText(key));
      const boardMatch = board.match(/^(\d+)x(\d+):(\d+)$/);
      const validOptions = ['', 'noGuess', 'noFlag', 'noGuess:noFlag']
        .includes(options.join(':'));
      if (!boardMatch
        || !validOptions
        || !Number.isInteger(seconds)
        || seconds < 0
        || seconds > 999) return null;
      const [, rowsText, colsText, minesText] = boardMatch;
      const rows = Number(rowsText);
      const cols = Number(colsText);
      const mines = Number(minesText);
      if (!Number.isInteger(rows)
        || rows < BOARD_LIMITS.minRows
        || rows > BOARD_LIMITS.maxRows
        || !Number.isInteger(cols)
        || cols < BOARD_LIMITS.minCols
        || cols > BOARD_LIMITS.maxCols
        || !Number.isInteger(mines)
        || mines < BOARD_LIMITS.minMines
        || mines > rows * cols - 9) return null;
      return {
        board,
        noGuess: parts.includes('noGuess'),
        noFlag: parts.includes('noFlag'),
        seconds,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.seconds - b.seconds), [bestVersion]);

  const newGame = useCallback((
    settings = gameRef.current.settings,
    level = gameRef.current.level,
    noGuess = gameRef.current.noGuess,
    noFlag = gameRef.current.noFlag,
  ) => {
    generationRef.current += 1;
    startedAtRef.current = null;
    setSeconds(0);
    const next = createInitialGame({ ...settings }, level, noGuess, noFlag);
    gameRef.current = next;
    setGame(next);
    removeStored(STORAGE_KEYS.currentGame);
  }, []);

  const finishLoss = useCallback((cells) => {
    const finalElapsedMs = elapsedMs();
    const finalSeconds = Math.min(Math.floor(finalElapsedMs / 1000), 999);
    startedAtRef.current = null;
    setSeconds(finalSeconds);
    removeStored(STORAGE_KEYS.currentGame);
    soundPlayerRef.current.play('lose');
    const next = {
      ...gameRef.current,
      cells: revealAllMines(cells),
      gameOver: true,
      status: 'lose',
      result: { key: 'lose', isBest: false },
      elapsedMs: finalElapsedMs,
    };
    gameRef.current = next;
    setGame(next);
  }, [elapsedMs]);

  const finishWin = useCallback((cells) => {
    const finalElapsedMs = elapsedMs();
    const finalSeconds = Math.min(Math.floor(finalElapsedMs / 1000), 999);
    const current = gameRef.current;
    const storedBestText = readText(bestKey);
    const storedBest = storedBestText === null ? null : Number(storedBestText);
    const isBest = storedBest === null || !Number.isFinite(storedBest) || finalSeconds < storedBest;
    if (isBest) {
      writeText(bestKey, finalSeconds);
      setBestVersion((value) => value + 1);
    }
    const completed = cloneCells(cells);
    if (!current.noFlag) {
      completed.flat().forEach((cell) => {
        if (cell.mine) cell.flagged = true;
      });
    }
    const record = {
      result: 'win',
      level: current.level,
      ...current.settings,
      noGuess: current.noGuess,
      noFlag: current.noFlag,
      seconds: finalSeconds,
      time: new Date().toISOString(),
      timestamp: Date.now(),
    };
    setHistory((records) => {
      const nextHistory = [record, ...records].slice(0, MAX_HISTORY_RECORDS);
      writeJson(STORAGE_KEYS.history, nextHistory);
      return nextHistory;
    });
    removeStored(STORAGE_KEYS.currentGame);
    startedAtRef.current = null;
    setSeconds(finalSeconds);
    soundPlayerRef.current.play('win');
    const next = {
      ...gameRef.current,
      cells: completed,
      gameOver: true,
      status: 'win',
      result: { key: 'win', isBest },
      elapsedMs: finalElapsedMs,
    };
    gameRef.current = next;
    setGame(next);
  }, [bestKey, elapsedMs]);

  const reveal = useCallback(async (row, col, playSound = true) => {
    const current = gameRef.current;
    const target = current.cells[row]?.[col];
    if (!target || current.gameOver || current.paused || target.revealed
      || target.flagged || target.questioned || current.status === 'generating'
      || current.status === 'generatingNoGuess') return;

    let cells = current.cells;
    let mineLayout = current.mineLayout;
    if (current.firstClick) {
      const generation = generationRef.current;
      const generating = {
        ...current,
        status: current.noGuess ? 'generatingNoGuess' : 'generating',
      };
      gameRef.current = generating;
      setGame(generating);
      mineLayout = await generateMineLayoutAsync(current.settings, { row, col }, {
        noGuess: current.noGuess,
        maxAttempts: 500,
        shouldCancel: () => generation !== generationRef.current,
      });
      if (generation !== generationRef.current) return;
      if (!mineLayout) {
        const failed = { ...gameRef.current, status: 'noGuessFailed' };
        gameRef.current = failed;
        setGame(failed);
        window.alert(t('noGuessAlert'));
        return;
      }
      cells = applyMineLayout(cells, current.settings, mineLayout);
      startedAtRef.current = Date.now();
    }

    const result = revealCells(cells, current.settings, row, col);
    const revealedSafe = countRevealedSafe(result.cells);
    const next = {
      ...current,
      cells: result.cells,
      mineLayout,
      firstClick: false,
      status: 'running',
    };
    gameRef.current = next;
    setGame(next);
    if (result.exploded) {
      finishLoss(result.cells);
      return;
    }
    if (revealedSafe === current.settings.rows * current.settings.cols - current.settings.mines) {
      finishWin(result.cells);
      return;
    }
    if (playSound) soundPlayerRef.current.play('open');
  }, [finishLoss, finishWin, t]);

  const chord = useCallback((row, col) => {
    const current = gameRef.current;
    if (current.paused || current.gameOver) return;
    const targets = findChordTargets(current.cells, current.settings, row, col);
    if (targets.length === 0) return;

    const result = revealCellsAt(current.cells, current.settings, targets);
    const next = { ...current, cells: result.cells, status: 'running' };
    gameRef.current = next;
    setGame(next);

    if (result.exploded) {
      finishLoss(result.cells);
      return;
    }
    if (countRevealedSafe(result.cells)
      === current.settings.rows * current.settings.cols - current.settings.mines) {
      finishWin(result.cells);
      return;
    }
    if (result.revealed > 0) soundPlayerRef.current.play('open');
  }, [finishLoss, finishWin]);

  const openCell = useCallback((row, col) => {
    const cell = gameRef.current.cells[row]?.[col];
    if (cell?.revealed) chord(row, col);
    else reveal(row, col);
  }, [chord, reveal]);

  const toggleFlag = useCallback((row, col) => {
    const current = gameRef.current;
    const cell = current.cells[row]?.[col];
    if (!cell || current.noFlag || current.gameOver || current.paused || cell.revealed) return;
    const cells = cloneCells(current.cells);
    const target = cells[row][col];
    if (!target.flagged && !target.questioned) target.flagged = true;
    else if (target.flagged) {
      target.flagged = false;
      target.questioned = true;
    } else target.questioned = false;
    soundPlayerRef.current.play('flag');
    const next = { ...current, cells };
    gameRef.current = next;
    setGame(next);
  }, []);

  const setPaused = useCallback((paused) => {
    const current = gameRef.current;
    if (current.firstClick || current.gameOver) return;
    const accumulated = elapsedMs();
    startedAtRef.current = paused ? null : Date.now();
    const next = {
      ...current,
      paused,
      elapsedMs: accumulated,
      status: paused ? 'paused' : 'running',
    };
    gameRef.current = next;
    setGame(next);
  }, [elapsedMs]);

  const retrySame = useCallback(() => {
    const current = gameRef.current;
    if (!current.mineLayout) return;
    generationRef.current += 1;
    startedAtRef.current = Date.now();
    setSeconds(0);
    const cells = applyMineLayout(createCells(current.settings), current.settings, current.mineLayout);
    const next = {
      ...createInitialGame(
        current.settings,
        current.level,
        current.noGuess,
        current.noFlag,
      ),
      cells,
      firstClick: false,
      status: 'running',
      mineLayout: current.mineLayout.map((coordinate) => [...coordinate]),
    };
    gameRef.current = next;
    setGame(next);
  }, []);

  const restore = useCallback((input) => {
    const snapshot = validateGameSnapshot(input);
    const cells = applyMineLayout(createCells(snapshot.settings), snapshot.settings, snapshot.lastMineLayout);
    snapshot.cells.forEach((saved) => Object.assign(cells[saved.row][saved.col], saved));
    generationRef.current += 1;
    startedAtRef.current = Date.now();
    setSeconds(Math.floor(snapshot.elapsedMs / 1000));
    const next = {
      settings: snapshot.settings,
      level: snapshot.currentLevel,
      noGuess: snapshot.noGuess,
      noFlag: snapshot.noFlag,
      cells,
      status: 'running',
      firstClick: false,
      paused: false,
      gameOver: false,
      elapsedMs: snapshot.elapsedMs,
      result: null,
      mineLayout: snapshot.lastMineLayout,
    };
    gameRef.current = next;
    setGame(next);
    writeText(STORAGE_KEYS.noGuess, snapshot.noGuess ? '1' : '0');
    writeText(STORAGE_KEYS.noFlag, snapshot.noFlag ? '1' : '0');
  }, []);

  useEffect(() => {
    const snapshot = readJson(STORAGE_KEYS.currentGame, null);
    if (!snapshot) return;
    try {
      restore(snapshot);
    } catch {
      removeStored(STORAGE_KEYS.currentGame);
    }
  }, [restore]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    removeStored(STORAGE_KEYS.history);
  }, []);

  const settingsActions = {
    setNoGuess(value) {
      writeText(STORAGE_KEYS.noGuess, value ? '1' : '0');
      newGame(
        gameRef.current.settings,
        gameRef.current.level,
        value,
        gameRef.current.noFlag,
      );
    },
    setNoFlag(value) {
      writeText(STORAGE_KEYS.noFlag, value ? '1' : '0');
      newGame(
        gameRef.current.settings,
        gameRef.current.level,
        gameRef.current.noGuess,
        value,
      );
    },
    setSound(value) {
      soundRef.current = value;
      setSound(value);
      writeText(STORAGE_KEYS.sound, value ? '1' : '0');
      if (value) void soundPlayerRef.current.play('flag');
    },
    setVolume(value) {
      const nextVolume = Math.min(Math.max(Math.round(Number(value)), 0), 100);
      volumeRef.current = nextVolume;
      setVolumeState(nextVolume);
      writeText(STORAGE_KEYS.volume, nextVolume);
      soundPlayerRef.current.setVolume();
    },
    setTouchMode(value) {
      setTouchMode(value);
      writeText(STORAGE_KEYS.touchMode, value);
    },
  };

  return {
    game,
    seconds,
    flags: countFlags(game.cells),
    bestTime,
    bestList,
    history,
    noGuess: game.noGuess,
    noFlag: game.noFlag,
    sound,
    volume,
    touchMode,
    soundPlayer: soundPlayerRef.current,
    newGame,
    retrySame,
    openCell,
    toggleFlag,
    chord,
    setPaused,
    serialize,
    restore,
    clearHistory,
    setHistory,
    settingsActions,
  };
}
