import { loadSave, writeSave, writeSession, normalizeName, displayName } from './storage.js';

const AVATARS = ['⚔️', '🛡️', '🏹', '✨', '🗡️', '🦉'];

const KINGDOM_ORDER = ['forest', 'village', 'castle', 'mountain', 'final'];

let saveData = null;
let player = null;

function freshKingdoms() {
  const out = {};
  KINGDOM_ORDER.forEach(id => {
    out[id] = {
      unlocked: id === 'forest',
      cleared: false,
      progress: 0,
    };
  });
  return out;
}

function ensureKingdoms(p) {
  const defaults = freshKingdoms();
  if (!p.kingdoms) p.kingdoms = defaults;
  KINGDOM_ORDER.forEach(id => {
    if (!p.kingdoms[id]) {
      p.kingdoms[id] = { ...defaults[id] };
    } else {
      p.kingdoms[id] = { ...defaults[id], ...p.kingdoms[id] };
    }
    if (!p.kingdoms[id].completedQuests) {
      p.kingdoms[id].completedQuests = [];
    }
  });
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
    inventory: {},
    pendingEffect: null,
    createdAt: Date.now(),
    lastPlayed: Date.now(),
  };
}

export function initState() {
  saveData = loadSave();
}

function ensurePlayerMeta(p) {
  if (!p.stats) p.stats = { correct: 0, total: 0 };
  if (!p.inventory) p.inventory = {};
  if (p.pendingEffect === undefined) p.pendingEffect = null;
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
    .map(p => {
      ensureKingdoms(p);
      ensurePlayerMeta(p);
      return p;
    })
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
  ensureKingdoms(player);
  ensurePlayerMeta(player);
  saveData.profiles[key] = player;
  flush();
  writeSession({ key, since: Date.now() });
  return { ok: true };
}

export function loginKnight(key) {
  const profile = saveData.profiles[key];
  if (!profile) return false;
  player = profile;
  ensureKingdoms(player);
  ensurePlayerMeta(player);
  player.lastPlayed = Date.now();
  flush();
  writeSession({ key, since: Date.now() });
  return true;
}

export function resumeSession(key) {
  const profile = saveData?.profiles[key];
  if (!profile) return false;
  player = profile;
  ensureKingdoms(player);
  ensurePlayerMeta(player);
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

export function spendCoins(amount) {
  if (!player || amount <= 0 || player.coins < amount) return false;
  player.coins -= amount;
  flush();
  return true;
}

export function itemCount(id) {
  return player?.inventory?.[id] || 0;
}

export function addItem(id, qty = 1) {
  if (!player || qty <= 0) return false;
  if (!player.inventory) player.inventory = {};
  player.inventory[id] = (player.inventory[id] || 0) + qty;
  flush();
  return true;
}

export function removeItem(id, qty = 1) {
  if (!player || qty <= 0) return false;
  const have = player.inventory?.[id] || 0;
  if (have < qty) return false;
  player.inventory[id] = have - qty;
  if (player.inventory[id] <= 0) delete player.inventory[id];
  flush();
  return true;
}

export function getPendingEffect() {
  return player?.pendingEffect ?? null;
}

export function setPendingEffect(effect) {
  if (!player) return false;
  if (player.pendingEffect) return false;
  player.pendingEffect = effect;
  flush();
  return true;
}

export function clearPendingEffect() {
  if (!player?.pendingEffect) return null;
  const effect = player.pendingEffect;
  player.pendingEffect = null;
  flush();
  return effect;
}

export function clearedCountFor(profile) {
  if (!profile?.kingdoms) return 0;
  return KINGDOM_ORDER.filter(id => profile.kingdoms[id]?.cleared).length;
}

export function accuracyFor(profile) {
  const total = profile?.stats?.total || 0;
  if (total <= 0) return null;
  return Math.round(((profile.stats.correct || 0) / total) * 100);
}

export function recordAnswer(correct) {
  if (!player) return;
  if (!player.stats) player.stats = { correct: 0, total: 0 };
  player.stats.total += 1;
  if (correct) player.stats.correct += 1;
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

export function getKingdom(id) {
  return player?.kingdoms?.[id] ?? null;
}

export function getKingdomStatus(id) {
  const k = getKingdom(id);
  if (!k) return 'locked';
  if (k.cleared) return 'cleared';
  if (k.unlocked) return k.progress > 0 ? 'progress' : 'available';
  return 'locked';
}

export function setCurrentKingdom(id) {
  if (!player) return;
  player.currentKingdom = id;
  flush();
}

export function getCurrentKingdom() {
  return player?.currentKingdom || 'forest';
}

export function setKingdomProgress(id, progress) {
  if (!player?.kingdoms?.[id]) return;
  player.kingdoms[id].progress = Math.max(0, Math.min(100, progress));
  if (player.kingdoms[id].progress > 0 && !player.kingdoms[id].unlocked) {
    player.kingdoms[id].unlocked = true;
  }
  flush();
}

export function unlockKingdom(id) {
  if (!player?.kingdoms?.[id]) return;
  player.kingdoms[id].unlocked = true;
  flush();
}

export function clearKingdom(id) {
  if (!player?.kingdoms?.[id]) return;
  player.kingdoms[id].cleared = true;
  player.kingdoms[id].progress = 100;
  const idx = KINGDOM_ORDER.indexOf(id);
  if (idx >= 0 && idx < KINGDOM_ORDER.length - 1) {
    const next = KINGDOM_ORDER[idx + 1];
    player.kingdoms[next].unlocked = true;
  }
  flush();
}

export function clearedKingdomCount() {
  if (!player?.kingdoms) return 0;
  return KINGDOM_ORDER.filter(id => player.kingdoms[id]?.cleared).length;
}

export function getKingdomOrder() {
  return [...KINGDOM_ORDER];
}

export function getCompletedQuests(kingdomId) {
  return player?.kingdoms?.[kingdomId]?.completedQuests || [];
}

export function isQuestDone(kingdomId, questId) {
  return getCompletedQuests(kingdomId).includes(questId);
}

export function completeQuest(kingdomId, questId, totalQuests) {
  if (!player?.kingdoms?.[kingdomId]) return;
  const k = player.kingdoms[kingdomId];
  if (!k.completedQuests.includes(questId)) {
    k.completedQuests.push(questId);
  }
  k.progress = Math.min(100, Math.round((k.completedQuests.length / totalQuests) * 100));
  if (k.completedQuests.length >= totalQuests) {
    k.progress = 100;
  }
  flush();
}
