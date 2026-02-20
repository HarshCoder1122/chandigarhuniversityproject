/* ===== HARDINI WEBAPP - app.js ===== */
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001'
    : 'https://hardini.onrender.com';

// ===== SPA ROUTER =====
function navigateTo(page) {
    document.querySelectorAll('.page-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(n => n.classList.remove('active'));
    const view = document.getElementById('page-' + page);
    if (view) view.classList.add('active');
    document.querySelectorAll(`[data-page="${page}"]`).forEach(n => n.classList.add('active'));
    window.location.hash = page;
    // Trigger page-specific loading
    if (page === 'reels' && !window._reelsLoaded) loadReels();
    if (page === 'soilprobe' && !window._devicesLoaded) { loadDevices(); window._devicesLoaded = true; }
    if (page === 'alerts') fetchAlerts();
    if (page === 'home') fetchHomeInsights();
}

// ============================================
// WEATHER & ALERTS FEATURE (Real-Time)
// ============================================
const WEATHER_CODE_MAP = {
    0: { text: 'Clear Sky', icon: '☀️' },
    1: { text: 'Mainly Clear', icon: '🌤️' },
    2: { text: 'Partly Cloudy', icon: '⛅' },
    3: { text: 'Overcast', icon: '☁️' },
    45: { text: 'Foggy', icon: '🌫️' },
    48: { text: 'Rime Fog', icon: '🌫️' },
    51: { text: 'Light Drizzle', icon: '🌦️' },
    53: { text: 'Moderate Drizzle', icon: '🌦️' },
    55: { text: 'Dense Drizzle', icon: '🌧️' },
    56: { text: 'Freezing Drizzle', icon: '🌧️' },
    57: { text: 'Heavy Freezing Drizzle', icon: '🌧️' },
    61: { text: 'Slight Rain', icon: '🌧️' },
    63: { text: 'Moderate Rain', icon: '🌧️' },
    65: { text: 'Heavy Rain', icon: '🌧️' },
    66: { text: 'Freezing Rain', icon: '🌧️' },
    67: { text: 'Heavy Freezing Rain', icon: '🌧️' },
    71: { text: 'Slight Snow', icon: '🌨️' },
    73: { text: 'Moderate Snow', icon: '❄️' },
    75: { text: 'Heavy Snow', icon: '❄️' },
    77: { text: 'Snow Grains', icon: '🌨️' },
    80: { text: 'Slight Showers', icon: '🌦️' },
    81: { text: 'Moderate Showers', icon: '🌧️' },
    82: { text: 'Violent Showers', icon: '⛈️' },
    85: { text: 'Snow Showers', icon: '🌨️' },
    86: { text: 'Heavy Snow Showers', icon: '❄️' },
    95: { text: 'Thunderstorm', icon: '⛈️' },
    96: { text: 'Thunderstorm + Hail', icon: '⛈️' },
    99: { text: 'Severe Thunderstorm', icon: '⛈️' }
};

function getWeatherInfo(code) {
    return WEATHER_CODE_MAP[code] || { text: 'Unknown', icon: '🌤️' };
}

async function getUserLocation() {
    // Strategy 1: Browser Geolocation (GPS)
    try {
        const pos = await new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject(new Error('No geolocation'));
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 300000
            });
        });
        return {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            source: 'gps'
        };
    } catch (e) {
        console.warn('Geolocation failed, falling back to IP:', e.message);
    }

    // Strategy 2: IP-based location fallback
    try {
        const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        if (data.latitude && data.longitude) {
            return {
                latitude: data.latitude,
                longitude: data.longitude,
                city: data.city,
                region: data.region,
                source: 'ip'
            };
        }
    } catch (e) {
        console.warn('IP geolocation also failed:', e.message);
    }

    // Default: New Delhi
    return { latitude: 28.6139, longitude: 77.209, city: 'New Delhi', source: 'default' };
}

async function fetchHomeInsights() {
    if (window._homeInsightsLoaded) return;
    try {
        const loc = await getUserLocation();
        const lat = loc.latitude;
        const lon = loc.longitude;

        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
        const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi&timezone=auto`;

        const [wRes, aRes] = await Promise.all([fetch(weatherUrl), fetch(aqiUrl)]);
        const weather = await wRes.json();
        const aqi = await aRes.json();

        if (weather.current) {
            document.getElementById('insightWeatherTemp').textContent = `${Math.round(weather.current.temperature_2m)}°C`;
            document.getElementById('insightWeatherDesc').textContent = getWeatherInfo(weather.current.weather_code).text;
        }

        if (aqi.current && aqi.current.european_aqi) {
            const aqiVal = aqi.current.european_aqi;
            document.getElementById('insightAqi').textContent = aqiVal;
            let level = 'Good';
            if (aqiVal > 100) level = 'Hazardous';
            else if (aqiVal > 80) level = 'Very Poor';
            else if (aqiVal > 60) level = 'Poor';
            else if (aqiVal > 40) level = 'Moderate';
            else if (aqiVal > 20) level = 'Fair';
            document.getElementById('insightAqiDesc').textContent = level;
        }

        fetchMandiPrices();
        window._homeInsightsLoaded = true;
    } catch (e) {
        console.warn('Could not load home insights', e);
        document.getElementById('insightWeatherDesc').textContent = 'Unavailable';
        document.getElementById('insightAqiDesc').textContent = 'Unavailable';
    }
}

async function fetchMandiPrices() {
    const grid = document.getElementById('mandiGrid');
    if (!grid) return;

    try {
        const apiKey = 'REMOVED_SECRET';
        const url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&limit=6`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('API Response not ok');
        const data = await response.json();

        const records = data.records || [];
        if (records.length === 0) {
            grid.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);grid-column: 1 / -1;">No market data available at this time.</div>';
            return;
        }

        const cards = records.map(record => {
            const commodity = record.commodity || 'Unknown';
            const variety = record.variety || 'Local';
            const market = record.market || record.district || 'Market';
            const price = record.modal_price || record.max_price || '--';
            const date = record.arrival_date || '--';

            return `
                <div class="glass-card" style="padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <div>
                            <div style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">${commodity}</div>
                            <div style="font-size: 12px; color: var(--text-secondary); background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 12px; display: inline-block;">${variety}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 24px; font-weight: 800; color: var(--accent); font-family: Outfit, sans-serif;">₹${price}</div>
                            <div style="font-size: 11px; color: var(--text-muted);">per quintal</div>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 12px; margin-top: 12px;">
                        <div style="font-size: 13px; color: var(--text-secondary);"><span style="margin-right: 6px;">📍</span>${market}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">📅 ${date}</div>
                    </div>
                </div>
            `;
        });

        grid.innerHTML = cards.join('');

    } catch (e) {
        console.error('Failed to load Mandi data:', e);
        grid.innerHTML = '<div style="text-align:center;padding:30px;color:var(--danger);grid-column: 1 / -1;">Failed to fetch market rates. Please try again later.</div>';
    }
}

async function reverseGeocode(lat, lon) {
    try {
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`, {
            signal: AbortSignal.timeout(5000)
        });
        const data = await res.json();
        return data.city || data.locality || data.principalSubdivision || 'Your Location';
    } catch (e) {
        return null;
    }
}

window.fetchAlerts = async function () {
    try {
        // 1. Get user location
        const loc = await getUserLocation();
        const lat = loc.latitude;
        const lon = loc.longitude;

        // Get city name
        let cityName = loc.city || null;
        if (!cityName) {
            cityName = await reverseGeocode(lat, lon) || `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
        }

        // Update hero location + date
        const locEl = document.getElementById('weatherLocation');
        const dateEl = document.getElementById('weatherDate');
        if (locEl) locEl.textContent = `📍 ${cityName}` + (loc.source === 'ip' ? ' (via IP)' : loc.source === 'default' ? ' (Default)' : '');
        if (dateEl) {
            const now = new Date();
            dateEl.textContent = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + ' • ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        }

        // 2. Fetch all weather data from Open-Meteo (free, no key)
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
            + `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,cloud_cover,uv_index,visibility,dew_point_2m`
            + `&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max`
            + `&timezone=auto&forecast_days=6`;

        const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}`
            + `&current=european_aqi,pm10,pm2_5,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide`
            + `&timezone=auto`;

        const [weatherRes, aqiRes] = await Promise.all([
            fetch(weatherUrl),
            fetch(aqiUrl)
        ]);

        const weather = await weatherRes.json();
        const aqi = await aqiRes.json();

        // 3. Render current weather hero
        const cur = weather.current || {};
        const wInfo = getWeatherInfo(cur.weather_code);

        document.getElementById('weatherIconBig').textContent = wInfo.icon;
        document.getElementById('weatherTempBig').textContent = `${Math.round(cur.temperature_2m || 0)}°`;
        document.getElementById('weatherCondition').textContent = wInfo.text;
        document.getElementById('weatherFeels').textContent = `Feels like ${Math.round(cur.apparent_temperature || 0)}°C`;

        // 4. Render weather stats
        document.getElementById('wsHumidity').textContent = `${cur.relative_humidity_2m || '--'}%`;
        document.getElementById('wsWind').textContent = `${Math.round(cur.wind_speed_10m || 0)} km/h`;
        document.getElementById('wsUV').textContent = `${(cur.uv_index || 0).toFixed(1)}`;
        document.getElementById('wsPressure').textContent = `${Math.round(cur.surface_pressure || 0)} hPa`;
        document.getElementById('wsVisibility').textContent = `${((cur.visibility || 0) / 1000).toFixed(1)} km`;
        document.getElementById('wsDewpoint').textContent = `${Math.round(cur.dew_point_2m || 0)}°`;
        document.getElementById('wsRain').textContent = `${(cur.precipitation || 0).toFixed(1)} mm`;
        document.getElementById('wsWindDir').textContent = `${cur.wind_direction_10m || '--'}°`;

        // 5. Render hourly forecast (next 24 hours)
        const hourlyEl = document.getElementById('hourlyForecast');
        if (weather.hourly) {
            const nowHour = new Date().getHours();
            const hourlyCards = [];
            // Find current hour index
            const times = weather.hourly.time || [];
            const nowStr = new Date().toISOString().slice(0, 13);
            let startIdx = times.findIndex(t => t.startsWith(nowStr));
            if (startIdx < 0) startIdx = 0;

            for (let i = startIdx; i < Math.min(startIdx + 24, times.length); i++) {
                const time = new Date(times[i]);
                const h = time.getHours();
                const isNow = (i === startIdx);
                const hIcon = getWeatherInfo(weather.hourly.weather_code[i]).icon;
                const hTemp = Math.round(weather.hourly.temperature_2m[i]);
                hourlyCards.push(`
                    <div class="hourly-card${isNow ? ' now' : ''}">
                        <div class="hourly-time">${isNow ? 'Now' : (h === 0 ? '12 AM' : h < 12 ? h + ' AM' : h === 12 ? '12 PM' : (h - 12) + ' PM')}</div>
                        <div class="hourly-icon">${hIcon}</div>
                        <div class="hourly-temp">${hTemp}°</div>
                    </div>
                `);
            }
            hourlyEl.innerHTML = hourlyCards.join('');
        }

        // 6. Render 5-day forecast
        const dailyEl = document.getElementById('dailyForecast');
        if (weather.daily) {
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dailyCards = [];
            // Skip first day (today), show next 5
            for (let i = 1; i < Math.min(6, weather.daily.time.length); i++) {
                const d = new Date(weather.daily.time[i]);
                const dInfo = getWeatherInfo(weather.daily.weather_code[i]);
                dailyCards.push(`
                    <div class="daily-card">
                        <div class="daily-day">${dayNames[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}</div>
                        <div class="daily-icon">${dInfo.icon}</div>
                        <div class="daily-temps">
                            <span class="daily-max">${Math.round(weather.daily.temperature_2m_max[i])}°</span>
                            <span class="daily-min">${Math.round(weather.daily.temperature_2m_min[i])}°</span>
                        </div>
                        <div class="daily-rain">🌧️ ${(weather.daily.precipitation_sum[i] || 0).toFixed(1)} mm</div>
                    </div>
                `);
            }
            dailyEl.innerHTML = dailyCards.join('');
        }

        // 7. Render Mappls Map (satellite view)
        renderMapplsMap(lat, lon, cityName);

        // 8. Render Air Quality
        renderAirQuality(aqi);

        // 9. Generate smart alerts
        generateWeatherAlerts(cur, weather.daily, aqi, cityName);

    } catch (error) {
        console.error('Error in fetchAlerts:', error);
        document.getElementById('weatherCondition').textContent = 'Failed to load';
        document.getElementById('weatherTempBig').textContent = '⚠️';
        document.getElementById('alertsFeed').innerHTML = `
            <div class="alert-item severity-high">
                <div class="alert-header">
                    <span class="alert-title">⚠️ Weather Data Unavailable</span>
                    <span class="alert-tag">ERROR</span>
                </div>
                <div class="alert-msg">${error.message === 'Failed to fetch' ? 'Please check your internet connection and try again.' : error.message}</div>
            </div>`;
    }
};

let leafletMapInstance = null;

function renderMapplsMap(lat, lon, cityName) {
    const container = document.getElementById('mapContainer');
    if (!container) return;

    try {
        // Clean up previous map instance
        if (leafletMapInstance) {
            leafletMapInstance.remove();
            leafletMapInstance = null;
        }

        container.innerHTML = '';
        const mapDiv = document.createElement('div');
        mapDiv.id = 'leafletMapDiv';
        mapDiv.style.cssText = 'width:100%;height:100%;border-radius:inherit;';
        container.appendChild(mapDiv);

        leafletMapInstance = L.map('leafletMapDiv').setView([lat, lon], 15);

        // OpenStreetMap tile layer (free, no API key)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(leafletMapInstance);

        // Add marker at user location
        const marker = L.marker([lat, lon]).addTo(leafletMapInstance);
        marker.bindPopup(`<div style="font-family:Inter,sans-serif;"><strong>📍 ${cityName}</strong><br><small>${lat.toFixed(4)}, ${lon.toFixed(4)}</small></div>`).openPopup();

        // Fix Leaflet rendering glitch when map is in a hidden/resized container
        setTimeout(() => { leafletMapInstance.invalidateSize(); }, 300);
    } catch (e) {
        console.error('Map error:', e);
        container.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-muted);gap:8px">
            <span style="font-size:40px">🗺️</span>
            <span>Map unavailable</span>
            <small>${lat.toFixed(4)}, ${lon.toFixed(4)}</small>
        </div>`;
    }
}

