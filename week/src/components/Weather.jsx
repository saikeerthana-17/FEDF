import React, { useState, useEffect } from "react";

function Weather() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Demo weather data (No API needed)
    setTimeout(() => {
      setWeather({
        temperature: 32,
        windspeed: 12,
        winddirection: 180,
        humidity: 65,
        time: new Date().toLocaleString(),
      });

      setLoading(false);
    }, 1500);
  }, []);

  if (loading) {
    return (
      <div className="weather-container">
        <h2>Loading Weather Information...</h2>
      </div>
    );
  }

  return (
    <div className="weather-container">
      <h1>🌤 Weather Information System</h1>

      <h3>📍 Hyderabad</h3>

      <div className="weather-card">
        <p>
          🌡 Temperature: <strong>{weather.temperature} °C</strong>
        </p>

        <p>
          💨 Wind Speed: <strong>{weather.windspeed} km/h</strong>
        </p>

        <p>
          🧭 Wind Direction: <strong>{weather.winddirection}°</strong>
        </p>

        <p>
          💧 Humidity: <strong>{weather.humidity}%</strong>
        </p>

        <p>
          🕒 Time: <strong>{weather.time}</strong>
        </p>
      </div>

      <button
        onClick={() =>
          setWeather({
            temperature: Math.floor(Math.random() * 10) + 28,
            windspeed: Math.floor(Math.random() * 20) + 5,
            winddirection: Math.floor(Math.random() * 360),
            humidity: Math.floor(Math.random() * 30) + 50,
            time: new Date().toLocaleString(),
          })
        }
      >
        🔄 Refresh Weather
      </button>
    </div>
  );
}

export default Weather;