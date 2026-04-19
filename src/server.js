import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

const HABITS_FILE = path.join(__dirname, '../data/habits.json');
const LA_PLATA = { lat: -34.9205, lon: -57.9536 };

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

function loadHabits() {
  if (!fs.existsSync(HABITS_FILE)) return {};
  return JSON.parse(fs.readFileSync(HABITS_FILE, 'utf-8'));
}

function saveHabits(data) {
  fs.mkdirSync(path.dirname(HABITS_FILE), { recursive: true });
  fs.writeFileSync(HABITS_FILE, JSON.stringify(data, null, 2));
}

function getOutfitRecommendation(temp, rain, windspeed) {
  const parts = [];

  if (temp <= 5) parts.push('Campera muy abrigada, bufanda y guantes');
  else if (temp <= 12) parts.push('Campera de abrigo o piloto');
  else if (temp <= 18) parts.push('Buzo o campera liviana');
  else if (temp <= 24) parts.push('Ropa liviana, remera');
  else parts.push('Ropa muy liviana, hace calor');

  if (rain > 1) parts.push('llevá paraguas ☂️');
  else if (rain > 0.1) parts.push('puede lloviznar, lleva algo');

  if (windspeed > 40) parts.push('hay viento fuerte');

  return parts.join(', ');
}

app.get('/api/weather', async (req, res) => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LA_PLATA.lat}&longitude=${LA_PLATA.lon}&hourly=temperature_2m,precipitation,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode&timezone=America%2FArgentina%2FBuenos_Aires&forecast_days=7`;
    const response = await fetch(url);
    const data = await response.json();

    const days = data.daily.time.map((date, i) => {
      const hourIndex = data.hourly.time.findIndex(t => t === `${date}T07:00`);
      const temp730 = hourIndex !== -1 ? data.hourly.temperature_2m[hourIndex] : data.daily.temperature_2m_min[i];
      const rain730 = hourIndex !== -1 ? data.hourly.precipitation[hourIndex] : 0;
      const wind730 = hourIndex !== -1 ? data.hourly.windspeed_10m[hourIndex] : data.daily.windspeed_10m_max[i];

      return {
        date,
        tempMax: data.daily.temperature_2m_max[i],
        tempMin: data.daily.temperature_2m_min[i],
        tempAt730: temp730,
        rainAt730: rain730,
        windAt730: wind730,
        totalRain: data.daily.precipitation_sum[i],
        weathercode: data.daily.weathercode[i],
        outfit: getOutfitRecommendation(temp730, rain730, wind730),
      };
    });

    res.json({ days });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el clima' });
  }
});

app.get('/api/habits', (req, res) => {
  res.json(loadHabits());
});

app.post('/api/habits/toggle', (req, res) => {
  const { date, habit } = req.body;
  const habits = loadHabits();
  if (!habits[date]) habits[date] = {};
  habits[date][habit] = !habits[date][habit];
  saveHabits(habits);
  res.json(habits);
});

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
  for (let i = 0; i < dates.length; i++) {
    if (habits[dates[i]]?.[habit]) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

app.get('/api/habits/stats', (req, res) => {
  const habits = loadHabits();
  const habitNames = ['ejercicio', 'lectura'];
  const stats = {};
  for (const h of habitNames) {
    const streak = calculateStreak(habits, h);
    const best = calculateBestStreak(habits, h);
    stats[h] = { streak, best, achievements: getAchievements(streak, best) };
  }
  res.json(stats);
});

function getAchievements(streak, best) {
  const all = [
    { id: 'first', label: '⭐ Primer día', req: 1 },
    { id: 'week', label: '🔥 Una semana seguida', req: 7 },
    { id: 'month', label: '💪 Un mes seguido', req: 30 },
    { id: 'three_months', label: '🏆 Tres meses seguidos', req: 90 },
  ];
  return all.map(a => ({ ...a, unlocked: best >= a.req }));
}

app.listen(PORT, () => {
  console.log(`Dashboard corriendo en http://localhost:${PORT}`);
});
