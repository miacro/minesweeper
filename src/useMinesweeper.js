import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createSoundPlayer } from '../modules/audio.js';
import { generateMineLayoutAsync, neighborCoordinates } from '../modules/game-logic.js';
import {
  readJson,
  readText,
  removeStored,
  STORAGE_KEYS,
  storedKeys,
  writeJson,
  writeText,
} from '../modules/storage.js';
import { validateGameSnapshot, validateHistoryPayload } from '../modules/validation.js';
import {
  applyMineLayout,
  cloneCells,
  countFlags,
  countRevealedSafe,
  createCells,
  revealAllMines,
  revealCells,
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

function createInitialGame(settings = LEVELS.expert, level = 'expert') {
  return {
    settings,
    level,
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

export function useMinesweeper({ t }) {
  const [game, setGame] = useState(() => createInitialGame());
  const [seconds, setSeconds] = useState(0);
  const [history, setHistory] = useState(readHistory);
  const [bestVersion, setBestVersion] = useState(0);
  const [noGuess, setNoGuess] = useState(() => readText(STORAGE_KEYS.noGuess) === '1');
  const [sound, setSound] = useState(() => readText(STORAGE_KEYS.sound) === '1');
  const [touchMode, setTouchMode] = useState(() => readText(STORAGE_KEYS.touchMode, 'open'));
  const gameRef = useRef(game);
  const soundRef = useRef(sound);
  const startedAtRef = useRef(null);
  const generationRef = useRef(0);
  const soundPlayerRef = useRef(null);

  gameRef.current = game;
  soundRef.current = sound;
  if (!soundPlayerRef.current) {
    soundPlayerRef.current = createSoundPlayer(() => soundRef.current);
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
    return `minesweeperBest:${rows}x${cols}:${mines}`;
  }, [game.settings]);

  const bestTime = useMemo(() => {
    const stored = readText(bestKey);
    if (stored === null) return null;
    const value = Number(stored);
    return Number.isInteger(value) && value >= 0 && value <= 999 ? value : null;
  }, [bestKey, bestVersion]);

  const bestList = useMemo(() => storedKeys()
    .filter((key) => key.startsWith('minesweeperBest:'))
    .map((key) => ({ board: key.replace('minesweeperBest:', ''), seconds: Number(readText(key)) }))
    .filter((entry) => Number.isFinite(entry.seconds))
    .sort((a, b) => a.seconds - b.seconds), [bestVersion]);

  const newGame = useCallback((settings = gameRef.current.settings, level = gameRef.current.level) => {
    generationRef.current += 1;
    startedAtRef.current = null;
    setSeconds(0);
    const next = createInitialGame({ ...settings }, level);
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
    setGame((current) => ({
      ...current,
      cells: revealAllMines(cells),
      gameOver: true,
      status: 'lose',
      result: { key: 'lose', isBest: false },
      elapsedMs: finalElapsedMs,
    }));
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
    completed.flat().forEach((cell) => {
      if (cell.mine) cell.flagged = true;
    });
    const record = {
      result: 'win',
      level: current.level,
      ...current.settings,
      seconds: finalSeconds,
      time: new Date().toISOString(),
      timestamp: Date.now(),
    };
    setHistory((records) => {
      const nextHistory = [record, ...records];
      writeJson(STORAGE_KEYS.history, nextHistory);
      return nextHistory;
    });
    removeStored(STORAGE_KEYS.currentGame);
    startedAtRef.current = null;
    setSeconds(finalSeconds);
    soundPlayerRef.current.play('win');
    setGame((value) => ({
      ...value,
      cells: completed,
      gameOver: true,
      status: 'win',
      result: { key: 'win', isBest },
      elapsedMs: finalElapsedMs,
    }));
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
      setGame((value) => ({
        ...value,
        status: noGuess ? 'generatingNoGuess' : 'generating',
      }));
      mineLayout = await generateMineLayoutAsync(current.settings, { row, col }, {
        noGuess,
        maxAttempts: 500,
        shouldCancel: () => generation !== generationRef.current,
      });
      if (generation !== generationRef.current) return;
      if (!mineLayout) {
        setGame((value) => ({ ...value, status: 'noGuessFailed' }));
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
  }, [finishLoss, finishWin, noGuess, t]);

  const chord = useCallback((row, col) => {
    const current = gameRef.current;
    const cell = current.cells[row]?.[col];
    if (!cell?.revealed || cell.adjacent === 0 || current.paused || current.gameOver) return;
    const around = neighborCoordinates(row, col, current.settings.rows, current.settings.cols);
    const flagCount = around.filter(([nextRow, nextCol]) => (
      current.cells[nextRow][nextCol].flagged
    )).length;
    if (flagCount !== cell.adjacent) return;
    around.forEach(([nextRow, nextCol]) => {
      reveal(nextRow, nextCol, false);
    });
    soundPlayerRef.current.play('open');
  }, [reveal]);

  const openCell = useCallback((row, col) => {
    const cell = gameRef.current.cells[row]?.[col];
    if (cell?.revealed) chord(row, col);
    else reveal(row, col);
  }, [chord, reveal]);

  const toggleFlag = useCallback((row, col) => {
    const current = gameRef.current;
    const cell = current.cells[row]?.[col];
    if (!cell || current.gameOver || current.paused || cell.revealed) return;
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
    setGame((value) => ({
      ...value,
      paused,
      elapsedMs: accumulated,
      status: paused ? 'paused' : 'running',
    }));
  }, [elapsedMs]);

  const retrySame = useCallback(() => {
    const current = gameRef.current;
    if (!current.mineLayout) return;
    generationRef.current += 1;
    startedAtRef.current = Date.now();
    setSeconds(0);
    const cells = applyMineLayout(createCells(current.settings), current.settings, current.mineLayout);
    const next = {
      ...createInitialGame(current.settings, current.level),
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
      setNoGuess(value);
      writeText(STORAGE_KEYS.noGuess, value ? '1' : '0');
    },
    setSound(value) {
      setSound(value);
      writeText(STORAGE_KEYS.sound, value ? '1' : '0');
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
    noGuess,
    sound,
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
