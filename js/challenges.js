import { addXp, recordAnswer } from './state.js';
import { startTimer, stopTimer, paintTimer, getRemaining, getLimit, wasExpired, resetExpired, secondsForQuest } from './timer.js';
import { scoreTrial } from './scoring.js';
import { consumeTrialStartEffect, consumeXpBoost } from './effects.js';

let session = null;
let selected = null;
let orderState = [];
let timedOutFlag = false;

const TYPE_LABELS = {
  mcq: 'MCQ',
  output: 'Output',
  debug: 'Debug',
  order: 'Order',
};

export function startSession(quest) {
  session = {
    quest,
    index: 0,
    correct: 0,
    lastScore: null,
  };
  selected = null;
  orderState = [];
  timedOutFlag = false;
}

export function getSession() {
  return session;
}

export function currentChallenge() {
  return session?.quest?.challenges?.[session.index] ?? null;
}

export function trialLabel() {
  if (!session) return '';
  const total = session.quest.challenges.length;
  return `Trial ${session.index + 1} / ${total}`;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightCode(src) {
  let s = escapeHtml(src);
  s = s.replace(/\b(int|double|boolean|String|true|false|System)\b/g, '<span class="tok-kw">$1</span>');
  s = s.replace(/\b(\d+)\b/g, '<span class="tok-num">$1</span>');
  s = s.replace(/(".*?")/g, '<span class="tok-str">$1</span>');
  return s;
}

function codeBlock(src) {
  if (!src) return '';
  return `<pre class="code-block"><code>${highlightCode(src)}</code></pre>`;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hintHiddenIndices(ch) {
  if (ch.type !== 'mcq' && ch.type !== 'output') return [];
  const wrong = ch.options.map((_, i) => i).filter(i => i !== ch.answer);
  return shuffle(wrong).slice(0, Math.min(2, wrong.length));
}

export function renderChallenge() {
  const stage = document.getElementById('challenge-stage');
  const progress = document.getElementById('challenge-progress');
  const ch = currentChallenge();
  if (!stage || !ch || !session) return;

  selected = null;
  orderState = shuffle(ch.blocks ? ch.blocks.map((_, i) => i) : []);
  timedOutFlag = false;
  resetExpired();

  if (progress) progress.textContent = trialLabel();

  const startEffect = consumeTrialStartEffect();
  const hiddenOptions = startEffect === 'hint' ? hintHiddenIndices(ch) : [];
  const extraTime = startEffect === 'time' ? 15 : 0;

  const markup = buildChallengeMarkup(ch, orderState, {
    softTimeout: true,
    hiddenOptions,
    hintActive: startEffect === 'hint',
  });
  stage.innerHTML = markup;
  stage.classList.remove('challenge-enter');
  void stage.offsetWidth;
  stage.classList.add('challenge-enter');

  wireChallengeInputs({
    get selected() { return selected; },
    set selected(v) { selected = v; },
    get orderState() { return orderState; },
    set orderState(v) { orderState = v; },
  }, 'challenge-submit', () => {
    window.dispatchEvent(new CustomEvent('cqk:submit'));
  });
  startChallengeTimer(extraTime);
}

function checkAnswer(ch, sel, order) {
  if (!ch) return { ok: false, explain: '' };

  if (ch.type === 'mcq' || ch.type === 'output') {
    if (sel === null) return { ok: false, explain: 'Pick an answer first.', needPick: true };
    return { ok: sel === ch.answer, explain: ch.explain };
  }

  if (ch.type === 'debug') {
    if (sel === null) return { ok: false, explain: 'Select a line first.', needPick: true };
    return { ok: sel === ch.answer, explain: ch.explain };
  }

  if (ch.type === 'order') {
    const ok = ch.answer.every((v, i) => order[i] === v);
    return { ok, explain: ch.explain };
  }

  return { ok: false, explain: '' };
}

export function gradeChallenge(ch, sel, order) {
  return checkAnswer(ch, sel, order);
}

export function freshOrderState(ch) {
  return shuffle(ch.blocks ? ch.blocks.map((_, i) => i) : []);
}

export function buildChallengeMarkup(ch, orderState, opts = {}) {
  const submitLabel = opts.submitLabel || 'Submit Answer';
  const submitId = opts.submitId || 'challenge-submit';
  const badge = opts.badge || TYPE_LABELS[ch.type] || ch.badge || 'Trial';

  let body = `<span class="challenge-badge ${opts.boss ? 'challenge-boss' : ''}">${badge}</span>`;
  body += `<h2 class="challenge-prompt">${escapeHtml(ch.prompt)}</h2>`;
  if (ch.code) body += codeBlock(ch.code);

  if (ch.type === 'mcq' || ch.type === 'output') {
    const hidden = new Set(opts.hiddenOptions || []);
    body += '<div class="option-grid" id="challenge-options">';
    ch.options.forEach((opt, i) => {
      if (hidden.has(i)) return;
      body += `<button type="button" class="option-btn" data-opt="${i}">${escapeHtml(opt)}</button>`;
    });
    body += '</div>';
    if (opts.hintActive) {
      body += '<p class="challenge-hint-msg">📜 Hint Scroll — two wrong answers removed.</p>';
    }
  }

  if (ch.type === 'debug') {
    const lines = ch.code.split('\n');
    body += '<div class="debug-lines" id="debug-lines">';
    lines.forEach((line, i) => {
      body += `<button type="button" class="debug-line" data-line="${i}"><span class="debug-num">${i + 1}</span><code>${highlightCode(line)}</code></button>`;
    });
    body += '</div>';
  }

  if (ch.type === 'order') {
    body += '<p class="order-hint">Drag blocks into the correct execution order.</p>';
    body += '<div class="order-list" id="order-list">';
    orderState.forEach(idx => {
      body += `<div class="order-block" draggable="true" data-idx="${idx}"><span class="order-grip">⠿</span><code>${highlightCode(ch.blocks[idx])}</code></div>`;
    });
    body += '</div>';
  }

  if (opts.softTimeout) {
    body += '<p class="challenge-timeout-msg" id="timeout-msg" hidden>Time\'s up — submit still counts, but no speed bonus.</p>';
  }

  body += `<button type="button" class="btn-primary btn-wide" id="${submitId}">${submitLabel}</button>`;
  return body;
}

export function wireChallengeInputs(stateRef, submitId, onSubmit) {
  document.querySelectorAll('#challenge-options .option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#challenge-options .option-btn').forEach(b => b.classList.remove('option-selected'));
      btn.classList.add('option-selected');
      stateRef.selected = Number(btn.dataset.opt);
    });
  });

  document.querySelectorAll('#debug-lines .debug-line').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#debug-lines .debug-line').forEach(b => b.classList.remove('debug-selected'));
      btn.classList.add('debug-selected');
      stateRef.selected = Number(btn.dataset.line);
    });
  });

  const list = document.getElementById('order-list');
  if (list) {
    setupOrderDrag(list, stateRef);
  }

  document.getElementById(submitId)?.addEventListener('click', onSubmit);
}

