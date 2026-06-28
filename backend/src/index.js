// dotenv MUST be loaded before any other local imports.
import 'dotenv/config';

import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

import connectDB from './config/db.js';
import { ensureIndexes } from './config/indexes.js';
import authRoutes from './routes/auth.js';
import submissionRoutes from './routes/submissions.js';
import appealRoutes from './routes/appeals.js';
import policyRoutes from './routes/policy.js';
import adminRoutes from './routes/admin.js';
import auditLogRoutes from './routes/auditLog.js';
import notificationRoutes from './routes/notifications.js';
import User from './models/User.js';
import { setIO } from './socket.js';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  },
});

setIO(io);

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) return next(new Error('Invalid user'));

    socket.user = user;
    next();
  } catch {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.user._id.toString()}`);
  if (socket.user.role === 'admin') {
    socket.join('admin');
  }
});

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/appeals', appealRoutes);
app.use('/api/policy', policyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/audit-log', auditLogRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// 404
app.use((req, res) => res.status(404).json({ message: `Route ${req.path} not found` }));

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: 'Duplicate entry' });
  }
  if (err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ message: err.message });
  }
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  await ensureIndexes();
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`\n── Service status ──────────────────────────`);
    console.log(`  AI (Groq)    : ${process.env.GROQ_API_KEY    ? '✅ configured' : '❌ missing GROQ_API_KEY'}`);
    console.log(`  AI (Gemini)  : ${process.env.GEMINI_API_KEY  ? '✅ configured' : '❌ missing GEMINI_API_KEY'}`);
    console.log(`  Image storage: ${process.env.S3_BUCKET       ? `✅ S3 → bucket "${process.env.S3_BUCKET}"` : '⚠️  MongoDB (set S3_BUCKET to enable S3)'}`);
    console.log(`  Email        : ${process.env.RESEND_API_KEY  ? '✅ Resend configured' : '⚠️  disabled (set RESEND_API_KEY to enable)'}`);
    console.log(`  Real-time    : ✅ Socket.io enabled`);
    console.log(`────────────────────────────────────────────\n`);
  });
});
