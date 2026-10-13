import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { connectDB } from './config/db.js';
import { ensureDefaultUser } from './config/ensureUser.js';
import { initCronJobs } from './cron/invoiceCron.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import publicRoutes from './routes/publicRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Hardened CORS policy
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed =
        process.env.NODE_ENV !== 'production' ||
        !process.env.CLIENT_URL ||
        origin === process.env.CLIENT_URL ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com');

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    credentials: true,
  })
);

// Body Parser with payload limit (protects against memory exhaustion attacks)
app.use(express.json({ limit: '2mb' }));

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'FlowCast Freelance Invoicing & Cash Flow API',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/public', publicRoutes);

// Production Static Serving: Serve React client build if present
const clientDistPath = path.resolve(process.cwd(), '../client/dist');
const altClientDistPath = path.resolve(process.cwd(), 'client/dist');
const staticPath = fs.existsSync(clientDistPath)
  ? clientDistPath
  : fs.existsSync(altClientDistPath)
  ? altClientDistPath
  : null;

if (staticPath) {
  app.use(express.static(staticPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

// Error Handling Middleware (must be after all routes and static handlers)
app.use(errorHandler);

// Start Server and Cron
const startServer = async () => {
  try {
    await connectDB();
    await ensureDefaultUser();
    initCronJobs();

    if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('super_secret'))) {
      console.warn('[SECURITY WARNING] Using default or weak JWT_SECRET in production! Please configure a unique JWT_SECRET.');
    }

    app.listen(PORT, () => {
      console.log(`[Server] FlowCast Backend running on port ${PORT}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('[Server Error] Failed to start:', error);
    process.exit(1);
  }
};

startServer();
