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
  },
  // 32-byte (64 hex char) key used to encrypt Gmail tokens at rest. See
  // utils/tokenCrypto.js. Generate with:
  //   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  tokenEncKey: process.env.TOKEN_ENC_KEY || '',
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
