const express = require('express');
const cors = require('cors');
const axios = require('axios');
const admin = require('firebase-admin');
// const serviceAccount = require('./serviceAccountKey.json'); // Removed to prevent crash on Vercel
require('dotenv').config();
const { IsomorphicCommunicate } = require('edge-tts-universal');

const app = express();
const PORT = process.env.PORT || 3001;

// Allow all origins (CORS Fix for Vercel)
app.use(cors({
    origin: true, // Allow all origins for debugging
    methods: ['GET', 'POST', 'OPTIONS', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
const serviceAccountPath = './serviceAccountKey.json';
let serviceAccount;

const fs = require('fs'); // Added fs requirement

try {
    // 1. Try Environment Variable (Best for Render/Vercel)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        console.log('🔹 Using FIREBASE_SERVICE_ACCOUNT env var');
        // If it's a base64 string (common for easier copy-pasting), decode it
        if (!process.env.FIREBASE_SERVICE_ACCOUNT.trim().startsWith('{')) {
            const buff = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64');
            serviceAccount = JSON.parse(buff.toString('utf-8'));
        } else {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        }
    }
    // 2. Try Local File
    else if (fs.existsSync(serviceAccountPath)) {
        console.log('🔹 Using local serviceAccountKey.json');
        serviceAccount = require(serviceAccountPath);
    } else {
        throw new Error('No Firebase credentials found (Env Var or File)');
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://hardini-3e576-default-rtdb.asia-southeast1.firebasedatabase.app"
    });
    console.log('✅ Firebase Admin SDK initialized');
} catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    // Do not crash immediately, allowing health check to pass so we can debug
}

const db = admin.database();

// Middleware
app.use(express.json({ limit: '10mb' }));

// Auth Middleware to verify Firebase ID Token
// Auth Middleware to verify Firebase ID Token
const verifyAuth = async (req, res, next) => {
    // Skip auth for preflight requests
    if (req.method === 'OPTIONS') return next();

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // Check if it's the soil reading endpoint (ESP32 might not have token)
            // or health check or public APIs
            if (req.path === '/' || req.path === '/api/soil-readings' || req.path === '/api/health' || req.path === '/api/reels' || req.path === '/api/tts') {
                return next();
            }
            console.warn(`⚠️ Unauthorized access attempt to ${req.path}`);
            return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Auth verification failed:', error.message);
        if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({ success: false, error: 'Unauthorized: Token expired' });
        }
        return res.status(403).json({ success: false, error: 'Unauthorized: Invalid token' });
    }
};

// Apply Auth Middleware globally (except excluded paths)
app.use(verifyAuth);


// YouTube API Configuration
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || 'REMOVED_SECRET';
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';

// Farming-related search terms
const FARMING_SEARCH_TERMS = [
    'farming india', 'agriculture india', 'rice farming', 'wheat farming',
    'tractor farming', 'organic farming', 'vegetable farming', 'dairy farming'
];

const FALLBACK_VIDEOS = [
    { id: 'h1_K7pL8C1c', title: 'Modern Farming Technology in India', thumbnail: 'https://i.ytimg.com/vi/h1_K7pL8C1c/hqdefault.jpg', channelTitle: 'Farming Tech' },
    { id: 'X5l6l9w3w5k', title: 'Organic Farming Success Story', thumbnail: 'https://i.ytimg.com/vi/X5l6l9w3w5k/hqdefault.jpg', channelTitle: 'Kisan Of India' },
    { id: '8z7P7b8C8D8', title: 'Vegetable Farming Tips', thumbnail: 'https://i.ytimg.com/vi/8z7P7b8C8D8/hqdefault.jpg', channelTitle: 'Agri World' },
    { id: '1a2b3c4d5e6', title: 'Wheat Cultivation Process', thumbnail: 'https://i.ytimg.com/vi/1a2b3c4d5e6/hqdefault.jpg', channelTitle: 'Indian Farmer' },
    { id: '9f8e7d6c5b4', title: 'Smart Irrigation Systems', thumbnail: 'https://i.ytimg.com/vi/9f8e7d6c5b4/hqdefault.jpg', channelTitle: 'Smart Farm' }
];

