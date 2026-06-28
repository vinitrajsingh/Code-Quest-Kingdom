import { loadSave, writeSave, writeSession, normalizeName, displayName } from './storage.js';

const AVATARS = ['⚔️', '🛡️', '🏹', '✨', '🗡️', '🦉'];

let saveData = null;
let player = null;

function freshKingdoms() {
  return {
    forest: { unlocked: true, cleared: false, progress: 0 },
    village: { unlocked: false, cleared: false, progress: 0 },
    castle: { unlocked: false, cleared: false, progress: 0 },
    mountain: { unlocked: false, cleared: false, progress: 0 },
    final: { unlocked: false, cleared: false, progress: 0 },
  };
}

function blankPlayer(name, avatar) {
  return {
    name: displayName(name),
    key: normalizeName(name),
    avatar,
    level: 1,
    xp: 0,
    coins: 0,
    introSeen: false,
    kingdoms: freshKingdoms(),
    stats: { correct: 0, total: 0 },
    createdAt: Date.now(),
    lastPlayed: Date.now(),
  };
}

export function initState() {
  saveData = loadSave();
}

export function getAvatars() {
  return AVATARS;
}

export function getPlayer() {
  return player;
}

export function isLoggedIn() {
  return player !== null;
}

export function getAllProfiles() {
  if (!saveData) return [];
  return Object.values(saveData.profiles)
    .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
}

export function profileExists(name) {
  const key = normalizeName(name);
  return Boolean(saveData?.profiles[key]);
}

export function registerKnight(name, avatar) {
  const key = normalizeName(name);
  const shown = displayName(name);
  if (!shown || shown.length < 2) return { ok: false, reason: 'Name must be at least 2 characters.' };
  if (saveData.profiles[key]) return { ok: false, reason: 'A knight with this name already exists.' };

  player = blankPlayer(shown, avatar);
  saveData.profiles[key] = player;
  flush();
  writeSession({ key, since: Date.now() });
  return { ok: true };
}

export function loginKnight(key) {
  const profile = saveData.profiles[key];
  if (!profile) return false;
  player = profile;
  player.lastPlayed = Date.now();
  flush();
  writeSession({ key, since: Date.now() });
  return true;
}

export function resumeSession(key) {
  const profile = saveData?.profiles[key];
  if (!profile) return false;
  player = profile;
  player.lastPlayed = Date.now();
  flush();
  return true;
}

export function logout() {
  player = null;
  writeSession(null);
}

export function markIntroSeen() {
  if (!player) return;
  player.introSeen = true;
  flush();
}

export function addXp(amount) {
  if (!player || amount <= 0) return;
  player.xp += amount;
  player.level = xpToLevel(player.xp);
  flush();
}

export function addCoins(amount) {
  if (!player || amount <= 0) return;
  player.coins += amount;
  flush();
}

export function xpToLevel(xp) {
  return Math.floor(xp / 100) + 1;
}

export function xpProgress(xp) {
  return xp % 100;
}

function flush() {
  if (!player || !saveData) return;
  player.lastPlayed = Date.now();
  saveData.profiles[player.key] = player;
  writeSave(saveData);
}

export function getSessionKey() {
  return player?.key ?? null;
}
