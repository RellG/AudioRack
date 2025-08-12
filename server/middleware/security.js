const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// Enhanced DDoS Protection
const createDDoSProtection = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Stricter in production
    message: {
      error: 'Too many requests from this IP. Please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for localhost in development
    skip: (req) => {
      return process.env.NODE_ENV !== 'production' && 
             (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip.startsWith('192.168.'));
    }
  });
};

// Aggressive rate limiting for authentication endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 attempts per 15 minutes
  message: {
    error: 'Too many authentication attempts. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Site password rate limiting (even more restrictive)
const siteAuthRateLimit = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 3, // Only 3 attempts per 30 minutes
  message: {
    error: 'Too many site authentication attempts. Access temporarily blocked.',
    retryAfter: '30 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Slow down repeated requests
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 20, // Allow 20 requests per 15 minutes at full speed
  delayMs: () => 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Max delay of 20 seconds
  validate: { delayMs: false } // Disable warning
});

// Enhanced security headers
const securityHeaders = (req, res, next) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Enhanced security headers for production
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // HSTS for HTTPS (enable when using SSL)
  if (req.secure || req.get('X-Forwarded-Proto') === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // CSP for additional protection (relaxed for site-login page)
  if (req.path === '/site-login') {
    // More permissive CSP for site login page (allows Tailwind CDN)
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com; " +
      "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' https:; " +
      "connect-src 'self'; " +
      "frame-ancestors 'none';"
    );
  } else {
    // Stricter CSP for main application
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self'; " +
      "connect-src 'self'; " +
      "frame-ancestors 'none';"
    );
  }
  
  next();
};

// IP whitelist for admin functions (if needed)
const adminIPWhitelist = process.env.ADMIN_IPS ? 
  process.env.ADMIN_IPS.split(',').map(ip => ip.trim()) : 
  ['127.0.0.1', '::1'];

const adminOnly = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  if (adminIPWhitelist.includes(clientIP) || clientIP.startsWith('192.168.')) {
    return next();
  }
  
  res.status(403).json({ 
    message: 'Admin access required from authorized IP address' 
  });
};

// Suspicious activity detection
const suspiciousActivityDetector = (req, res, next) => {
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /eval\s*\(/i,  // Code injection
    /javascript:/i,  // JavaScript injection
  ];
  
  const userAgent = req.get('User-Agent') || '';
  const queryString = JSON.stringify(req.query);
  const body = JSON.stringify(req.body || {});
  
  // Check for suspicious patterns
  const testString = `${req.url} ${queryString} ${body} ${userAgent}`;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(testString)) {
      console.warn(`🚨 SUSPICIOUS ACTIVITY DETECTED from ${req.ip}:`, {
        pattern: pattern.toString(),
        url: req.url,
        userAgent: userAgent,
        timestamp: new Date().toISOString()
      });
      
      return res.status(400).json({ 
        message: 'Invalid request detected' 
      });
    }
  }
  
  next();
};

module.exports = {
  createDDoSProtection,
  authRateLimit,
  siteAuthRateLimit,
  speedLimiter,
  securityHeaders,
  adminOnly,
  suspiciousActivityDetector
};