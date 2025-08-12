const crypto = require('crypto');

// Simple site-wide password protection
const SITE_PASSWORD_HASH = process.env.SITE_PASSWORD_HASH || 
  '7ace840182b68cc1d95d4442fa0e8699434bfa71ad942749b950d2d0c6a6ed9f'; // KingdomAudio223%

const siteAuth = (req, res, next) => {
  // Skip auth for API health check
  if (req.path === '/api/health') {
    return next();
  }
  
  // Skip auth for site login page and authentication
  if (req.path === '/site-login' || req.path === '/api/site-auth') {
    return next();
  }
  
  // Skip auth for static assets (CSS, JS, images, etc.)
  if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    return next();
  }
  
  // Skip auth for asset paths
  if (req.path.startsWith('/assets/') || req.path.startsWith('/static/')) {
    return next();
  }
  
  // Check if site session is valid
  if (req.session && req.session.siteAuthorized) {
    return next();
  }
  
  // For API calls, return JSON error
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ 
      message: 'Site access required. Please authenticate at the main page.' 
    });
  }
  
  // For web requests, redirect to site login
  res.redirect('/site-login');
};

// Site authentication endpoint
const authenticateSite = async (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ message: 'Password required' });
  }
  
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  
  if (passwordHash === SITE_PASSWORD_HASH) {
    req.session.siteAuthorized = true;
    console.log(`✅ Site access granted to ${req.ip} at ${new Date().toISOString()}`);
    res.json({ success: true, message: 'Site access granted' });
  } else {
    // Log failed attempt
    console.log(`Failed site access attempt from ${req.ip} at ${new Date().toISOString()}`);
    res.status(401).json({ success: false, message: 'Invalid site password' });
  }
};

module.exports = { siteAuth, authenticateSite };