import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createI18n } from '../modules/i18n.js';
import {
  MAX_HISTORY_RECORDS,
  normalizeBoardSettings,
  readJsonFile,
  validateHistoryPayload,
} from '../modules/validation.js';
import {
  readText,
  STORAGE_KEYS,
  writeJson,
  writeText,
} from '../modules/storage.js';
import { findChordCandidates } from './game-state.js';
import {
  canCompleteMouseGesture,
  isPrimaryMouseGesture,
  movedBeyondThreshold,
} from './input-logic.js';
import { LEVELS, useMinesweeper } from './useMinesweeper.js';

const SEGMENTS = {
  0: ['a', 'b', 'c', 'd', 'e', 'f'],
  1: ['b', 'c'],
  2: ['a', 'b', 'g', 'e', 'd'],
  3: ['a', 'b', 'c', 'd', 'g'],
  4: ['f', 'g', 'b', 'c'],
  5: ['a', 'f', 'g', 'c', 'd'],
  6: ['a', 'f', 'e', 'd', 'c', 'g'],
  7: ['a', 'b', 'c'],
  8: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  9: ['a', 'b', 'c', 'd', 'f', 'g'],
  '-': ['g'],
};

const ZOOM_LEVELS = [50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300];

function readLanguage() {
  const stored = readText(STORAGE_KEYS.language, 'en');
  return ['en', 'zh-CN'].includes(stored) ? stored : 'en';
}

function readZoom() {
  const stored = Number(readText(STORAGE_KEYS.zoom, 100));
  return ZOOM_LEVELS.includes(stored) ? stored : 100;
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function Counter({ value, label }) {
  const clamped = Math.min(Math.max(Math.trunc(value), -99), 999);
  const digits = clamped < 0
    ? `-${String(Math.abs(clamped)).padStart(2, '0')}`
    : String(clamped).padStart(3, '0');
  return (
    <div className="counter" aria-label={label}>
      <span className="digit-row">
        {[...digits].map((digit, index) => {
          const active = new Set(SEGMENTS[digit] || []);
          return (
            <span className="digit" key={`${digit}-${index}`}>
              {['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((segment) => (
                <span
                  className={`seg seg-${segment}${active.has(segment) ? ' on' : ''}`}
                  key={segment}
                />
              ))}
            </span>
          );
        })}
      </span>
    </div>
  );
}

