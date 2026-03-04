import { config } from '../config.js';

const DEFAULT_COORDS = {
  latitude: 43.65,
  longitude: -79.38,
  city: 'Toronto, Ontario',
};

export async function getWeatherData() {
  try {
    if (config.OPENWEATHER_API_KEY) {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${DEFAULT_COORDS.latitude}&lon=${DEFAULT_COORDS.longitude}&units=metric&appid=${config.OPENWEATHER_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`OpenWeatherMap failed: ${response.status}`);
      const data = await response.json();
      return {
        source: 'openweathermap',
        location: DEFAULT_COORDS.city,
        temperatureC: data?.main?.temp,
        windKph: data?.wind?.speed ? Number(data.wind.speed) * 3.6 : null,
        condition: data?.weather?.[0]?.description,
        raw: data,
      };
    }

    const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${DEFAULT_COORDS.latitude}&longitude=${DEFAULT_COORDS.longitude}&current_weather=true`;
    const response = await fetch(openMeteoUrl);
    if (!response.ok) throw new Error(`Open-Meteo failed: ${response.status}`);
    const data = await response.json();
    const current = data.current_weather || {};

    return {
      source: 'open-meteo',
      location: DEFAULT_COORDS.city,
      temperatureC: current.temperature,
      windKph: current.windspeed,
      conditionCode: current.weathercode,
      observedAt: current.time,
      raw: current,
    };
  } catch (err) {
    return {
      source: 'error',
      location: DEFAULT_COORDS.city,
      error: err.message,
    };
  }
}
