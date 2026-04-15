'use strict';

const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { createBotServer } = require('./server');

// ---------------------------------------------------------------
// Config
// ---------------------------------------------------------------
const BACKEND_URL    = process.env.BACKEND_URL ?? 'http://nestjs-backend:3000';
const CHAT_ENDPOINT  = `${BACKEND_URL}/chat/incoming`;
const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS ?? '90000', 10);
const CHROMIUM_EXECUTABLE = process.env.PUPPETEER_EXECUTABLE_PATH ?? '/usr/bin/chromium';

// ---------------------------------------------------------------
// Puppeteer args — tuned for low memory in Docker
// ---------------------------------------------------------------
const PUPPETEER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--disable-gpu',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-default-apps',
  '--disable-sync',
  '--disable-translate',
  '--hide-scrollbars',
  '--mute-audio',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-component-update',
  '--disable-domain-reliability',
  '--disable-print-preview',
  '--disable-client-side-phishing-detection',
  '--disable-features=AudioServiceOutOfProcess',
];

// ---------------------------------------------------------------
// State
// ---------------------------------------------------------------
let isConnected = false;
let waClient = null;
let latestQR = null; // ← stores raw QR string for /qr endpoint

// In-flight request tracker — one pending request per phone number
const inFlight = new Set();

// ---------------------------------------------------------------
// Activity Log — track last 100 events for dashboard
// ---------------------------------------------------------------
const activityLog = [];
const MAX_LOGS = 100;

function logActivity(type, data) {
  const entry = {
    timestamp: new Date().toISOString(),
    type,
    data,
  };
  activityLog.push(entry);
  console.log(`[Activity] ${type}:`, data);
  if (activityLog.length > MAX_LOGS) {
    activityLog.shift();
  }
}

function getActivityLog() {
  return activityLog;
}

function getConnectionStatus() {
  return isConnected;
}

// ---------------------------------------------------------------
// WhatsApp Client
// ---------------------------------------------------------------
waClient = new Client({
  authStrategy: new LocalAuth({
    dataPath: '/app/.wwebjs_auth',
  }),
  puppeteer: {
    headless: true,
    args: PUPPETEER_ARGS,
    executablePath: CHROMIUM_EXECUTABLE,
  },
  webVersionCache: {
    type: 'local',
    path: '/app/.wwebjs_cache',
  },
});

// ---------------------------------------------------------------
// Client events
// ---------------------------------------------------------------

waClient.on('qr', (qr) => {
  latestQR = qr; // ← store for /qr endpoint
  console.log('[WhatsApp] Scan QR code to authenticate:');
  qrcode.generate(qr, { small: true });
  logActivity('qr_code_displayed', { small: true });
});

waClient.on('authenticated', () => {
  console.log('[WhatsApp] Authenticated successfully');
  logActivity('authenticated', { status: 'success' });
});

waClient.on('ready', () => {
  isConnected = true;
  latestQR = null; // ← clear QR once authenticated
  console.log('[WhatsApp] Client ready and connected');
  logActivity('ready', { connected: true });
});

waClient.on('auth_failure', (msg) => {
  console.error('[WhatsApp] Authentication failed:', msg);
  isConnected = false;
  logActivity('auth_failure', { message: msg });
  process.exit(1);
});

waClient.on('disconnected', (reason) => {
  console.warn('[WhatsApp] Disconnected:', reason);
  isConnected = false;
  logActivity('disconnected', { reason });

  setTimeout(() => {
    console.log('[WhatsApp] Attempting reconnect...');
    logActivity('reconnect_attempt', { attempt: 1 });
    waClient.initialize().catch((err) => {
      console.error('[WhatsApp] Reconnect failed:', err.message);
      logActivity('reconnect_failed', { error: err.message });
      process.exit(1);
    });
  }, 5_000);
});

// ---------------------------------------------------------------
// Inbound message handler
// ---------------------------------------------------------------
waClient.on('message', async (msg) => {
  if (msg.isGroupMsg)                          return;
  if (msg.from === 'status@broadcast')         return;
  if (!msg.body || !msg.body.trim())           return;
  if (msg.type !== 'chat')                     return;

  const phone = msg.from;
  const text  = msg.body.trim();

  if (inFlight.has(phone)) {
    console.log(`[WhatsApp] Dropping duplicate from ${phone} (in-flight)`);
    logActivity('duplicate_message', { phone, text });
    return;
  }

  inFlight.add(phone);
  console.log(`[WhatsApp] Incoming from ${phone}: "${text.substring(0, 80)}"`);
  logActivity('incoming_message', { phone, text: text.substring(0, 100) });

  try {
    const reply = await forwardToBackend(phone, text);
    await msg.reply(reply);
    console.log(`[WhatsApp] Replied to ${phone}`);
    logActivity('reply_sent', { phone, replyLength: reply.length });
  } catch (err) {
    console.error(`[WhatsApp] Handler error for ${phone}:`, err.message);
    logActivity('handler_error', { phone, error: err.message });
    try {
      await msg.reply(
        'Sorry, something went wrong on our end. Please try again in a moment.',
      );
    } catch (replyErr) {
      console.error('[WhatsApp] Could not send fallback reply:', replyErr.message);
      logActivity('fallback_reply_failed', { phone, error: replyErr.message });
    }
  } finally {
    inFlight.delete(phone);
  }
});

// ---------------------------------------------------------------
// Forward message to NestJS backend
// ---------------------------------------------------------------
async function forwardToBackend(phone, message) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(CHAT_ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ phone, message }),
      signal:  controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Backend HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();

    if (!data.reply || typeof data.reply !== 'string') {
      throw new Error('Backend returned invalid reply format');
    }

    return data.reply;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Backend timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------
// Start internal HTTP server
// ---------------------------------------------------------------
createBotServer(
  () => waClient,
  () => isConnected,
  () => getActivityLog(),
  () => latestQR, // ← pass QR getter
);

// ---------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------
async function shutdown(signal) {
  console.log(`[WhatsApp] ${signal} received, shutting down...`);
  isConnected = false;
  try {
    await waClient.destroy();
  } catch (_) {}
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[WhatsApp] Unhandled rejection:', reason);
});

// ---------------------------------------------------------------
// Boot
// ---------------------------------------------------------------
console.log('[WhatsApp] Starting bot...');
console.log(`[WhatsApp] Backend: ${BACKEND_URL}`);

const LOCK_PATHS = [
  '/app/.wwebjs_auth',
  '/app/.wwebjs_cache',
];

for (const basePath of LOCK_PATHS) {
  for (const lock of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
    const lockPath = `${basePath}/${lock}`;
    if (fs.existsSync(lockPath)) {
      fs.rmSync(lockPath);
      console.log(`[WhatsApp] Removed stale lock: ${lockPath}`);
    }
  }
}

waClient.initialize().catch((err) => {
  console.error('[WhatsApp] Fatal init error:', err.message);
  process.exit(1);
});