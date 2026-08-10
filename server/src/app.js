const express = require('express');
const cors = require('cors');
const config = require('./config');
const authRoutes = require('./routes/authRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const errorHandler = require('./middleware/errorHandler');

// I build the app here but I DON'T start it listening. server.js does that.
// Keeping them separate means my tests can import this app and send requests
// straight to it, without opening a real network port.
const app = express();

// CORS: allow my deployed frontend to call this API from its own origin. In
// production CLIENT_ORIGIN is my Vercel URL (comma-separated if more than one);
// with none set (local dev) I reflect any origin, which is fine behind the proxy.
const allowedOrigins = config.clientOrigin
  ? config.clientOrigin.split(',').map((o) => o.trim())
  : true;
app.use(cors({ origin: allowedOrigins }));

// Middleware: parse JSON request bodies so I can read them as req.body.
app.use(express.json());

// A simple health check. Handy for confirming the server is up and for
// deployment probes later.
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Feature routes. My auth router is mounted here, so its '/register' becomes
// '/api/auth/register'.
app.use('/api/auth', authRoutes);

// Application routes, mounted under /api/applications.
app.use('/api/applications', applicationRoutes);

// Gmail integration routes (OAuth connect/callback/status/disconnect),
// mounted under /api/integrations/gmail.
app.use('/api/integrations/gmail', integrationRoutes);

// My error handler goes LAST, so it can catch errors from any route above it.
app.use(errorHandler);

module.exports = app;
