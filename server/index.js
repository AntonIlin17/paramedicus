import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { WebSocketServer } from 'ws';
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config.js';
import { sessionManager } from './services/session.js';
import chatRoutes from './routes/chat.js';
import formRoutes from './routes/forms.js';
import emailRoutes from './routes/email.js';
import scheduleRoutes from './routes/schedule.js';
import statusRoutes from './routes/status.js';
import voiceRoutes from './routes/voice.js';
import { handleWSMessage } from './ws/handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const artifactsDir = path.resolve(__dirname, './data/artifacts');

fs.mkdirSync(artifactsDir, { recursive: true });

sessionManager.restore();

const app = express();

app.use(
  cors({
    origin: config.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'medicos-server',
    timestamp: new Date().toISOString(),
    features: {
      llmProvider: config.LLM_PROVIDER,
      deepgramSTT: Boolean(config.DEEPGRAM_API_KEY),
      premiumTTS: Boolean(config.ELEVENLABS_API_KEY || config.DEEPGRAM_API_KEY),
      demoMode: config.DEMO_MODE,
    },
  });
});

app.use('/api/artifacts', express.static(artifactsDir));
app.use('/api/chat', chatRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/voice', voiceRoutes);

const server = http.createServer(app);

const wss = new WebSocketServer({
  server,
  path: '/ws',
});

wss.on('connection', (ws, req) => {
  try {
    const reqUrl = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = reqUrl.searchParams.get('session') || uuidv4();

    if (!sessionManager.has(sessionId)) {
      sessionManager.create(sessionId);
    }

    const session = sessionManager.get(sessionId);
    ws.send(
      JSON.stringify({
        type: 'session_init',
        payload: {
          sessionId,
          session,
        },
      }),
    );

    ws.on('message', async (data) => {
      await handleWSMessage(ws, sessionId, data.toString());
    });

    ws.on('close', () => {
      // Session is intentionally retained to support reconnect.
    });
  } catch (err) {
    console.error('[ws] connection error:', err.message);
    ws.close();
  }
});

server.listen(config.PORT, () => {
  console.log(`MedicOS server running on http://localhost:${config.PORT}`);
});