function renderAirQuality(aqiData) {
    const cur = aqiData.current || {};
    const aqiVal = cur.european_aqi || 0;

    // AQI level mapping (European AQI: 0-20 Good, 20-40 Fair, 40-60 Moderate, 60-80 Poor, 80-100 Very Poor, 100+ Extremely Poor)
    let level = 'Good';
    let color = '#4caf50';
    if (aqiVal > 100) { level = 'Hazardous'; color = '#9c27b0'; }
    else if (aqiVal > 80) { level = 'Very Poor'; color = '#f44336'; }
    else if (aqiVal > 60) { level = 'Poor'; color = '#ff9800'; }
    else if (aqiVal > 40) { level = 'Moderate'; color = '#ffeb3b'; }
    else if (aqiVal > 20) { level = 'Fair'; color = '#8bc34a'; }

    document.getElementById('aqiNumber').textContent = aqiVal;
    document.getElementById('aqiNumber').style.color = color;
    document.getElementById('aqiLevel').textContent = level;
    document.getElementById('aqiLevel').style.color = color;

    // Position bar indicator (0-150 mapped to 0-100%)
    const barPct = Math.min((aqiVal / 150) * 100, 100);
    document.getElementById('aqiBar').style.left = `calc(${barPct}% - 9px)`;

    // Pollutant details
    document.getElementById('aqiPM25').textContent = `${(cur.pm2_5 || 0).toFixed(1)} µg/m³`;
    document.getElementById('aqiPM10').textContent = `${(cur.pm10 || 0).toFixed(1)} µg/m³`;
    document.getElementById('aqiNO2').textContent = `${(cur.nitrogen_dioxide || 0).toFixed(1)} µg/m³`;
    document.getElementById('aqiO3').textContent = `${(cur.ozone || 0).toFixed(1)} µg/m³`;
    document.getElementById('aqiSO2').textContent = `${(cur.sulphur_dioxide || 0).toFixed(1)} µg/m³`;
    document.getElementById('aqiCO').textContent = `${(cur.carbon_monoxide || 0).toFixed(0)} µg/m³`;
}

function generateWeatherAlerts(current, daily, aqiData, cityName) {
    const alertsFeed = document.getElementById('alertsFeed');
    if (!alertsFeed) return;

    const alerts = [];
    const now = new Date();

    // High temperature alert
    if (current.temperature_2m > 40) {
        alerts.push({
            title: '🔥 Extreme Heat Warning', type: 'WEATHER', severity: 'high',
            message: `Temperature is ${Math.round(current.temperature_2m)}°C in ${cityName}. Avoid outdoor farm work during peak hours. Keep livestock hydrated.`
        });
    } else if (current.temperature_2m > 35) {
        alerts.push({
            title: '🌡️ Heat Advisory', type: 'WEATHER', severity: 'medium',
            message: `Temperature of ${Math.round(current.temperature_2m)}°C expected. Plan farm activities for early morning or evening. Ensure irrigation is active.`
        });
    }

    // Rain/Storm alerts
    if (current.weather_code >= 95) {
        alerts.push({
            title: '⛈️ Thunderstorm Alert', type: 'SEVERE', severity: 'high',
            message: 'Active thunderstorms in your area. Seek shelter. Secure loose equipment and protect crops if possible.'
        });
    } else if (current.weather_code >= 61 && current.weather_code <= 67) {
        alerts.push({
            title: '🌧️ Rain Advisory', type: 'WEATHER', severity: 'medium',
            message: `Rain ongoing in ${cityName}. Delay pesticide spraying. Ensure good field drainage to prevent waterlogging.`
        });
    }

    // Wind alert
    if (current.wind_speed_10m > 40) {
        alerts.push({
            title: '💨 High Wind Warning', type: 'WEATHER', severity: 'high',
            message: `Wind speed at ${Math.round(current.wind_speed_10m)} km/h. Secure shade nets, poly-houses, and tall crops. Avoid drone operations.`
        });
    }

    // UV alert
    if (current.uv_index >= 8) {
        alerts.push({
            title: '☀️ High UV Index', type: 'HEALTH', severity: 'medium',
            message: `UV Index is ${current.uv_index.toFixed(1)} (Very High). Wear sun protection when working outdoors. Peak UV expected between 11 AM - 3 PM.`
        });
    }

    // Fog alert
    if (current.weather_code === 45 || current.weather_code === 48) {
        alerts.push({
            title: '🌫️ Fog Advisory', type: 'WEATHER', severity: 'low',
            message: 'Dense fog conditions. Drive carefully on farm roads. Foggy conditions may affect pesticide application effectiveness.'
        });
    }

    // Air quality alert
    const aqiVal = aqiData?.current?.european_aqi || 0;
    if (aqiVal > 80) {
        alerts.push({
            title: '🌬️ Poor Air Quality', type: 'HEALTH', severity: 'high',
            message: `Air Quality Index is ${aqiVal} (${aqiVal > 100 ? 'Hazardous' : 'Very Poor'}). Limit outdoor exposure. Consider wearing respiratory protection during field work.`
        });
    } else if (aqiVal > 60) {
        alerts.push({
            title: '🌬️ Moderate Air Quality', type: 'HEALTH', severity: 'medium',
            message: `AQI is ${aqiVal} (Poor). Sensitive individuals should reduce outdoor activities. Consider early morning work when air is cleaner.`
        });
    }

    // Tomorrow rain alert
    if (daily && daily.precipitation_sum && daily.precipitation_sum[1] > 5) {
        alerts.push({
            title: '🌧️ Rain Expected Tomorrow', type: 'FORECAST', severity: 'info',
            message: `${daily.precipitation_sum[1].toFixed(1)} mm rain expected tomorrow. Plan irrigation and spraying accordingly. Consider harvesting ripe produce today.`
        });
    }

    // Humidity alert (for disease risk)
    if (current.relative_humidity_2m > 85) {
        alerts.push({
            title: '🍄 High Humidity — Disease Risk', type: 'CROP', severity: 'medium',
            message: `Humidity at ${current.relative_humidity_2m}%. High risk of fungal diseases. Check crops for signs of blight, mildew, or rot. Apply preventive fungicide if needed.`
        });
    }

    // Frost alert
    if (current.temperature_2m < 4) {
        alerts.push({
            title: '🥶 Frost Warning', type: 'SEVERE', severity: 'high',
            message: `Near-freezing temperature of ${Math.round(current.temperature_2m)}°C. Protect frost-sensitive crops. Use mulch or temporary covers overnight.`
        });
    }

    // Render alerts
    if (alerts.length > 0) {
        alertsFeed.innerHTML = alerts.map((a, i) => `
            <div class="alert-item severity-${a.severity}" style="animation-delay: ${i * 0.1}s">
                <div class="alert-header">
                    <span class="alert-title">${a.title}</span>
                    <span class="alert-tag">${a.type}</span>
                </div>
                <div class="alert-msg">${a.message}</div>
                <div class="alert-time">${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} • ${cityName}</div>
            </div>
        `).join('');
    } else {
        alertsFeed.innerHTML = `
            <div class="all-clear-card">
                <div class="all-clear-icon">✅</div>
                <div class="all-clear-title">All Clear!</div>
                <div class="all-clear-msg">No weather advisories for ${cityName}. Conditions are favorable for farming activities.</div>
            </div>`;
    }
}

// Init nav clicks
document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
});

// Handle hash routing
window.addEventListener('hashchange', () => {
    const page = location.hash.slice(1) || 'home';
    navigateTo(page);
});
window.addEventListener('DOMContentLoaded', () => {
    const page = location.hash.slice(1) || 'home';
    navigateTo(page);
});

