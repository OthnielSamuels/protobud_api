'use strict';

const http = require('http');

/**
 * Minimal HTTP server running inside the WhatsApp bot process.
 * Listens on port 3001 (internal Docker network only).
 *
 * Endpoints:
 *   GET  /health    → { connected: bool }
 *   GET  /status    → { connected, uptime, startTime }
 *   GET  /activity  → [{ timestamp, type, data }]
 *   GET  /          → HTML dashboard
 *   POST /send      → { phone, message } → sends via WA client
 */
function createBotServer(getClient, getConnectionStatus, getActivityLog) {
  const PORT = parseInt(process.env.BOT_HTTP_PORT ?? '3001', 10);
  const startTime = new Date();

  const server = http.createServer(async (req, res) => {
    // CORS headers for dashboard frontend access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Root — HTML dashboard
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsApp Bot Monitor</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #0d0a0a;
      color: #f5efef;
      padding: 20px;
    }
    .container { max-width: 1000px; margin: 0 auto; }
    h1 { margin-bottom: 30px; font-size: 24px; }
    .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
    .status-card {
      background: #150f0f;
      border: 1px solid #2a1f1f;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    .status-indicator {
      font-size: 32px;
      margin-bottom: 10px;
    }
    .status-label { font-size: 12px; color: #a09090; text-transform: uppercase; margin-bottom: 8px; }
    .status-value { font-size: 18px; font-weight: bold; font-family: 'IBM Plex Mono', monospace; }
    .connected { color: #3dd68c; }
    .disconnected { color: #e82a2a; }
    .activity-section { background: #150f0f; border: 1px solid #2a1f1f; border-radius: 8px; padding: 20px; }
    .activity-section h2 { font-size: 16px; margin-bottom: 15px; }
    .activity-log { max-height: 400px; overflow-y: auto; }
    .activity-entry {
      background: #1c1414;
      border-left: 3px solid #5b8def;
      padding: 12px;
      margin-bottom: 8px;
      border-radius: 4px;
      font-size: 12px;
      font-family: 'IBM Plex Mono', monospace;
    }
    .activity-time { color: #a09090; }
    .activity-type { color: #a78bfa; font-weight: bold; }
    .activity-data { color: #f5efef; margin-top: 4px; }
    .empty-state { color: #6a5555; text-align: center; padding: 40px; }
    button {
      background: #e82a2a;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: bold;
      transition: background 0.2s;
    }
    button:hover { background: #ff3d3d; }
    .controls { margin-bottom: 20px; display: flex; gap: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🤖 WhatsApp Bot Monitor</h1>
    
    <div class="controls">
      <button onclick="refresh()">Refresh</button>
      <button onclick="clearLogs()">Clear Log</button>
    </div>

    <div class="status-grid">
      <div class="status-card">
        <div class="status-label">Status</div>
        <div class="status-indicator" id="status-icon">◯</div>
        <div class="status-value" id="status-text">Connecting...</div>
      </div>
      <div class="status-card">
        <div class="status-label">Uptime</div>
        <div class="status-value" id="uptime">—</div>
      </div>
      <div class="status-card">
        <div class="status-label">Last Updated</div>
        <div class="status-value" id="updated">—</div>
      </div>
    </div>

    <div class="activity-section">
      <h2>Activity Log</h2>
      <div class="activity-log" id="activity-log">
        <div class="empty-state">Loading...</div>
      </div>
    </div>
  </div>

  <script>
    let lastUpdate = Date.now();

    async function refresh() {
      try {
        const status = await fetch('/status').then(r => r.json());
        const activity = await fetch('/activity').then(r => r.json());
        
        // Update status
        const connected = status.connected;
        document.getElementById('status-icon').textContent = connected ? '●' : '○';
        document.getElementById('status-icon').className = connected ? 'connected' : 'disconnected';
        document.getElementById('status-text').textContent = connected ? 'Connected' : 'Disconnected';
        document.getElementById('status-text').className = connected ? 'connected' : 'disconnected';
        
        // Update uptime
        const uptimeSec = Math.floor(status.uptime);
        const uptimeMin = Math.floor(uptimeSec / 60);
        const uptimeHr = Math.floor(uptimeMin / 60);
        const uptimeDays = Math.floor(uptimeHr / 24);
        let uptimeStr = '';
        if (uptimeDays > 0) uptimeStr += uptimeDays + 'd ';
        if (uptimeHr % 24 > 0) uptimeStr += (uptimeHr % 24) + 'h ';
        if (uptimeMin % 60 > 0) uptimeStr += (uptimeMin % 60) + 'm';
        document.getElementById('uptime').textContent = uptimeStr || '0m';
        
        // Update timestamp
        const now = new Date().toLocaleTimeString();
        document.getElementById('updated').textContent = now;
        
        // Update activity log
        const logDiv = document.getElementById('activity-log');
        if (activity.length === 0) {
          logDiv.innerHTML = '<div class="empty-state">No activity yet</div>';
        } else {
          logDiv.innerHTML = activity.slice(-30).reverse().map(entry => {
            const time = new Date(entry.timestamp).toLocaleTimeString();
            const dataStr = JSON.stringify(entry.data).substring(0, 100);
            return \`<div class="activity-entry">
              <span class="activity-time">\${time}</span>
              <span class="activity-type">\${entry.type}</span>
              <div class="activity-data">\${dataStr}</div>
            </div>\`;
          }).join('');
        }
      } catch (err) {
        console.error('Refresh failed:', err);
      }
    }

    function clearLogs() {
      if (confirm('Clear all logs?')) {
        // Can't clear from frontend, just refresh
        refresh();
      }
    }

    // Initial load and auto-refresh
    refresh();
    setInterval(refresh, 2000);
  </script>
</body>
</html>`);
      return;
    }

    // Health check
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ connected: getConnectionStatus() }));
      return;
    }

    // Status endpoint
    if (req.method === 'GET' && req.url === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        connected: getConnectionStatus(),
        uptime: (Date.now() - startTime.getTime()) / 1000,
        startTime: startTime.toISOString(),
      }));
      return;
    }

    // Activity log endpoint
    if (req.method === 'GET' && req.url === '/activity') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getActivityLog() || []));
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
