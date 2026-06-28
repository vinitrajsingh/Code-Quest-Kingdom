import { recordAnswer, addXp, getCurrentKingdom } from './state.js';
import { getKingdomMeta, getAllKingdoms } from './map.js';
import {
  buildChallengeMarkup,
  wireChallengeInputs,
  gradeChallenge,
  freshOrderState,
} from './challenges.js';
import {
  startTimer, stopTimer, paintTimer, resetExpired, secondsForBossPhase,
} from './timer.js';
import { scoreTrial } from './scoring.js';
import { consumeHeartPotion } from './effects.js';

let boss = null;
let input = { selected: null, orderState: [], timedOutFlag: false };
let clearSummary = null;
let onVictory = null;
let onDefeat = null;

export function setBossCallbacks(win, lose) {
  onVictory = win;
  onDefeat = lose;
}

export function getClearSummary() {
  return clearSummary;
}

export function renderBossIntro(quest) {
  const name = document.getElementById('boss-intro-name');
  const line = document.getElementById('boss-intro-line');
  const icon = document.getElementById('boss-intro-icon');
  if (name) name.textContent = quest.title;
  if (line) line.textContent = `"${quest.npc.dialogue}"`;
  if (icon) icon.textContent = quest.npc.portrait;
}

export function startBossBattle(quest) {
  boss = {
    quest,
    phase: 0,
    hearts: 3,
    bossHp: quest.challenges.length,
    started: Date.now(),
    strikes: 0,
    phaseTimes: [],
  };
  if (consumeHeartPotion() && boss.hearts < 3) boss.hearts += 1;
  renderBossPhase();
}

export function abandonBoss() {
  stopTimer();
  boss = null;
}

function currentPhaseChallenge() {
  return boss?.quest?.challenges?.[boss.phase] ?? null;
}

function updateBossHud() {
  const segs = document.querySelectorAll('#boss-segments .seg');
  segs.forEach((el, i) => {
    el.classList.toggle('seg-on', i < boss.bossHp);
  });

  const hearts = document.querySelectorAll('#boss-hearts .heart');
  hearts.forEach((el, i) => {
    el.classList.toggle('heart-on', i < boss.hearts);
  });

  const label = document.getElementById('boss-phase-label');
  if (label) label.textContent = `Phase ${boss.phase + 1} / ${boss.quest.challenges.length}`;
}

function renderBossPhase() {
  const stage = document.getElementById('boss-stage');
  const ch = currentPhaseChallenge();
  if (!stage || !ch || !boss) return;

  input.selected = null;
  input.orderState = freshOrderState(ch);
  input.timedOutFlag = false;
  resetExpired();

  const feedback = document.getElementById('boss-feedback');
  if (feedback) {
    feedback.hidden = true;
    feedback.textContent = '';
  }

  const badge = ch.badge || `Phase ${boss.phase + 1}`;
  stage.innerHTML = buildChallengeMarkup(ch, input.orderState, {
    boss: true,
    badge,
    submitId: 'boss-strike',
    submitLabel: 'Strike',
  });

  stage.classList.remove('boss-hit');
  void stage.offsetWidth;
  stage.classList.add('challenge-enter');

  wireChallengeInputs(input, 'boss-strike', () => handleBossStrike(false));
  updateBossHud();

  const ring = document.getElementById('boss-timer');
  const sec = secondsForBossPhase(boss.phase);
  startTimer(
    sec,
    () => paintTimer(ring),
    () => handleBossStrike(true)
  );
  paintTimer(ring);
}

function showBossFeedback(text, isError) {
  const el = document.getElementById('boss-feedback');
  if (!el) return;
  el.textContent = text;
  el.hidden = false;
  el.classList.toggle('boss-feedback-error', isError);
}