// Get farming reels from YouTube API
app.get('/api/reels', async (req, res) => {
    try {
        const maxResults = Math.min(parseInt(req.query.limit) || 20, 10);
        const allVideos = [];

        // Simplified search for brevity in migration
        const searchTerm = FARMING_SEARCH_TERMS[Math.floor(Math.random() * FARMING_SEARCH_TERMS.length)];

        const searchResponse = await axios.get(`${YOUTUBE_API_URL}/search`, {
            params: {
                key: YOUTUBE_API_KEY,
                q: searchTerm,
                type: 'video',
                part: 'snippet',
                maxResults: maxResults,
                regionCode: 'IN',
                relevanceLanguage: 'en'
            }
        });

        if (searchResponse.data.items) {
            const videos = searchResponse.data.items.map(video => ({
                id: video.id.videoId,
                title: video.snippet.title,
                thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default.url,
                channelTitle: video.snippet.channelTitle,
            }));
            return res.json({ success: true, data: videos });
        }
        res.json({ success: true, data: [] });

    } catch (error) {
        console.error('Error fetching reels:', error.message);
        // Fallback to hardcoded videos on error to prevent UI breakage
        console.log('Serving fallback videos due to API error');
        res.json({ success: true, data: FALLBACK_VIDEOS });
    }
});

// Orders API Endpoints (Protected)

// Create a new order
app.post('/api/orders', async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });

        const { items, totalAmount, deliveryAddress, orderNotes, paymentMethod } = req.body;

        if (!items || items.length === 0) return res.status(400).json({ success: false, error: 'Items required' });

        const orderData = {
            user_id: req.user.uid,
            user_email: req.user.email || 'unknown',
            items,
            total_amount: parseFloat(totalAmount),
            delivery_address: deliveryAddress || null,
            order_notes: orderNotes || null,
            payment_method: paymentMethod || 'COD',
            status: 'pending',
            created_at: new Date().toISOString()
        };

        // Save to Firebase at users/{uid}/orders
        const newOrderRef = db.ref(`users/${req.user.uid}/orders`).push();
        await newOrderRef.set(orderData);

        res.status(201).json({
            success: true,
            data: { id: newOrderRef.key, ...orderData },
            message: 'Order created successfully'
        });

    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get orders (Protected)
