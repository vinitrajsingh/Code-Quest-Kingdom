import { initRouter, goTo, setSessionCheck, setOnNavigate } from './router.js';
import {
  initState, isLoggedIn, registerKnight, loginKnight, resumeSession, logout,
  markIntroSeen, getPlayer, getAllProfiles, clearKingdom, getCurrentKingdom,
} from './state.js';
import { loadSession } from './storage.js';
import { syncHud, renderProfile, renderKnightList, setAuthTab, getSelectedAvatar, bindAvatarPicker } from './ui.js';
import { loadKingdoms, renderWorldMap, bindMapEvents, renderKingdomHeader, showMapToast } from './map.js';
import {
  preloadQuests, renderKingdomHub, bindKingdomPath, openDialogue, renderQuestBrief,
  finalizeQuest, getActiveQuest, showReplayDialogue,
} from './kingdom.js';
import {
  startSession, renderChallenge, submitChallenge, renderResult,
  advanceAfterResult, abandonSession,
} from './challenges.js';
import { stopTimer } from './timer.js';
import {
  renderBossIntro, startBossBattle, abandonBoss, setBossCallbacks,
  renderKingdomCleared,
} from './boss.js';

const STUB_LABELS = {
  inventory: { title: 'Inventory', desc: 'Items and consumables arrive in Stage 7.' },
  leaderboard: { title: 'Leaderboard', desc: 'Local rankings arrive in Stage 7.' },
};

let introIndex = 0;
let splashTimer = null;

function finishBoot() {
  document.body.classList.remove('booting');
  document.body.classList.add('ready');
}

function enterGame() {
  const p = getPlayer();
  syncHud();
  renderWorldMap();
  if (p?.introSeen) {
    goTo('map', false);
  } else {
    goTo('intro', false);
  }
}

function refreshAuth() {
  renderKnightList(getAllProfiles(), key => {
    if (loginKnight(key)) enterGame();
  });
  const profiles = getAllProfiles();
  if (profiles.length > 0) {
    setAuthTab('login');
  } else {
    setAuthTab('register');
  }
}

function handleNavigate(name) {
  if (name !== 'challenge' && name !== 'result' && name !== 'boss') stopTimer();
  syncHud();
  if (name === 'map') renderWorldMap();
  if (name === 'profile') renderProfile();
  if (name === 'auth') refreshAuth();
  if (name === 'kingdom') {
    renderKingdomHeader();
    renderKingdomHub();
  }
  if (name === 'kingdom-cleared') renderKingdomCleared();
  syncNavHighlight(name);
}

function syncNavHighlight(screen) {
  const map = { map: 'map', profile: 'profile' };
  const active = map[screen];
  document.querySelectorAll('.bottom-nav').forEach(nav => {
    nav.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('nav-active', active && item.dataset.nav === active);
    });
  });
}

function bindRoutes() {
  document.querySelectorAll('[data-route]').forEach(el => {
    el.addEventListener('click', () => {
      const dest = el.dataset.route;
      if (dest) goTo(dest);
    });
  });
}

function bindDevNav() {
  document.querySelectorAll('.devnav-btn').forEach(btn => {
    btn.addEventListener('click', () => goTo(btn.dataset.route, true, { bypass: true }));
  });
}

function bindSplash() {
  const skip = document.getElementById('splash-skip');
  const enter = () => {
    clearTimeout(splashTimer);
    refreshAuth();
    goTo('auth');
  };
  skip?.addEventListener('click', enter);
  splashTimer = setTimeout(enter, 2200);
}

function bindAuth() {
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => setAuthTab(tab.dataset.authTab));
  });

  bindAvatarPicker();

  const form = document.getElementById('auth-register');
  const errEl = document.getElementById('reg-error');

  form?.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('reg-name')?.value || '';
    const avatar = getSelectedAvatar();
    const result = registerKnight(name, avatar);

    if (!result.ok) {
      if (errEl) {
        errEl.textContent = result.reason;
        errEl.hidden = false;
      }
      return;
    }

    if (errEl) errEl.hidden = true;
    goTo('intro');
  });
}

function bindIntro() {
  const slides = document.querySelectorAll('.intro-slide');
  const dots = document.querySelectorAll('.dot');
  const next = document.getElementById('intro-next');
  const skip = document.getElementById('intro-skip');

  function showSlide(i) {
    slides.forEach((s, idx) => s.classList.toggle('intro-slide-active', idx === i));
    dots.forEach((d, idx) => d.classList.toggle('dot-active', idx === i));
    introIndex = i;
    if (next) next.textContent = i === slides.length - 1 ? 'Begin' : 'Continue';
  }

  function finishIntro() {
    markIntroSeen();
    syncHud();
    renderWorldMap();
    goTo('map');
  }

  next?.addEventListener('click', () => {
    if (introIndex < slides.length - 1) {
      showSlide(introIndex + 1);
    } else {
      finishIntro();
    }
  });

  skip?.addEventListener('click', finishIntro);
}

