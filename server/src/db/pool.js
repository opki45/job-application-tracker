const mysql = require('mysql2/promise');
const config = require('../config');

// I'm using a pool instead of a single connection. A pool keeps a few database
// connections open and hands a free one to each query, then takes it back when
// the query finishes. That way I get several queries running at once, and I
// don't pay the cost of opening a new connection on every request.
const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,

  waitForConnections: true, // if all my connections are busy, queue the query...
  connectionLimit: 10,      // ...instead of opening more than 10 connections.
  queueLimit: 0,            // 0 means my wait-queue has no size limit.

  // I want DATE columns back as plain strings ('2026-07-15'), not JS Date
  // objects. That stops the day shifting across timezones when I send it to the
  // frontend as JSON.
  dateStrings: true,

  // Managed hosts like TiDB Cloud require a TLS connection. I enable it via
  // DB_SSL=true in production; locally it stays off.
  ssl: config.db.ssl ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
});

module.exports = pool;
