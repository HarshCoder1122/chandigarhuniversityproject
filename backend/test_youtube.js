const axios = require('axios');
const API_KEY = 'REMOVED_SECRET'; // Key from .env.local
const FALLBACK_KEY = 'REMOVED_SECRET'; // Key from server.js

async function testKey(key, name) {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=farming&type=video&key=${key}`;
    try {
        console.log(`Testing ${name}...`);
        const res = await axios.get(url);
        console.log(`${name}: Success! Found ${res.data.items.length} videos.`);
    } catch (err) {
        console.error(`${name}: Failed. ${err.response ? err.response.data.error.message : err.message}`);
    }
}

async function run() {
    await testKey(API_KEY, 'Env Key');
    await testKey(FALLBACK_KEY, 'Fallback Key');
}

run();