function bindNav() {
  document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const nav = item.dataset.nav;
      if (nav === 'map') {
        goTo('map');
        return;
      }
      if (nav === 'profile') {
        goTo('profile');
        return;
      }
      if (STUB_LABELS[nav]) {
        document.getElementById('stub-title').textContent = STUB_LABELS[nav].title;
        document.getElementById('stub-desc').textContent = STUB_LABELS[nav].desc;
        goTo('stub');
      }
    });
  });
}

function bindMap() {
  bindMapEvents(() => goTo('kingdom'));
}

function beginTrials(quest) {
  if (!quest?.challenges?.length) return;
  if (quest.type === 'boss') {
    renderBossIntro(quest);
    goTo('boss-intro');
    return;
  }
  startSession(quest);
  renderChallenge();
  goTo('challenge');
}

async function finishTrialsFlow() {
  await finalizeQuest();
  abandonSession();
  syncHud();
  await renderKingdomHub();
  renderWorldMap();
  goTo('kingdom');
}

async function finishBossVictoryFlow() {
  await finalizeQuest();
  abandonBoss();
  syncHud();
  clearKingdom(getCurrentKingdom());
  renderKingdomCleared();
  await renderKingdomHub();
  renderWorldMap();
  goTo('kingdom-cleared');
}

function bindBoss() {
  setBossCallbacks(
    () => finishBossVictoryFlow(),
    () => goTo('boss-defeat')
  );

  document.getElementById('boss-begin')?.addEventListener('click', () => {
    const quest = getActiveQuest();
    if (!quest) return;
    startBossBattle(quest);
    goTo('boss');
  });

  document.getElementById('boss-intro-back')?.addEventListener('click', () => goTo('quest-brief'));

  document.getElementById('boss-defeat-retry')?.addEventListener('click', () => {
    abandonBoss();
    goTo('kingdom');
  });

  document.getElementById('cleared-map')?.addEventListener('click', () => goTo('map'));
}

function bindChallenges() {
  window.addEventListener('cqk:submit', () => {
    const pick = submitChallenge();
    if (pick?.needPick) return;
    renderResult();
    goTo('result');
  });

  document.getElementById('result-card')?.addEventListener('click', async e => {
    if (e.target.id !== 'result-continue') return;

    const next = advanceAfterResult();
    if (next === 'retry') {
      renderChallenge();
      goTo('challenge');
      return;
    }
    if (next === 'challenge') {
      renderChallenge();
      goTo('challenge');
      return;
    }
    if (next === 'quest-done') {
      await finishTrialsFlow();
    }
  });
}

function openQuestFlow(mode, quest) {
  if (mode === 'replay') {
    showReplayDialogue(quest);
    goTo('dialogue');
    return;
  }
  openDialogue(quest);
  goTo('dialogue');
}

function bindKingdom() {
  document.getElementById('kingdom-back')?.addEventListener('click', () => {
    abandonSession();
    abandonBoss();
    stopTimer();
    renderWorldMap();
    goTo('map');
  });

  bindKingdomPath(openQuestFlow);

  document.getElementById('dialogue-later')?.addEventListener('click', () => goTo('kingdom'));

  document.getElementById('dialogue-accept')?.addEventListener('click', () => {
    const quest = getActiveQuest();
    if (!quest) return;
    renderQuestBrief(quest);
    goTo('quest-brief');
  });

  document.getElementById('brief-back')?.addEventListener('click', () => goTo('kingdom'));

  document.getElementById('brief-start')?.addEventListener('click', () => {
    const quest = getActiveQuest();
    if (!quest) return;
    beginTrials(quest);
  });
}

function bindDevTools() {
  document.getElementById('dev-clear-forest')?.addEventListener('click', () => {
    if (!isLoggedIn()) return;
    clearKingdom('forest');
    renderWorldMap();
    showMapToast('Forest restored — Loop Village unlocked');
  });
}

function bindProfile() {
  document.getElementById('profile-back')?.addEventListener('click', () => goTo('map'));
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    logout();
    refreshAuth();
    goTo('auth');
  });
}

async function boot() {
  initState();
  initRouter();
  await loadKingdoms();
  await preloadQuests();
  setSessionCheck(() => isLoggedIn());
  setOnNavigate(handleNavigate);

  bindRoutes();
  bindDevNav();
  bindDevTools();
  bindAuth();
  bindIntro();
  bindNav();
  bindMap();
  bindKingdom();
  bindChallenges();
  bindBoss();
  bindProfile();

  const session = loadSession();
  if (session?.key && resumeSession(session.key)) {
    syncHud();
    renderWorldMap();
    enterGame();
    finishBoot();
    return;
  }

  goTo('splash', false);
  bindSplash();
  finishBoot();
}

boot();
