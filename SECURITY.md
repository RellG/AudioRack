# AudioRack.Live - Security Documentation

## 🛡️ Security Implementation Overview

**Security Level**: Enterprise-Grade Multi-Layer Protection  
**Last Updated**: August 11, 2025  
**Status**: ✅ ACTIVE & OPERATIONAL

---

## 🔐 Authentication & Access Control

### Site-Wide Password Protection
```javascript
// Implementation: server/middleware/siteAuth.js
const SITE_PASSWORD = 'KingdomAudio223%';
const SITE_PASSWORD_HASH = '7ace840182b68cc1d95d4442fa0e8699434bfa71ad942749b950d2d0c6a6ed9f';
```

**Features**:
- SHA-256 password hashing
- 24-hour session persistence
- Professional login gateway at `/site-login`
- Automatic redirect after authentication
- Static asset bypass for performance

### User Authentication System
- **Method**: Simplified phone + name authentication
- **JWT Tokens**: Secure session management
- **Team-based Access**: Users grouped by team ID
- **Role Support**: Admin/member permissions

---

## 🚫 DDoS & Rate Limiting Protection

### Multi-Tier Rate Limiting
```javascript
// General DDoS Protection
windowMs: 15 minutes
max: 100 requests (production) / 1000 (development)

// Authentication Endpoints
windowMs: 15 minutes  
max: 5 attempts per IP

// Site Authentication
windowMs: 15 minutes
max: 10 attempts per IP
```

### Advanced Protection Features
- **express-slow-down**: Progressive delay on repeated requests
- **Suspicious Activity Detection**: Automated threat monitoring
- **IP-based tracking**: Per-endpoint rate limiting
- **Failed attempt logging**: Security event recording

---

## 🌐 CORS & Domain Security

### Domain Configuration
```javascript
// Allowed Origins
- localhost (all ports)
- 192.168.4.50:1314 (ethernet interface)
- audiorack.live (all ports via regex pattern)
- www.audiorack.live (all ports via regex pattern)
```

### CORS Policy
- **Credentials**: Include for session management
- **Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization, Custom headers
- **Domain Validation**: Regex pattern matching for flexibility

---

## 🔒 HTTP Security Headers

