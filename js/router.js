const screens = new Map();

export function initRouter() {
  document.querySelectorAll('.screen').forEach(el => {
    screens.set(el.dataset.screen, el);
  });
}

export function goTo(name, animate = true) {
  const target = screens.get(name);
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

  if (name !== 'splash') {
    history.replaceState(null, '', `#${name}`);
  }
}

export function getScreen(name) {
  return screens.get(name);
}

export function currentScreen() {
  return document.querySelector('.screen-active')?.dataset.screen ?? null;
}
