import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  const habits = await redis.get('habits') ?? {};
  res.json(habits);
}
