import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function listModels() {
    try {
        const response = await axios.get('https://api.groq.com/openai/v1/models', {
            headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` }
        });
        const models = response.data.data.map(m => m.id);
        console.log("All Models:", models);
    } catch (e) {
        console.error("Error:", e.message);
    }
}
listModels();
