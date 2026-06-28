import {
  getPlayer,
  getKingdomStatus,
  setCurrentKingdom,
  getCurrentKingdom,
} from './state.js';

let kingdoms = [];
let toastTimer = null;

export async function loadKingdoms() {
  if (kingdoms.length) return kingdoms;
  const res = await fetch('data/kingdoms.json');
  kingdoms = await res.json();
  return kingdoms;
}

export function getKingdomMeta(id) {
  return kingdoms.find(k => k.id === id) || null;
}

export function getAllKingdoms() {
  return kingdoms;
}

function statusLabel(status, progress) {
  if (status === 'cleared') return 'Restored';
  if (status === 'progress') return progress > 0 ? `${progress}%` : 'Active';
  if (status === 'available') return 'Enter';
  return 'Locked';
}

function renderNodeContent(meta, status, progress) {
  const showTopic = status !== 'locked';
  const topic = showTopic ? `<span class="node-topic">${meta.topic}</span>` : '';
  const badge = statusLabel(status, progress);

  return `
    <span class="node-icon">${meta.icon}</span>
    <div class="node-info">
      <span class="node-label">${meta.name}</span>
      ${topic}
    </div>
    <span class="node-badge node-badge-${status}">${badge}</span>
  `;
}

function nodeClass(status) {
  if (status === 'cleared') return 'kingdom-cleared';
  if (status === 'progress') return 'kingdom-progress';
  if (status === 'available') return 'kingdom-active';
  return 'kingdom-locked';
}

export function renderWorldMap() {
  const container = document.getElementById('map-kingdoms');
  const summaryEl = document.getElementById('map-progress');
  if (!container || !kingdoms.length) return;

  const player = getPlayer();
  container.innerHTML = '';

  let cleared = 0;

  kingdoms.forEach(meta => {
    const status = player ? getKingdomStatus(meta.id) : 'locked';
    if (status === 'cleared') cleared += 1;

    const prog = player?.kingdoms?.[meta.id]?.progress || 0;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `kingdom-node ${nodeClass(status)}`;
    btn.dataset.kingdom = meta.id;
    btn.dataset.order = String(meta.order);

    const crystal = status === 'cleared' ? '<span class="node-crystal">✦</span>' : '';
    btn.innerHTML = crystal + renderNodeContent(meta, status, prog);

    container.appendChild(btn);
  });

  if (summaryEl) {
    summaryEl.textContent = `${cleared} / ${kingdoms.length} crystals restored`;
  }
}

export function renderKingdomHeader(kingdomId) {
  const meta = getKingdomMeta(kingdomId || getCurrentKingdom());
  if (!meta) return;

  const title = document.getElementById('kingdom-hud-title');
  const topic = document.querySelector('#screen-kingdom .kingdom-banner h2');
  const sub = document.querySelector('#screen-kingdom .kingdom-banner p');

  if (title) title.textContent = meta.name;
  if (topic) topic.textContent = meta.topic;
  if (sub) sub.textContent = `${meta.areas} areas · 1 boss`;
}

export function showMapToast(message) {
  const toast = document.getElementById('app-toast') || document.getElementById('map-toast');
  if (!toast) return;

  toast.textContent = message;
  toast.hidden = false;
  toast.classList.add('app-toast-show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('app-toast-show');
    setTimeout(() => { toast.hidden = true; }, 300);
  }, 2800);
}

export function bindMapEvents(onEnter) {
  const container = document.getElementById('map-kingdoms');
  if (!container) return;

  container.addEventListener('click', e => {
    const node = e.target.closest('.kingdom-node');
    if (!node) return;

    const id = node.dataset.kingdom;
    const status = getKingdomStatus(id);

    if (status === 'locked') {
      node.classList.add('shake');
      setTimeout(() => node.classList.remove('shake'), 450);
      const meta = getKingdomMeta(id);
      showMapToast(meta?.requiresLabel || 'This kingdom is sealed.');
      return;
    }

    setCurrentKingdom(id);
    renderKingdomHeader(id);
    onEnter(id);
  });
}

export function refreshMapIfVisible() {
  renderWorldMap();
}