app.get('/api/orders', async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });

        // Fetch orders for logged-in user
        const snapshot = await db.ref(`users/${req.user.uid}/orders`).once('value');
        const ordersObj = snapshot.val();

        const orders = [];
        if (ordersObj) {
            Object.keys(ordersObj).forEach(key => {
                orders.push({ id: key, ...ordersObj[key] });
            });
            // Sort by created_at desc
            orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        res.json({ success: true, data: orders, count: orders.length });

    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// ============================================
// DEVICE MANAGEMENT API
// ============================================

// Register a new IoT device (Protected)
app.post('/api/devices', async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });

        const { device_id, device_name, field_name, crop_type, connectivity } = req.body;

        if (!device_id || !device_name) {
            return res.status(400).json({ success: false, error: 'device_id and device_name are required' });
        }

        const deviceConfig = {
            device_id,
            device_name,
            field_name: field_name || '',
            crop_type: crop_type || '',
            connectivity: connectivity || 'wifi',
            registered_at: new Date().toISOString(),
            status: 'active'
        };

        await db.ref(`users/${req.user.uid}/devices/${device_id}/config`).set(deviceConfig);

        console.log(`Device ${device_id} registered for user ${req.user.uid}`);
        res.status(201).json({ success: true, data: deviceConfig, message: 'Device registered successfully' });

    } catch (error) {
        console.error('Device registration error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// List all devices for authenticated user (Protected)
app.get('/api/devices', async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });

        const snapshot = await db.ref(`users/${req.user.uid}/devices`).once('value');
        const devicesObj = snapshot.val();
        const devices = [];

        if (devicesObj) {
            for (const [deviceId, deviceData] of Object.entries(devicesObj)) {
                const config = deviceData.config || {};
                // Get latest reading timestamp
                const dataSnapshot = await db.ref(`users/${req.user.uid}/devices/${deviceId}/data`)
                    .orderByChild('created_at')
                    .limitToLast(1)
                    .once('value');
                const latestData = dataSnapshot.val();
                let lastReading = null;
                let rssi = null;
                let sensorValues = {};

                if (latestData) {
                    const entry = Object.values(latestData)[0];
                    lastReading = entry.created_at;
                    rssi = entry.rssi;
                    sensorValues = {
                        moisture: entry.soil_moist_pct,
                        temperature: entry.soil_temp_c,
                        ph: entry.soil_ph || 6.5,
                        nitrogen: entry.soil_n_mg_kg || 120,
                        phosphorus: entry.soil_p_mg_kg || 40,
                        potassium: entry.soil_k_mg_kg || 150,
                        ec: entry.soil_ec_us_cm || 0
                    };
                }
                devices.push({
                    ...config,
                    device_id: deviceId,
                    last_reading: lastReading,
                    rssi: rssi,
                    ...sensorValues
                });
            }
        }

        res.json({ success: true, data: devices });

    } catch (error) {
        console.error('Error fetching devices:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete a device registration (Protected)
app.delete('/api/devices/:deviceId', async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });

        const { deviceId } = req.params;

        // Remove device config (keep data for historical records)
        await db.ref(`users/${req.user.uid}/devices/${deviceId}/config`).remove();

        console.log(`Device ${deviceId} removed for user ${req.user.uid}`);
        res.json({ success: true, message: 'Device removed successfully' });

    } catch (error) {
        console.error('Error removing device:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Soil Sensor Data API Endpoints

// Receive soil sensor data from ESP32 (Unauthenticated for device simplicity, uses body user_uid)
// In production, use a device secret or auth token
app.post('/api/soil-readings', async (req, res) => {
    try {
        const { user_uid, device_id, soil_temp_c, soil_moist_pct, ambient_temp_c, ambient_humidity_pct, rssi } = req.body;

        if (!user_uid || !device_id) {
            return res.status(400).json({ success: false, error: 'user_uid and device_id required' });
        }

        const readingData = {
            device_id,
            soil_temp_c: parseFloat(soil_temp_c) || 0,
            soil_moist_pct: parseFloat(soil_moist_pct) || 0,
            ambient_temp_c: parseFloat(ambient_temp_c) || 0,
            ambient_humidity_pct: parseFloat(ambient_humidity_pct) || 0,
            rssi: parseInt(rssi) || null,
            created_at: new Date().toISOString(),
            soil_ec_us_cm: parseFloat(req.body.soil_ec_us_cm) || 0,
            soil_ph: parseFloat(req.body.soil_ph) || 0,
            soil_n_mg_kg: parseInt(req.body.soil_n_mg_kg) || 0,
            soil_p_mg_kg: parseInt(req.body.soil_p_mg_kg) || 0,
            soil_k_mg_kg: parseInt(req.body.soil_k_mg_kg) || 0
        };

        // Save to Firebase at users/{uid}/devices/{device_id}/data
        const newReadingRef = db.ref(`users/${user_uid}/devices/${device_id}/data`).push();
        await newReadingRef.set(readingData);

        console.log(`Soil reading saved for user ${user_uid}`);

        res.status(201).json({ success: true, message: 'Soil reading saved' });
    } catch (error) {
        console.error('Soil reading error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get soil readings (Protected)
app.get('/api/soil-readings/:deviceId', async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });

        const { deviceId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const uid = req.user.uid;

        const snapshot = await db.ref(`users/${uid}/devices/${deviceId}/data`)
            .orderByChild('created_at')
            .limitToLast(limit)
            .once('value');

        const readingsObj = snapshot.val();
        const readings = [];
        if (readingsObj) {
            Object.keys(readingsObj).forEach(key => {
                readings.push({ id: key, ...readingsObj[key] });
            });
            readings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        res.json({ success: true, data: readings });

    } catch (error) {
        console.error('Error fetching soil readings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// HARDINI AI CHATBOT
// ============================================
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const HARDINI_SYSTEM_PROMPT = (language) => `You are Hardini AI 🌾, an expert agricultural assistant.
IMPORTANT: The user is authenticated.
Your expertise includes: Crop cultivation, Soil health, Pest control, Irrigation, Government schemes, Market prices.

🚨 STRICT DOMAIN RESTRICTION 🚨
You must ONLY answer questions related to agriculture, farming, gardening, rural development, and weather.
If the user asks about anything else, politely decline and steer them back to farming.

🚨 LANGUAGE INSTRUCTION 🚨
You MUST answer in **${language || 'English'}**.
- If the language is an Indian language (e.g., Hindi, Marathi, Telugu), use the **native script** (Devanagari, Telugu script, etc.).
- Do NOT use Hinglish or transliteration unless explicitly asked.
- Keep the tone helpful, respectful, and simple for rural farmers.

RULES:
1. Respond exclusively in ${language || 'English'}.
2. Be practical and actionable.
3. Use emojis (🌾🌱).
4. Use the provided context (Weather, Soil, Prices) to give specific advice.
`;

// Helper: Fetch Weather from Open-Meteo
async function fetchWeather(lat, lon) {
    if (!lat || !lon) return null;
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,rain,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
        const response = await axios.get(url);
        const current = response.data.current;
        return `Current Weather: ${current.temperature_2m}°C, Humidity: ${current.relative_humidity_2m}%, Wind: ${current.wind_speed_10m} km/h, Rain: ${current.rain}mm. Code: ${current.weather_code}`;
    } catch (error) {
        console.error('Weather fetch error:', error.message);
        return null;
    }
}

// Helper: Fetch Mandi Prices (Real AGMARKNET via data.gov.in)
async function fetchMandiPrices(location, crop) {
    try {
        const apiKey = process.env.DATA_GOV_IN_API_KEY || '579b464db66ec23bdd000001f2e0e0176cd148a05c755ac88e99e28f'; // Public test key often used
        // Get today's date in dd/mm/yyyy
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        const dateStr = `${dd}/${mm}/${yyyy}`;

        // Simplified query for chatbot context
        const response = await axios.get(`https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070`, {
            params: {
                'api-key': apiKey,
                format: 'json',
                offset: 0,
                limit: 5,
                // filters can be applied here
            },
            timeout: 2500 // strict timeout for chatbot
        });

        if (response.data && response.data.records) {
            let info = `Market Prices (Mandi):\n`;
            response.data.records.forEach(r => {
                info += `- ${r.commodity} in ${r.market}, ${r.state}: ₹${r.modal_price}/quintal\n`;
            });
            return info;
        }
        return "Market data temporarily unavailable.";
    } catch (error) {
        console.error("Mandi API Error (Chatbot):", error.message);
        return "Market data unavailable.";
    }
}

// ============================================
// MANDI (MARKET) PRICES API ENDPOINT
// ============================================
app.get('/api/mandi', async (req, res) => {
    try {
        const apiKey = process.env.DATA_GOV_IN_API_KEY || '579b464db66ec23bdd0000018f2e1a2f4c3a44b75a6c0b1f13f1d8c1'; // Default public key or env var
        const state = req.query.state || ''; // e.g., 'Maharashtra'
        const limit = parseInt(req.query.limit) || 10;

        let params = {
            'api-key': apiKey,
            format: 'json',
            offset: 0,
            limit: limit
        };

        if (state) {
            params['filters[state]'] = state;
        }

        const url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070`;
        const response = await axios.get(url, { params, timeout: 5000 });

        if (response.data && response.data.records) {
            // Map the AGMARKNET fields to our UI expected fields
            const data = response.data.records.map(record => ({
                state: record.state,
                market: record.market,
                commodity: record.commodity,
                variety: record.variety,
                arrival_date: record.arrival_date,
                min_price: record.min_price,
                max_price: record.max_price,
                modal_price: record.modal_price
            }));

            return res.json({ success: true, data: data });
        }

        return res.json({ success: true, data: [] });
    } catch (error) {
        console.error("Mandi API Error:", error.message);
        // Fallback to mock data if API fails to prevent UI breakage
        const mockFallback = [
            { commodity: 'Wheat', modal_price: '2200', market: 'Pune', trend: 'up', change: '+5%' },
            { commodity: 'Rice (Basmati)', modal_price: '3500', market: 'Karnal', trend: 'down', change: '-2%' },
            { commodity: 'Cotton', modal_price: '6000', market: 'Nagpur', trend: 'stable', change: '0%' },
            { commodity: 'Soybean', modal_price: '4800', market: 'Indore', trend: 'up', change: '+3%' },
            { commodity: 'Onion', modal_price: '1500', market: 'Lasalgaon', trend: 'up', change: '+10%' }
        ];
        res.json({ success: true, data: mockFallback, fallback: true });
    }
});

// ============================================
// INDUSLABS AI VOICE AGENT PROXY ENDPOINTS
// ============================================
const INDUSLABS_API_KEY = process.env.INDUSLABS_API_KEY || 'REMOVED_SECRET';

// Proxy: Fetch Available Agents
app.post('/api/agents', async (req, res) => {
    try {
        const response = await axios.post("https://api.induslabs.io/api/developer/agents", {
            api_key: INDUSLABS_API_KEY
        }, {
            headers: { 'Content-Type': 'application/json', 'accept': 'application/json' }
        });
        res.json(response.data);
    } catch (error) {
        console.error("IndusLabs Agents Proxy Error:", error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to fetch agents" });
    }
});

// Proxy: Start LiveKit Session
app.post('/api/livekit', async (req, res) => {
    try {
        const { agent_id, customer_number } = req.body;

        if (!agent_id) {
            return res.status(400).json({ error: "agent_id is required" });
        }

        const response = await axios.post("https://api.induslabs.io/api/developer/livekit", {
            api_key: INDUSLABS_API_KEY,
            agent_id: agent_id,
            customer_number: customer_number || "WebUser"
        }, {
            headers: { 'Content-Type': 'application/json', 'accept': 'application/json' }
        });
        res.json(response.data);
    } catch (error) {
        console.error("IndusLabs LiveKit Proxy Error:", error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to start LiveKit session" });
    }
});

// Helper: Fetch Soil Data from Firebase
async function fetchUserSoilData(uid) {
    try {
        const snapshot = await db.ref(`users/${uid}/devices`).once('value');
        const devices = snapshot.val();
        if (!devices) return null;

        let soilInfo = "User's Soil Data:\n";
        for (const [deviceId, deviceData] of Object.entries(devices)) {
            // Get latest reading
            const dataSnapshot = await db.ref(`users/${uid}/devices/${deviceId}/data`)
                .orderByChild('created_at')
                .limitToLast(1)
                .once('value');
            const latestData = dataSnapshot.val();
            if (latestData) {
                const reading = Object.values(latestData)[0];
                soilInfo += `- Device ${deviceData.config?.device_name || deviceId}: Moisture ${reading.soil_moist_pct}%, Temp ${reading.soil_temp_c}°C, pH ${reading.ph || 'N/A'}\n`;
            }
        }
        return soilInfo;
    } catch (error) {
        console.error('Soil data fetch error:', error);
        return null;
    }
}

app.post('/api/chat', async (req, res) => {
    try {
        if (!GROQ_API_KEY) return res.status(503).json({ success: false, error: 'AI service not configured' });

        const { message, language, image, history, location } = req.body;
        // Personalization using Auth
        const userContext = req.user ? `User ID: ${req.user.uid}, Email: ${req.user.email}` : 'Guest User';

        if (!message && !image) return res.status(400).json({ success: false, error: 'Message required' });

        // --- RAG & Context Injection ---
        // Parallelize with Timeout (Max 1.5s wait for data)
        const TIMEOUT_MS = 1500;
        const withTimeout = (promise) => Promise.race([
            promise,
            new Promise(resolve => setTimeout(() => resolve(null), TIMEOUT_MS))
        ]);

        const promises = [];

        // 1. Weather
        if (location && location.latitude && location.longitude) {
            promises.push(withTimeout(fetchWeather(location.latitude, location.longitude)).then(res => res ? `[Wait] ${res}` : null));
        } else {
            promises.push(Promise.resolve(null));
        }

        // 2. Soil Data
        if (req.user) {
            promises.push(withTimeout(fetchUserSoilData(req.user.uid)).then(res => res ? `[Soil Sensors] ${res}` : null));
        } else {
            promises.push(Promise.resolve(null));
        }

        // 3. Market Prices
        const lowerMsg = message ? message.toLowerCase() : '';
        if (lowerMsg.includes('price') || lowerMsg.includes('rate') || lowerMsg.includes('mandi') || lowerMsg.includes('bhav')) {
            promises.push(withTimeout(fetchMandiPrices("User Location", "All")).then(res => res ? `[Market] ${res}` : null));
        } else {
            promises.push(Promise.resolve(null));
        }

        const results = await Promise.allSettled(promises);
        const contextData = results
            .filter(r => r.status === 'fulfilled' && r.value)
            .map(r => r.value)
            .join('\n');

        const messages = [
            { role: 'system', content: HARDINI_SYSTEM_PROMPT(language) + `\nContext: ${userContext}\nReal-time Data:\n${contextData}` }
        ];

        if (history && Array.isArray(history)) {
            const recentHistory = history.slice(-6); // Reduced history context for speed
            recentHistory.forEach(msg => messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content }));
        }

        // Use High Quality Model
        let model = 'llama-3.3-70b-versatile';
        if (image) {
            model = 'llama-3.2-90b-vision-preview'; // High quality vision model
            const userContent = [
                { type: 'text', text: message || 'Analyze this agricultural image.' },
                { type: 'image_url', image_url: { url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}` } }
            ];
            messages.push({ role: 'user', content: userContent });
        } else {
            messages.push({ role: 'user', content: message });
        }

        const groqResponse = await axios.post(GROQ_API_URL, {
            model: model,
            messages: messages,
            temperature: 0.7,
            max_tokens: 1024 // Restore token limit
        }, { headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` } });

        const reply = groqResponse.data.choices[0]?.message?.content || 'Error generating response.';

        // Save chat log to Firebase for history/audit
        if (req.user) {
            db.ref(`users/${req.user.uid}/chat_history`).push({
                role: 'user', content: message || '[Image]', timestamp: Date.now()
            });
            db.ref(`users/${req.user.uid}/chat_history`).push({
                role: 'assistant', content: reply, timestamp: Date.now()
            });
        }

        res.json({ success: true, reply: reply });

    } catch (error) {
        console.error('Chat API error:', error.message);
        res.status(500).json({ success: false, error: 'AI Error: ' + error.message });
    }
});

// ============================================
// TTS — Microsoft Edge TTS (High Quality & Natural)
// ============================================

// Map languages to specific high-quality neural voices
// Supports both full names AND short codes from the frontend
const VOICE_MAP = {
    'en': 'en-IN-NeerjaNeural',
    'English': 'en-IN-NeerjaNeural',
    'hi': 'hi-IN-SwaraNeural',
    'Hindi': 'hi-IN-SwaraNeural',
    'mr': 'mr-IN-AarohiNeural',
    'Marathi': 'mr-IN-AarohiNeural',
    'te': 'te-IN-ShrutiNeural',
    'Telugu': 'te-IN-ShrutiNeural',
    'ta': 'ta-IN-PallaviNeural',
    'Tamil': 'ta-IN-PallaviNeural',
    'bn': 'bn-IN-TanishaaNeural',
    'Bengali': 'bn-IN-TanishaaNeural',
    'kn': 'kn-IN-SapnaNeural',
    'Kannada': 'kn-IN-SapnaNeural',
    'gu': 'gu-IN-DhwaniNeural',
    'Gujarati': 'gu-IN-DhwaniNeural',
    'pa': 'pa-IN-OjasNeural',
    'Punjabi': 'pa-IN-OjasNeural',
    'ml': 'ml-IN-SobhanaNeural',
    'Malayalam': 'ml-IN-SobhanaNeural',
    'or': 'or-IN-MunaNeural',
    'Odia': 'or-IN-MunaNeural',
    'ur': 'ur-IN-GulshanNeural',
    'Urdu': 'ur-IN-GulshanNeural',
    'es': 'es-ES-ElviraNeural',
    'Spanish': 'es-ES-ElviraNeural',
    'fr': 'fr-FR-DeniseNeural',
    'French': 'fr-FR-DeniseNeural',
    'ar': 'ar-SA-ZariyahNeural',
    'Arabic': 'ar-SA-ZariyahNeural'
};

// Auto-detect language from text using Unicode ranges
function detectLanguageFromText(text) {
    if (/[\u0A00-\u0A7F]/.test(text)) return 'pa';
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
    if (/[\u0D00-\u0D7F]/.test(text)) return 'ml';
    if (/[\u0B00-\u0B7F]/.test(text)) return 'or';
    if (/[\u0A80-\u0AFF]/.test(text)) return 'gu';
    if (/[\u0980-\u09FF]/.test(text)) return 'bn';
    if (/[\u0600-\u06FF]/.test(text)) return 'ur';
    if (/[\u0900-\u097F]/.test(text)) return 'hi';
    return 'en';
}

app.post('/api/tts', async (req, res) => {
    try {
        const { text, language } = req.body;
        if (!text) return res.status(400).json({ success: false, error: 'Text required' });

        // Clean text - remove emojis and special chars that might confuse TTS
        const cleanText = text
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove markdown bold
            .replace(/\*(.*?)\*/g, '$1')     // Remove markdown italic
            .replace(/__(.*?)__/g, '$1')     // Remove markdown underline
            .replace(/`(.*?)`/g, '$1')       // Remove code blocks
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links (keep text)
            .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '') // Remove emojis
            .replace(/[#_`~@$%^&|+={}[\]:;"<>\\/()]/g, '') // Remove special chars
            .replace(/^[•\-] /gm, '') // Remove bullet points
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 500);

        if (!cleanText) return res.status(400).json({ success: false, error: 'No speakable text after cleaning' });

        // Auto-detect language if 'auto' or not provided
        let lang = language;
        if (!lang || lang === 'auto') {
            lang = detectLanguageFromText(cleanText);
        }

        const selectedVoice = VOICE_MAP[lang] || 'en-IN-NeerjaNeural';

        console.log(`TTS Request: lang=${lang}, voice=${selectedVoice}, text="${cleanText.substring(0, 30)}..."`);

        // Try Edge TTS first (neural voices, best quality)
        try {
            const communicate = new IsomorphicCommunicate(cleanText, {
                voice: selectedVoice,
                rate: '+25%',
                volume: '+0%'
            });

            // Create a promise that rejects after timeout
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Edge TTS timeout')), 4000)
            );

            // Fetch first chunk to ensure connection works before sending headers
            const iterator = communicate.stream();
            const firstChunkPromise = iterator.next();

            const firstResult = await Promise.race([firstChunkPromise, timeoutPromise]);

            if (!firstResult.done && firstResult.value.type === 'audio') {
                // Connection successful, start streaming
                res.set({
                    'Content-Type': 'audio/mpeg',
                    'Cache-Control': 'no-cache',
                    'Transfer-Encoding': 'chunked'
                });

                // Write first chunk
                res.write(Buffer.from(firstResult.value.data));

                // Stream remaining chunks
                for await (const chunk of iterator) {
                    if (chunk.type === 'audio' && chunk.data) {
                        res.write(Buffer.from(chunk.data));
                    }
                }
                res.end();
                return; // Done
            }
            throw new Error('No audio data in first chunk');
        } catch (edgeErr) {
            console.warn('Edge TTS failed or timed out, switching to Google TTS:', edgeErr.message);
            // Fallthrough to Google TTS
        }

        // Fallback: Google TTS (simpler, very reliable)
        const googleTTS = require('google-tts-api');
        const GOOGLE_LANG_MAP = {
            'en': 'en', 'hi': 'hi', 'mr': 'mr', 'te': 'te', 'ta': 'ta',
            'bn': 'bn', 'kn': 'kn', 'gu': 'gu', 'pa': 'pa', 'ml': 'ml',
            'ur': 'ur', 'or': 'or', 'es': 'es', 'fr': 'fr', 'ar': 'ar'
        };
        const gLang = GOOGLE_LANG_MAP[lang] || 'en';
        // Use slow=false for normal speed, but Google TTS is generally fast
        const url = googleTTS.getAudioUrl(cleanText, { lang: gLang, slow: false });

        console.log(`Fallback to Google TTS: ${url}`);
        const audioRes = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000 });

        if (!res.headersSent) {
            res.set({
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'no-cache'
            });
            res.send(Buffer.from(audioRes.data));
        } else {
            console.error('Cannot fallback to Google TTS because headers already sent');
            res.end();
        }

    } catch (error) {
        console.error('TTS error (all engines failed):', error.message);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'TTS Failed' });
        } else {
            res.end();
        }
    }
});

