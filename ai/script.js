const LEVELS = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
};

const boardEl = document.getElementById('board');
const statusbarEl = document.getElementById('statusbar');
const faceEl = document.getElementById('face');
const mineCountEl = document.getElementById('mineCount');
const timerEl = document.getElementById('timer');
const zoomInput = document.getElementById('zoomInput');
const settingsToggle = document.getElementById('settingsToggle');
const settingsPanel = document.getElementById('settingsPanel');
const helpToggle = document.getElementById('helpToggle');
const helpPanel = document.getElementById('helpPanel');
const bestToggle = document.getElementById('bestToggle');
const bestPanel = document.getElementById('bestPanel');
const bestList = document.getElementById('bestList');
const bestTimeEl = document.getElementById('bestTime');
const pauseButton = document.getElementById('pauseButton');
const pauseOverlay = document.getElementById('pauseOverlay');
const statusText = document.getElementById('statusText');
const retryButton = document.getElementById('retryButton');
const resultPanel = document.getElementById('resultPanel');
const noGuessToggle = document.getElementById('noGuessToggle');
const soundToggle = document.getElementById('soundToggle');
const touchMode = document.getElementById('touchMode');
const historyToggle = document.getElementById('historyToggle');
const historyPanel = document.getElementById('historyPanel');
const historyList = document.getElementById('historyList');
const historyFilter = document.getElementById('historyFilter');
const historySort = document.getElementById('historySort');
const clearHistory = document.getElementById('clearHistory');
const exportHistory = document.getElementById('exportHistory');
const importHistory = document.getElementById('importHistory');
const exportGame = document.getElementById('exportGame');
const importGame = document.getElementById('importGame');
const customPanel = document.getElementById('customPanel');
const customRows = document.getElementById('customRows');
const customCols = document.getElementById('customCols');
const customMines = document.getElementById('customMines');

let settings = { ...LEVELS.expert };
let cells = [];
let gameOver = false;
let firstClick = true;
let revealedCount = 0;
let flags = 0;
let seconds = 0;
let timerId = null;
let longPressId = null;
let touchLongPressed = false;
let peekedCells = [];
let paused = false;
let currentLevel = 'expert';
let resultRecorded = false;
let lastMineLayout = null;
let loadingSavedGame = false;
let audioCtx = null;
let audioMaster = null;

function initAudio() {
  if (audioCtx || !window.AudioContext && !window.webkitAudioContext) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioCtx({ latencyHint: 'interactive' });
  const compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 16;
  compressor.ratio.value = 8;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.12;
  audioMaster = audioCtx.createGain();
  audioMaster.gain.value = 0.65;
  audioMaster.connect(compressor).connect(audioCtx.destination);
}

function applyZoom(value) {
  const zoom = clamp(value, 50, 300);
  document.querySelector('.game-card').style.transform = `scale(${zoom / 100})`;
  zoomInput.value = zoom;
  localStorage.setItem('minesweeperZoom', String(zoom));
}

function playSound(type) {
  if (!soundToggle.checked || !window.AudioContext && !window.webkitAudioContext) return;
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const ctx = audioCtx;
  const now = ctx.currentTime + 0.001;

  function tone(frequency, start, duration, volume = 0.035, wave = 'sine') {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.setValueAtTime(frequency, now + start);
    oscillator.type = wave;
    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.linearRampToValueAtTime(volume, now + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
    oscillator.connect(gain).connect(audioMaster);
    oscillator.start(now + start);
    oscillator.stop(now + start + duration + 0.02);
  }

  if (type === 'open') tone(740, 0, 0.08, 0.026, 'triangle');
  if (type === 'flag') tone(980, 0, 0.06, 0.024, 'sine');
  if (type === 'win') {
    tone(660, 0, 0.08, 0.025, 'triangle');
    tone(880, 0.08, 0.1, 0.025, 'triangle');
    tone(1175, 0.17, 0.14, 0.023, 'sine');
  }
  if (type === 'lose') {
    tone(260, 0, 0.12, 0.028, 'triangle');
    tone(190, 0.1, 0.18, 0.026, 'sine');
    tone(130, 0.24, 0.26, 0.024, 'sine');
  }
}

function warmAudio() {
  if (!soundToggle.checked || audioCtx || !window.AudioContext && !window.webkitAudioContext) return;
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || min, min), max);
}