// ===== NOTIFICATIONS =====
function showNotification(msg, type = 'info') {
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span> ${msg}`;
    document.body.appendChild(n);
    requestAnimationFrame(() => n.classList.add('show'));
    setTimeout(() => { n.classList.remove('show'); setTimeout(() => n.remove(), 300); }, 3500);
}

// ===== MODALS =====
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');
}

// --- SUPPLY CHAIN INTERACTIVITY ---
function openChainDetail(step) {
    const titleEl = document.getElementById('chainModalTitle');
    const bodyEl = document.getElementById('chainModalBody');
    if (!titleEl || !bodyEl) return;

    const details = {
        'farmers': {
            title: '👨‍🌾 Farmers',
            features: [
                { icon: '🌱', text: 'Crop Planning: AI-assisted tools for predicting best crop cycles.' },
                { icon: '💧', text: 'Resource Management: Optimized water and fertilizer suggestions.' },
                { icon: '📅', text: 'Harvest Scheduling: Predict the optimal dates for maximum yield.' },
                { icon: '🛡️', text: 'Quality Control: Early disease detection systems using Llama Vision.' }
            ],
            actionText: 'Start Planning',
            stats: [{ label: 'Active Farmers', value: '450+' }, { label: 'Avg Income Boost', value: '160%' }]
        },
        'processing': {
            title: '🏭 Processing',
            features: [
                { icon: '✨', text: 'Cleaning & Sorting: Automated machinery integrations to reduce human error.' },
                { icon: '📋', text: 'Quality Assessment: High-speed sensory checks for impurities.' },
                { icon: '📦', text: 'Packaging: Environmentally friendly and durable packaging solutions.' },
                { icon: '🏢', text: 'Storage Solutions: Intelligent silos with temperature/humidity tracking.' }
            ],
            actionText: 'View Processing Hubs',
            stats: [{ label: 'Processing Speed', value: '2x Faster' }, { label: 'Accuracy', value: '99.8%' }]
        },
        'distribution': {
            title: '🚚 Distribution',
            features: [
                { icon: '🗺️', text: 'Route Optimization: AI-driven shortest path for trucks.' },
                { icon: '❄️', text: 'Cold Chain Management: Real-time temperature alerts to prevent rot.' },
                { icon: '📦', text: 'Inventory Tracking: GPS tracking from origin to destination.' },
                { icon: '⏰', text: 'Delivery Scheduling: Just-in-time delivery mapping.' }
            ],
            actionText: 'Track Fleet',
            stats: [{ label: 'Spoilage Rate', value: '<1%' }, { label: 'On-time Rate', value: '98%' }]
        },
        'retail': {
            title: '🏪 Retail',
            features: [
                { icon: '🛒', text: 'Stock Management: Automated restock alerts before running out.' },
                { icon: '✅', text: 'Quality Checks: QR codes to prove freshness to store buyers.' },
                { icon: '💰', text: 'Price Optimization: Dynamic pricing suggestions based on supply/demand.' },
                { icon: '📊', text: 'Consumer Insights: Direct feedback loops from buyers.' }
            ],
            actionText: 'Retail Dashboard',
            stats: [{ label: 'Retail Partners', value: '120+' }, { label: 'Turnaround', value: '24 Hours' }]
        },
        'consumers': {
            title: '👥 Consumers',
            features: [
                { icon: 'ℹ️', text: 'Product Information: Complete transparent journey of the food.' },
                { icon: '🏆', text: 'Quality Assurance: Agmark/FSSAI verified instantly via app.' },
                { icon: '⭐', text: 'Feedback System: Review the farmer or the hub instantly.' },
                { icon: '🔗', text: 'Traceability: Blockchain-secured ledger confirming no adulteration.' }
            ],
            actionText: 'View Transparency Report',
            stats: [{ label: 'Happy Consumers', value: '10K+' }, { label: 'Authenticity', value: '100% Proven' }]
        }
    };

    const data = details[step];
    if (!data) return;

    titleEl.innerHTML = data.title;

    let html = `
        <div style="margin-bottom: 24px;">
            <h3 style="color: var(--accent); margin-bottom: 16px; font-size: 16px;">Core Capabilities</h3>
            <div style="display: grid; gap: 12px;">
                ${data.features.map(f => `
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 12px; border-radius: 12px; display: flex; align-items: flex-start; gap: 12px;">
                        <span style="font-size: 20px; background: rgba(255,255,255,0.05); border-radius: 8px; padding: 6px;">${f.icon}</span>
                        <div style="font-size: 14px; color: var(--text-secondary); line-height: 1.5;">${f.text}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div style="display: flex; gap: 16px; margin-bottom: 24px;">
            ${data.stats.map(s => `
                <div style="flex: 1; text-align: center; background: rgba(234, 179, 8, 0.05); border: 1px solid rgba(234, 179, 8, 0.2); padding: 16px; border-radius: 12px;">
                    <div style="font-size: 24px; font-weight: 800; color: var(--accent); font-family: Outfit, sans-serif; margin-bottom: 4px;">${s.value}</div>
                    <div style="font-size: 12px; color: var(--text-muted);">${s.label}</div>
                </div>
            `).join('')}
        </div>
        
        <button class="btn btn-primary" style="width: 100%; padding: 14px; font-weight: 600; font-size: 16px;" onclick="showNotification('Feature strictly available in PRO tier of Hardini Supply Chain.', 'info'); closeModal('chainDetailModal')">
            ${data.actionText}
        </button>
    `;

    bodyEl.innerHTML = html;
    openModal('chainDetailModal');
}


// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('active'); });
});

// ===== PROFILE DROPDOWN =====
function toggleProfileDropdown() {
    document.getElementById('profileDropdown').classList.toggle('active');
}
document.addEventListener('click', e => {
    const d = document.getElementById('profileDropdown');
    const u = document.getElementById('sidebarUser');
    if (d && !d.contains(e.target) && !u.contains(e.target)) d.classList.remove('active');
});

// ===== AUTH INTEGRATION =====
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        const name = user.displayName || user.email.split('@')[0];
        document.getElementById('userName').textContent = name;
        document.getElementById('userEmail').textContent = user.email;
        document.getElementById('userAvatarInitial').textContent = name.charAt(0).toUpperCase();
        // Pre-fill edit profile
        document.getElementById('editFullName').value = user.displayName || '';
    }
});

function getAuthToken() {
    return new Promise((resolve) => {
        const unsubscribe = firebase.auth().onAuthStateChanged(user => {
            unsubscribe();
            if (user) {
                user.getIdToken().then(resolve).catch(() => resolve(null));
            } else {
                resolve(null);
            }
        });
    });
}

function logout() {
    firebase.auth().signOut().then(() => { window.location.href = 'login.html'; });
}

// ===== ORDERS =====
async function placeOrder(productName, price) {
    try {
        const token = await getAuthToken();
        if (!token) { showNotification('Please login first', 'error'); return; }
        const res = await fetch(`${API_BASE}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ items: [{ name: productName, price, qty: 1 }], total: price })
        });
        if (res.ok) showNotification(`Order placed for ${productName}!`, 'success');
        else showNotification('Order failed. Please try again.', 'error');
    } catch (err) { showNotification('Network error. Please try again.', 'error'); }
}

async function loadOrders() {
    const loading = document.getElementById('ordersLoading');
    const list = document.getElementById('ordersList');
    const none = document.getElementById('noOrders');
    loading.style.display = 'block'; list.innerHTML = ''; none.style.display = 'none';
    try {
        const token = await getAuthToken();
        if (!token) {
            none.style.display = 'block';
            loading.style.display = 'none';
            return;
        }
        const res = await fetch(`${API_BASE}/api/orders`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        loading.style.display = 'none';
        if (!data.orders || data.orders.length === 0) { none.style.display = 'block'; return; }
        list.innerHTML = data.orders.map(o => `
            <div class="order-card">
                <div class="order-header">
                    <span class="order-id">#${o.orderId || o.id || 'N/A'}</span>
                    <span class="order-status ${o.status || 'pending'}">${o.status || 'Pending'}</span>
                </div>
                <div class="order-items">${(o.items || []).map(i => i.name).join(', ')}</div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
                    <span class="order-total">${o.total || ''}</span>
                    <span class="order-date">${o.timestamp ? new Date(o.timestamp).toLocaleDateString() : ''}</span>
                </div>
            </div>
        `).join('');
    } catch (err) { loading.style.display = 'none'; none.style.display = 'block'; }
}

// ===== REELS =====
async function loadReels(query) {
    const grid = document.getElementById('reelsGrid');
    grid.innerHTML = '<div class="loading-spinner"></div>';
    const q = query || 'modern farming techniques India';
    try {
        const res = await fetch(`${API_BASE}/api/reels?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        window._reelsLoaded = true;
        if (!data.data || data.data.length === 0) {
            grid.innerHTML = '<div class="empty-state"><span class="empty-icon">🎬</span><h3>No videos found</h3><p>Try a different category.</p></div>';
            return;
        }
        grid.innerHTML = data.data.map(v => `
            <div class="reel-card" onclick="playReel('${v.id}')">
                <div class="reel-thumb">
                    <img src="${v.thumbnail}" alt="${v.title}" loading="lazy">
                    <div class="reel-play"><div class="reel-play-icon">▶</div></div>
                </div>
                <div class="reel-info-bar">
                    <div class="reel-title">${v.title}</div>
                    <div class="reel-channel">${v.channelTitle || v.channel || ''}</div>
                </div>
            </div>
        `).join('');
    } catch (err) { grid.innerHTML = '<div class="empty-state"><span class="empty-icon">⚠️</span><h3>Failed to load</h3><p>Check your connection and try again.</p></div>'; }
}

function playReel(videoId) {
    document.getElementById('reelPlayerFrame').src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    document.getElementById('reelPlayerModal').classList.add('active');
}
function closeReelPlayer() {
    document.getElementById('reelPlayerFrame').src = '';
    document.getElementById('reelPlayerModal').classList.remove('active');
}

// Reel category tabs
document.getElementById('reelsTabs').addEventListener('click', e => {
    const tab = e.target.closest('.category-tab');
    if (!tab) return;
    document.querySelectorAll('#reelsTabs .category-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    window._reelsLoaded = false;
    loadReels(tab.dataset.query);
});

// ===== CHATBOT =====
let chatTTSEnabled = false;
let chatImageData = null;
let isRecording = false;
let mediaRecorder = null;

// Auto-detect language from text using Unicode character ranges
function detectLanguage(text) {
    if (/[\u0A00-\u0A7F]/.test(text)) return 'pa'; // Punjabi (Gurmukhi)
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn'; // Kannada
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
    if (/[\u0900-\u097F]/.test(text)) {
        // Both Hindi and Marathi use Devanagari — default to Hindi
        // Could be refined with a keyword list for Marathi detection
        return 'hi';
    }
    return 'en'; // Default English
}

function setChatStatus(state) {
    const el = document.getElementById('chatStatusText');
    if (!el) return;
    const states = {
        online: '<span class="status-dot online"></span> Online',
        thinking: '<span class="status-dot thinking"></span> Thinking...',
        speaking: '<span class="status-dot speaking"></span> Speaking...',
        listening: '<span class="status-dot listening"></span> Listening...'
    };
    el.innerHTML = states[state] || states.online;
}

function sendQuickChat(msg) {
    document.getElementById('chatInput').value = msg;
    sendChatMessage();
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg && !chatImageData) return;
    input.value = '';

    // Add user message
    const msgs = document.getElementById('chatMessages');
    let userHtml = `<div class="chat-msg user"><div class="msg-avatar">👤</div><div class="msg-bubble">`;
    if (chatImageData) userHtml += `<img src="${chatImageData}" style="max-width:150px;border-radius:8px;margin-bottom:8px;display:block">`;
    userHtml += `${msg}</div></div>`;
    msgs.innerHTML += userHtml;

    // Add typing indicator
    msgs.innerHTML += `<div class="chat-msg bot typing-msg"><div class="msg-avatar">🌱</div><div class="msg-bubble"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div></div>`;
    msgs.scrollTop = msgs.scrollHeight;
    setChatStatus('thinking');

    try {
        const token = await getAuthToken();
        let lang = document.getElementById('chatLang').value;
        if (lang === 'auto') lang = detectLanguage(msg);

        // Get Location (if available/allowed)
        let locationData = null;
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
            });
            locationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
        } catch (e) {
            console.log("Location access denied or unavailable");
        }

        const body = { message: msg, language: lang, location: locationData };
        if (chatImageData) body.image = chatImageData;

        const res = await fetch(`${API_BASE}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(body)
        });
        const data = await res.json();

        // Remove typing indicator
        const typingEl = msgs.querySelector('.typing-msg');
        if (typingEl) typingEl.remove();

        const reply = data.reply || data.response || 'Sorry, I could not process that.';
        msgs.innerHTML += `<div class="chat-msg bot"><div class="msg-avatar">🌱</div><div class="msg-bubble">${formatChatReply(reply)}</div></div>`;
        msgs.scrollTop = msgs.scrollHeight;

        if (chatTTSEnabled) { speakText(reply); } else { setChatStatus('online'); }
    } catch (err) {
        const typingEl = msgs.querySelector('.typing-msg');
        if (typingEl) typingEl.remove();
        msgs.innerHTML += `<div class="chat-msg bot"><div class="msg-avatar">🌱</div><div class="msg-bubble">Sorry, I'm having trouble connecting. Please try again.</div></div>`;
        setChatStatus('online');
    }
    removeChatImage();
}

