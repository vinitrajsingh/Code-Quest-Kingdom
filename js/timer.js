const CIRC = 97.4;
let tickId = null;
let remain = 0;
let limit = 60;
let expired = false;
let onTick = null;
let onExpire = null;

export function startTimer(seconds, tickCb, expireCb) {
  stopTimer();
  limit = seconds;
  remain = seconds;
  expired = false;
  onTick = tickCb;
  onExpire = expireCb;
  paint();
  tickId = setInterval(() => {
    remain -= 1;
    if (remain <= 0) {
      remain = 0;
      paint();
      stopTimer();
      expired = true;
      onExpire?.();
      return;
    }
    paint();
  }, 1000);
}

export function stopTimer() {
  if (tickId) clearInterval(tickId);
  tickId = null;
}

export function paintTimer(ringEl) {
  if (!ringEl) return;
  const label = ringEl.querySelector('.timer-text');
  const fill = ringEl.querySelector('.timer-fill');
  const m = Math.floor(remain / 60);
  const s = remain % 60;
  if (label) label.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  if (fill) fill.style.strokeDashoffset = String(CIRC * (1 - remain / limit));
  const ratio = remain / limit;
  ringEl.dataset.state = ratio <= 0.22 ? 'danger' : ratio <= 0.45 ? 'warn' : 'safe';
}

function paint() {
  onTick?.(remain, limit);
}

export function getRemaining() {
  return remain;
}

export function getLimit() {
  return limit;
}

export function wasExpired() {
  return expired;
}

export function resetExpired() {
  expired = false;
}

export function secondsForQuest(quest) {
  if (quest?.type === 'boss') return 45;
  if (quest?.difficulty >= 2) return 50;
  return 60;
}

export { CIRC };
