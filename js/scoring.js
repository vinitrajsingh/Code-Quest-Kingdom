export const BASE_XP = 10;

export function quickBonus(remaining, total) {
  if (remaining <= 0) return 0;
  const ratio = remaining / total;
  if (ratio >= 0.5) return 5;
  if (ratio >= 0.3) return 3;
  if (ratio >= 0.1) return 1;
  return 0;
}

export function scoreTrial(remaining, total, timedOut) {
  const bonus = timedOut ? 0 : quickBonus(remaining, total);
  return { xp: BASE_XP, bonus, total: BASE_XP + bonus };
}
