import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors'; 
import mongoose from 'mongoose';
import bodyParser from 'body-parser';

const customerSchema = new mongoose.Schema({
    customerId: { type: String, required: true, unique: true },
    domain: { type: String, required: true },
    apiToken: { type: String, required: true, unique: true},
    isActive: { type: Boolean, default: true },
  });
  
  const Customer = mongoose.model('customers', customerSchema);
  

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors()); // Enable CORS
app.use(express.json());

// Middleware
app.use(bodyParser.json());

// Database connection
mongoose.connect('connection-string/word-wizard?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error(`Failed to connect to MongoDB: ${err.message}`);
});

// Routes
app.post('/api/verify', async (req, res) => {
    const { apiToken, domain } = req.body;
  
    if (!apiToken || !domain) {
      return res.status(400).json({ error: 'ApiToken and domain are required.' });
    }
  
    try {
          const customer = await Customer.findOne({ apiToken: apiToken, domain:domain, isActive: true });
  
      if (customer) {
        return res.json({ isValid: true });
      } else {
        return res.json({ isValid: false });
      }
    } catch (error) {
      console.error('Error verifying customer:', error);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  });

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