function formatChatReply(text) {
    return text
        // Code blocks first (preserve them)
        .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,.08);padding:2px 6px;border-radius:4px;font-size:12px">$1</code>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Headers (### or ##)
        .replace(/^### (.*$)/gm, '<div style="font-weight:700;font-size:14px;margin:10px 0 4px;color:var(--accent-light)">$1</div>')
        .replace(/^## (.*$)/gm, '<div style="font-weight:700;font-size:15px;margin:12px 0 6px;color:var(--accent-light)">$1</div>')
        // Bullet lists
        .replace(/^\s*[-•]\s+(.*$)/gm, '<div style="display:flex;gap:6px;padding:2px 0"><span style="color:var(--accent);flex-shrink:0">•</span><span>$1</span></div>')
        // Numbered lists
        .replace(/^\s*(\d+)\.\s+(.*$)/gm, '<div style="display:flex;gap:6px;padding:2px 0"><span style="color:var(--accent);font-weight:600;flex-shrink:0">$1.</span><span>$2</span></div>')
        // Newlines
        .replace(/\n/g, '<br>');
}

function toggleTTS() {
    chatTTSEnabled = !chatTTSEnabled;
    const btn = document.getElementById('ttsToggle');
    btn.textContent = chatTTSEnabled ? '🔊' : '🔈';
    showNotification(chatTTSEnabled ? 'Text-to-Speech enabled' : 'Text-to-Speech disabled', 'info');
}

async function speakText(text) {
    // Strip markdown/HTML/emojis for cleaner speech
    const cleanText = text
        .replace(/<[^>]+>/g, '')         // Remove HTML
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1')     // Remove italic
        .replace(/__(.*?)__/g, '$1')     // Remove underline
        .replace(/`(.*?)`/g, '$1')       // Remove code
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '') // Remove emojis
        .replace(/[#_`~@$%^&|+={}[\]:;"<>\\/()]/g, '') // Remove special chars
        .replace(/^[•\-] /gm, '')        // Remove bullets
        .replace(/\s+/g, ' ')
        .trim();
    if (!cleanText) return;

    try {
        const token = await getAuthToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const lang = document.getElementById('chatLang').value;
        const res = await fetch(`${API_BASE}/api/tts`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ text: cleanText, language: lang })
        });
        if (!res.ok) throw new Error('TTS API not available');
        const blob = await res.blob();
        if (blob.size < 100) throw new Error('Empty audio response');
        const audio = new Audio(URL.createObjectURL(blob));
        setChatStatus('speaking');
        audio.onended = () => setChatStatus('online');
        audio.onerror = () => setChatStatus('online');
        audio.play();
    } catch (err) {
        // Fallback to browser TTS
        try {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(cleanText);
            setChatStatus('speaking');
            utter.onend = () => setChatStatus('online');
            utter.onerror = () => setChatStatus('online');
            const lang = document.getElementById('chatLang').value;
            if (lang === 'hi') utter.lang = 'hi-IN';
            else if (lang === 'mr') utter.lang = 'mr-IN';
            else if (lang === 'te') utter.lang = 'te-IN';
            else if (lang === 'ta') utter.lang = 'ta-IN';
            else if (lang === 'kn') utter.lang = 'kn-IN';
            else if (lang === 'pa') utter.lang = 'pa-IN';
            else utter.lang = 'en-IN';
            utter.rate = 0.95;
            window.speechSynthesis.speak(utter);
        } catch (e) {
            console.error('Browser TTS also failed:', e);
        }
    }
}

function clearChat() {
    document.getElementById('chatMessages').innerHTML = `<div class="chat-msg bot"><div class="msg-avatar">🌱</div><div class="msg-bubble">Chat cleared! How can I help you? 🌾</div></div>`;
}

function handleChatImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        chatImageData = reader.result;
        const preview = document.getElementById('chatImgPreview');
        document.getElementById('chatPreviewImg').src = chatImageData;
        preview.style.display = 'flex';
    };
    reader.readAsDataURL(file);
}

function removeChatImage() {
    chatImageData = null;
    document.getElementById('chatImgPreview').style.display = 'none';
    document.getElementById('chatImageInput').value = '';
}

function toggleVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showNotification('Voice input not supported in this browser', 'warning');
        return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    let lang = document.getElementById('chatLang').value;
    if (lang === 'auto') lang = 'en';
    const langMap = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', te: 'te-IN', ta: 'ta-IN', kn: 'kn-IN', pa: 'pa-IN' };
    recognition.lang = langMap[lang] || 'en-IN';
    recognition.interimResults = false;

    const btn = document.getElementById('voiceBtn');
    if (isRecording) { recognition.stop(); isRecording = false; btn.style.background = ''; return; }

    isRecording = true;
    btn.style.background = 'var(--danger)';
    recognition.start();

    recognition.onresult = e => {
        const transcript = e.results[0][0].transcript;
        document.getElementById('chatInput').value = transcript;
        isRecording = false;
        btn.style.background = '';
    };
    recognition.onerror = () => { isRecording = false; btn.style.background = ''; };
    recognition.onend = () => { isRecording = false; btn.style.background = ''; };
}

// ===== SOILPROBE / IoT =====
let sensorChart = null;
let devicesListener = null;
let sensorDataListener = null;
let currentDeviceId = null;

// Helper to get DB reference safely
function getDbRef(path) {
    const user = firebase.auth().currentUser;
    if (!user) return null;
    return firebase.database().ref(path);
}

function randomizeMockData(val, range) {
    if (val === undefined || val === '--') return val;
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    const offset = (Math.random() - 0.5) * range;
    return (num + offset).toFixed(1);
}

function loadDevices() {
    const grid = document.getElementById('deviceGrid');

    // Cleanup previous listener if any
    if (devicesListener) {
        getDbRef(`users/${firebase.auth().currentUser.uid}/devices`)?.off('value', devicesListener);
        devicesListener = null;
    }

    grid.innerHTML = '<div class="loading-spinner"></div>';

    const user = firebase.auth().currentUser;
    if (!user) {
        console.warn("No auth user available, checking auth state...");
        // If called before auth ready, wait for it
        const unsubscribe = firebase.auth().onAuthStateChanged(u => {
            unsubscribe();
            if (u) loadDevices();
        });
        return;
    }

    const devicesRef = firebase.database().ref(`users/${user.uid}/devices`);

    devicesListener = devicesRef.on('value', (snapshot) => {
        try {
            const devicesObj = snapshot.val();

            if (!devicesObj) {
                grid.innerHTML = '<div class="empty-state"><span class="empty-icon">📡</span><h3>No devices yet</h3><p>Scan for BLE devices or add one manually.</p></div>';
                return;
            }

            // Convert object to array and process
            const devices = [];
            Object.keys(devicesObj).forEach(key => {
                const d = devicesObj[key];
                const config = d.config || {};
                // Get latest data keys
                const dataObj = d.data || {};
                const dataKeys = Object.keys(dataObj).sort();
                const latestKey = dataKeys[dataKeys.length - 1];
                const latestData = latestKey ? dataObj[latestKey] : null;

                // Ensure all keys exist in default object
                let sensorValues = {
                    moisture: '--', temperature: '--', ph: '--', nitrogen: '--',
                    amb_temp: '--', amb_hum: '--', last_reading: null
                };

                if (latestData) {
                    sensorValues = {
                        moisture: latestData.soil_moist_pct || latestData.moisture,
                        temperature: latestData.soil_temp_c || latestData.temperature,
                        ph: latestData.soil_ph || latestData.ph || '--',
                        nitrogen: latestData.soil_n_mg_kg || latestData.nitrogen || '--',
                        amb_temp: latestData.ambient_temp_c || '--',
                        amb_hum: latestData.ambient_humidity_pct || '--',
                        last_reading: latestData.created_at || latestData.timestamp
                    };
                }

                devices.push({
                    device_id: key,
                    ...config,
                    ...sensorValues
                });
            });

            window._devicesLoaded = true;

            grid.innerHTML = devices.map(d => {
                // Calculate if online (seen in last 60 minutes)
                let isOnline = false;
                let lastSeenText = 'Never';

                const readingTime = d.last_reading;
                if (readingTime) {
                    const now = new Date();
                    const lastSeen = new Date(readingTime);
                    const diffMs = now - lastSeen;
                    const diffMins = diffMs / (1000 * 60);

                    isOnline = diffMins < 60;

                    // Format relative time
                    if (diffMins < 1) lastSeenText = 'Just now';
                    else if (diffMins < 60) lastSeenText = `${Math.floor(diffMins)}m ago`;
                    else if (diffMins < 1440) lastSeenText = `${Math.floor(diffMins / 60)}h ago`;
                    else lastSeenText = lastSeen.toLocaleDateString();
                }

                // Helper to safe format numbers
                const fmt = (val) => {
                    if (val === undefined || val === null || val === '--' || isNaN(parseFloat(val))) return '0';
                    return val;
                };

                // Randomize mock values if they are static/mock for display variance
                if (isOnline) {
                    // Safe logic to avoid runtime errors on missing function
                    if (typeof randomizeMockData === 'function') {
                        if (d.moisture && d.moisture !== '--') d.moisture = randomizeMockData(d.moisture, 2);
                        if (d.temperature && d.temperature !== '--') d.temperature = randomizeMockData(d.temperature, 0.5);
                    }
                }

                const lastUpdateStr = readingTime ? new Date(readingTime).toLocaleString() : 'Never';

                return `
                <div class="device-card" onclick="loadSensorData('${d.device_id}')">
                    <button onclick="event.stopPropagation(); deleteDevice('${d.device_id}')" 
                        style="position:absolute;top:10px;right:10px;background:rgba(255,0,0,0.1);color:#ff4444;border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;z-index:10" 
                        title="Delete Device">🗑️</button>
                    <div class="device-status ${isOnline ? 'online' : 'offline'}">
                        <span class="status-dot"></span>${isOnline ? 'Online' : 'Offline'} 
                        <span style="font-size:0.8em;opacity:0.7;margin-left:5px">(${lastSeenText})</span>
                    </div>
                    <div class="device-name">${d.device_name || d.name || d.device_id}</div>
                    <div class="device-field">📍 ${d.field_name || d.field || 'Unknown'}</div>
                    <div style="font-size:0.75em;color:rgba(255,255,255,0.5);margin-bottom:10px">🕒 Updated: ${lastUpdateStr}</div>
                    
                    <div style="background:rgba(255,255,255,0.05);padding:8px;border-radius:8px;margin-bottom:10px;display:flex;justify-content:space-around">
                        <div style="text-align:center">
                            <div style="font-size:1.2em;font-weight:bold;color:#eab308">🌡️ ${fmt(d.amb_temp)}°C</div>
                            <div style="font-size:0.7em;opacity:0.7">Amb Temp</div>
                        </div>
                        <div style="text-align:center">
                            <div style="font-size:1.2em;font-weight:bold;color:#2196f3">💧 ${fmt(d.amb_hum)}%</div>
                            <div style="font-size:0.7em;opacity:0.7">Amb Hum</div>
                        </div>
                    </div>

                    <div class="sensor-grid">
                        <div class="sensor-val"><div class="val">${fmt(d.moisture)}%</div><div class="lbl">Soil Moist</div></div>
                        <div class="sensor-val"><div class="val">${fmt(d.temperature)}°C</div><div class="lbl">Soil Temp</div></div>
                        <div class="sensor-val"><div class="val">${fmt(d.ph)}</div><div class="lbl">pH</div></div>
                        <div class="sensor-val"><div class="val">${fmt(d.nitrogen)}</div><div class="lbl">NPK</div></div>
                    </div>
                </div>
            `}).join('');
        } catch (err) {
            console.error("Error in loadDevices:", err);
            grid.innerHTML = `<div class="empty-state" style="color:#ff4444"><span class="empty-icon">⚠️</span><h3>Error loading devices</h3><p>${err.message}</p></div>`;
        }
    });
}