function formatCounter(value) {
  const sign = value < 0 ? '-' : '';
  return sign + String(Math.abs(value)).padStart(3, '0').slice(-3);
}

function renderDigits(element, value) {
  const segmentMap = {
    '0': ['a', 'b', 'c', 'd', 'e', 'f'],
    '1': ['b', 'c'],
    '2': ['a', 'b', 'g', 'e', 'd'],
    '3': ['a', 'b', 'c', 'd', 'g'],
    '4': ['f', 'g', 'b', 'c'],
    '5': ['a', 'f', 'g', 'c', 'd'],
    '6': ['a', 'f', 'e', 'd', 'c', 'g'],
    '7': ['a', 'b', 'c'],
    '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    '9': ['a', 'b', 'c', 'd', 'f', 'g'],
    '-': ['g'],
  };

  element.replaceChildren(...formatCounter(value).split('').map((digit) => {
    const digitEl = document.createElement('span');
    digitEl.className = 'digit';
    const onSegments = new Set(segmentMap[digit] || []);
    ['a', 'b', 'c', 'd', 'e', 'f', 'g'].forEach((segment) => {
      const segmentEl = document.createElement('span');
      segmentEl.className = `seg seg-${segment}${onSegments.has(segment) ? ' on' : ''}`;
      digitEl.appendChild(segmentEl);
    });
    return digitEl;
  }));
}

function startTimer() {
  if (timerId || paused) return;
  timerId = window.setInterval(() => {
    seconds = Math.min(seconds + 1, 999);
    renderDigits(timerEl, seconds);
    saveCurrentGame();
  }, 1000);
}

function stopTimer() {
  window.clearInterval(timerId);
  timerId = null;
}

function resetTimer() {
  stopTimer();
  seconds = 0;
  renderDigits(timerEl, seconds);
}

function bestKey() {
  const { rows, cols, mines } = settings;
  return `minesweeperBest:${rows}x${cols}:${mines}`;
}

function updateBestTime() {
  const best = localStorage.getItem(bestKey());
  bestTimeEl.textContent = `最佳：${best ? `${best}s` : '--'}`;
}

function renderBestList() {
  const entries = Object.keys(localStorage)
    .filter((key) => key.startsWith('minesweeperBest:'))
    .map((key) => ({ key, seconds: Number(localStorage.getItem(key)) }))
    .filter((entry) => Number.isFinite(entry.seconds))
    .sort((a, b) => a.seconds - b.seconds);
  bestList.replaceChildren(...entries.map((entry) => {
    const item = document.createElement('li');
    item.textContent = `${entry.key.replace('minesweeperBest:', '')} · ${entry.seconds}s`;
    return item;
  }));
}

function updateStatus(text) {
  statusText.textContent = text;
}

function levelLabel() {
  const labels = {
    beginner: '初级',
    intermediate: '中级',
    expert: '高级',
    custom: '自定义',
  };
  return labels[currentLevel] || '自定义';
}

function readHistory() {
  try {
    return JSON.parse(localStorage.getItem('minesweeperHistory') || '[]');
  } catch {
    return [];
  }
}

function renderHistory() {
  const filter = historyFilter?.value || 'all';
  const sort = historySort?.value || 'timeDesc';
  const history = readHistory()
    .filter((record) => record.result === '胜利')
    .filter((record) => filter === 'all' || record.level === filter)
    .sort((a, b) => {
      if (sort === 'secondsAsc') return a.seconds - b.seconds;
      if (sort === 'secondsDesc') return b.seconds - a.seconds;
      const at = Number(a.timestamp) || Date.parse(a.time) || 0;
      const bt = Number(b.timestamp) || Date.parse(b.time) || 0;
      return sort === 'timeAsc' ? at - bt : bt - at;
    });
  historyList.replaceChildren(...history.map((record) => {
    const item = document.createElement('li');
    item.textContent = `${record.result} · ${record.level} ${record.rows}x${record.cols}/${record.mines}雷 · ${record.seconds}s · ${record.time}`;
    return item;
  }));
}