function Cell({ cell, t, onOpen, onFlag, touchMode, noFlag, warmAudio }) {
  const longPressRef = useRef(null);
  const longPressedRef = useRef(false);
  const touchStartRef = useRef(null);
  const touchMovedRef = useRef(false);
  const skipClickRef = useRef(false);
  const skipClickTimerRef = useRef(null);

  const suppressNextClick = () => {
    window.clearTimeout(skipClickTimerRef.current);
    skipClickRef.current = true;
    skipClickTimerRef.current = window.setTimeout(() => {
      skipClickRef.current = false;
    }, 0);
  };

  useEffect(() => () => {
    window.clearTimeout(longPressRef.current);
    window.clearTimeout(skipClickTimerRef.current);
  }, []);

  const handlePointerDown = (event) => {
    if (event.pointerType === 'mouse') {
      longPressedRef.current = false;
      return;
    }
    if (event.button !== 0) return;
    warmAudio();
    touchStartRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    touchMovedRef.current = false;
    longPressedRef.current = false;
    event.currentTarget.classList.add('peek');
    if (noFlag) return;
    longPressRef.current = window.setTimeout(() => {
      longPressedRef.current = true;
      suppressNextClick();
      if (touchMode === 'flag') onOpen(cell.row, cell.col);
      else onFlag(cell.row, cell.col);
    }, 480);
  };

  const handlePointerMove = (event) => {
    if (event.pointerType === 'mouse' || touchMovedRef.current) return;
    if (!movedBeyondThreshold(touchStartRef.current, event)) return;
    touchMovedRef.current = true;
    event.currentTarget.classList.remove('peek');
    window.clearTimeout(longPressRef.current);
  };

  const handlePointerUp = (event) => {
    const moved = touchMovedRef.current;
    touchStartRef.current = null;
    touchMovedRef.current = false;
    event.currentTarget.classList.remove('peek');
    window.clearTimeout(longPressRef.current);
    if (event.pointerType !== 'mouse' && moved) {
      event.preventDefault();
      suppressNextClick();
      return;
    }
    if (!noFlag && event.pointerType !== 'mouse' && touchMode === 'flag' && !longPressedRef.current) {
      event.preventDefault();
      suppressNextClick();
      onFlag(cell.row, cell.col);
    }
  };

  const classNames = [
    'cell',
    cell.revealed && 'revealed',
    cell.flagged && 'flagged',
    cell.questioned && 'questioned',
    cell.mine && cell.revealed && 'mine',
    cell.exploded && 'exploded',
    cell.revealed && !cell.mine && cell.adjacent > 0 && `n${cell.adjacent}`,
  ].filter(Boolean).join(' ');

  return (
    <button
      className={classNames}
      type="button"
      role="gridcell"
      data-row={cell.row}
      data-col={cell.col}
      aria-label={t('cell', { row: cell.row + 1, col: cell.col + 1 })}
      onClick={() => {
        if (skipClickRef.current) {
          window.clearTimeout(skipClickTimerRef.current);
          skipClickRef.current = false;
          return;
        }
        onOpen(cell.row, cell.col);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        if (longPressedRef.current) return;
        if (!noFlag) onFlag(cell.row, cell.col);
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={(event) => {
        touchStartRef.current = null;
        touchMovedRef.current = false;
        event.currentTarget.classList.remove('peek');
        window.clearTimeout(skipClickTimerRef.current);
        skipClickRef.current = false;
        window.clearTimeout(longPressRef.current);
      }}
    >
      {cell.questioned ? '?' : cell.revealed && !cell.mine && cell.adjacent > 0 ? cell.adjacent : ''}
    </button>
  );
}

function Board({ game, t, openCell, toggleFlag, touchMode, warmAudio }) {
  const boardRef = useRef(null);
  const previewTargetRef = useRef(null);
  const previewCellsRef = useRef([]);
  const mousePointerRef = useRef(null);
  const skipMouseClickRef = useRef(false);
  const skipMouseClickTimerRef = useRef(null);

  const cellAtPoint = (clientX, clientY) => {
    const target = document.elementFromPoint(clientX, clientY)?.closest('.cell');
    return target && boardRef.current?.contains(target) ? target : null;
  };

  const clearPreview = () => {
    previewCellsRef.current.forEach((cell) => cell.classList.remove('peek'));
    previewCellsRef.current = [];
    previewTargetRef.current = null;
  };

  const showPreview = (target) => {
    if (previewTargetRef.current === target) return;
    clearPreview();
    if (!target || game.gameOver) return;

    previewTargetRef.current = target;
    const row = Number(target.dataset.row);
    const col = Number(target.dataset.col);
    const cell = game.cells[row]?.[col];
    if (!cell) return;

    if (!cell.revealed) {
      if (!cell.flagged && !cell.questioned) previewCellsRef.current = [target];
    } else {
      previewCellsRef.current = findChordCandidates(game.cells, game.settings, row, col)
        .map(([nextRow, nextCol]) => boardRef.current?.querySelector(
          `.cell[data-row="${nextRow}"][data-col="${nextCol}"]`,
        ))
        .filter(Boolean);
    }
    previewCellsRef.current.forEach((previewCell) => previewCell.classList.add('peek'));
  };

  const suppressMouseClick = () => {
    window.clearTimeout(skipMouseClickTimerRef.current);
    skipMouseClickRef.current = true;
    skipMouseClickTimerRef.current = window.setTimeout(() => {
      skipMouseClickRef.current = false;
    }, 0);
  };

  useEffect(() => () => {
    clearPreview();
    window.clearTimeout(skipMouseClickTimerRef.current);
  }, []);

  const handlePointerDown = (event) => {
    if (!isPrimaryMouseGesture(event)) return;
    const target = cellAtPoint(event.clientX, event.clientY);
    if (!target) return;
    warmAudio();
    mousePointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    showPreview(target);
  };

  const handlePointerMove = (event) => {
    if (event.pointerType !== 'mouse' || mousePointerRef.current !== event.pointerId) return;
    if ((event.buttons & 1) === 0) {
      mousePointerRef.current = null;
      clearPreview();
      return;
    }
    showPreview(cellAtPoint(event.clientX, event.clientY));
  };

  const handlePointerUp = (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    if (!canCompleteMouseGesture(mousePointerRef.current, event)) {
      mousePointerRef.current = null;
      clearPreview();
      suppressMouseClick();
      return;
    }
    const target = cellAtPoint(event.clientX, event.clientY);
    mousePointerRef.current = null;
    clearPreview();
    suppressMouseClick();
    if (target) openCell(Number(target.dataset.row), Number(target.dataset.col));
  };

  const cancelMouseGesture = (event) => {
    if (event.pointerType !== 'mouse') return;
    mousePointerRef.current = null;
    clearPreview();
  };

  return (
    <div
      ref={boardRef}
      className={[
        'board',
        game.paused && 'is-paused',
        game.status === 'lose' && 'is-failed',
        ['generating', 'generatingNoGuess'].includes(game.status) && 'is-generating',
      ].filter(Boolean).join(' ')}
      role="grid"
      aria-label={t('board')}
      style={{ gridTemplateColumns: `repeat(${game.settings.cols}, 24px)` }}
      onClickCapture={(event) => {
        if (event.detail === 0 || (!event.ctrlKey && !skipMouseClickRef.current)) return;
        window.clearTimeout(skipMouseClickTimerRef.current);
        skipMouseClickRef.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={cancelMouseGesture}
      onLostPointerCapture={cancelMouseGesture}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse' && mousePointerRef.current !== null) clearPreview();
      }}
    >
      {game.cells.flat().map((cell) => (
        <Cell
          key={`${cell.row}-${cell.col}`}
          cell={cell}
          t={t}
          onOpen={openCell}
          onFlag={toggleFlag}
          touchMode={touchMode}
          noFlag={game.noFlag}
          warmAudio={warmAudio}
        />
      ))}
    </div>
  );
}

function RecordsPanel({
  visible,
  t,
  language,
  bestList,
  history,
  clearHistory,
  setHistory,
  translateError,
}) {
  const [filter, setFilter] = useState('all');
  const [noGuessFilter, setNoGuessFilter] = useState('all');
  const [noFlagFilter, setNoFlagFilter] = useState('all');
  const [sort, setSort] = useState('timeDesc');
  const importRef = useRef(null);
  const matchesOptions = useCallback((record) => {
    const matchesNoGuess = noGuessFilter === 'all'
      || record.noGuess === (noGuessFilter === 'enabled');
    const matchesNoFlag = noFlagFilter === 'all'
      || record.noFlag === (noFlagFilter === 'enabled');
    return matchesNoGuess && matchesNoFlag;
  }, [noFlagFilter, noGuessFilter]);
  const filteredBestList = useMemo(
    () => bestList.filter(matchesOptions),
    [bestList, matchesOptions],
  );
  const records = useMemo(() => history
    .filter((record) => filter === 'all' || record.level === filter)
    .filter(matchesOptions)
    .sort((a, b) => {
      if (sort === 'secondsAsc') return a.seconds - b.seconds;
      if (sort === 'secondsDesc') return b.seconds - a.seconds;
      return sort === 'timeAsc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp;
    }), [filter, history, matchesOptions, sort]);

  if (!visible) return null;
  return (
    <section className="history-panel records-panel" aria-label={t('records')}>
      <div className="records-toolbar">
        <div className="records-filters">
          <select value={noGuessFilter} onChange={(event) => setNoGuessFilter(event.target.value)} aria-label={t('noGuessFilter')}>
            <option value="all">{t('noGuess')} · {t('all')}</option>
            <option value="enabled">{t('noGuess')} · {t('enabled')}</option>
            <option value="disabled">{t('noGuess')} · {t('disabled')}</option>
          </select>
          <select value={noFlagFilter} onChange={(event) => setNoFlagFilter(event.target.value)} aria-label={t('noFlagFilter')}>
            <option value="all">{t('noFlag')} · {t('all')}</option>
            <option value="enabled">{t('noFlag')} · {t('enabled')}</option>
            <option value="disabled">{t('noFlag')} · {t('disabled')}</option>
          </select>
        </div>
        <div className="records-actions">
          <button type="button" onClick={() => downloadJson(`minesweeper-history-${new Date().toISOString().slice(0, 10)}.json`, {
            app: 'minesweeper',
            version: 2,
            exportedAt: new Date().toISOString(),
            records: history,
          })}>{t('saveFile')}</button>
          <button type="button" onClick={() => importRef.current?.click()}>{t('loadFile')}</button>
          <button type="button" onClick={clearHistory}>{t('clear')}</button>
        </div>
      </div>
      <div className="records-section">
        <strong>{t('bestScores')}</strong>
        <ol className="history-list" data-empty-label={t('empty')}>
          {filteredBestList.map((entry) => (
            <li key={`${entry.board}-${entry.noGuess}-${entry.noFlag}`}>
              {entry.board}
              {entry.noGuess ? ` · ${t('noGuess')}` : ''}
              {entry.noFlag ? ` · ${t('noFlag')}` : ''}
              {!entry.noGuess && !entry.noFlag ? ` · ${t('standardMode')}` : ''}
              {' · '}{entry.seconds}s
            </li>
          ))}
        </ol>
      </div>
      <div className="records-section">
        <div className="history-title">
          <span>{t('history')}</span>
          <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label={t('historyFilter')}>
            <option value="all">{t('all')}</option>
            {Object.keys(LEVELS).concat('custom').map((level) => (
              <option value={level} key={level}>{t(level)}</option>
            ))}
          </select>
          <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label={t('historySort')}>
            <option value="timeDesc">{t('newest')}</option>
            <option value="timeAsc">{t('oldest')}</option>
            <option value="secondsAsc">{t('fastest')}</option>
            <option value="secondsDesc">{t('slowest')}</option>
          </select>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (event) => {
              const [file] = event.target.files;
              try {
                const imported = validateHistoryPayload(await readJsonFile(file));
                const merged = [...imported, ...history];
                const unique = [...new Map(merged.map((record) => [
                  `${record.level}|${record.rows}|${record.cols}|${record.mines}|${record.noGuess}|${record.noFlag}|${record.seconds}|${record.timestamp}`,
                  record,
                ])).values()].slice(0, MAX_HISTORY_RECORDS);
                setHistory(unique);
                writeJson(STORAGE_KEYS.history, unique);
              } catch (error) {
                window.alert(t('historyFileError', { message: translateError(error.message) }));
              }
              event.target.value = '';
            }}
          />
        </div>
        <ol className="history-list" data-empty-label={t('empty')}>
          {records.map((record) => (
            <li key={`${record.level}-${record.noGuess}-${record.noFlag}-${record.timestamp}`}>
              {t('win')}
              {record.noGuess ? ` · ${t('noGuess')}` : ''}
              {record.noFlag ? ` · ${t('noFlag')}` : ''}
              {!record.noGuess && !record.noFlag ? ` · ${t('standardMode')}` : ''}
              {' · '}{t(record.level)} {record.rows}x{record.cols}/{record.mines} {t('mineUnit')} · {record.seconds}s · {new Date(record.timestamp).toLocaleString(language, { hour12: false })}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function App() {
  const [language, setLanguage] = useState(readLanguage);
  const i18n = useMemo(() => createI18n(language), [language]);
  const t = useCallback((key, values) => i18n.t(key, values), [i18n]);
  const gameApi = useMinesweeper({ t });
  const {
    game, seconds, flags, bestTime, bestList, history,
    noGuess, noFlag, sound, volume, touchMode, soundPlayer,
    newGame, retrySame, openCell, toggleFlag, setPaused,
    serialize, restore, clearHistory, setHistory, settingsActions,
  } = gameApi;
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [recordsVisible, setRecordsVisible] = useState(false);
  const [faceAnimation, setFaceAnimation] = useState(0);
  const [zoom, setZoom] = useState(readZoom);
  const [custom, setCustom] = useState({ rows: 16, cols: 16, mines: 40 });
  const shellRef = useRef(null);
  const cardRef = useRef(null);
  const dockRef = useRef(null);
  const dockTrackRef = useRef(null);
  const importGameRef = useRef(null);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t('title');
  }, [language, t]);

  useEffect(() => {
    const shell = shellRef.current;
    const card = cardRef.current;
    const dock = dockRef.current;
    if (!shell || !card || !dock) return undefined;
    let syncing = false;
    const update = () => {
      const overflow = shell.scrollWidth - shell.clientWidth > 1;
      dock.hidden = !overflow;
      document.body.classList.toggle('has-horizontal-scroll-dock', overflow);
      if (overflow) {
        dockTrackRef.current.style.width = `${shell.scrollWidth}px`;
        dock.scrollLeft = shell.scrollLeft;
      }
    };
    const shellScroll = () => {
      if (syncing) return;
      syncing = true;
      dock.scrollLeft = shell.scrollLeft;
      syncing = false;
    };
    const dockScroll = () => {
      if (syncing) return;
      syncing = true;
      shell.scrollLeft = dock.scrollLeft;
      syncing = false;
    };
    const observer = new ResizeObserver(update);
    observer.observe(card);
    shell.addEventListener('scroll', shellScroll);
    dock.addEventListener('scroll', dockScroll);
    window.addEventListener('resize', update);
    update();
    return () => {
      observer.disconnect();
      shell.removeEventListener('scroll', shellScroll);
      dock.removeEventListener('scroll', dockScroll);
      window.removeEventListener('resize', update);
    };
  }, [zoom, recordsVisible, helpVisible, settingsVisible]);

  useEffect(() => {
    const keyboard = (event) => {
      if (event.target.matches('input, select, button')) return;
      const key = event.key.toLowerCase();
      if (key === 'r') newGame(game.settings, game.level);
      if (key === 'p') setPaused(!game.paused);
      if (key === 'h') setRecordsVisible((visible) => !visible);
      if (['1', '2', '3'].includes(key)) {
        const level = { 1: 'beginner', 2: 'intermediate', 3: 'expert' }[key];
        newGame(LEVELS[level], level);
      }
    };
    document.addEventListener('keydown', keyboard);
    return () => document.removeEventListener('keydown', keyboard);
  }, [game.level, game.paused, game.settings, newGame, setPaused]);

  const statusWidth = game.settings.cols * 24 + 8;
  const resetGame = () => {
    soundPlayer.warm();
    setFaceAnimation((value) => value + 1);
    newGame(game.settings, game.level);
  };
  const startCustomGame = () => {
    const settings = normalizeBoardSettings(custom);
    setCustom(settings);
    newGame(settings, 'custom');
  };
  const helpItems = [
    ['helpMouseTitle', 'helpMouse'],
    ['helpChordTitle', 'helpChord'],
    ['helpTouchTitle', 'helpTouch'],
    ['helpSafetyTitle', 'helpSafety'],
    ['helpNoFlagTitle', 'helpNoFlag'],
    ['helpKeysTitle', 'helpKeys'],
  ];

  return (
    <>
      <main className="page-shell" ref={shellRef}>
        <section className="game-card" ref={cardRef} aria-label={t('game')} style={{ zoom: `${zoom}%` }}>
          <header className="topbar">
            <div><h1>{t('title')}</h1><p>{t('subtitle')}</p></div>
            <span className="topbar-mark" aria-hidden="true">MINESWEEPER</span>
          </header>

          <div className="controls" aria-label={t('gameSettings')}>
            <div className="utility-controls">
              <button className={`level${settingsVisible ? ' is-active' : ''}`} type="button" onClick={() => setSettingsVisible((value) => !value)}>{t('settings')}</button>
              <button className={`level${helpVisible ? ' is-active' : ''}`} type="button" onClick={() => setHelpVisible((value) => !value)}>{t('help')}</button>
              <button className={`level${recordsVisible ? ' is-active' : ''}`} type="button" aria-expanded={recordsVisible} onClick={() => setRecordsVisible((value) => !value)}>{t('records')}</button>
              <label className="language-control">
                <span className="visually-hidden">{t('language')}</span>
                <select value={language} onChange={(event) => {
                  setLanguage(event.target.value);
                  writeText(STORAGE_KEYS.language, event.target.value);
                }} aria-label={t('language')}>
                  {i18n.languages.map(({ code, name }) => <option value={code} key={code}>{name}</option>)}
                </select>
              </label>
            </div>
            <div className="difficulty-controls" aria-label={t('difficulty')}>
              {Object.keys(LEVELS).concat('custom').map((level) => (
                <button
                  className={`level${game.level === level ? ' is-active' : ''}`}
                  data-level={level}
                  type="button"
                  key={level}
                  onClick={() => {
                    if (level === 'custom') startCustomGame();
                    else newGame(LEVELS[level], level);
                  }}
                >{t(level)}</button>
              ))}
            </div>
          </div>

          {settingsVisible && (
            <div className="settings-panel">
              <label className="zoom-control"><span>{t('zoom')}</span>
                <select value={zoom} onChange={(event) => {
                  const value = Number(event.target.value);
                  setZoom(value);
                  writeText(STORAGE_KEYS.zoom, value);
                }}>
                  {ZOOM_LEVELS.map((value) => <option value={value} key={value}>{value}%</option>)}
                </select>
              </label>
              <label className="option-control"><input type="checkbox" checked={noGuess} onChange={(event) => settingsActions.setNoGuess(event.target.checked)} />{t('noGuess')}</label>
              <label className="option-control"><input type="checkbox" checked={noFlag} onChange={(event) => settingsActions.setNoFlag(event.target.checked)} />{t('noFlag')}</label>
              <label className="option-control"><input type="checkbox" checked={sound} onChange={(event) => settingsActions.setSound(event.target.checked)} />{t('sound')}</label>
              <label className="option-control volume-control">
                <span>{t('volume')}</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={volume}
                  aria-label={t('volume')}
                  aria-valuetext={`${volume}%`}
                  onChange={(event) => settingsActions.setVolume(event.target.value)}
                  onPointerUp={() => {
                    if (sound) void soundPlayer.play('flag');
                  }}
                  onKeyUp={(event) => {
                    if (sound && ['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) {
                      void soundPlayer.play('flag');
                    }
                  }}
                />
                <output>{volume}%</output>
              </label>
              <label className="option-control">{t('touch')}
                <select disabled={noFlag} value={noFlag ? 'open' : touchMode} onChange={(event) => settingsActions.setTouchMode(event.target.value)}>
                  <option value="open">{t('touchOpen')}</option>
                  <option value="flag">{t('touchFlag')}</option>
                </select>
              </label>
              <button type="button" onClick={() => {
                const snapshot = serialize();
                if (!snapshot) window.alert(t('noGameToSave'));
                else downloadJson(`minesweeper-game-${new Date().toISOString().slice(0, 10)}.json`, {
                  app: 'minesweeper', type: 'game-state', version: 2, game: snapshot,
                });
              }}>{t('saveGame')}</button>
              <button type="button" onClick={() => importGameRef.current?.click()}>{t('loadGame')}</button>
              <input ref={importGameRef} type="file" accept="application/json,.json" hidden onChange={async (event) => {
                const [file] = event.target.files;
                try {
                  const parsed = await readJsonFile(file);
                  restore(parsed.game || parsed);
                } catch (error) {
                  window.alert(t('gameFileError', { message: i18n.translateError(error.message) }));
                }
                event.target.value = '';
              }} />
            </div>
          )}

          {game.level === 'custom' && (
            <form className="custom-panel" onSubmit={(event) => {
              event.preventDefault();
              startCustomGame();
            }}>
              {[
                ['cols', 'width', 8, 40],
                ['rows', 'height', 8, 30],
                ['mines', 'mines', 10, 300],
              ].map(([field, label, min, max]) => (
                <label key={field}>{t(label)} <input type="number" min={min} max={max} value={custom[field]} onChange={(event) => setCustom((value) => ({ ...value, [field]: Number(event.target.value) }))} /></label>
              ))}
              <button type="submit">{t('start')}</button>
            </form>
          )}

          <div className="meta-panel">
            <span>{t('best', { value: bestTime === null ? '--' : `${bestTime}s` })}</span>
            {noGuess && <span>{t('noGuess')}</span>}
            {noFlag && <span>{t('noFlag')}</span>}
            {!noGuess && !noFlag && <span>{t('standardMode')}</span>}
            <span id="statusText">{t(game.status)}</span>
            <button type="button" onClick={() => setPaused(!game.paused)}>{t(game.paused ? 'resume' : 'pause')}</button>
            <button type="button" onClick={retrySame}>{t('retry')}</button>
          </div>

          <div className="play-layout">
            <div className="game-frame">
              <div
                className="statusbar"
                style={{ width: `${statusWidth}px` }}
                role="button"
                tabIndex={0}
                aria-label={t('restart')}
                onClick={resetGame}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  resetGame();
                }}
              >
                <Counter value={game.settings.mines - flags} label={t('minesRemaining')} />
                <span
                  className="face"
                  key={faceAnimation}
                  aria-hidden="true"
                >
                  {game.status === 'win' ? '😎' : game.status === 'lose' ? '😵' : '🙂'}
                </span>
                <Counter value={seconds} label={t('elapsed')} />
              </div>
              <Board game={game} t={t} openCell={openCell} toggleFlag={toggleFlag} touchMode={touchMode} warmAudio={() => soundPlayer.warm()} />
            </div>
            <RecordsPanel
              visible={recordsVisible}
              t={t}
              language={language}
              bestList={bestList}
              history={history}
              clearHistory={clearHistory}
              setHistory={setHistory}
              translateError={i18n.translateError}
            />
          </div>

          {game.paused && <div className="pause-overlay">{t('paused')}</div>}
          {game.result && <div className="result-panel">{t(game.result.key)} · {t(game.level)} {game.settings.rows}x{game.settings.cols}/{game.settings.mines} {t('mineUnit')} · {seconds}s{game.result.isBest ? ` · ${t('newBest')}` : ''}</div>}

          {helpVisible && (
            <section id="helpPanel" className="info-panel" aria-label={t('help')}>
              <strong>{t('help')}</strong>
              <dl className="help-list">
                {helpItems.flatMap(([title, description]) => [
                  <dt key={`${title}-term`}>{t(title)}</dt>,
                  <dd key={`${title}-description`}>{t(description)}</dd>,
                ])}
              </dl>
            </section>
          )}
        </section>
      </main>
      <div className="horizontal-scroll-dock" ref={dockRef} aria-hidden="true" hidden>
        <div className="horizontal-scroll-track" ref={dockTrackRef} />
      </div>
    </>
  );
}

export default App;
