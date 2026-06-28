import { initRouter, goTo, currentScreen } from './router.js';

const STUB_LABELS = {
  inventory: { title: 'Inventory', desc: 'Items and consumables arrive in Stage 7.' },
  profile: { title: 'Profile', desc: 'Stats and badges arrive in Stage 7.' },
  leaderboard: { title: 'Leaderboard', desc: 'Local rankings arrive in Stage 7.' },
};

let introIndex = 0;

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
    btn.addEventListener('click', () => goTo(btn.dataset.route));
  });
}

function bindSplash() {
  const skip = document.getElementById('splash-skip');
  const auto = setTimeout(() => goTo('auth'), 2200);
  skip?.addEventListener('click', () => {
    clearTimeout(auto);
    goTo('auth');
  });
}

function bindAuth() {
  const form = document.getElementById('auth-form');
  form?.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('knight-name')?.value.trim();
    if (name) {
      document.getElementById('hud-name').textContent = name;
    }
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

  next?.addEventListener('click', () => {
    if (introIndex < slides.length - 1) {
      showSlide(introIndex + 1);
    } else {
      goTo('map');
    }
  });

  skip?.addEventListener('click', () => goTo('map'));
}

function bindMap() {
  document.querySelector('.kingdom-active')?.addEventListener('click', () => {
    goTo('kingdom');
  });

  document.querySelectorAll('.kingdom-locked').forEach(node => {
    node.addEventListener('click', () => {
      node.classList.add('shake');
      setTimeout(() => node.classList.remove('shake'), 450);
    });
  });

  document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const nav = item.dataset.nav;
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('nav-active'));
      item.classList.add('nav-active');
      if (nav === 'map') {
        goTo('map');
      } else if (STUB_LABELS[nav]) {
        document.getElementById('stub-title').textContent = STUB_LABELS[nav].title;
        document.getElementById('stub-desc').textContent = STUB_LABELS[nav].desc;
        goTo('stub');
      }
    });
  });
}

function bindKingdom() {
  document.getElementById('kingdom-back')?.addEventListener('click', () => goTo('map'));
  document.querySelector('.path-active')?.addEventListener('click', () => goTo('dialogue'));
}

function bindOptions() {
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const grid = btn.closest('.option-grid');
      grid?.querySelectorAll('.option-btn').forEach(b => b.classList.remove('option-selected'));
      btn.classList.add('option-selected');
    });
  });
}

function bindHash() {
  const hash = location.hash.slice(1);
  if (hash && hash !== 'splash') {
    goTo(hash, false);
  }
}

function demoTimer() {
  const ring = document.querySelector('.timer-ring');
  if (!ring) return;
  let sec = 45;
  const label = ring.querySelector('.timer-text');
  const fill = ring.querySelector('.timer-fill');
  const max = 97.4;

  setInterval(() => {
    if (currentScreen() !== 'challenge') return;
    sec = Math.max(0, sec - 1);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (label) label.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    const pct = sec / 45;
    if (fill) fill.style.strokeDashoffset = max * (1 - pct);
    ring.dataset.state = sec <= 10 ? 'danger' : sec <= 20 ? 'warn' : 'safe';
  }, 1000);
}

initRouter();
bindRoutes();
bindDevNav();
bindSplash();
bindAuth();
bindIntro();
bindMap();
bindKingdom();
bindOptions();
bindHash();
demoTimer();