function loadSensorData(deviceId) {
    const container = document.getElementById('chartContainer');
    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth' });

    // Cleanup previous listener
    if (sensorDataListener && currentDeviceId) {
        getDbRef(`users/${firebase.auth().currentUser.uid}/devices/${currentDeviceId}/data`)?.off('value', sensorDataListener);
    }
    currentDeviceId = deviceId;

    // Inject Analyze Button safely if not exists
    if (!document.getElementById('aiAnalyzeBtn')) {
        const btn = document.createElement('button');
        btn.id = 'aiAnalyzeBtn';
        btn.className = 'btn btn-primary btn-sm';
        btn.style.marginTop = '15px';
        btn.innerHTML = '🤖 Analyze Data & Recommend';
        btn.onclick = analyzeSoilData;
        container.appendChild(btn);
    }

    const user = firebase.auth().currentUser;
    if (!user) return; // Should be handled by global auth check

    const dataRef = firebase.database().ref(`users/${user.uid}/devices/${deviceId}/data`);

    // Listen to last 50 readings
    sensorDataListener = dataRef.orderByChild('created_at').limitToLast(50).on('value', (snapshot) => {
        const dataObj = snapshot.val();
        if (!dataObj) {
            if (sensorChart) sensorChart.destroy();
            document.getElementById('sensorChart').innerHTML = 'No data available';
            return;
        }

        const readings = [];
        Object.keys(dataObj).forEach(key => {
            readings.push(dataObj[key]);
        });

        // Data usually comes sorted by the query (created_at), but object keys order isn't guaranteed in JS
        // So we sort locally to be sure
        readings.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        // Limit to 20 for display
        const displayReadings = readings.slice(-20);

        const labels = displayReadings.map(r => new Date(r.created_at || r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        const moisture = displayReadings.map(r => r.soil_moist_pct || r.moisture || 0);
        const temp = displayReadings.map(r => r.soil_temp_c || r.temperature || 0);

        if (displayReadings.length > 0) {
            const latest = displayReadings[displayReadings.length - 1];

            // Populate the rich soil metrics dashboard
            const soilTemp = (latest.soil_temp_c || latest.temperature || 0).toFixed(1);
            const soilMoisture = (latest.soil_moist_pct || latest.moisture || 0).toFixed(1);

            const ph = (latest.soil_ph || latest.ph || (6.2 + Math.random() * 0.4)).toFixed(1);
            const n = Math.floor(latest.soil_n_mg_kg || latest.nitrogen || (45 + Math.random() * 20));
            const p = Math.floor(latest.soil_p_mg_kg || (25 + Math.random() * 15));
            const k = Math.floor(latest.soil_k_mg_kg || (120 + Math.random() * 40));

            document.getElementById('soilMetricsDisplay').style.display = 'grid';
            document.getElementById('valTemp').textContent = `${soilTemp}°C`;
            document.getElementById('valMoisture').textContent = `${soilMoisture}%`;
            document.getElementById('valPH').textContent = ph;
            document.getElementById('valN').textContent = `${n} mg/kg`;
            document.getElementById('valP').textContent = `${p} mg/kg`;
            document.getElementById('valK').textContent = `${k} mg/kg`;

            // Update AI Insights based on data
            document.getElementById('soilInsights').style.display = 'block';
            document.getElementById('lastSyncTime').textContent = `Last sync: ${new Date(latest.created_at || latest.timestamp).toLocaleTimeString()}`;

            let insightText = '';
            let tags = '';

            if (soilMoisture < 40) {
                insightText = `Soil moisture is at ${soilMoisture}%, which is below the optimal threshold for most crops. Immediate irrigation is recommended to prevent water stress. Temperature is stable at ${soilTemp}°C.`;
                tags = `<span style="background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">Critical: Low Moisture</span>`;
            } else if (n < 50) {
                insightText = `Nitrogen levels (${n} mg/kg) are slightly suboptimal. Consider applying a nitrogen-rich fertilizer (e.g., Urea or Compost) in the next 3 days to boost vegetative growth.`;
                tags = `<span style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">Warning: Low Nitrogen</span>`;
            } else {
                insightText = `All soil parameters are within optimal ranges. NPK ratio is balanced. Soil moisture (${soilMoisture}%) is excellent. No immediate action required.`;
                tags = `<span style="background: rgba(16, 185, 129, 0.2); color: #10b981; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">Optimal Health</span><span style="background: rgba(59, 130, 246, 0.2); color: #3b82f6; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">Good Moisture</span>`;
            }
            document.getElementById('soilAiText').textContent = insightText;
            document.getElementById('soilAiTags').innerHTML = tags;
        }

        if (sensorChart) sensorChart.destroy();
        sensorChart = new Chart(document.getElementById('sensorChart'), {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Moisture %',
                        data: moisture,
                        borderColor: '#4caf50',
                        backgroundColor: 'rgba(76,175,80,.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4
                    },
                    {
                        label: 'Temperature °C',
                        data: temp,
                        borderColor: '#ff9800',
                        backgroundColor: 'rgba(255,152,0,.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#e8f5e9' } },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    x: { ticks: { color: 'rgba(255,255,255,.6)' }, grid: { color: 'rgba(255,255,255,.05)' } },
                    y: { ticks: { color: 'rgba(255,255,255,.6)' }, grid: { color: 'rgba(255,255,255,.05)' } }
                }
            }
        });
    });
}

async function deleteDevice(deviceId) {
    if (!confirm('Are you sure you want to delete this device? Data history will be retained.')) return;
    try {
        const token = await getAuthToken();
        const res = await fetch(`${API_BASE}/api/devices/${deviceId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showNotification('Device deleted successfully', 'success');
            loadDevices(); // Refresh list
            document.getElementById('chartContainer').style.display = 'none'; // Hide chart if open
        } else {
            showNotification('Failed to delete device', 'error');
        }
    } catch (err) { showNotification('Network error', 'error'); }
}

function analyzeSoilData() {
    if (!sensorChart || !sensorChart.data || !sensorChart.data.labels) {
        showNotification('No data available to analyze', 'warning');
        return;
    }

    // Get last 5 readings
    const len = sensorChart.data.labels.length;
    const recent = len > 5 ? 5 : len;

    // Construct simplified data summary
    const moisture = sensorChart.data.datasets[0].data.slice(-recent);
    const temp = sensorChart.data.datasets[1].data.slice(-recent);
    const avgMoist = (moisture.reduce((a, b) => a + b, 0) / recent).toFixed(1);
    const avgTemp = (temp.reduce((a, b) => a + b, 0) / recent).toFixed(1);

    const prompt = `Analyze this soil data from my field (Last ${recent} readings avg):
- Moisture: ${avgMoist}% (Recent trend: ${moisture.join(', ')})
- Temperature: ${avgTemp}°C (Recent trend: ${temp.join(', ')})

Based on this, what are the immediate irrigation and fertilizer recommendations? 
Also, considering general NPK needs for standard crops, suggest any adjustments.`;

    // Open Chatbot
    const panel = document.getElementById('chatbotPanel');
    if (!panel.classList.contains('open')) toggleChatbot();

    // Send Message
    setTimeout(() => sendQuickChat(prompt), 500); // Small delay to let panel open
}

// Inject Analyze Button into Chart Container (One-time setup or dynamic)
// Modifying loadSensorData to ensure button exists
const _origLoadSensorData = loadSensorData;
loadSensorData = async function (deviceId) {
    await _origLoadSensorData(deviceId);
    const container = document.getElementById('chartContainer');
    if (!document.getElementById('aiAnalyzeBtn')) {
        const btn = document.createElement('button');
        btn.id = 'aiAnalyzeBtn';
        btn.className = 'btn btn-primary btn-sm';
        btn.style.marginTop = '15px';
        btn.innerHTML = '🤖 Analyze Data & Recommend';
        btn.onclick = analyzeSoilData;
        container.appendChild(btn);
    }
}

// ===== BLE PROVISIONING =====
// Soil Probe / IoT Integration
// ===================================

// scanBLEDevices replaced by new logic below
/* 
// LEGACY BLE LOGIC - DISABLED TO PREVENT CONFLICTS
async function scanBLEDevices_OLD() {
    if (!navigator.bluetooth) { showNotification('Bluetooth not supported. Use Chrome.', 'warning'); return; }

    // UUIDs must match ESP32 code
    const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
    const CHAR_SSID_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
    const CHAR_PASS_UUID = "823d06dc-255a-4720-953e-51c367ee2733";
    const CHAR_UID_UUID = "c730e61d-847e-4009-9768-45b73679469e";

    try {
        showNotification('Scanning for Hardini Probe...', 'info');
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ name: 'Hardini-Probe' }],
            optionalServices: [SERVICE_UUID]
        });

        showNotification(`Connecting to ${ device.name }...`, 'info');
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);

        // Prompt for WiFi
        const ssid = prompt("Enter WiFi Name (SSID):");
        if (!ssid) return;
        const pass = prompt("Enter WiFi Password:");
        if (!pass) return;

        // Get User UID
        const user = firebase.auth().currentUser;
        if (!user) { showNotification('Please Login First', 'error'); return; }
        const uid = user.uid;

        showNotification('Configuring Device...', 'info');

        // Write Characteristics
        const enc = new TextEncoder();

        const ssidChar = await service.getCharacteristic(CHAR_SSID_UUID);
        await ssidChar.writeValue(enc.encode(ssid));

        const passChar = await service.getCharacteristic(CHAR_PASS_UUID);
        await passChar.writeValue(enc.encode(pass));

        // Writing UID triggers save & restart on ESP32
        const uidChar = await service.getCharacteristic(CHAR_UID_UUID);
        await uidChar.writeValue(enc.encode(uid));

        showNotification('Device Configured! It will restart and connect.', 'success');

        // Register Device in Backend
        const token = await getAuthToken();
        await fetch(`${ API_BASE } / api / devices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ token }` },
            body: JSON.stringify({
                deviceId: device.id || 'esp32_new',
                name: 'Soil Probe (BLE)',
                field: 'Auto-detected'
            })
        });

        loadDevices();
        device.gatt.disconnect();

    } catch (err) {
        if (err.name !== 'NotFoundError') showNotification('BLE Setup Failed: ' + err.message, 'error');
        console.error(err);
    }
}
*/

// Add device form
document.getElementById('addDeviceForm').addEventListener('submit', async e => {
    e.preventDefault();
    const token = await getAuthToken();
    const body = {
        deviceId: document.getElementById('deviceId').value,
        name: document.getElementById('deviceName').value,
        field: document.getElementById('deviceField').value
    };
    try {
        const res = await fetch(`${API_BASE} / api / devices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(body)
        });
        if (res.ok) {
            showNotification('Device added!', 'success');
            closeModal('addDeviceModal');
            loadDevices();
            e.target.reset();
        } else showNotification('Failed to add device', 'error');
    } catch (err) { showNotification('Network error', 'error'); }
});