function handleBossStrike(fromTimeout) {
  if (!boss) return;

  stopTimer();
  const ch = currentPhaseChallenge();
  const result = fromTimeout
    ? { ok: false, explain: 'Time ran out — the dragon strikes back!', needPick: false }
    : gradeChallenge(ch, input.selected, input.orderState);

  if (result.needPick) {
    showBossFeedback(result.explain, true);
    startBossPhaseTimer();
    return;
  }

  recordAnswer(result.ok);

  if (result.ok) {
    boss.strikes += 1;
    boss.phaseTimes.push(Date.now());
    const scores = scoreTrial(999, 1000, false);
    addXp(scores.total);

    const stage = document.getElementById('boss-stage');
    stage?.classList.add('boss-hit');
    document.getElementById('screen-boss')?.classList.add('shake');

    setTimeout(() => {
      document.getElementById('screen-boss')?.classList.remove('shake');
      boss.bossHp -= 1;
      boss.phase += 1;

      if (boss.phase >= boss.quest.challenges.length) {
        finishBossVictory();
        return;
      }
      renderBossPhase();
    }, 520);
    return;
  }

  boss.hearts -= 1;
  updateBossHud();
  document.getElementById('screen-boss')?.classList.add('shake');
  setTimeout(() => document.getElementById('screen-boss')?.classList.remove('shake'), 450);

  if (boss.hearts <= 0) {
    finishBossDefeat(result.explain);
    return;
  }

  showBossFeedback(fromTimeout ? result.explain : `${result.explain} — lose 1 heart.`, true);
  startBossPhaseTimer();
}

function startBossPhaseTimer() {
  const ring = document.getElementById('boss-timer');
  const sec = secondsForBossPhase(boss.phase);
  resetExpired();
  startTimer(
    sec,
    () => paintTimer(ring),
    () => handleBossStrike(true)
  );
  paintTimer(ring);
}

function finishBossVictory() {
  const elapsed = Math.floor((Date.now() - boss.started) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  const kingdomId = getCurrentKingdom();
  const meta = getKingdomMeta(kingdomId);
  const kingdoms = getAllKingdoms();
  const idx = kingdoms.findIndex(k => k.id === kingdomId);
  const next = idx >= 0 ? kingdoms[idx + 1] : null;
  clearSummary = {
    title: meta ? `${meta.name} Restored` : 'Kingdom Restored',
    subtitle: next
      ? `The Code Crystal glows again. ${next.name} awaits.`
      : 'The Code Crystal glows again across the realm.',
    accuracy: `${boss.strikes}/${boss.quest.challenges.length}`,
    time: `${m}:${s.toString().padStart(2, '0')}`,
    xp: boss.quest.rewards.xp,
    coins: boss.quest.rewards.coins,
  };
  stopTimer();
  const q = boss.quest;
  boss = null;
  onVictory?.(q);
}

function finishBossDefeat(lastExplain) {
  stopTimer();
  const el = document.getElementById('boss-defeat-reason');
  if (el) el.textContent = lastExplain || 'The guardian was too strong.';
  boss = null;
  onDefeat?.();
}

export function renderKingdomCleared() {
  const s = clearSummary;
  if (!s) return;

  const title = document.getElementById('cleared-title');
  const sub = document.getElementById('cleared-sub');
  const acc = document.getElementById('cleared-accuracy');
  const time = document.getElementById('cleared-time');
  const xp = document.getElementById('cleared-xp');
  const coins = document.getElementById('cleared-coins');

  if (title) title.textContent = s.title;
  if (sub) sub.textContent = s.subtitle;
  if (acc) acc.textContent = s.accuracy;
  if (time) time.textContent = s.time;
  if (xp) xp.textContent = `+${s.xp}`;
  if (coins) coins.textContent = `+${s.coins}`;
}

export function renderQuestClearedSummary(quest, correct, total, elapsedMs) {
  const elapsed = Math.floor(elapsedMs / 1000);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  clearSummary = {
    title: `${quest.area} Cleared`,
    subtitle: 'The path forward glows a little brighter.',
    accuracy: `${correct}/${total}`,
    time: `${m}:${s.toString().padStart(2, '0')}`,
    xp: quest.rewards.xp,
    coins: quest.rewards.coins,
  };
  renderKingdomCleared();
}
