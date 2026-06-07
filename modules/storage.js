export const STORAGE_KEYS = {
  currentGame: 'minesweeperCurrentGame',
  history: 'minesweeperHistory',
  language: 'minesweeperLanguageV2',
  noGuess: 'minesweeperNoGuess',
  noFlag: 'minesweeperNoFlag',
  sound: 'minesweeperSound',
  volume: 'minesweeperVolume',
  touchMode: 'minesweeperTouchMode',
  zoom: 'minesweeperZoom',
};

export function readText(key, fallback = null) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeText(key, value) {
  try {
    localStorage.setItem(key, String(value));
    return true;
  } catch {
    return false;
  }
}

export function readJson(key, fallback) {
  const value = readText(key);
  if (value === null) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  return writeText(key, JSON.stringify(value));
}

export function removeStored(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage can be unavailable in privacy-restricted browsing contexts.
  }
}

export function storedKeys() {
  try {
    return Object.keys(localStorage);
  } catch {
    return [];
  }
}