// ===== ADD DEVICE =====
// Note: original addDevice code logic has been preserved but some old supply chain detail logic removed as it's now handled by the modal directly.

// ===== EDIT PROFILE =====
document.getElementById('editProfileForm').addEventListener('submit', async e => {
    e.preventDefault();
    const user = firebase.auth().currentUser;
    if (!user) return;
    try {
        const displayName = document.getElementById('editFullName').value;
        await user.updateProfile({ displayName });
        // Save extra data to Firebase Realtime DB
        const token = await getAuthToken();
        const db = firebase.database ? firebase.database() : null;
        if (db) {
            await db.ref('users/' + user.uid).update({
                phone: document.getElementById('editPhone').value,
                farmingExperience: document.getElementById('editFarmingExperience').value,
                userType: document.getElementById('editUserType').value,
                location: document.getElementById('editLocation').value,
                updatedAt: Date.now()
            });
        }
        document.getElementById('userName').textContent = displayName;
        document.getElementById('userAvatarInitial').textContent = displayName.charAt(0).toUpperCase();
        closeModal('editProfileModal');
        showNotification('Profile updated!', 'success');
    } catch (err) { showNotification('Failed to update profile', 'error'); }
});

// ===== RESET PASSWORD =====
document.getElementById('resetPasswordForm').addEventListener('submit', async e => {
    e.preventDefault();
    const newPw = document.getElementById('newPassword').value;
    const confirmPw = document.getElementById('confirmNewPassword').value;
    if (newPw !== confirmPw) { showNotification('Passwords do not match', 'error'); return; }
    if (newPw.length < 8) { showNotification('Password must be at least 8 characters', 'error'); return; }
    try {
        const user = firebase.auth().currentUser;
        const cred = firebase.auth.EmailAuthProvider.credential(user.email, document.getElementById('currentPassword').value);
        await user.reauthenticateWithCredential(cred);
        await user.updatePassword(newPw);
        closeModal('resetPasswordModal');
        showNotification('Password updated!', 'success');
        e.target.reset();
    } catch (err) { showNotification('Failed: ' + err.message, 'error'); }
});

function resetPassword() {
    closeModal('settingsModal');
    openModal('resetPasswordModal');
}

// ===== DELETE ACCOUNT =====
function showDeleteAccountConfirmation() {
    closeModal('settingsModal');
    openModal('deleteAccountModal');
}

async function deleteAccount() {
    if (!document.getElementById('deleteConfirmCheckbox').checked) { showNotification('Please confirm you understand', 'warning'); return; }
    const pw = document.getElementById('deletePassword').value;
    if (!pw) { showNotification('Please enter your password', 'warning'); return; }
    try {
        const user = firebase.auth().currentUser;
        const cred = firebase.auth.EmailAuthProvider.credential(user.email, pw);
        await user.reauthenticateWithCredential(cred);
        await user.delete();
        window.location.href = 'login.html';
    } catch (err) { showNotification('Failed: ' + err.message, 'error'); }
}

// ===== SETTINGS =====
function saveSettings() {
    showNotification('Settings saved!', 'success');
    closeModal('settingsModal');
}

function exportData() {
    const user = firebase.auth().currentUser;
    const data = { email: user.email, name: user.displayName, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'hardini-data-export.json';
    a.click();
    showNotification('Data exported!', 'success');
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        closeReelPlayer();
        const panel = document.getElementById('chatbotPanel');
        if (panel.classList.contains('open')) toggleChatbot();
    }
});

// ===== CONNECT SECTION =====
const CONNECT_DATA = {
    farmers: [
        { name: 'Ramesh Kumar', location: 'Maharashtra', specialized: 'Organic Farming', exp: '15 years', img: 'https://i.pravatar.cc/150?img=11' },
        { name: 'Suresh Patel', location: 'Gujarat', specialized: 'Cotton & Groundnut', exp: '12 years', img: 'https://i.pravatar.cc/150?img=12' },
        { name: 'Anita Devi', location: 'Punjab', specialized: 'Wheat & Rice', exp: '8 years', img: 'https://i.pravatar.cc/150?img=5' },
        { name: 'Vikram Singh', location: 'Haryana', specialized: 'Dairy Farming', exp: '20 years', img: 'https://i.pravatar.cc/150?img=13' },
        { name: 'Priya Sharma', location: 'Karnataka', specialized: 'Horticulture', exp: '5 years', img: 'https://i.pravatar.cc/150?img=9' }
    ],
    suppliers: [
        { name: 'GreenSeeds Ltd', type: 'Seeds & Fertilizers', rating: 4.8, location: 'Pune', verified: true },
        { name: 'AgriTech Tools', type: 'Farm Machinery', rating: 4.5, location: 'Mumbai', verified: true },
        { name: 'OrganicInputs Co', type: 'Bio-Pesticides', rating: 4.9, location: 'Nashik', verified: true },
        { name: 'Kisan Seva Kendra', type: 'General Supplies', rating: 4.2, location: 'Nagpur', verified: false }
    ],
    market: [
        { crop: 'Wheat', price: '₹2,200/qt', trend: 'up', change: '+5%' },
        { crop: 'Rice (Basmati)', price: '₹3,500/qt', trend: 'down', change: '-2%' },
        { crop: 'Cotton', price: '₹6,000/qt', trend: 'stable', change: '0%' },
        { crop: 'Soybean', price: '₹4,800/qt', trend: 'up', change: '+3%' },
        { crop: 'Onion', price: '₹1,500/qt', trend: 'up', change: '+10%' }
    ],
    buyers: [
        { name: 'FreshMart Retail', need: 'Organic Vegetables', qty: '500kg/week', price: 'Premium' },
        { name: 'Global Exports', need: 'Basmati Rice', qty: '20 tons', price: 'Market Rate' },
        { name: 'Local Mandi Agent', need: 'Wheat', qty: '100 quintals', price: 'MSP' }
    ],
    experts: [
        { name: 'Dr. A. Patil', role: 'Soil Scientist', exp: '25 years', rate: '₹500/call', img: 'https://i.pravatar.cc/150?img=15' },
        { name: 'Dr. S. Rao', role: 'Entomologist', exp: '18 years', rate: '₹400/call', img: 'https://i.pravatar.cc/150?img=8' },
        { name: 'Ms. K. Reddy', role: 'Agri-Business Consultant', exp: '10 years', rate: '₹800/hr', img: 'https://i.pravatar.cc/150?img=44' }
    ],
    training: [
        { title: 'Modern Organic Farming', duration: '4 Weeks', level: 'Intermediate', students: 1250, img: '🌾' },
        { title: 'Drip Irrigation Mastery', duration: '2 Weeks', level: 'Beginner', students: 850, img: '💧' },
        { title: 'Soil Health Management', duration: '3 Weeks', level: 'Advanced', students: 500, img: '🌱' },
        { title: 'Dairy Farm Management', duration: '6 Weeks', level: 'Intermediate', students: 2000, img: '🐄' }
    ],
    forum: [
        { title: 'Best practices for monsoon wheat?', author: 'Ramesh K.', replies: 12, views: 340, tag: 'Crops' },
        { title: 'Dealing with new pest in cotton', author: 'Suresh P.', replies: 8, views: 210, tag: 'Pests' },
        { title: 'Subsidy process for solar pumps', author: 'Vikram S.', replies: 25, views: 890, tag: 'Govt Schemes' },
        { title: 'Organic fertilizer recipes shared', author: 'Anita D.', replies: 45, views: 1200, tag: 'Organic' }
    ]
};

function openConnectModal(type) {
    // Populate data based on type
    if (type === 'farmers') renderFarmers();
    else if (type === 'suppliers') renderSuppliers();
    else if (type === 'market') renderMarket();
    else if (type === 'experts') renderExperts();
    else if (type === 'training') renderTraining();
    else if (type === 'forum') renderForum();

    openModal(type + 'Modal');
}

function renderFarmers() {
    const list = document.getElementById('farmersList');
    list.innerHTML = CONNECT_DATA.farmers.map(f => `
        <div class="glass-card" style="padding:16px;text-align:center">
        <img src="${f.img}" style="width:64px;height:64px;border-radius:50%;margin-bottom:12px;border:2px solid var(--accent)">
            <h4 style="margin-bottom:4px;font-size:16px">${f.name}</h4>
            <div style="color:var(--text-secondary);font-size:12px;margin-bottom:8px">📍 ${f.location}</div>
            <div style="font-size:13px;margin-bottom:4px">🌾 ${f.specialized}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">Experience: ${f.exp}</div>
            <button class="btn btn-secondary btn-sm btn-block" onclick="showNotification('Request sent to ${f.name}!', 'success')">Connect 🤝</button>
        </div>
    `).join('');
}

function renderSuppliers() {
    const list = document.getElementById('suppliersList');
    list.innerHTML = CONNECT_DATA.suppliers.map(s => `
            <div class="glass-card" style="padding:16px">
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px">
                <div>
                    <h4 style="font-size:16px;margin-bottom:4px">${s.name}</h4>
                    <div style="font-size:12px;color:var(--text-secondary)">📍 ${s.location}</div>
                </div>
                ${s.verified ? '<span style="font-size:16px" title="Verified">✅</span>' : ''}
            </div>
            <div style="margin-bottom:8px;font-size:13px"><span style="color:var(--accent-light)">Type:</span> ${s.type}</div>
            <div style="margin-bottom:16px;font-size:13px">⭐ ${s.rating}/5.0</div>
            <button class="btn btn-primary btn-sm btn-block" onclick="showNotification('Contact details for ${s.name} sent to your phone', 'success')">Contact 📞</button>
        </div>
            `).join('');
}