function normalizeHistory(records) {
  if (!Array.isArray(records)) return [];
  return records.filter((record) => (
    record &&
    record.result === '胜利' &&
    typeof record.level === 'string' &&
    Number.isFinite(Number(record.rows)) &&
    Number.isFinite(Number(record.cols)) &&
    Number.isFinite(Number(record.mines)) &&
    Number.isFinite(Number(record.seconds)) &&
    typeof record.time === 'string'
  )).map((record) => ({
    result: '胜利',
    level: record.level,
    rows: Number(record.rows),
    cols: Number(record.cols),
    mines: Number(record.mines),
    seconds: Number(record.seconds),
    time: record.time,
    timestamp: Number(record.timestamp) || Date.parse(record.time) || 0,
  }));
}

function exportHistoryFile() {
  const data = {
    app: 'minesweeper',
    version: 1,
    exportedAt: new Date().toISOString(),
    records: readHistory().filter((record) => record.result === '胜利'),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `minesweeper-history-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importHistoryFile(file) {
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const imported = normalizeHistory(Array.isArray(parsed) ? parsed : parsed.records);
      const merged = [...imported, ...readHistory().filter((record) => record.result === '胜利')];
      const seen = new Set();
      const unique = merged.filter((record) => {
        const key = `${record.level}|${record.rows}|${record.cols}|${record.mines}|${record.seconds}|${record.time}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      localStorage.setItem('minesweeperHistory', JSON.stringify(unique));
      renderHistory();
    } catch {
      window.alert('战绩文件格式不正确');
    }
  });
  reader.readAsText(file);
}

function recordHistory(result) {
  if (resultRecorded || firstClick || result !== '胜利') return;
  resultRecorded = true;
  const history = readHistory();
  history.unshift({
    result,
    level: levelLabel(),
    rows: settings.rows,
    cols: settings.cols,
    mines: settings.mines,
    seconds,
    time: new Date().toLocaleString('zh-CN', { hour12: false }),
    timestamp: Date.now(),
  });
  localStorage.setItem('minesweeperHistory', JSON.stringify(history));
  renderHistory();
}

function saveBestTime() {
  const best = Number(localStorage.getItem(bestKey())) || Infinity;
  if (seconds > 0 && seconds < best) {
    localStorage.setItem(bestKey(), String(seconds));
    updateBestTime();
    renderBestList();
    return true;
  }
  return false;
}

function setPaused(nextPaused) {
  if (gameOver || firstClick) return;
  paused = nextPaused;
  pauseOverlay.hidden = !paused;
  boardEl.classList.toggle('is-paused', paused);
  pauseButton.textContent = paused ? '继续' : '暂停';
  updateStatus(paused ? '已暂停' : '进行中');
  if (paused) {
    stopTimer();
  } else {
    startTimer();
  }
}

function showResult(result, isBest = false) {
  resultPanel.hidden = false;
  resultPanel.textContent = `${result} · ${levelLabel()} ${settings.rows}x${settings.cols}/${settings.mines}雷 · ${seconds}s${isBest ? ' · 新最佳' : ''}`;
}

function hideResult() {
  resultPanel.hidden = true;
  resultPanel.textContent = '';
}

function neighbors(row, col) {
  const list = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const nextRow = row + dr;
      const nextCol = col + dc;
      if (nextRow >= 0 && nextRow < settings.rows && nextCol >= 0 && nextCol < settings.cols) {
        list.push(cells[nextRow][nextCol]);
      }
    }
  }
  return list;
}

function createCells() {
  cells = Array.from({ length: settings.rows }, (_, row) => (
    Array.from({ length: settings.cols }, (_, col) => ({
      row,
      col,
      mine: false,
      exploded: false,
      adjacent: 0,
      revealed: false,
      flagged: false,
      questioned: false,
      el: null,
    }))
  ));
}

function placeMines(safeCell) {
  for (let attempt = 0; attempt < (noGuessToggle.checked ? 80 : 1); attempt += 1) {
    placeMinesOnce(safeCell);
    if (!noGuessToggle.checked || isLogicallySolvable(safeCell)) return;
  }
  placeMinesOnce(safeCell);
}

