import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import helmet from 'helmet';
import passport from 'passport';
import handwritingRoutes from './routes/handwriting';
import authRoutes from './routes/auth';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security headers
app.use(helmet());

// HTTPS redirect in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [process.env.CLIENT_URL || 'http://localhost:5173'];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// MongoDB connection (optional - continues without DB if unavailable)
const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    logger.warn('MONGODB_URI not defined - running without database');
    return;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      family: 4,
    });
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.warn('MongoDB connection failed - running without database', { error: (error as Error).message });
  }
};

mongoose.connection.on('disconnected', () => logger.info('MongoDB disconnected'));
mongoose.connection.on('error', (err) => logger.error('MongoDB error', { err }));

// Health check
app.get('/api/health', (_req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ status: 'ok', database: dbStatus });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/handwriting', handwritingRoutes);

// Start server
const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    logger.error('Server startup error', { err });
    process.exit(1);
  });

  const shutdown = () => {
    logger.info('Shutting down gracefully...');
    server.close(() => {
      mongoose.connection.close().then(() => process.exit(0));
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startServer();

export default app;