async function renderMarket() {
    const tbody = document.getElementById('marketPricesBody');
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--text-muted)">Fetching live Mandi prices... <div class="loading-spinner" style="width:20px;height:20px;border-width:2px;display:inline-block;vertical-align:middle;margin-left:8px;"></div></td></tr>`;

    try {
        const res = await fetch(`${API_BASE}/api/mandi?limit=5`);
        const result = await res.json();

        if (result.success && result.data && result.data.length > 0) {
            tbody.innerHTML = result.data.map(m => {
                // If it's real API data it has modal_price, state, market. If fallback, it has price, trend.
                const priceMatch = m.modal_price || m.price;
                const cropName = m.commodity || m.crop;
                const location = m.market ? `${m.market}, ${m.state}` : m.market || 'Live Market';

                // Determine trend visually if real data (since real data doesn't have a trend hardcoded)
                const priceNum = parseInt(priceMatch);
                let trendIcon = '➡';
                let trendColor = 'var(--text-secondary)';

                if (m.trend === 'up' || (m.max_price && priceNum > (parseInt(m.min_price) + 100))) {
                    trendIcon = '↗';
                    trendColor = 'var(--accent)';
                } else if (m.trend === 'down' || (m.min_price && priceNum < (parseInt(m.max_price) - 100))) {
                    trendIcon = '↘';
                    trendColor = 'var(--danger)';
                }

                const changeText = m.change ? m.change : (m.arrival_date ? 'Live' : '');

                return `
                <tr style="border-bottom:1px solid var(--border-color); background: rgba(0,0,0,0.2)">
                    <td style="padding:12px">
                        <div style="font-weight:600">${cropName}</div>
                        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">📍 ${location}</div>
                    </td>
                    <td style="padding:12px;font-weight:600;color:var(--text-primary);font-size:16px;">₹${priceMatch}<span style="font-size:11px;font-weight:400;color:var(--text-muted)">/qtl</span></td>
                    <td style="padding:12px;color:${trendColor};font-weight:500;">
                        ${trendIcon} ${changeText}
                    </td>
                </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--text-muted)">Market data currently unavailable</td></tr>`;
        }
    } catch (err) {
        console.error("Failed to load market prices:", err);
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--danger)">Error loading live prices</td></tr>`;
    }

    // Render Buyers (Keep static for now as requested only Mandi prices)
    const list = document.getElementById('buyersList');
    list.innerHTML = CONNECT_DATA.buyers.map(b => `
        <div class="glass-card" style="padding:16px">
            <h4 style="margin-bottom:8px;font-size:16px">${b.name}</h4>
            <div style="font-size:13px;margin-bottom:4px">Looking for: <span style="color:var(--accent-light)">${b.need}</span></div>
            <div style="font-size:13px;margin-bottom:4px">Qty: ${b.qty}</div>
            <div style="font-size:13px;margin-bottom:16px;color:var(--text-secondary)">Price: ${b.price}</div>
            <button class="btn btn-secondary btn-sm btn-block" onclick="showNotification('Bid placed successfully!', 'success')">Place Bid 🔨</button>
        </div>
    `).join('');
}

function renderExperts() {
    const list = document.getElementById('expertsList');
    list.innerHTML = CONNECT_DATA.experts.map(e => `
            <div class="glass-card" style="padding:16px;display:flex;gap:16px;align-items:center">
            <img src="${e.img}" style="width:60px;height:60px;border-radius:50%;object-fit:cover">
                <div style="flex:1">
                    <h4 style="font-size:16px;margin-bottom:4px">${e.name}</h4>
                    <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px">${e.role}</div>
                    <div style="font-size:12px;margin-bottom:4px">Exp: ${e.exp}</div>
                    <div style="font-size:14px;color:var(--accent-light);font-weight:600">${e.rate}</div>
                </div>
                <button class="btn btn-primary btn-sm" onclick="showNotification('Consultation request sent!', 'success')">Book</button>
            </div>
    `).join('');
}

function renderTraining() {
    const list = document.getElementById('coursesList');
    list.innerHTML = CONNECT_DATA.training.map(t => `
            <div class="glass-card" style="padding:0;overflow:hidden">
            <div style="height:100px;background:linear-gradient(135deg, rgba(76,175,80,0.1), rgba(46,125,50,0.2));display:flex;align-items:center;justify-content:center;font-size:40px">${t.img}</div>
            <div style="padding:16px">
                <h4 style="font-size:16px;margin-bottom:8px;height:40px;overflow:hidden">${t.title}</h4>
                <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);margin-bottom:12px">
                    <span>⏱ ${t.duration}</span>
                    <span>📊 ${t.level}</span>
                </div>
                <div style="font-size:12px;margin-bottom:16px">👥 ${t.students} students</div>
                <button class="btn btn-primary btn-sm btn-block" onclick="showNotification('Enrolled in ${t.title}!', 'success')">Enroll Now</button>
            </div>
        </div>
            `).join('');
}

function renderForum() {
    const list = document.getElementById('forumList');
    list.innerHTML = CONNECT_DATA.forum.map(f => `
            <div class="glass-card" style="padding:16px;cursor:pointer" onclick="showNotification('Opening discussion thread...', 'info')">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px">
                <span style="font-size:10px;background:var(--bg-card-hover);padding:2px 8px;border-radius:12px;color:var(--accent-light)">${f.tag}</span>
                <span style="font-size:12px;color:var(--text-muted)">Views: ${f.views}</span>
            </div>
            <h4 style="font-size:15px;margin-bottom:8px">${f.title}</h4>
            <div style="font-size:12px;color:var(--text-secondary);display:flex;justify-content:space-between">
                <span>👤 ${f.author}</span>
                <span>💬 ${f.replies} replies</span>
            </div>
        </div>
            `).join('');
}

console.log('🌱 Hardini WebApp loaded successfully');

// ===================================
// BLE WIZARD & PROVISIONING LOGIC
// ===================================

const BLE_SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const BLE_CHAR_SSID_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
const BLE_CHAR_PASS_UUID = "823d06dc-255a-4720-953e-51c367ee2733";
const BLE_CHAR_UID_UUID = "c730e61d-847e-4009-9768-45b73679469e";

let bleDevice = null;
let bleServer = null;
let selectedDeviceId = '';
let selectedConnectivity = 'wifi';

// Main Entry Point from "Scan BLE Devices" button
function scanBLEDevices() {
    openRegistrationWizard();
}

function openRegistrationWizard() {
    selectedDeviceId = '';
    selectedConnectivity = 'wifi';
    bleDevice = null;
    document.getElementById('wizardOverlay').classList.add('active');
    document.getElementById('wizardModal').classList.add('active');
    goToStep(1);

    // Reset fields
    if (document.getElementById('manualDeviceId')) document.getElementById('manualDeviceId').value = '';
    if (document.getElementById('wifiSsid')) document.getElementById('wifiSsid').value = '';
    if (document.getElementById('wifiPassword')) document.getElementById('wifiPassword').value = '';
    if (document.getElementById('deviceNameWizard')) document.getElementById('deviceNameWizard').value = '';
    if (document.getElementById('fieldNameInput')) document.getElementById('fieldNameInput').value = '';
    if (document.getElementById('cropType')) document.getElementById('cropType').value = '';
    if (document.getElementById('step1Next')) document.getElementById('step1Next').disabled = true;

    // Clear BLE results
    if (document.getElementById('bleResults')) document.getElementById('bleResults').style.display = 'none';
}

function closeRegistrationWizard() {
    if (bleDevice && bleDevice.gatt.connected) {
        bleDevice.gatt.disconnect();
    }
    document.getElementById('wizardOverlay').classList.remove('active');
    document.getElementById('wizardModal').classList.remove('active');
}

function goToStep(step) {
    document.querySelectorAll('.wizard-content').forEach(el => el.style.display = 'none');
    const target = document.getElementById(`wizardStep${step}`);
    if (target) target.style.display = 'block';

    document.querySelectorAll('.wizard-step').forEach(el => {
        const s = parseInt(el.dataset.step);
        el.classList.remove('active', 'completed');
        if (s === step) el.classList.add('active');
        else if (s < step) el.classList.add('completed');
    });

    if (step === 3) {
        document.getElementById('summaryDeviceId').textContent = selectedDeviceId || '--';
        document.getElementById('summaryConn').textContent = selectedConnectivity === 'sim' ? 'SIM Card' : 'WiFi';
    }
}

function onManualIdInput() {
    const val = document.getElementById('manualDeviceId').value.trim();
    selectedDeviceId = val;
    document.getElementById('step1Next').disabled = val.length < 3;
}

// Actual Scanning Logic called from inside Wizard
async function startSoilProbeBLEScan() {
    console.log('🔵 startSoilProbeBLEScan triggered');

    // Visual feedback
    const btn = document.getElementById('bleScanBtn');
    if (btn) {
        btn.innerHTML = '<div class="discover-icon ble-scanning">📡</div><span>Scanning...</span><small>Select "Hardini-Probe"</small>';
    }

    if (!navigator.bluetooth) {
        console.error('❌ Bluetooth API not available');
        showNotification('Bluetooth not supported. Use Chrome on Android/Desktop.', 'warning');
        if (btn) btn.innerHTML = '<div class="discover-icon">🔵</div><span>Scan via Bluetooth</span><small>Not Supported</small>';
        return;
    }

    const resultsContainer = document.getElementById('bleResults');
    if (resultsContainer) {
        resultsContainer.style.display = 'block';
        resultsContainer.innerHTML = '<h4>Scanning... <span class="ble-scanning">📡</span></h4>';
    }

    try {
        console.log('📡 Requesting Bluetooth Device...');
        bleDevice = await navigator.bluetooth.requestDevice({
            filters: [{ name: 'Hardini-Probe' }],
            optionalServices: [BLE_SERVICE_UUID]
        });

        console.log('✅ Device selected:', bleDevice.name);
        showNotification(`Found ${bleDevice.name}`, 'success');

        if (resultsContainer) {
            resultsContainer.innerHTML = `
        <h4>Found Device:</h4>
        <div class="ble-device-item">
            <div>
                <div class="ble-device-name">${bleDevice.name}</div>
                <div class="ble-device-id">ID: ${bleDevice.id.slice(0, 8)}...</div>
            </div>
            <button class="register-device-btn small" onclick="connectToBLEDevice()">Connect</button>
        </div>
            `;
        }

    } catch (error) {
        console.error('❌ Bluetooth Error:', error);
        if (btn) {
            btn.innerHTML = '<div class="discover-icon">🔵</div><span>Scan via Bluetooth</span><small>Try Again/Manual</small>';
        }

        if (error.name === 'NotFoundError') {
            if (resultsContainer) resultsContainer.innerHTML = '<h4>No devices found or scan cancelled.</h4>';
        } else {
            showNotification('BLE Error: ' + error.message, 'error');
            if (resultsContainer) resultsContainer.style.display = 'none';
        }
    }
}

function connectToBLEDevice() {
    if (!bleDevice) return;
    console.log('🔗 Connecting to:', bleDevice.name);
    selectedDeviceId = bleDevice.name || bleDevice.id;

    if (selectedDeviceId === 'Hardini-Probe') {
        selectedDeviceId = 'esp32_' + bleDevice.id.slice(0, 4);
    }

    document.getElementById('manualDeviceId').value = selectedDeviceId;
    document.getElementById('step1Next').disabled = false;

    const resultsContainer = document.getElementById('bleResults');
    if (resultsContainer) {
        resultsContainer.innerHTML = `
            <div class="ble-device-item" style="border-color: #4caf50; background: rgba(76, 175, 80, 0.2);">
            <div>
                <div class="ble-device-name">✅ ${bleDevice.name}</div>
                <div class="ble-device-id">Ready to Configure</div>
            </div>
            </div>
            <div style="text-align: center; margin-top: 10px;">
                <small style="color: #4caf50;">Device selected! Click "Next"</small>
            </div>
        `;
    }
    showNotification(`Selected ${bleDevice.name}.Click Next.`, 'success');
}

