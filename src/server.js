'use strict';

const http = require('http');

/**
 * Minimal HTTP server running inside the WhatsApp bot process.
 * Listens on port 3001 (internal Docker network only).
 *
 * Endpoints:
 *   GET  /health  → { connected: bool }
 *   POST /send    → { phone, message } → sends via WA client
 */
function createBotServer(getClient, getConnectionStatus) {
  const PORT = parseInt(process.env.BOT_HTTP_PORT ?? '3001', 10);

  const server = http.createServer(async (req, res) => {
    // Health check
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ connected: getConnectionStatus() }));
      return;
    }

    // Send message
    if (req.method === 'POST' && req.url === '/send') {
      let body = '';

      req.on('data', (chunk) => {
        body += chunk;
        // Basic request size guard — reject >16KB
        if (body.length > 16_384) {
          res.writeHead(413);
          res.end('Payload too large');
          req.destroy();
        }
      });

      req.on('end', async () => {
        try {
          const { phone, message } = JSON.parse(body);

          if (!phone || !message) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'phone and message are required' }));
            return;
          }

          const waClient = getClient();

          if (!waClient || !getConnectionStatus()) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'WhatsApp client not connected' }));
            return;
          }

          await waClient.sendMessage(phone, message);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ sent: true }));
        } catch (err) {
          console.error('[BotServer] Send error:', err.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to send message' }));
        }
      });

      return;
    }

    // 404 for everything else
    res.writeHead(404);
    res.end('Not found');
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[BotServer] HTTP server listening on port ${PORT}`);
  });

  server.on('error', (err) => {
    console.error('[BotServer] HTTP server error:', err.message);
  });

  return server;
}

module.exports = { createBotServer };
