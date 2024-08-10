import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors'; // Import cors

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors()); // Enable CORS
app.use(express.json());

app.post('/api/proxy', async (req, res) => {
    const { content } = req.body;
    const API_KEY = '';
    const API_URL = 'https://api.openai.com/v1/chat/completions';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant.' },
                    { role: 'user', content: `Identify important terms and provide brief definitions for the following content:\n\n${content}\n\nList each term followed by its definition without numbering.` }
                ],
                max_tokens: 1000,
                temperature: 0.5,
            }),
        });

        if (response.ok) {
            const data = await response.json();
            const glossaryText = data.choices[0].message.content.trim();
            const glossary = parseGlossary(glossaryText);
            res.json(glossary);
        } else {
            res.status(response.status).json({ error: 'Failed to fetch from OpenAI' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error fetching glossary from OpenAI' });
    }
});

function parseGlossary(glossaryText) {
    const glossary = {};
    const lines = glossaryText.split('\n');
    lines.forEach(line => {
        const [term, definition] = line.split(':').map(s => s.trim());
        if (term && definition) {
            glossary[term] = definition;
        }
    });
    return glossary;
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
