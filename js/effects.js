import { getPendingEffect, clearPendingEffect } from './state.js';

export function consumeTrialStartEffect() {
  const effect = getPendingEffect();
  if (effect === 'hint' || effect === 'time') {
    clearPendingEffect();
    return effect;
  }
  return null;
}

export function consumeXpBoost() {
  if (getPendingEffect() === 'xp') {
    clearPendingEffect();
    return 8;
  }
  return 0;
}

export function consumeHeartPotion() {
  if (getPendingEffect() === 'heart') {
    clearPendingEffect();
    return true;
  }
  return false;
}