function placeMinesOnce(safeCell) {
  cells.flat().forEach((cell) => {
    cell.mine = false;
    cell.adjacent = 0;
  });
  const blocked = new Set([`${safeCell.row},${safeCell.col}`]);
  neighbors(safeCell.row, safeCell.col).forEach((cell) => blocked.add(`${cell.row},${cell.col}`));

  const candidates = cells.flat().filter((cell) => !blocked.has(`${cell.row},${cell.col}`));
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  candidates.slice(0, settings.mines).forEach((cell) => {
    cell.mine = true;
  });

  cells.flat().forEach((cell) => {
    cell.adjacent = neighbors(cell.row, cell.col).filter((neighbor) => neighbor.mine).length;
  });
  lastMineLayout = cells.flat().filter((cell) => cell.mine).map((cell) => [cell.row, cell.col]);
}

function isLogicallySolvable(startCell) {
  const knownSafe = new Set([`${startCell.row},${startCell.col}`]);
  const flaggedMines = new Set();
  let changed = true;

  while (changed) {
    changed = false;
    [...knownSafe].forEach((key) => {
      const [row, col] = key.split(',').map(Number);
      const cell = cells[row][col];
      if (cell.adjacent === 0) {
        neighbors(row, col).forEach((neighbor) => {
          const neighborKey = `${neighbor.row},${neighbor.col}`;
          if (!neighbor.mine && !knownSafe.has(neighborKey)) {
            knownSafe.add(neighborKey);
            changed = true;
          }
        });
      }
    });

    [...knownSafe].forEach((key) => {
      const [row, col] = key.split(',').map(Number);
      const cell = cells[row][col];
      if (cell.adjacent === 0) return;
      const around = neighbors(row, col);
      const unknown = around.filter((neighbor) => !knownSafe.has(`${neighbor.row},${neighbor.col}`) && !flaggedMines.has(`${neighbor.row},${neighbor.col}`));
      const flags = around.filter((neighbor) => flaggedMines.has(`${neighbor.row},${neighbor.col}`)).length;
      if (unknown.length > 0 && cell.adjacent - flags === unknown.length) {
        unknown.forEach((neighbor) => {
          const neighborKey = `${neighbor.row},${neighbor.col}`;
          if (neighbor.mine && !flaggedMines.has(neighborKey)) {
            flaggedMines.add(neighborKey);
            changed = true;
          }
        });
      }
      if (unknown.length > 0 && flags === cell.adjacent) {
        unknown.forEach((neighbor) => {
          const neighborKey = `${neighbor.row},${neighbor.col}`;
          if (!neighbor.mine && !knownSafe.has(neighborKey)) {
            knownSafe.add(neighborKey);
            changed = true;
          }
        });
      }
    });
  }

  return knownSafe.size >= settings.rows * settings.cols - settings.mines;
}

function applyMineLayout(layout) {
  cells.flat().forEach((cell) => {
    cell.mine = false;
    cell.adjacent = 0;
  });
  layout.forEach(([row, col]) => {
    if (cells[row]?.[col]) cells[row][col].mine = true;
  });
  cells.flat().forEach((cell) => {
    cell.adjacent = neighbors(cell.row, cell.col).filter((neighbor) => neighbor.mine).length;
  });
  lastMineLayout = layout.map(([row, col]) => [row, col]);
}

function updateMineCount() {
  renderDigits(mineCountEl, settings.mines - flags);
}

function renderCell(cell) {
  const el = cell.el;
  el.className = 'cell';
  el.textContent = '';

  if (cell.flagged) {
    el.classList.add('flagged');
  }

  if (cell.questioned) {
    el.classList.add('questioned');
    el.textContent = '?';
  }

  if (!cell.revealed) return;

  el.classList.add('revealed');
  if (cell.mine) {
    el.classList.add('mine');
    if (cell.exploded) {
      el.classList.add('exploded');
    }
    return;
  }

  if (cell.adjacent > 0) {
    el.classList.add(`n${cell.adjacent}`);
    el.textContent = cell.adjacent;
  }
}

function reveal(cell, shouldPlaySound = true) {
  if (gameOver || paused || cell.revealed || cell.flagged || cell.questioned) return;

  if (firstClick) {
    firstClick = false;
    placeMines(cell);
    startTimer();
    updateStatus('进行中');
  }

  cell.revealed = true;
  revealedCount += 1;
  renderCell(cell);

  if (cell.mine) {
    cell.exploded = true;
    lose();
    return;
  }

  if (cell.adjacent === 0) {
    neighbors(cell.row, cell.col).forEach((neighbor) => reveal(neighbor, false));
  }

  checkWin();
  if (shouldPlaySound && !gameOver) playSound('open');
  if (shouldPlaySound) saveCurrentGame();
}

