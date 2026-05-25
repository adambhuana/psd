const express = require('express');
const path = require('path');

const app = express();
const PORT = 57132;

// Parse JSON bodies
app.use(express.json({ limit: '5mb' }));

// Serve static files
app.use(express.static(path.join(__dirname), {
    setHeaders: (res) => {
        res.set('Cache-Control', 'no-store');
    }
}));

// ===== CLEAN URL ROUTES =====
app.get('/ai-chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'ai-chat.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// ===== PROXY ENDPOINT FOR OPENAI =====
app.post('/api/openai', async (req, res) => {
    const { apiKey, baseUrl, messages, model, temperature, max_tokens } = req.body;

    if (!apiKey) {
        return res.status(400).json({ error: { message: 'API key is required' } });
    }

    // Use custom base URL or default to OpenAI
    const apiBaseUrl = (baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const endpoint = `${apiBaseUrl}/chat/completions`;

    try {
        console.log(`📡 Proxying to: ${endpoint}`);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model || 'gpt-4o-mini',
                temperature: temperature || 0.3,
                max_tokens: max_tokens || 2000,
                messages: messages
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        res.json(data);
    } catch (error) {
        console.error('API proxy error:', error.message);
        res.status(500).json({
            error: { message: `Failed to connect to ${apiBaseUrl}: ${error.message}` }
        });
    }
});

const http = require('http');
const server = http.createServer(app);

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Kill the existing process or use a different port.`);
    } else {
        console.error('❌ Failed to start server:', err.message);
    }
    process.exit(1);
});

server.listen(PORT, () => {
    console.log(`\n🚀 Zyvanta server running at:`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`   http://localhost:${PORT}/ai-chat.html`);
    console.log(`\n📡 OpenAI proxy active at /api/openai\n`);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => process.exit(0));
});
