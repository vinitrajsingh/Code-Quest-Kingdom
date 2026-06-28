const screens = new Map();

const PROTECTED = new Set([
  'map', 'kingdom', 'dialogue', 'quest-brief', 'quest-preview', 'challenge',
  'result', 'boss-intro', 'boss', 'boss-defeat', 'kingdom-cleared', 'stub', 'profile', 'intro',
]);

let sessionCheck = () => false;
let onNavigate = null;

export function initRouter() {
  document.querySelectorAll('.screen').forEach(el => {
    screens.set(el.dataset.screen, el);
  });
}

export function setSessionCheck(fn) {
  sessionCheck = fn;
}

export function setOnNavigate(fn) {
  onNavigate = fn;
}

export function goTo(name, animate = true, opts = {}) {
  const bypass = opts.bypass === true;
  let targetName = name;

  if (!bypass && PROTECTED.has(name) && !sessionCheck()) {
    targetName = 'auth';
  }

  const target = screens.get(targetName);
  if (!target) return;

  const current = document.querySelector('.screen-active');
  if (current === target) return;

  if (animate && current) {
    current.classList.add('screen-exit');
    current.classList.remove('screen-active');
    setTimeout(() => current.classList.remove('screen-exit'), 260);
  } else if (current) {
    current.classList.remove('screen-active');
  }

  target.classList.add('screen-active', 'screen-enter');
  setTimeout(() => target.classList.remove('screen-enter'), 400);

  if (targetName !== 'splash') {
    history.replaceState(null, '', `#${targetName}`);
  } else {
    history.replaceState(null, '', location.pathname);
  }

  onNavigate?.(targetName);
}

export function getScreen(name) {
  return screens.get(name);
}

export function currentScreen() {
  return document.querySelector('.screen-active')?.dataset.screen ?? null;
}

export function isProtected(name) {
  return PROTECTED.has(name);
}
