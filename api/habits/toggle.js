import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { date, habit } = req.body;
  const habits = await redis.get('habits') ?? {};
  if (!habits[date]) habits[date] = {};
  habits[date][habit] = !habits[date][habit];
  await redis.set('habits', habits);
  res.json(habits);
}