function toggleFlag(cell) {
  if (gameOver || paused || cell.revealed) return;
  if (!cell.flagged && !cell.questioned) {
    cell.flagged = true;
    flags += 1;
  } else if (cell.flagged) {
    cell.flagged = false;
    cell.questioned = true;
    flags -= 1;
  } else {
    cell.questioned = false;
  }
  renderCell(cell);
  updateMineCount();
  playSound('flag');
  saveCurrentGame();
}

function chord(cell) {
  if (gameOver || paused || !cell.revealed || cell.adjacent === 0) return;
  const around = neighbors(cell.row, cell.col);
  const flagCount = around.filter((neighbor) => neighbor.flagged).length;
  if (flagCount === cell.adjacent) {
    const before = revealedCount;
    around.forEach((neighbor) => reveal(neighbor, false));
    if (!gameOver && revealedCount > before) {
      playSound('open');
      saveCurrentGame();
    }
  }
}

function handleCellClick(cell) {
  if (cell.revealed) {
    chord(cell);
  } else {
    reveal(cell);
  }
}

function clearPeek() {
  peekedCells.forEach((cell) => cell.el.classList.remove('peek'));
  peekedCells = [];
}

function peekNeighbors(cell) {
  clearPeek();
  if (gameOver || !cell.revealed || cell.adjacent === 0) return;
  peekedCells = neighbors(cell.row, cell.col).filter((neighbor) => (
    !neighbor.revealed && !neighbor.flagged
  ));
  peekedCells.forEach((neighbor) => neighbor.el.classList.add('peek'));
}

function revealAllMines() {
  cells.flat().forEach((cell) => {
    if (cell.mine) {
      cell.revealed = true;
      renderCell(cell);
    }
  });
}

function lose() {
  gameOver = true;
  faceEl.textContent = '😵';
  stopTimer();
  updateStatus('失败');
  showResult('失败');
  boardEl.classList.remove('is-failed');
  void boardEl.offsetWidth;
  boardEl.classList.add('is-failed');
  playSound('lose');
  clearSavedGame();
  revealAllMines();
}

function checkWin() {
  if (revealedCount !== settings.rows * settings.cols - settings.mines) return;
  gameOver = true;
  faceEl.textContent = '😎';
  stopTimer();
  const isBest = saveBestTime();
  recordHistory('胜利');
  updateStatus('胜利');
  showResult('胜利', isBest);
  playSound('win');
  clearSavedGame();
  cells.flat().forEach((cell) => {
    if (cell.mine && !cell.flagged) {
      cell.flagged = true;
      flags += 1;
      renderCell(cell);
    }
  });
  updateMineCount();
}

function buildBoard() {
  boardEl.innerHTML = '';
  boardEl.style.gridTemplateColumns = `repeat(${settings.cols}, 24px)`;
  statusbarEl.style.width = `${settings.cols * 24 + 8}px`;

  cells.flat().forEach((cell) => {
    const button = document.createElement('button');
    button.className = 'cell';
    button.type = 'button';
    button.setAttribute('role', 'gridcell');
    button.setAttribute('aria-label', `第 ${cell.row + 1} 行，第 ${cell.col + 1} 列`);

    button.addEventListener('click', () => {
      if (button.dataset.skipClick === '1') {
        delete button.dataset.skipClick;
        return;
      }
      handleCellClick(cell);
    });
    button.addEventListener('dblclick', () => chord(cell));
    button.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      toggleFlag(cell);
    });
    button.addEventListener('pointerdown', (event) => {
      warmAudio();
      peekNeighbors(cell);
      if (event.pointerType === 'mouse') return;
      touchLongPressed = false;
      longPressId = window.setTimeout(() => {
        touchLongPressed = true;
        button.dataset.skipClick = '1';
        if (touchMode.value === 'flag') {
          reveal(cell, true);
        } else {
          toggleFlag(cell);
        }
      }, 480);
    });
    button.addEventListener('pointerup', (event) => {
      if (event.pointerType !== 'mouse' && touchMode.value === 'flag' && !touchLongPressed) {
        event.preventDefault();
        button.dataset.skipClick = '1';
        toggleFlag(cell);
      }
    });
    button.addEventListener('pointerup', () => {
      clearPeek();
      window.clearTimeout(longPressId);
    });
    button.addEventListener('pointerleave', clearPeek);
    button.addEventListener('pointercancel', () => {
      clearPeek();
      window.clearTimeout(longPressId);
    });

    cell.el = button;
    boardEl.appendChild(button);
  });
}

