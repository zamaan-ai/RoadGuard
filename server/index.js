import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';

import { initDB } from './db.js';
import { attachUser } from './middleware/auth.js';
import { UPLOAD_DIR } from './upload.js';

import authRouter from './routes/auth.js';
import reportsRouter from './routes/reports.js';
import fleetRouter from './routes/fleet.js';
import workflowRouter from './routes/workflow.js';
import notificationsRouter from './routes/notifications.js';
import activityRouter from './routes/activity.js';
import settingsRouter from './routes/settings.js';
import statsRouter from './routes/stats.js';
import topologyRouter from './routes/topology.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'roadguard123');
const JWT_SECRET = process.env.JWT_SECRET || '';
if (process.env.NODE_ENV === 'production' && (!JWT_SECRET || JWT_SECRET.length < 32)) {
  throw new Error('Set JWT_SECRET to a random secret of at least 32 characters in production.');
}
if (process.env.NODE_ENV === 'production' && (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === 'roadguard123')) {
  throw new Error('Set a unique ADMIN_PASSWORD in production.');
}

async function main() {
  await initDB({ adminUsername: ADMIN_USERNAME, adminPassword: ADMIN_PASSWORD });

  const app = express();
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, { cors: { origin: CORS_ORIGIN } });

  app.use(cors({ origin: CORS_ORIGIN }));
  app.use(morgan('dev'));
  app.use(express.json());
  app.use(attachUser);
  app.use('/uploads', express.static(UPLOAD_DIR));
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/api/health', (_req, res) => res.json({ ok: true, time: Date.now() }));

  app.use('/api/auth', authRouter);
  app.use('/api/reports', reportsRouter(io));
  app.use('/api/fleet', fleetRouter(io));
  app.use('/api/workflow', workflowRouter(io));
  app.use('/api/notifications', notificationsRouter(io));
  app.use('/api/activity', activityRouter);
  app.use('/api/settings', settingsRouter(io));
  app.use('/api/stats', statsRouter);
  app.use('/api/topology', topologyRouter);

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  app.use((err, _req, res, _next) => {
    console.error(err);
    const status = err.status || 400;
    res.status(status).json({ error: err.message || 'Unexpected server error' });
  });

  io.on('connection', (socket) => {
    socket.emit('system:online', { time: Date.now() });
  });

  httpServer.listen(PORT, () => {
    console.log(`RoadGuard API listening on http://localhost:${PORT}`);
    console.log(`Mobile capture page: http://localhost:${PORT}/mobile.html (use your LAN IP + HTTPS tunnel for a real phone)`);
    console.log(`Socket.IO real-time channel ready`);
    console.log(`Firestore backend: geo-sharded by state/city/locality`);
    if (process.env.NODE_ENV !== 'production') console.log(`Development admin login -> username: "${ADMIN_USERNAME}" (set ADMIN_PASSWORD in server/.env)`);
  });
}

main().catch((err) => {
  console.error('Failed to start RoadGuard API:', err);
  process.exit(1);
});
