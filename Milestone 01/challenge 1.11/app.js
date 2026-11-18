/**
 * Dev Confessions Application Entrypoint
 * Bootstraps Express server, middleware, routes, and environment configuration.
 */

// Load environment variables from .env file before initializing application
require('dotenv').config();

const express = require('express');
const confessionRoutes = require('./routes/confessionRoutes');

const app = express();

// Parse JSON request payloads
app.use(express.json());

// Mount confessions resource router under standard versioned API namespace
app.use('/api/v1/confessions', confessionRoutes);

// Health check endpoint for cloud monitoring and deployment verification
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'dev-confessions-api' });
});

// Centralized port configuration respecting environment variable or default fallback
const serverPort = process.env.PORT || 3000;

let server;
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  server = app.listen(serverPort, () => {
    const startupMessage = `running on ${serverPort}`;
    console.log(startupMessage);
  });
}

module.exports = app;
module.exports.app = app;
module.exports.server = server;