function setActiveLevel(level) {
  document.querySelectorAll('.level[data-level]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.level === level);
  });
}

function newGame(nextSettings = settings) {
  settings = { ...nextSettings };
  gameOver = false;
  firstClick = true;
  paused = false;
  resultRecorded = false;
  revealedCount = 0;
  flags = 0;
  faceEl.textContent = '🙂';
  pauseButton.textContent = '暂停';
  pauseOverlay.hidden = true;
  updateStatus('未开始');
  hideResult();
  boardEl.classList.remove('is-paused', 'is-failed');
  resetTimer();
  updateMineCount();
  updateBestTime();
  createCells();
  buildBoard();
  if (!loadingSavedGame) clearSavedGame();
}

function retrySameGame() {
  if (!lastMineLayout) return;
  const layout = lastMineLayout.map(([row, col]) => [row, col]);
  newGame(settings);
  firstClick = false;
  applyMineLayout(layout);
  updateStatus('进行中');
  startTimer();
}

function serializeGame() {
  if (firstClick || gameOver) return null;
  return {
    settings,
    currentLevel,
    seconds,
    flags,
    lastMineLayout,
    cells: cells.flat().map((cell) => ({
      row: cell.row,
      col: cell.col,
      revealed: cell.revealed,
      flagged: cell.flagged,
      questioned: cell.questioned,
      exploded: cell.exploded,
    })),
  };
}