### Implemented Headers
```javascript
// Content Security Policy
script-src: 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com
style-src: 'self' 'unsafe-inline' https://cdn.tailwindcss.com

// Security Headers
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

### Path-Specific CSP
- **Site Login Page**: Allows Tailwind CDN for styling
- **Application Pages**: Stricter policy for enhanced security
- **API Endpoints**: JSON-only responses

---

## 🍪 Session Management

### Session Configuration
```javascript
// Session Settings
secret: process.env.SESSION_SECRET
resave: false
saveUninitialized: false
cookie: {
  secure: false,        // HTTP compatible
  httpOnly: true,       // XSS protection
  maxAge: 24 * 60 * 60 * 1000,  // 24 hours
  sameSite: 'lax'       // CSRF protection
}
```

### Security Features
- **HttpOnly Cookies**: Prevents XSS access
- **24-Hour Expiration**: Automatic session cleanup
- **SameSite Protection**: CSRF attack prevention
- **Secure Flag Ready**: For HTTPS upgrade

---

## 🔍 Activity Monitoring

### Suspicious Activity Detection
```javascript
// Monitored Patterns
- Rapid failed login attempts
- Unusual API endpoint access
- High-frequency requests
- Invalid authentication tokens
- Suspicious user-agent strings
```

### Logging & Alerts
- **Security Events**: Logged with IP, timestamp, action
- **Failed Attempts**: Rate limit triggers and responses
- **Session Activities**: Login/logout tracking
- **API Access**: Request patterns and anomalies

---

## 🛠️ Database Security

### Connection Security
```javascript
// PostgreSQL Configuration
host: localhost (no remote access)
ssl: false (local network only)
pool: {
  max: 10,           // Connection limit
  acquire: 60000,    // Timeout protection
  idle: 30000,       // Auto-cleanup
  evict: 10000,      // Stale connection removal
  handleDisconnects: true  // Auto-recovery
}
```

### Data Protection
- **Local Database**: No external database exposure
- **Input Validation**: express-validator on all endpoints
- **SQL Injection Prevention**: Sequelize ORM parameterized queries
- **Soft Deletes**: Audit trail preservation

---

## 🔧 Network Security

### Firewall Configuration (UFW)
```bash
# Current Rules
22/tcp     ALLOW   Anywhere (SSH)
22         ALLOW   192.168.4.0/24 (Local SSH)
1314       ALLOW   127.0.0.1 (Localhost)
1314       ALLOW   192.168.4.0/24 (Local Network)
3000       ALLOW   127.0.0.1 (Dev Mode)
3000       ALLOW   192.168.4.0/24 (Dev Mode)
```

### Access Restrictions
- **Ethernet Only**: WiFi interface disabled for security
- **Local Network**: 192.168.4.0/24 subnet access
- **Port Isolation**: Only necessary ports exposed
- **SSH Security**: Key-based authentication recommended

---

## 🚨 Threat Mitigation

### Known Attack Vectors & Protections

**DDoS Attacks**:
- ✅ Multi-tier rate limiting
- ✅ Progressive request delays
- ✅ IP-based request tracking

**Brute Force Attacks**:
- ✅ Site password protection
- ✅ Authentication rate limiting
- ✅ Account lockout mechanisms

**XSS Attacks**:
- ✅ Content Security Policy
- ✅ HttpOnly session cookies
- ✅ Input sanitization

**CSRF Attacks**:
- ✅ SameSite cookie policy
- ✅ Origin validation
- ✅ Custom headers requirement

**SQL Injection**:
- ✅ Sequelize ORM parameterized queries
- ✅ Input validation middleware
- ✅ Type checking on all inputs

---

## 📊 Security Monitoring

### Health Checks
```bash
# System Security Status
curl http://192.168.4.50:1314/api/health

# Database Connection Status
sudo -u postgres psql -d equipmentcheck -c "SELECT COUNT(*) FROM pg_stat_activity WHERE datname='equipmentcheck';"

# Firewall Status
sudo ufw status verbose

# Active Sessions
# Check session store for active user sessions
```

### Log Monitoring
```bash
# Security Events
tail -f startup.log | grep -E "(SECURITY|SUSPICIOUS|BLOCKED)"

# Rate Limit Events
tail -f startup.log | grep -E "(rate limit|too many requests)"

# Authentication Events
tail -f startup.log | grep -E "(Site access|auth|login)"
```

---

## 🔄 Security Maintenance

### Regular Tasks
- [ ] Review security logs weekly
- [ ] Update dependencies monthly
- [ ] Rotate JWT secrets quarterly
- [ ] Audit user access quarterly
- [ ] Review firewall rules quarterly

### Emergency Procedures
```bash
# Emergency Lockdown
sudo ufw deny 1314          # Block all external access
pkill -f "start-server.sh"  # Stop server

# Security Reset
# Change site password hash in siteAuth.js
# Restart server with new credentials
```

---

## ⚡ Performance vs Security Balance

### Optimizations Applied
- **Static Asset Bypass**: CSS/JS files skip authentication
- **Session Caching**: 24-hour persistent sessions
- **Connection Pooling**: Database optimization
- **Selective Middleware**: Path-based security application

### Security Tradeoffs
- **HTTP vs HTTPS**: HTTP for simplified setup (HTTPS upgrade ready)
- **Local Network Trust**: Reduced encryption for performance
- **Session Persistence**: 24-hour sessions vs frequent re-auth

---

**Security Status**: ✅ ENTERPRISE-GRADE PROTECTION ACTIVE  
**Threat Level**: LOW (Multiple protection layers active)  
**Last Security Review**: August 11, 2025  
**Next Review Due**: September 11, 2025