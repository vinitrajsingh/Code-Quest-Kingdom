import {
  getPlayer, itemCount, addItem, removeItem, spendCoins,
  getPendingEffect, setPendingEffect, getAllProfiles,
  clearedCountFor, accuracyFor, xpToLevel,
} from './state.js';
import { getAllItems, getItem } from './items.js';
import { showMapToast } from './map.js';
import { syncHud } from './ui.js';

let activeTab = 'bag';

export function getMetaTab() {
  return activeTab;
}

export function setMetaTab(tab) {
  activeTab = tab;
}

function effectLabel(effect) {
  const labels = {
    hint: 'Hint Scroll armed',
    time: 'Time Crystal armed',
    xp: 'Wisdom Tome armed',
    heart: 'Heart Potion armed',
  };
  return labels[effect] || 'Item armed';
}

function renderPendingBanner() {
  const el = document.getElementById('meta-pending');
  if (!el) return;
  const pending = getPendingEffect();
  if (!pending) {
    el.hidden = true;
    return;
  }
  const item = getAllItems().find(i => i.effect === pending);
  el.textContent = item ? `${item.icon} ${effectLabel(pending)}` : effectLabel(pending);
  el.hidden = false;
}

export function renderInventoryScreen() {
  renderPendingBanner();
  const bag = document.getElementById('meta-bag');
  const shop = document.getElementById('meta-shop');
  if (!bag || !shop) return;

  document.querySelectorAll('.meta-tab').forEach(tab => {
    tab.classList.toggle('meta-tab-active', tab.dataset.metaTab === activeTab);
  });
  bag.hidden = activeTab !== 'bag';
  shop.hidden = activeTab !== 'shop';

  if (activeTab === 'bag') renderBag(bag);
  else renderShop(document.getElementById('meta-shop-list'));
}

function renderBag(container) {
  const items = getAllItems();
  const owned = items.filter(item => itemCount(item.id) > 0);
  const pending = getPendingEffect();

  if (!owned.length) {
    container.innerHTML = `
      <div class="meta-empty panel panel-cut">
        <span class="meta-empty-icon">🎒</span>
        <p>Your satchel is empty.</p>
        <p class="meta-empty-sub">Visit the merchant to buy consumables.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = owned.map(item => {
    const count = itemCount(item.id);
    const canUse = !pending && count > 0;
    return `
      <article class="item-card panel panel-cut" data-item-id="${item.id}">
        <span class="item-icon">${item.icon}</span>
        <div class="item-body">
          <h3 class="item-name">${item.name} <span class="item-qty">×${count}</span></h3>
          <p class="item-desc">${item.desc}</p>
        </div>
        <button type="button" class="btn-primary item-use" data-use="${item.id}" ${canUse ? '' : 'disabled'}>
          ${pending ? 'Wait' : 'Use'}
        </button>
      </article>
    `;
  }).join('');
}

function renderShop(container) {
  const coins = getPlayer()?.coins ?? 0;
  const coinEl = document.getElementById('meta-shop-coins');
  if (coinEl) coinEl.textContent = coins;

  const items = getAllItems();
  container.innerHTML = items.map(item => {
    const owned = itemCount(item.id);
    const afford = coins >= item.price;
    return `
      <article class="shop-row panel panel-cut" data-item-id="${item.id}">
        <span class="item-icon">${item.icon}</span>
        <div class="item-body">
          <h3 class="item-name">${item.name}</h3>
          <p class="item-desc">${item.desc}</p>
          ${owned > 0 ? `<span class="shop-owned">Owned: ${owned}</span>` : ''}
        </div>
        <button type="button" class="btn-primary shop-buy" data-buy="${item.id}" ${afford ? '' : 'disabled'}>
          ${item.price} ◆
        </button>
      </article>
    `;
  }).join('');
}

export function tryUseItem(id) {
  const item = getItem(id);
  if (!item) return { ok: false, reason: 'Unknown item.' };
  if (getPendingEffect()) return { ok: false, reason: 'Another item is already armed.' };
  if (itemCount(id) <= 0) return { ok: false, reason: 'You do not have that item.' };
  if (!removeItem(id, 1)) return { ok: false, reason: 'Could not use item.' };
  setPendingEffect(item.effect);
  return { ok: true, label: `${item.icon} ${item.name} ready.` };
}

export function tryBuyItem(id) {
  const item = getItem(id);
  if (!item) return { ok: false, reason: 'Unknown item.' };
  if (!spendCoins(item.price)) return { ok: false, reason: 'Not enough coins.' };
  addItem(id, 1);
  syncHud();
  return { ok: true, label: `${item.icon} ${item.name} purchased.` };
}

export function bindMetaScreen(onTabChange) {
  document.getElementById('inventory-back')?.addEventListener('click', () => onTabChange('map'));

  document.querySelectorAll('.meta-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.metaTab;
      renderInventoryScreen();
    });
  });

  document.getElementById('meta-stage')?.addEventListener('click', e => {
    const useBtn = e.target.closest('[data-use]');
    if (useBtn) {
      const result = tryUseItem(useBtn.dataset.use);
      if (result.ok) {
        showMapToast(result.label);
        renderInventoryScreen();
      } else {
        showMapToast(result.reason);
      }
      return;
    }

    const buyBtn = e.target.closest('[data-buy]');
    if (buyBtn) {
      const result = tryBuyItem(buyBtn.dataset.buy);
      if (result.ok) {
        showMapToast(result.label);
        renderInventoryScreen();
      } else {
        showMapToast(result.reason);
      }
    }
  });
}

export function renderLeaderboardScreen() {
  const list = document.getElementById('leaderboard-list');
  const rankEl = document.getElementById('leaderboard-your-rank');
  if (!list) return;

  const profiles = getAllProfiles()
    .slice()
    .sort((a, b) => {
      if (b.xp !== a.xp) return b.xp - a.xp;
      const ca = clearedCountFor(a);
      const cb = clearedCountFor(b);
      if (cb !== ca) return cb - ca;
      return (b.lastPlayed || 0) - (a.lastPlayed || 0);
    });

  const me = getPlayer();
  const myRank = profiles.findIndex(p => p.key === me?.key) + 1;

  if (rankEl) {
    rankEl.textContent = myRank > 0 ? `#${myRank} of ${profiles.length}` : '—';
  }

  if (!profiles.length) {
    list.innerHTML = '<p class="meta-empty-sub">No knights registered yet.</p>';
    return;
  }

  list.innerHTML = profiles.map((profile, i) => {
    const rank = i + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
    const cleared = clearedCountFor(profile);
    const acc = accuracyFor(profile);
    const isMe = profile.key === me?.key;
    return `
      <article class="rank-row panel panel-cut ${isMe ? 'rank-row-me' : ''}">
        <span class="rank-medal">${medal}</span>
        <span class="rank-avatar">${profile.avatar}</span>
        <div class="rank-body">
          <span class="rank-name">${profile.name}${isMe ? ' (you)' : ''}</span>
          <span class="rank-meta">Lv ${xpToLevel(profile.xp)} · ${cleared}/5 crystals · ${acc !== null ? `${acc}% acc` : '— acc'}</span>
        </div>
        <span class="rank-xp">${profile.xp} XP</span>
      </article>
    `;
  }).join('');
}

export function bindLeaderboardScreen(onBack) {
  document.getElementById('leaderboard-back')?.addEventListener('click', () => onBack('map'));
}
