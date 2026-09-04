const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const connectDB = require('./config/db');

// ============================================================
// LOAD ENVIRONMENT VARIABLES
// ============================================================

dotenv.config({
  path: path.join(__dirname, '.env')
});

// ============================================================
// CONNECT TO DATABASE
// ============================================================

connectDB();

// ============================================================
// CREATE EXPRESS APP
// ============================================================

const app = express();

// ============================================================
// BODY PARSER
// ============================================================

app.use(express.json());

// ============================================================
// CORS CONFIGURATION
// ============================================================

// Explicitly allowed origins
const defaultAllowedOrigins = [
  // Local development
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',

  // Local development using 127.0.0.1
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',

  // Production frontend
  'https://placement-guide-nu.vercel.app'
];

// Additional origins from environment variables
const envOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  ...(process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [])
]
  .filter(Boolean)
  .map((origin) => origin.trim().replace(/\/+$/, ''));

// Combine and remove duplicates
const allowedOrigins = [
  ...new Set([
    ...defaultAllowedOrigins,
    ...envOrigins
  ])
];

// CORS origin checker
const corsOriginChecker = (origin, callback) => {
  // Allow requests without an Origin header.
  // Examples: Postman, curl, server-to-server requests,
  // Render health checks, etc.
  if (!origin) {
    return callback(null, true);
  }

  const cleanOrigin = origin.replace(/\/+$/, '');

  // Allow explicitly configured origins
  if (allowedOrigins.includes(cleanOrigin)) {
    return callback(null, true);
  }

  // Allow Vercel deployment and preview URLs
  //
  // Example:
  // https://placement-guide-xxxxx.vercel.app
  //
  if (
    /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(cleanOrigin)
  ) {
    return callback(null, true);
  }

  // Allow localhost during development
  if (
    process.env.NODE_ENV !== 'production' &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)
  ) {
    return callback(null, true);
  }

  console.log(`CORS blocked origin: ${origin}`);

  return callback(
    new Error(`Origin ${origin} not allowed by CORS`)
  );
};

// CORS options
const corsOptions = {
  origin: corsOriginChecker,

  // Required if your frontend sends cookies/auth credentials
  credentials: true,

  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS'
  ],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With'
  ],

  optionsSuccessStatus: 204
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Explicitly handle preflight requests
app.options('*', cors(corsOptions));

// ============================================================
// STATIC FILES
// ============================================================

// Uploaded resumes/files
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'))
);

// ============================================================
// IMPORT ROUTES
// ============================================================

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const resumeRoutes = require('./routes/resumes');
const testRoutes = require('./routes/tests');
const interviewRoutes = require('./routes/interviews');
const jobRoutes = require('./routes/jobs');
const questionBankRoutes = require('./routes/questionBank');
const contestRoutes = require('./routes/contests');
const doubtRoutes = require('./routes/doubts');
const holidayRoutes = require('./routes/holidays');
const notificationRoutes = require('./routes/notifications');
const roadmapRoutes = require('./routes/roadmaps');
const discussionRoutes = require('./routes/discussions');

// ============================================================
// MOUNT API ROUTES
// ============================================================

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/questions', questionBankRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/doubts', doubtRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/roadmaps', roadmapRoutes);
app.use('/api/discussions', discussionRoutes);

// ============================================================
// HEALTH CHECK
// ============================================================

// Useful for Render and deployment testing
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Placement Preparation Portal Backend is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// API health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Placement Preparation Portal API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// BASE ROUTE
// ============================================================

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Placement Preparation Portal API'
  });
});

// ============================================================
// 404 HANDLER
// ============================================================

app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// ============================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================

app.use((err, req, res, next) => {
  console.error('Server Error:', err);

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Server Error'
  });
});

// ============================================================
// CREATE HTTP SERVER
// ============================================================

const server = http.createServer(app);

// ============================================================
// SOCKET.IO CONFIGURATION
// ============================================================

const io = new Server(server, {
  cors: corsOptions
});

// Make Socket.IO available to Express routes/controllers
app.set('socketio', io);

// ============================================================
// SOCKET.IO EVENTS
// ============================================================

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // User connects to their private notification room
  socket.on('join_user_room', (userId) => {
    if (!userId) {
      return;
    }

    socket.join(`user_${userId}`);

    console.log(
      `User ${userId} joined their notification room`
    );
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// ============================================================
// SERVER PORT
// ============================================================

// Render automatically provides PORT.
// Local development falls back to 5000.
const PORT = process.env.PORT || 5000;

// ============================================================
// START SERVER
// ============================================================

server.listen(PORT, '0.0.0.0', () => {
  console.log(
    `Server running in ${
      process.env.NODE_ENV || 'development'
    } mode on port ${PORT}`
  );
});

// ============================================================
// HANDLE UNHANDLED PROMISE REJECTIONS
// ============================================================

process.on('unhandledRejection', (err) => {
  console.error(
    `Unhandled Promise Rejection: ${err.message}`
  );

  server.close(() => {
    process.exit(1);
  });
});

// ============================================================
// HANDLE UNCAUGHT EXCEPTIONS
// ============================================================

process.on('uncaughtException', (err) => {
  console.error(
    `Uncaught Exception: ${err.message}`
  );

  server.close(() => {
    process.exit(1);
  });
});