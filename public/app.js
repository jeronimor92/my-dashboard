const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const HABIT_ICONS = { ejercicio: '🏃', lectura: '📚' };

const todayStr = new Date().toISOString().split('T')[0];

document.getElementById('current-date').textContent = formatDateLabel(todayStr);

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return `${DAYS_ES[d.getDay()]} ${d.getDate()} de ${MONTHS_ES[d.getMonth()]}`;
}

function weatherIcon(code, rain) {
  if (rain > 5) return '🌧️';
  if (rain > 1) return '🌦️';
  if (code === 0) return '☀️';
  if (code <= 2) return '⛅';
  if (code <= 45) return '🌫️';
  if (code <= 65) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  return '⛈️';
}

async function loadWeather() {
  const grid = document.getElementById('weather-grid');
  try {
    const res = await fetch('/api/weather');
    const { days } = await res.json();

    grid.innerHTML = days.map((day, i) => {
      const d = new Date(day.date + 'T12:00:00');
      const dayName = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : DAYS_ES[d.getDay()];
      const isToday = i === 0;
      const icon = weatherIcon(day.weathercode, day.rainAt730);
      const rainText = day.rainAt730 > 0.1
        ? `💧 ${day.rainAt730.toFixed(1)} mm`
        : '💧 Sin lluvia';

      return `
        <div class="weather-day ${isToday ? 'today' : ''}">
          <div class="day-name">${dayName}</div>
          <div class="day-date">${d.getDate()} ${MONTHS_ES[d.getMonth()]}</div>
          <div class="weather-icon">${icon}</div>
          <div class="temp-730">${Math.round(day.tempAt730)}°C</div>
          <div class="temp-range">↑${Math.round(day.tempMax)}° ↓${Math.round(day.tempMin)}°</div>
          <div class="rain-info">${rainText}</div>
          <div class="outfit">${day.outfit}</div>
        </div>
      `;
    }).join('');
  } catch {
    grid.innerHTML = '<p style="color:#f55">Error al cargar el clima.</p>';
  }
}

async function loadHabits() {
  const [habitsRes, statsRes] = await Promise.all([
    fetch('/api/habits'),
    fetch('/api/habits/stats'),
  ]);
  const habits = await habitsRes.json();
  const stats = await statsRes.json();

  const habitNames = ['ejercicio', 'lectura'];
  const todayHabits = habits[todayStr] || {};

  const container = document.getElementById('habits-container');
  container.innerHTML = `<div class="habits-grid">
    ${habitNames.map(h => {
      const done = !!todayHabits[h];
      const streak = stats[h]?.streak ?? 0;
      return `
        <div class="habit-card ${done ? 'done' : ''}" onclick="toggleHabit('${h}')">
          <div class="habit-icon">${HABIT_ICONS[h]}</div>
          <div class="habit-name">${h}</div>
          <div class="habit-streak">🔥 Racha: ${streak} días</div>
          <div class="habit-check">${done ? '✅' : '⬜'}</div>
        </div>
      `;
    }).join('')}
  </div>`;

  const achContainer = document.getElementById('achievements-container');
  const allAchievements = habitNames.flatMap(h =>
    (stats[h]?.achievements ?? []).map(a => ({ ...a, habit: h }))
  );
  const unique = [...new Map(allAchievements.map(a => [a.id + a.habit, a])).values()];
  achContainer.innerHTML = `<div class="achievements-grid">
    ${unique.map(a => `
      <div class="achievement ${a.unlocked ? 'unlocked' : ''}">
        ${a.label} <span style="font-size:0.75rem;opacity:0.6">(${a.habit})</span>
      </div>
    `).join('')}
  </div>`;
}

async function toggleHabit(habit) {
  await fetch('/api/habits/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: todayStr, habit }),
  });
  loadHabits();
}

loadWeather();
loadHabits();