function exportGameFile() {
  const snapshot = serializeGame();
  if (!snapshot) {
    window.alert('当前没有可保存的进行中局面');
    return;
  }
  const data = {
    app: 'minesweeper',
    type: 'game-state',
    version: 1,
    exportedAt: new Date().toISOString(),
    game: snapshot,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `minesweeper-game-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function restoreSnapshot(snapshot) {
  if (!snapshot?.settings || !Array.isArray(snapshot.cells) || !Array.isArray(snapshot.lastMineLayout)) return false;
  loadingSavedGame = true;
  currentLevel = snapshot.currentLevel || 'custom';
  newGame(snapshot.settings);
  loadingSavedGame = false;
  firstClick = false;
  seconds = Number(snapshot.seconds) || 0;
  renderDigits(timerEl, seconds);
  applyMineLayout(snapshot.lastMineLayout);
  snapshot.cells.forEach((saved) => {
    const cell = cells[saved.row]?.[saved.col];
    if (!cell) return;
    cell.revealed = Boolean(saved.revealed);
    cell.flagged = Boolean(saved.flagged);
    cell.questioned = Boolean(saved.questioned);
    cell.exploded = Boolean(saved.exploded);
    renderCell(cell);
  });
  revealedCount = cells.flat().filter((cell) => cell.revealed && !cell.mine).length;
  flags = cells.flat().filter((cell) => cell.flagged).length;
  updateMineCount();
  updateStatus('进行中');
  startTimer();
  saveCurrentGame();
  return true;
}

function importGameFile(file) {
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!restoreSnapshot(parsed.game || parsed)) window.alert('局面文件格式不正确');
    } catch {
      window.alert('局面文件格式不正确');
    }
  });
  reader.readAsText(file);
}

function saveCurrentGame() {
  const snapshot = serializeGame();
  if (snapshot) localStorage.setItem('minesweeperCurrentGame', JSON.stringify(snapshot));
}

function clearSavedGame() {
  localStorage.removeItem('minesweeperCurrentGame');
}

function restoreSavedGame() {
  const raw = localStorage.getItem('minesweeperCurrentGame');
  if (!raw) return false;
  try {
    const snapshot = JSON.parse(raw);
    return restoreSnapshot(snapshot);
  } catch {
    loadingSavedGame = false;
    clearSavedGame();
    return false;
  }
}

document.querySelectorAll('.level[data-level]').forEach((button) => {
  button.addEventListener('click', () => {
    const level = button.dataset.level;
    setActiveLevel(level);
    customPanel.hidden = level !== 'custom';
    if (level !== 'custom') {
      currentLevel = level;
      newGame(LEVELS[level]);
    }
  });
});

customPanel.addEventListener('submit', (event) => {
  event.preventDefault();
  const rows = clamp(customRows.value, 8, 30);
  const cols = clamp(customCols.value, 8, 40);
  const maxMines = Math.max(10, rows * cols - 9);
  const mines = clamp(customMines.value, 10, maxMines);
  customRows.value = rows;
  customCols.value = cols;
  customMines.value = mines;
  currentLevel = 'custom';
  newGame({ rows, cols, mines });
});

pauseButton.addEventListener('click', () => setPaused(!paused));

retryButton.addEventListener('click', retrySameGame);

historyToggle.addEventListener('click', () => {
  historyPanel.hidden = !historyPanel.hidden;
});

settingsToggle.addEventListener('click', () => {
  settingsPanel.hidden = !settingsPanel.hidden;
});

helpToggle.addEventListener('click', () => {
  helpPanel.hidden = !helpPanel.hidden;
});

bestToggle.addEventListener('click', () => {
  bestPanel.hidden = !bestPanel.hidden;
  renderBestList();
});

historyFilter.addEventListener('change', renderHistory);
historySort.addEventListener('change', renderHistory);

clearHistory.addEventListener('click', () => {
  localStorage.removeItem('minesweeperHistory');
  renderHistory();
});

exportHistory.addEventListener('click', exportHistoryFile);

importHistory.addEventListener('change', () => {
  const [file] = importHistory.files;
  if (file) importHistoryFile(file);
  importHistory.value = '';
});

exportGame.addEventListener('click', exportGameFile);

importGame.addEventListener('change', () => {
  const [file] = importGame.files;
  if (file) importGameFile(file);
  importGame.value = '';
});

zoomInput.addEventListener('change', () => applyZoom(zoomInput.value));

noGuessToggle.addEventListener('change', () => {
  localStorage.setItem('minesweeperNoGuess', noGuessToggle.checked ? '1' : '0');
});

soundToggle.addEventListener('change', () => {
  localStorage.setItem('minesweeperSound', soundToggle.checked ? '1' : '0');
});

touchMode.addEventListener('change', () => {
  localStorage.setItem('minesweeperTouchMode', touchMode.value);
});

function releaseStatusbar() {
  statusbarEl.classList.remove('is-pressing');
}

statusbarEl.addEventListener('pointerdown', (event) => {
  if (event.target !== statusbarEl && !event.target.closest('.face')) return;
  warmAudio();
  event.preventDefault();
  statusbarEl.classList.add('is-pressing');
  newGame(currentLevel === 'custom' ? settings : LEVELS[currentLevel]);
});

statusbarEl.addEventListener('pointerup', releaseStatusbar);
statusbarEl.addEventListener('pointerleave', releaseStatusbar);
statusbarEl.addEventListener('pointercancel', releaseStatusbar);

document.addEventListener('keydown', (event) => {
  if (event.target.matches('input, select, button')) return;
  const key = event.key.toLowerCase();
  if (key === 'r') newGame(currentLevel === 'custom' ? settings : LEVELS[currentLevel]);
  if (key === 'p') setPaused(!paused);
  if (key === 'h') historyPanel.hidden = !historyPanel.hidden;
  if (key === '1') {
    currentLevel = 'beginner';
    setActiveLevel(currentLevel);
    newGame(LEVELS.beginner);
  }
  if (key === '2') {
    currentLevel = 'intermediate';
    setActiveLevel(currentLevel);
    newGame(LEVELS.intermediate);
  }
  if (key === '3') {
    currentLevel = 'expert';
    setActiveLevel(currentLevel);
    newGame(LEVELS.expert);
  }
});

applyZoom(localStorage.getItem('minesweeperZoom') || 100);
noGuessToggle.checked = localStorage.getItem('minesweeperNoGuess') === '1';
soundToggle.checked = localStorage.getItem('minesweeperSound') === '1';
touchMode.value = localStorage.getItem('minesweeperTouchMode') || 'open';
renderHistory();
renderBestList();
if (!restoreSavedGame()) newGame();
