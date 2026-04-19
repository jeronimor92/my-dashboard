const LA_PLATA = { lat: -34.9205, lon: -57.9536 };

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

export default async function handler(req, res) {
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
  } catch {
    res.status(500).json({ error: 'Error al obtener el clima' });
  }
}
