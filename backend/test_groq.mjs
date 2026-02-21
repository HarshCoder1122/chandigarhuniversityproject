import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function testGroq(modelName) {
    try {
        const imageBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCABQAFADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAaEAACAwEBAAAAAAAAAAAAAAAAAQIDBAUG/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AJ0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//Z";

        const messages = [
            {
                role: 'user',
                content: [
                    { type: 'text', text: 'Analyze this image.' },
                    { type: 'image_url', image_url: { url: imageBase64 } }
                ]
            }
        ];

        const response = await axios.post(GROQ_API_URL, {
            model: modelName,
            messages: messages,
            temperature: 0.7,
            max_tokens: 1024
        }, {
            headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' }
        });

        console.log(`Success on ${modelName}:`, response.data.choices[0].message.content);
    } catch (e) {
        console.error(`Error on ${modelName}:`, e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
    }
}

testGroq('llama-3.3-70b-versatile');