// ============================================
// ALERTS SYSTEM (Weather, Mandi, Gov)
// ============================================
app.post('/api/alerts', async (req, res) => {
    try {
        const { latitude, longitude, ip } = req.body;
        const alerts = [];
        let weatherData = null;

        // 1. Weather Alerts (Open-Meteo)
        // Check for Rain, High Wind, Extreme Temp
        if (latitude && longitude) {
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=weather_code,wind_speed_10m,temperature_2m,relative_humidity_2m&timezone=auto`;
                const response = await axios.get(url);
                const current = response.data.current;

                weatherData = {
                    temp: current.temperature_2m,
                    wind: current.wind_speed_10m,
                    humidity: current.relative_humidity_2m || 60, // Fallback if API version differs
                    code: current.weather_code
                };

                // Rain Check (Codes: 61, 63, 65 = Rain | 80, 81, 82 = Showers | 95+ = Thunderstorm)
                if (current.weather_code >= 61 && current.weather_code <= 65) {
                    alerts.push({ type: 'weather', severity: 'medium', title: 'Rain Alert 🌧️', message: 'Rain has started. Cover harvested crops.' });
                } else if (current.weather_code >= 80) {
                    alerts.push({ type: 'weather', severity: 'high', title: 'Storm Warning ⛈️', message: 'Heavy showers/thunderstorms expected. seek shelter.' });
                }

                // Wind Check (> 25 km/h)
                if (current.wind_speed_10m > 25) {
                    alerts.push({ type: 'weather', severity: 'medium', title: 'High Winds 💨', message: `Strong winds (${current.wind_speed_10m} km/h). Secure tall crops.` });
                }

                // Temp Check (> 40°C or < 5°C)
                if (current.temperature_2m > 40) {
                    alerts.push({ type: 'weather', severity: 'medium', title: 'Heatwave 🔥', message: 'Temperature > 40°C. Irrigate to prevent heat stress.' });
                } else if (current.temperature_2m < 5) {
                    alerts.push({ type: 'weather', severity: 'medium', title: 'Frost Alert ❄️', message: 'Low temperature. Frost possible.' });
                }
            } catch (err) {
                console.error('Weather alert fetch failed:', err.message);
            }
        }

        // 2. Mandi Price Alerts (Mock Data - In production use real API)
        // Simulating price surge for generic crops
        const mockSurges = [
            { crop: 'Onion', price: 2500, change: '+15%' },
            { crop: 'Tomato', price: 1800, change: '-10%' },
            { crop: 'Soybean', price: 4200, change: '+5%' }
        ];

        // Randomly pick one to show "Live" feel
        const randomCrop = mockSurges[Math.floor(Date.now() / 1000) % mockSurges.length];
        if (randomCrop.change.startsWith('+')) {
            alerts.push({
                type: 'mandi',
                severity: 'low',
                title: 'Price Surge 📈',
                message: `${randomCrop.crop} prices up by ${randomCrop.change}. Avg: ₹${randomCrop.price}/qtl.`
            });
        }

        // 3. Government Scheme Alerts (Static/Mock)
        alerts.push({
            type: 'gov',
            severity: 'low',
            title: 'PM-KISAN Update 📢',
            message: 'Next installment processing started. Check your e-KYC status.'
        });

        res.json({ success: true, alerts: alerts, weather: weatherData });

    } catch (error) {
        console.error('Alerts API error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch alerts' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Hardini Backend API is running (Firebase Admin)',
        timestamp: new Date().toISOString(),
        groqConfigured: !!GROQ_API_KEY
    });
});

// Root Endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Hardini Backend is Running! 🚀',
        timestamp: new Date().toISOString()
    });
});

// Only run the server if executed directly (not when imported by Vercel)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Hardini Backend Server running on port ${PORT}`);
        if (serviceAccount) {
            console.log(`🔥 Firebase Project: ${serviceAccount.project_id}`);
        } else {
            console.log('⚠️ Firebase not initialized (Missing Credentials)');
        }
    });
}

module.exports = app;