function setupOrderDrag(list, stateRef) {
  let dragEl = null;

  list.querySelectorAll('.order-block').forEach(block => {
    block.addEventListener('dragstart', e => {
      dragEl = block;
      block.classList.add('order-dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    block.addEventListener('dragend', () => {
      block.classList.remove('order-dragging');
      stateRef.orderState = [...list.querySelectorAll('.order-block')].map(el => Number(el.dataset.idx));
    });
    block.addEventListener('dragover', e => {
      e.preventDefault();
      const target = e.target.closest('.order-block');
      if (!target || target === dragEl) return;
      const rect = target.getBoundingClientRect();
      const after = e.clientY > rect.top + rect.height / 2;
      list.insertBefore(dragEl, after ? target.nextSibling : target);
    });
  });

  stateRef.orderState = [...list.querySelectorAll('.order-block')].map(el => Number(el.dataset.idx));
}

function startChallengeTimer(extra = 0) {
  const ring = document.getElementById('challenge-timer');
  const sec = secondsForQuest(session.quest) + extra;
  startTimer(
    sec,
    () => paintTimer(ring),
    () => {
      timedOutFlag = true;
      const msg = document.getElementById('timeout-msg');
      if (msg) msg.hidden = false;
    }
  );
  paintTimer(ring);
}

export function submitChallenge() {
  const ch = currentChallenge();
  const result = checkAnswer(ch, selected, orderState);
  if (result.needPick) return result;

  stopTimer();
  const timedOut = timedOutFlag || wasExpired();
  const scores = scoreTrial(getRemaining(), getLimit(), timedOut);
  const ok = result.ok;

  recordAnswer(ok);
  let itemBonus = 0;
  if (ok) {
    session.correct += 1;
    addXp(scores.total);
    itemBonus = consumeXpBoost();
    if (itemBonus > 0) addXp(itemBonus);
  }

  session.lastScore = { ...scores, ok, explain: result.explain, timedOut, itemBonus };
  return { ok, explain: result.explain, scores, timedOut };
}

export function renderResult() {
  const card = document.getElementById('result-card');
  const last = session?.lastScore;
  if (!card || !last) return;

  card.className = `result-card panel panel-cut ${last.ok ? 'result-correct' : 'result-wrong'}`;

  const icon = last.ok ? '✓' : '✗';
  const title = last.ok ? 'Correct!' : 'Not quite!';
  const btnLabel = last.ok
    ? (session.index >= session.quest.challenges.length - 1 ? 'Complete Quest' : 'Next Trial')
    : 'Try Again';

  let loot = '';
  if (last.ok) {
    loot = `<span>+${last.xp} XP</span>`;
    if (last.bonus > 0) loot += `<span class="loot-bonus">+${last.bonus} Quick Bonus</span>`;
    else if (last.timedOut) loot += `<span class="loot-muted">No speed bonus</span>`;
    if (last.itemBonus > 0) loot += `<span class="loot-bonus">+${last.itemBonus} Tome Bonus</span>`;
  }

  const explain = String(last.explain)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code>$1</code>');

  card.innerHTML = `
    <div class="result-icon">${icon}</div>
    <h2>${title}</h2>
    <p class="result-explain">${explain}</p>
    <div class="result-loot">${loot}</div>
    <button type="button" class="btn-primary btn-wide" id="result-continue">${btnLabel}</button>
  `;
}

export function advanceAfterResult() {
  const last = session?.lastScore;
  if (!last) return 'challenge';

  if (!last.ok) return 'retry';

  session.index += 1;
  if (session.index >= session.quest.challenges.length) return 'quest-done';
  return 'challenge';
}

export function abandonSession() {
  stopTimer();
  session = null;
}

export function sessionSummary() {
  if (!session) return null;
  return {
    quest: session.quest,
    correct: session.correct,
    total: session.quest.challenges.length,
  };
}
