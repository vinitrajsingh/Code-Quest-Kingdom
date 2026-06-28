import {
  getPlayer,
  getKingdomStatus,
  setCurrentKingdom,
  getCurrentKingdom,
} from './state.js';

let kingdoms = [];
let toastTimer = null;

const ORDER_TOP = ['82%', '62%', '42%', '22%', '0%'];

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

function statusLabel(status, progress, requiresLabel) {
  if (status === 'cleared') return 'Crystal Restored';
  if (status === 'progress') return progress > 0 ? `In Progress · ${progress}%` : 'In Progress';
  if (status === 'available') return 'Enter Kingdom';
  return requiresLabel || 'Locked';
}

function nodeClass(status) {
  if (status === 'cleared') return 'kingdom-cleared';
  if (status === 'progress') return 'kingdom-progress';
  if (status === 'available') return 'kingdom-active';
  return 'kingdom-locked';
}

export function renderWorldMap() {
  const container = document.getElementById('map-kingdoms');
  const pathEl = document.getElementById('map-path-glow');
  const summaryEl = document.getElementById('map-progress');
  if (!container || !kingdoms.length) return;

  const player = getPlayer();
  container.innerHTML = '';

  let cleared = 0;

  kingdoms.forEach((meta, idx) => {
    const status = player ? getKingdomStatus(meta.id) : 'locked';
    if (status === 'cleared') cleared += 1;

    const prog = player?.kingdoms?.[meta.id]?.progress || 0;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `kingdom-node ${nodeClass(status)}`;
    btn.dataset.kingdom = meta.id;
    btn.dataset.order = String(meta.order);
    btn.style.top = ORDER_TOP[idx] || '0%';

    const crystal = status === 'cleared' ? '<span class="node-crystal">✦</span>' : '';

    btn.innerHTML = `
      ${crystal}
      <span class="node-icon">${meta.icon}</span>
      <span class="node-label">${meta.name}</span>
      <span class="node-topic">${meta.topic}</span>
      <span class="node-status">${statusLabel(status, prog, meta.requiresLabel)}</span>
    `;

    container.appendChild(btn);
  });

  if (pathEl) {
    const lit = cleared / kingdoms.length;
    pathEl.style.opacity = String(0.25 + lit * 0.75);
  }

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
