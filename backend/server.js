// server.js — Main entry point for the AI Voice-Based Intern Task Allocation System
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./config/database');
const { startScheduler } = require('./jobs/scheduler');

// ─── Import Routes ──────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const internRoutes = require('./routes/interns');
const mentorRoutes = require('./routes/mentors');
const taskRoutes = require('./routes/tasks');
const meetingRoutes = require('./routes/meetings');
const submissionRoutes = require('./routes/submissions');
const reviewRoutes = require('./routes/reviews');
const assistantRoutes = require('./routes/assistant');
const emailLogRoutes = require('./routes/emailLogs');
const dashboardRoutes = require('./routes/dashboard');
const notificationRoutes = require('./routes/notifications');

const app = express();

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // relax for API
  })
);

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin "${origin}" not allowed`));
      }
    },
    credentials: true,
  })
);

// Global rate limiter: 200 req / 15 min per IP (skipped in development)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development',
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api/', globalLimiter);

// Stricter limiter for auth endpoints (skipped in development)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  skip: () => process.env.NODE_ENV === 'development',
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});
app.use('/api/auth/', authLimiter);

// ─── Body Parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Static Files (uploaded submissions) ──────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Health Check ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'AI Intern Task Allocation System API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    modes: {
      email: process.env.MOCK_EMAIL === 'true' ? 'MOCK (dev)' : 'REAL (SMTP)',
      calendar: process.env.MOCK_CALENDAR === 'true' ? 'MOCK (dev)' : 'REAL (Google)',
      gemini: !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here' ? 'MOCK (no key)' : 'REAL (Gemini)',
    },
  });
});

// ─── API Routes ────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/interns', internRoutes);
app.use('/api/mentors', mentorRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/email-logs', emailLogRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';
  console.error('[ERROR]', err.message);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages.join('. ') });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(400).json({ success: false, message: `A record with this ${field} already exists.` });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid ID format: ${err.value}` });
  }
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ success: false, message: err.message });
  }
  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: `File too large. Max size: ${process.env.MAX_FILE_SIZE_MB || 10}MB` });
  }

  res.status(err.status || err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      const pad = (s) => String(s).padEnd(30);
      console.log('\n╔══════════════════════════════════════════════════════╗');
      console.log('║   🤖 AI Intern Task Allocation System — Backend      ║');
      console.log('╠══════════════════════════════════════════════════════╣');
      console.log(`║  ${pad('Port: ' + PORT)}                        ║`);
      console.log(`║  ${pad('Env : ' + process.env.NODE_ENV)}                        ║`);
      console.log(`║  ${pad('Frontend: ' + process.env.FRONTEND_URL)}                        ║`);
      console.log(`║  ${pad('Email: ' + (process.env.MOCK_EMAIL === 'true' ? '📧 MOCK mode' : '📤 SMTP real'))}                        ║`);
      console.log(`║  ${pad('Gemini: ' + (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' ? '🤖 REAL API' : '🤖 MOCK mode'))}                        ║`);
      console.log('╚══════════════════════════════════════════════════════╝\n');
    });
    startScheduler();
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();
