const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for your extension
app.use(cors());
app.use(express.json());

// OpenAI proxy endpoint
app.post('/api/generate-examples', async (req, res) => {
    const { swedishWord, englishTranslation } = req.body;
    
    if (!swedishWord || !englishTranslation) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: 'OpenAI API key not configured' });
    }
    
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a Swedish language teacher helping students learn Swedish. Generate simple, practical example sentences that demonstrate how to use Swedish words in everyday contexts. Each example should be at A2-B1 level (beginner to intermediate).'
                    },
                    {
                        role: 'user',
                        content: `Generate 3 example sentences using the Swedish word "${swedishWord}" (which means "${englishTranslation}" in English). For each example, provide:
1. The Swedish sentence
2. The English translation

Format your response as a JSON array with objects containing "swedish" and "english" properties. Example format:
[{"swedish": "...", "english": "..."}, {"swedish": "...", "english": "..."}, {"swedish": "...", "english": "..."}]

Make the sentences natural, practical, and at beginner-intermediate level.`
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenAI API error:', response.status, errorText);
            return res.status(response.status).json({ 
                error: `OpenAI API error: ${response.status}` 
            });
        }
        
        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // Parse the JSON response
        let examples;
        try {
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                examples = JSON.parse(jsonMatch[0]);
            } else {
                examples = JSON.parse(content);
            }
        } catch (parseError) {
            console.error('Error parsing OpenAI response:', parseError);
            return res.status(500).json({ 
                error: 'Failed to parse examples from OpenAI response' 
            });
        }
        
        res.json({ examples });
        
    } catch (error) {
        console.error('Error calling OpenAI API:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});
