# Swedish Vocabulary Extension - Proxy Server Setup

## Problem
Mobile Chrome doesn't allow localStorage access for extension pages, so we can't store the OpenAI API key directly in the extension.

## Solution
Use a proxy server that securely stores your API key and forwards requests to OpenAI.

## Setup Instructions

### 1. Local Development

1. **Navigate to backend folder:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure your API key:**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=sk-your-actual-key-here
   PORT=3000
   ```

4. **Start the server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Test it:**
   - The server runs on `http://localhost:3000`
   - The extension will automatically use it when running locally

### 2. Deploy to Production

You need to deploy the proxy server to a cloud provider. Here are some free options:

#### Option A: Deploy to Render.com (Recommended - Free tier available)

1. Create an account at [render.com](https://render.com)

2. Create a new Web Service:
   - Connect your GitHub repository
   - Root directory: `backend`
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`

3. Add environment variable:
   - Key: `OPENAI_API_KEY`
   - Value: your OpenAI API key

4. Deploy! You'll get a URL like `https://your-app.onrender.com`

5. Update your extension:
   - On desktop: `localStorage.setItem('PROXY_API_URL', 'https://your-app.onrender.com/api/generate-examples')`
   - Or update the default in `script.js`

#### Option B: Deploy to Railway.app (Free tier available)

1. Create an account at [railway.app](https://railway.app)

2. Click "New Project" → "Deploy from GitHub repo"

3. Select your repository

4. Add environment variable:
   - `OPENAI_API_KEY`: your OpenAI API key

5. Deploy! You'll get a URL like `https://your-app.railway.app`

6. Update your extension with the new URL

#### Option C: Deploy to Fly.io (Free tier available)

1. Install flyctl: `curl -L https://fly.io/install.sh | sh`

2. Login: `flyctl auth login`

3. Create `fly.toml` in your project:
   ```toml
   app = "svenska-proxy"
   
   [build]
   
   [env]
     PORT = "8080"
   
   [[services]]
     http_checks = []
     internal_port = 8080
     protocol = "tcp"
     
     [[services.ports]]
       handlers = ["http"]
       port = 80
     
     [[services.ports]]
       handlers = ["tls", "http"]
       port = 443
   ```

4. Deploy: `flyctl launch`

5. Set your API key: `flyctl secrets set OPENAI_API_KEY=sk-your-key-here`

6. Update your extension with the new URL

### 3. Update Extension for Production

Once deployed, update `script.js`:

```javascript
const PROXY_API_URL = localStorage.getItem('PROXY_API_URL') || 'https://your-deployed-url.com/api/generate-examples';
```

Or set it dynamically in the browser console:
```javascript
localStorage.setItem('PROXY_API_URL', 'https://your-deployed-url.com/api/generate-examples')
```

## Security Notes

- Never commit your `.env` file to git (it's in `.gitignore`)
- The proxy server doesn't require authentication, so anyone with the URL can use it
- If you want to add authentication, consider adding an API key header check in `server.js`
- For production, consider adding rate limiting to prevent abuse

## Optional: Add Authentication

To add basic authentication to your proxy, update `server.js`:

```javascript
// Add this near the top after other requires
const API_SECRET = process.env.API_SECRET;

// Add this middleware before the /api/generate-examples route
app.use('/api/*', (req, res, next) => {
    const authHeader = req.headers['x-api-key'];
    if (authHeader !== API_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
});
```

Then in your `.env`:
```
API_SECRET=some-random-secret-key
```

And update `script.js` to include the header:
```javascript
const response = await fetch(PROXY_API_URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'some-random-secret-key'
    },
    // ... rest of the code
});
```

## Troubleshooting

- **"Failed to generate examples"**: Make sure the proxy server is running
- **CORS errors**: The server has CORS enabled, but check browser console for details
- **Connection refused**: Check the PROXY_API_URL is correct
- **500 error**: Check server logs - usually means OpenAI API key is missing or invalid
