import {
  getCurrentKingdom,
  getCompletedQuests,
  isQuestDone,
  completeQuest,
  addXp,
  addCoins,
} from './state.js';

const cache = new Map();
let activeQuest = null;
let typeTimer = null;

export function getActiveQuest() {
  return activeQuest;
}

export async function loadKingdomQuests(kingdomId) {
  if (cache.has(kingdomId)) return cache.get(kingdomId);
  try {
    const res = await fetch(`data/questions/${kingdomId}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    cache.set(kingdomId, data);
    return data;
  } catch {
    return null;
  }
}

export async function preloadQuests() {
  cache.delete('forest');
  await loadKingdomQuests('forest');
}

function areaStatus(data, quest) {
  if (isQuestDone(data.kingdomId, quest.id)) return 'done';
  const idx = quest.order;
  if (idx === 0) return 'active';
  const prev = data.quests[idx - 1];
  if (isQuestDone(data.kingdomId, prev.id)) return 'active';
  return 'locked';
}

function diffStars(n) {
  return '★'.repeat(n) + '☆'.repeat(3 - n);
}

export async function renderKingdomHub() {
  const kingdomId = getCurrentKingdom();
  const data = await loadKingdomQuests(kingdomId);
  const path = document.getElementById('kingdom-path');
  const progressEl = document.getElementById('kingdom-area-progress');
  if (!path) return;

  if (!data) {
    if (progressEl) progressEl.textContent = 'Quests coming soon';
    path.innerHTML = '<p class="kingdom-empty">This kingdom\'s trials are not ready yet.</p>';
    return;
  }

  const done = getCompletedQuests(kingdomId).length;
  const total = data.quests.length;

  if (progressEl) {
    progressEl.textContent = `${done} / ${total} areas cleared`;
  }

  path.innerHTML = '';

  data.quests.forEach(quest => {
    const status = areaStatus(data, quest);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `path-node path-${status}${quest.type === 'boss' ? ' path-boss' : ''}`;
    btn.dataset.questId = quest.id;
    btn.disabled = status === 'locked';

    const tag = quest.type === 'boss' ? 'Boss' : status === 'done' ? 'Done' : status === 'active' ? 'Quest' : 'Sealed';

    btn.innerHTML = `
      <span class="path-dot"></span>
      <span class="path-body">
        <span class="path-name">${quest.area}</span>
        <span class="path-tag">${tag}</span>
      </span>
    `;

    path.appendChild(btn);
  });
}

export function bindKingdomPath(onQuestOpen) {
  const path = document.getElementById('kingdom-path');
  if (!path) return;

  path.addEventListener('click', async e => {
    const node = e.target.closest('.path-node');
    if (!node || node.disabled) return;

    const kingdomId = getCurrentKingdom();
    const data = await loadKingdomQuests(kingdomId);
    if (!data) return;
    const quest = data.quests.find(q => q.id === node.dataset.questId);
    if (!quest) return;

    if (isQuestDone(kingdomId, quest.id)) {
      onQuestOpen('replay', quest);
      return;
    }

    activeQuest = quest;
    onQuestOpen('new', quest);
  });
}

export function openDialogue(quest, onReady) {
  activeQuest = quest;
  const portrait = document.getElementById('dialogue-portrait');
  const name = document.getElementById('dialogue-name');
  const text = document.getElementById('dialogue-text');
  const accept = document.getElementById('dialogue-accept');

  if (portrait) portrait.textContent = quest.npc.portrait;
  if (name) name.textContent = quest.npc.name;
  if (accept) {
    accept.textContent = 'Accept Quest';
    accept.disabled = true;
  }

  if (text) {
    typeDialogue(quest.npc.dialogue, text, () => {
      if (accept) accept.disabled = false;
      onReady?.();
    });
  }
}

function typeDialogue(full, el, done) {
  clearInterval(typeTimer);
  el.textContent = '';
  el.classList.add('dialogue-typing');
  let i = 0;
  typeTimer = setInterval(() => {
    el.textContent = full.slice(0, i + 1);
    i += 1;
    if (i >= full.length) {
      clearInterval(typeTimer);
      el.classList.remove('dialogue-typing');
      done?.();
    }
  }, 24);
}

export function renderQuestBrief(quest) {
  const typeEl = document.getElementById('brief-type');
  const titleEl = document.getElementById('brief-title');
  const objEl = document.getElementById('brief-objective');
  const xpEl = document.getElementById('brief-xp');
  const coinEl = document.getElementById('brief-coins');
  const diffEl = document.getElementById('brief-diff');
  const timeEl = document.getElementById('brief-time');
  const trialsEl = document.getElementById('brief-trials');

  if (typeEl) typeEl.textContent = quest.type === 'boss' ? 'Boss Trial' : 'Forest Quest';
  if (titleEl) titleEl.textContent = quest.title;
  if (objEl) objEl.textContent = quest.objective;
  if (xpEl) xpEl.textContent = `+${quest.rewards.xp}`;
  if (coinEl) coinEl.textContent = `+${quest.rewards.coins}`;
  if (diffEl) diffEl.textContent = diffStars(quest.difficulty);
  if (timeEl) timeEl.textContent = `⏱ ~${quest.parMinutes} min par`;
  if (trialsEl) trialsEl.textContent = `${quest.trials} trials`;
}

export async function finalizeQuest() {
  const kingdomId = getCurrentKingdom();
  const data = await loadKingdomQuests(kingdomId);
  if (!activeQuest || !data) return null;

  completeQuest(kingdomId, activeQuest.id, data.quests.length);
  addXp(activeQuest.rewards.xp);
  addCoins(activeQuest.rewards.coins);

  if (activeQuest.type === 'boss') return 'boss';
  return 'kingdom';
}

export function showReplayDialogue(quest) {
  activeQuest = quest;
  const portrait = document.getElementById('dialogue-portrait');
  const name = document.getElementById('dialogue-name');
  const text = document.getElementById('dialogue-text');
  const accept = document.getElementById('dialogue-accept');

  if (portrait) portrait.textContent = quest.npc.portrait;
  if (name) name.textContent = quest.npc.name;
  if (text) {
    text.textContent = `You've already cleared ${quest.area}. Replay trials will return in a later update.`;
    text.classList.remove('dialogue-typing');
  }
  if (accept) {
    accept.textContent = 'Already Cleared';
    accept.disabled = true;
  }
}
