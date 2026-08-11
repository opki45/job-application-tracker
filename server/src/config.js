const path = require('path');

// Jest sets NODE_ENV=test automatically. When it does, load ".env.test" so
// tests run against a separate database and never touch your real data.
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
// quiet: true stops dotenv printing its "injected env / tip" lines on startup.
require('dotenv').config({ path: path.resolve(process.cwd(), envFile), quiet: true });

const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  // Comma-separated list of allowed frontend origins for CORS. In production I
  // set this to my Vercel URL. Empty in dev (same-origin via the Vite proxy).
  clientOrigin: process.env.CLIENT_ORIGIN || '',
  // Where I send the browser after the Gmail OAuth callback runs (success or
  // error). This is the client app itself, not an API route.
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
    // A second "Authorized redirect URI" on the SAME Google Cloud OAuth
    // client as above -- Sign-in with Google (identity only) is a separate
    // flow from the Gmail import grant, so it gets its own callback route
    // instead of overloading the Gmail one. See googleClient.js.
    loginRedirectUri: process.env.GOOGLE_LOGIN_REDIRECT_URI || '',
  },
  // 32-byte (64 hex char) key used to encrypt Gmail tokens at rest. See
  // utils/tokenCrypto.js. Generate with:
  //   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  tokenEncKey: process.env.TOKEN_ENC_KEY || '',
  llm: {
    // 'ollama' | 'gemini' -- which provider src/llm/extractApplication.js
    // calls. Ollama is the default: free, and email text never leaves the
    // machine. Gemini is the fallback for a host that can't run Ollama.
    provider: process.env.LLM_PROVIDER || 'ollama',
    ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2:3b',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    // '-latest' alias rather than a pinned version -- pinned Gemini model
    // names get deprecated/removed fairly quickly, and I'd rather track
    // Google's current recommended flash model than have this silently 404
    // again later.
    geminiModel: process.env.GEMINI_MODEL || 'gemini-flash-latest',
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'job_tracker',
    // Managed databases (like TiDB Cloud) require TLS. I turn this on in
    // production with DB_SSL=true; it stays off for my local MySQL.
    ssl: process.env.DB_SSL === 'true',
  },
};

module.exports = config;
