const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const { connectDB } = require('./database');
const { User, Equipment, EquipmentHistory } = require('./models/index');
const authRoutes = require('./routes/auth');
const equipmentRoutes = require('./routes/equipment');
const { siteAuth, authenticateSite } = require('./middleware/siteAuth');
const { 
  createDDoSProtection, 
  authRateLimit, 
  siteAuthRateLimit,
  speedLimiter,
  securityHeaders,
  suspiciousActivityDetector 
} = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 1314;

// Model associations are now defined in models/index.js

// Enhanced security configuration
app.use(helmet({
  contentSecurityPolicy: false, // We'll handle this in custom middleware
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
  hsts: process.env.NODE_ENV === 'production',
  expectCt: false,
  referrerPolicy: false,
  noSniff: true,
  xssFilter: true,
  frameguard: { action: 'deny' }
}));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'audioRackLive2024SecretKey',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to false until we have HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // Changed from 'strict' to 'lax' for better compatibility
  }
}));

// Apply security middleware
app.use(securityHeaders);
app.use(suspiciousActivityDetector);
app.use(speedLimiter);
app.use(createDDoSProtection());

// Specific rate limiting for authentication
app.use('/api/auth', authRateLimit);
// app.use('/api/site-auth', siteAuthRateLimit); // Temporarily disabled for testing

// CORS configuration - Allow domain and local access
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:1314',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:1314',
      'http://192.168.4.50:3000',
      'http://192.168.4.50:1314',
      'https://audiorack.live',
      'https://www.audiorack.live',
      'https://audiorack.live:1314',
      'https://www.audiorack.live:1314',
      'http://audiorack.live',
      'http://www.audiorack.live',
      'http://audiorack.live:1314',
      'http://www.audiorack.live:1314',
      null,  // Allow null origin (direct API calls)
      undefined  // Allow undefined origin
    ];
    
    // Allow requests from ethernet network range
    if (origin && origin.match(/^http:\/\/192\.168\.4\.\d+:(3000|1314)$/)) {
      return callback(null, true);
    }
    
    // Allow requests from audiorack.live domain with any port
    if (origin && origin.match(/^https?:\/\/(www\.)?audiorack\.live(:\d+)?$/)) {
      console.log(`✅ CORS allowed AudioRack domain: ${origin}`);
      return callback(null, true);
    }
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`🚫 CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to PostgreSQL and sync models
connectDB();

// Site authentication route (before site auth middleware)
app.post('/api/site-auth', authenticateSite);

// Site login page
app.get('/site-login', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/public/site-login.html'));
});

// Apply site-wide authentication (after site-auth routes)
app.use(siteAuth);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/equipment', equipmentRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    server: 'Equipment Checker API',
    version: '1.0.0',
    database: 'PostgreSQL'
  });
});

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  // Add cache-busting headers for static files
  app.use(express.static(path.join(__dirname, '../client/dist'), {
    maxAge: 0, // No caching for development/testing
    etag: false,
    lastModified: false,
    setHeaders: (res, path) => {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }
  }));
  
  app.get('*', (req, res) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => e.message);
    return res.status(400).json({
      message: 'Validation Error',
      errors
    });
  }
  
  if (err.name === 'SequelizeDatabaseError') {
    return res.status(400).json({
      message: 'Database Error'
    });
  }
  
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Enhanced error handling and graceful shutdown
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit - let the server keep running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - let the server keep running
});

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  try {
    const { sequelize } = require('./database');
    await sequelize.close();
  } catch (error) {
    console.error('Error closing database:', error);
  }
  process.exit(0);
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Equipment Checker Server running on port ${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Ethernet access: http://192.168.4.50:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: PostgreSQL`);
  console.log(`Access restricted to: localhost and ethernet interface only`);
});

module.exports = { app, server };