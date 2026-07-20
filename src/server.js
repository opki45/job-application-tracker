const app = require('./app');
const config = require('./config');

// The only job of this file is to actually start the HTTP server. I keep this
// out of app.js so my tests can use the app without a live port.
app.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
});
