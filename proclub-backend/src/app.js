import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';

import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import moduleRoutes from './routes/modulesRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import userRoutes from './routes/userRoutes.js';
import memberDashboardRoutes from './routes/memberDashboardRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import certificateRoutes from './routes/certificateRoutes.js';
import upcomingEventRoutes from './routes/upcomingEventRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import redisService from './services/redisService.js';
import redisRoutes from './routes/redisRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import path from 'path';

const app = express();

const envOrigins = [
  process.env.FRONTEND_URL,
  process.env.APP_URL,
  process.env.CORS_ORIGINS
]
  .filter(Boolean)
  .flatMap((value) => value.split(','))
  .map((value) => value.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  'http://localhost:5173',
  ...envOrigins
]);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  if (allowedOrigins.has(origin)) return true;

  // Allow www and non-www variants of the same domain
  try {
    const { hostname, protocol } = new URL(origin);

    for (const allowed of allowedOrigins) {
      try {
        const allowedUrl = new URL(allowed);
        const base = allowedUrl.hostname.replace(/^www\./, '');

        if (protocol === allowedUrl.protocol && hostname.replace(/^www\./, '') === base) {
          return true;
        }
      } catch {
        // allowed origin is not a full URL, ignore
      }
    }
  } catch {
    return false;
  }

  return false;
};

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.join(process.cwd(), 'src', 'uploads')));

app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', projectRoutes);
app.use('/api', courseRoutes);
app.use('/api', moduleRoutes);
app.use('/api', quizRoutes);
app.use('/api', notificationRoutes);
app.use('/api', certificateRoutes);
app.use('/api', upcomingEventRoutes);
app.use('/api', contactRoutes);
app.use('/api', userRoutes);
app.use('/api', memberDashboardRoutes);
app.use('/api/redis', redisRoutes);

if (!process.env.VERCEL) {
  const port = process.env.PORT || 3000;

  (async () => {
    await redisService.connect();

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })();
}

export default app;
