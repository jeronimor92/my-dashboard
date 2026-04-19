import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

function calculateStreak(habits, habit) {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    if (habits[key]?.[habit]) streak++;
    else break;
  }
  return streak;
}

function calculateBestStreak(habits, habit) {
  const dates = Object.keys(habits).sort();
  let best = 0, current = 0;
  for (const date of dates) {
    if (habits[date]?.[habit]) { current++; best = Math.max(best, current); }
    else current = 0;
  }
  return best;
}

function getAchievements(streak, best) {
  return [
    { id: 'first', label: '⭐ Primer día', req: 1 },
    { id: 'week', label: '🔥 Una semana seguida', req: 7 },
    { id: 'month', label: '💪 Un mes seguido', req: 30 },
    { id: 'three_months', label: '🏆 Tres meses seguidos', req: 90 },
  ].map(a => ({ ...a, unlocked: best >= a.req }));
}

export default async function handler(req, res) {
  const habits = await redis.get('habits') ?? {};
  const stats = {};
  for (const h of ['ejercicio', 'lectura']) {
    const streak = calculateStreak(habits, h);
    const best = calculateBestStreak(habits, h);
    stats[h] = { streak, best, achievements: getAchievements(streak, best) };
  }
  res.json(stats);
}