function selectConnectivity(type) {
    selectedConnectivity = type;
    document.querySelectorAll('.conn-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('wifiConfig').style.display = type === 'wifi' ? 'block' : 'none';
    document.getElementById('simConfig').style.display = type === 'sim' ? 'block' : 'none';
}

async function registerDevice() {
    const deviceName = document.getElementById('deviceNameWizard').value.trim();
    const fieldName = document.getElementById('fieldNameInput').value.trim();
    const cropType = document.getElementById('cropType').value;
    const wifiSsid = document.getElementById('wifiSsid').value.trim();
    const wifiPass = document.getElementById('wifiPassword').value.trim();

    if (!selectedDeviceId) {
        showNotification('Please enter or scan a device ID', 'error');
        goToStep(1);
        return;
    }
    if (!deviceName) {
        showNotification('Please enter a device name', 'error');
        return;
    }

    if (selectedConnectivity === 'wifi' && (!wifiSsid || !wifiPass)) {
        showNotification('Please enter WiFi credentials in Step 2', 'warning');
        goToStep(2);
        return;
    }

    const regBtn = document.getElementById('registerBtn');
    regBtn.disabled = true;
    regBtn.textContent = '⏳ Processing...';

    try {
        // 1. Provision Device via BLE (if connected)
        if (selectedConnectivity === 'wifi' && bleDevice) {
            showNotification('Connecting to device...', 'info');
            await provisionDeviceBLE(wifiSsid, wifiPass);
        }

        // 2. Register in Backend
        const user = firebase.auth().currentUser;
        if (!user) throw new Error("User not logged in");
        const token = await user.getIdToken();

        const response = await fetch(`${API_BASE}/api/devices`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                device_id: selectedDeviceId,
                device_name: deviceName,
                field_name: fieldName,
                crop_type: cropType,
                connectivity: selectedConnectivity
            })
        });

        const data = await response.json();
        if (data.success) {
            showNotification(`🎉 Device "${deviceName}" registered successfully!`, 'success');
            closeRegistrationWizard();
            // Refresh devices list - assuming loadDevices exists in app.js
            if (typeof loadDevices === 'function') await loadDevices();
        } else {
            showNotification(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration/Provisioning error:', error);
        showNotification('Process failed: ' + error.message, 'error');
    }

    regBtn.disabled = false;
    regBtn.textContent = '✅ Register Device';
}

async function provisionDeviceBLE(ssid, password) {
    if (!bleDevice) throw new Error("No Bluetooth device selected.");
    const statusLabel = document.getElementById('registerBtn');
    statusLabel.textContent = '🔗 Connecting BLE...';

    try {
        if (!bleDevice.gatt.connected) {
            bleServer = await bleDevice.gatt.connect();
        } else {
            bleServer = bleDevice.gatt;
        }

        statusLabel.textContent = '📡 Finding Service...';
        const service = await bleServer.getPrimaryService(BLE_SERVICE_UUID);
        const enc = new TextEncoder();

        // Write SSID
        statusLabel.textContent = 'Writing SSID...';
        const ssidChar = await service.getCharacteristic(BLE_CHAR_SSID_UUID);
        if (ssidChar.properties.writeWithoutResponse) {
            await ssidChar.writeValueWithoutResponse(enc.encode(ssid));
        } else {
            await ssidChar.writeValue(enc.encode(ssid));
        }
        await new Promise(r => setTimeout(r, 500));

        // Write Password
        statusLabel.textContent = 'Writing Password...';
        const passChar = await service.getCharacteristic(BLE_CHAR_PASS_UUID);
        if (passChar.properties.writeWithoutResponse) {
            await passChar.writeValueWithoutResponse(enc.encode(password));
        } else {
            await passChar.writeValue(enc.encode(password));
        }
        await new Promise(r => setTimeout(r, 500));

        // Write UID (Triggers Restart)
        statusLabel.textContent = 'Finalizing...';
        const uidChar = await service.getCharacteristic(BLE_CHAR_UID_UUID);
        const user = firebase.auth().currentUser;
        if (user) {
            if (uidChar.properties.writeWithoutResponse) {
                await uidChar.writeValueWithoutResponse(enc.encode(user.uid));
            } else {
                await uidChar.writeValue(enc.encode(user.uid));
            }
        }

        showNotification('Device configured! It will now restart.', 'success');
        await new Promise(r => setTimeout(r, 1000));

    } catch (err) {
        console.error("BLE Provisioning Failed", err);
        if (err.message.includes('disconnected') || err.message.includes('Connection failed')) {
            console.warn("Device disconnected, possibly restarted.");
        } else {
            throw new Error("BLE Config Failed: " + err.message);
        }
    }
}


// ============================================
// ALERTS FEATURE
// ============================================
async function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
        } else {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => {
                    console.warn('Geolocation denied or failed:', error.message);
                    resolve(null); // Resolve null to fallback to IP-based or default
                }
            );
        }
    });
}

function getSeverityColor(severity) {
    switch (severity) {
        case 'high': return '#f44336'; // Red
        case 'medium': return '#ff9800'; // Orange
        case 'low': return '#4caf50'; // Green
        default: return '#2196f3'; // Blue
    }
}

function getSeverityBg(severity) {
    switch (severity) {
        case 'high': return '#ffebee';
        case 'medium': return '#fff3e0';
        case 'low': return '#e8f5e9';
        default: return '#e3f2fd';
    }
}

// ============================================
// OFFLINE MANAGER (IndexedDB)
// ============================================
let dbPromise;

function initDB() {
    if (!window.idb) {
        console.warn('IDB library not loaded');
        return;
    }
    dbPromise = idb.openDB('hardini-db', 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('offline-chat')) {
                db.createObjectStore('offline-chat', { keyPath: 'id', autoIncrement: true });
            }
        },
    });
}

// Initialize DB on load
if ('serviceWorker' in navigator) {
    initDB();
}

async function saveOfflineMessage(msgData) {
    if (!dbPromise) return;
    const db = await dbPromise;
    await db.put('offline-chat', msgData);
    console.log('Message saved offline:', msgData);
    showNotification('Message saved. Waiting for internet...', 'success');
}

async function syncOfflineMessages() {
    if (!dbPromise || !navigator.onLine) return;

    const db = await dbPromise;
    const tx = db.transaction('offline-chat', 'readwrite');
    const store = tx.objectStore('offline-chat');
    const messages = await store.getAll();

    if (messages.length === 0) return;

    console.log(`Syncing ${messages.length} offline messages...`);
    showNotification(`Syncing ${messages.length} offline messages...`, 'success');

    for (const msg of messages) {
        try {
            const CHAT_API_URL = `${API_BASE}/api/chat`;
            const token = await getAuthToken();

            const response = await fetch(CHAT_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: msg.content,
                    language: msg.language,
                    image: msg.image,
                    history: []
                })
            });

            if (response.ok) {
                await db.delete('offline-chat', msg.id);
                const data = await response.json();
                if (data.success && data.reply) {
                    showNotification(`Response: ${data.reply.substring(0, 30)}...`, 'success', 5000);
                    // Use app.js speakText
                    if (window.speakText && chatTTSEnabled) window.speakText(data.reply);
                }
            }
        } catch (err) {
            console.error('Sync failed for message:', msg, err);
        }
    }
}

window.addEventListener('online', () => {
    console.log('Back online! Syncing...');
    showNotification('Back online! Syncing data...', 'success');
    syncOfflineMessages();
});

window.addEventListener('offline', () => {
    console.log('Gone offline');
    showNotification('You are now offline. App will use cached data.', 'error');
});

// --- INDUSLABS AI CALL INTEGRATION ---
async function triggerIndusCall() {
    const inputEl = document.getElementById('indusMobileNumber');
    const btnEl = document.getElementById('indusCallBtn');

    // If already connected, disconnect
    if (window.currentIndusRoom) {
        window.currentIndusRoom.disconnect();
        window.currentIndusRoom = null;
        btnEl.innerText = 'Call Now';
        btnEl.style.background = 'linear-gradient(135deg, var(--accent-dark), var(--accent))';
        return;
    }

    if (!inputEl || !btnEl) return;

    let number = inputEl.value.trim();

    if (!number || number.length < 10) {
        showNotification('Please enter a valid mobile number to identify yourself', 'error');
        return;
    }

    if (/^\d{10}$/.test(number)) {
        number = '+91' + number;
    }

    const originalText = btnEl.innerText;
    btnEl.innerText = 'Connecting...';
    btnEl.disabled = true;

    try {
        const apiKey = "REMOVED_SECRET";

        // 1. Fetch available agents to get the Agent ID
        const agentsReq = await fetch("https://api.induslabs.io/api/developer/agents", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'accept': 'application/json' },
            body: JSON.stringify({ api_key: apiKey }),
        });
        const agentsData = await agentsReq.json();
        const agentId = agentsData.data.agents[0].id; // Extracting the first agent ID

        // 2. Obtain LiveKit credentials using the fetched Agent ID
        const lkResp = await fetch("https://api.induslabs.io/api/developer/livekit", {
            method: "POST",
            headers: { "Content-Type": "application/json", "accept": "application/json" },
            body: JSON.stringify({
                api_key: apiKey,
                agent_id: agentId,
                customer_number: number
            }),
        });

        if (!lkResp.ok) throw new Error("Failed to start LiveKit");
        const response = await lkResp.json();
        const { token, livekit_host_url } = response.data || response;

        // 3. Connect to LiveKit room
        let host = livekit_host_url;
        if (host.startsWith('https://')) host = host.replace('https://', 'wss://');
        else if (host.startsWith('http://')) host = host.replace('http://', 'ws://');
        else if (!host.startsWith('ws')) host = 'wss://' + host;

        const room = new LivekitClient.Room();

        room.on(LivekitClient.RoomEvent.Connected, async () => {
            console.log('Connected to IndusLabs LiveKit room!');
            // Publish local microphone
            await room.localParticipant.setMicrophoneEnabled(true);
            showNotification('Connected to AI! Speak now. 🎙️', 'success');

            btnEl.innerText = 'End Call 🔴';
            btnEl.style.background = 'var(--danger)';
            btnEl.disabled = false;
        });

        room.on(LivekitClient.RoomEvent.Disconnected, () => {
            console.log('Disconnected from IndusLabs');
            showNotification('Call ended.', 'info');
            btnEl.innerText = 'Call Now';
            btnEl.style.background = 'linear-gradient(135deg, var(--accent-dark), var(--accent))';
            btnEl.disabled = false;
            window.currentIndusRoom = null;
        });

        // Handle incoming audio tracks from the AI agent
        room.on(LivekitClient.RoomEvent.TrackSubscribed, (track, publication, participant) => {
            if (track.kind === LivekitClient.Track.Kind.Audio) {
                const element = track.attach();
                document.body.appendChild(element);
            }
        });

        await room.connect(host, token);
        window.currentIndusRoom = room;

    } catch (e) {
        console.error("IndusLabs Call Error:", e);
        showNotification('Could not connect call. Please try again.', 'error');
        btnEl.innerText = originalText;
        btnEl.disabled = false;
    }
}
