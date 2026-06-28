import { getPlayer, xpToLevel, xpProgress } from './state.js';

export function syncHud() {
  const p = getPlayer();
  if (!p) return;

  const lvl = xpToLevel(p.xp);
  const pct = xpProgress(p.xp);

  document.querySelectorAll('[data-hud="name"]').forEach(el => {
    el.textContent = p.name;
  });

  document.querySelectorAll('[data-hud="level"]').forEach(el => {
    el.textContent = lvl;
  });

  document.querySelectorAll('[data-hud="coins"]').forEach(el => {
    el.textContent = p.coins;
  });

  document.querySelectorAll('[data-hud="xp-fill"]').forEach(el => {
    el.style.width = `${pct}%`;
  });

  document.querySelectorAll('[data-hud="avatar"]').forEach(el => {
    el.textContent = p.avatar;
  });
}

export function renderProfile() {
  const p = getPlayer();
  if (!p) return;

  const nameEl = document.getElementById('profile-name');
  const lvlEl = document.getElementById('profile-level');
  const avatarEl = document.getElementById('profile-avatar');
  const xpEl = document.getElementById('profile-xp');
  const coinsEl = document.getElementById('profile-coins');
  const accuracyEl = document.getElementById('profile-accuracy');
  const joinedEl = document.getElementById('profile-joined');

  if (nameEl) nameEl.textContent = p.name;
  if (lvlEl) lvlEl.textContent = `Level ${xpToLevel(p.xp)}`;
  if (avatarEl) avatarEl.textContent = p.avatar;
  if (xpEl) xpEl.textContent = p.xp;
  if (coinsEl) coinsEl.textContent = p.coins;

  const total = p.stats?.total || 0;
  const correct = p.stats?.correct || 0;
  const acc = total > 0 ? `${Math.round((correct / total) * 100)}%` : '—';
  if (accuracyEl) accuracyEl.textContent = acc;

  if (joinedEl) {
    const d = new Date(p.createdAt);
    joinedEl.textContent = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

export function renderKnightList(profiles, selectFn) {
  const list = document.getElementById('knight-list');
  const empty = document.getElementById('auth-empty');
  if (!list) return;

  list.innerHTML = '';

  if (empty) empty.hidden = profiles.length > 0;

  profiles.forEach(profile => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'knight-row';
    btn.innerHTML = `
      <span class="knight-row-avatar">${profile.avatar}</span>
      <span class="knight-row-info">
        <span class="knight-row-name">${profile.name}</span>
        <span class="knight-row-meta">Lv ${xpToLevel(profile.xp)} · ${profile.coins} ◆</span>
      </span>
      <span class="knight-row-enter">→</span>
    `;
    btn.addEventListener('click', () => selectFn(profile.key));
    list.appendChild(btn);
  });
}

export function setAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(el => {
    el.classList.toggle('auth-tab-active', el.dataset.authTab === tab);
  });
  document.querySelectorAll('.auth-pane').forEach(el => {
    el.classList.toggle('auth-pane-active', el.dataset.authPane === tab);
  });
}

export function getSelectedAvatar() {
  const picked = document.querySelector('.avatar-opt.avatar-selected');
  return picked?.dataset.avatar || '⚔️';
}

export function getXpLevel(xp) {
  return xpToLevel(xp);
}

export function pulseReward(amount) {
  document.querySelectorAll('.hud-coin').forEach(el => {
    el.classList.add('coin-pulse');
    setTimeout(() => el.classList.remove('coin-pulse'), 700);
  });

  const hud = document.querySelector('.hud-bar');
  if (!hud || amount <= 0) return;

  const burst = document.createElement('span');
  burst.className = 'xp-burst';
  burst.textContent = `+${amount} XP`;
  hud.appendChild(burst);
  setTimeout(() => burst.remove(), 900);
}

export function bindAvatarPicker() {
  document.querySelectorAll('.avatar-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.avatar-opt').forEach(b => b.classList.remove('avatar-selected'));
      btn.classList.add('avatar-selected');
    });
  });
}
