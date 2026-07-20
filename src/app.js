const express = require('express');
const authRoutes = require('./routes/authRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const errorHandler = require('./middleware/errorHandler');

// I build the app here but I DON'T start it listening. server.js does that.
// Keeping them separate means my tests can import this app and send requests
// straight to it, without opening a real network port.
const app = express();

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

// My error handler goes LAST, so it can catch errors from any route above it.
app.use(errorHandler);

module.exports = app;
