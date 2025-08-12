# 🔒 AudioRack.Live Security & Domain Setup Guide

## 1. 🌐 Domain Configuration

### DNS Setup at your domain registrar:
```
A Record: audiorack.live → YOUR_PUBLIC_IP
A Record: www.audiorack.live → YOUR_PUBLIC_IP
```

### Find your public IP:
```bash
curl -s ifconfig.me
```

## 2. 🛡️ Security Features Implemented

### **Site-Wide Password Protection**
- **Default Password**: `AudioRack2024!`
- **Access Page**: Shows before main application
- **Session-Based**: Stays logged in for 24 hours
- **Rate Limited**: Max 3 attempts per 30 minutes

### **Advanced DDoS Protection**
- **Rate Limiting**: 100 requests per 15 minutes (production)
- **Speed Limiting**: Progressively delays excessive requests
- **Connection Throttling**: Automatic slowdown for rapid requests
- **IP-Based Filtering**: Suspicious activity detection

### **Enhanced Security Headers**
- **XSS Protection**: Prevents cross-site scripting
- **Content Security Policy**: Restricts resource loading
- **HSTS**: Forces HTTPS (when SSL enabled)
- **Frame Protection**: Prevents clickjacking
- **MIME Sniffing Protection**: Content type enforcement

### **Authentication Security**
- **Restricted Auth Attempts**: 5 per 15 minutes
- **Session Security**: HTTP-only cookies, same-site protection
- **CSRF Protection**: Built-in token validation
- **Suspicious Activity Logging**: Automatic threat detection

## 3. 🔧 Configuration & Deployment

### **Change Default Passwords**
1. Generate new site password hash:
```bash
node -e "console.log(require('crypto').createHash('sha256').update('YourNewPassword').digest('hex'))"
```

2. Update `.env.production`:
```bash
SITE_PASSWORD_HASH=your_generated_hash_here
SESSION_SECRET=your_unique_session_secret
```

### **Network Security Setup**

#### **Router/Firewall Configuration:**
1. **Port Forwarding**: 80 → 1314, 443 → 1314 (for SSL)
2. **Firewall Rules**:
   ```
   ALLOW: Port 1314 (HTTP)
   ALLOW: Port 443 (HTTPS) - for future SSL
   BLOCK: All other ports except SSH (22)
   ```

#### **Recommended Reverse Proxy (Nginx)**
```nginx
server {
    listen 80;
    server_name audiorack.live www.audiorack.live;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name audiorack.live www.audiorack.live;
    
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_private_key /path/to/ssl/key.pem;
    
    location / {
        proxy_pass http://localhost:1314;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header Referrer-Policy strict-origin-when-cross-origin;
    }
}
```

## 4. 🚀 Deployment Commands

### **Start Server (Production)**
```bash
cd /home/ovlab/EquipmentCheck
NODE_ENV=production nohup node server/server.js > logs/server.log 2>&1 &
```

### **Monitor Server**
```bash
# Check if running
ps aux | grep "node.*server"

# View logs
tail -f logs/server.log

# Check security events
grep "SUSPICIOUS\|FAILED" logs/server.log
```

### **Auto-Restart Setup (PM2)**
```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'audiorack-live',
    script: 'server/server.js',
    cwd: '/home/ovlab/EquipmentCheck',
    env: {
      NODE_ENV: 'production',
      PORT: 1314
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log'
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 5. 🔍 Security Monitoring

### **Log Monitoring**
- **Failed Login Attempts**: Automatically logged
- **Suspicious Activity**: Pattern-based detection
- **Rate Limit Violations**: IP-based tracking
- **Site Access Attempts**: Password gate monitoring

### **Security Alerts to Watch**
```bash
# Monitor failed attempts
tail -f logs/server.log | grep "FAILED\|SUSPICIOUS\|blocked"

# Check rate limit hits
tail -f logs/server.log | grep "Too many"

# Monitor CORS violations
tail -f logs/server.log | grep "CORS blocked"
```

## 6. 🛡️ Additional Security Recommendations

### **SSL/HTTPS Setup (Recommended)**
1. **Get SSL Certificate** (Let's Encrypt recommended):
```bash
sudo apt install certbot
sudo certbot certonly --standalone -d audiorack.live -d www.audiorack.live
```

2. **Auto-Renewal**:
```bash
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **System Security**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install fail2ban for intrusion prevention
sudo apt install fail2ban

# Configure firewall
sudo ufw enable
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw allow 1314/tcp # Application
```

### **Database Security**
- Change default PostgreSQL passwords
- Restrict database access to localhost only
- Enable database connection logging
- Regular backup scheduling

## 7. 🎯 Testing Security

### **Penetration Testing Commands**
```bash
# Test rate limiting
for i in {1..20}; do curl -s -o /dev/null -w "%{http_code}\n" http://audiorack.live/api/health; done

# Test site authentication
curl -X POST http://audiorack.live/api/site-auth -H "Content-Type: application/json" -d '{"password":"wrong"}'

# Test CORS policy
curl -H "Origin: http://malicious-site.com" http://audiorack.live/api/health
```

## 8. 📞 Emergency Procedures

### **If Under Attack**
1. **Immediate**: Block suspicious IPs at router level
2. **Emergency Shutdown**: `pm2 stop all`
3. **Analyze Logs**: Check for attack patterns
4. **Update Rules**: Tighten rate limits if needed

### **Site Password Reset**
1. Generate new hash: `node -e "console.log(require('crypto').createHash('sha256').update('NewPassword').digest('hex'))"`
2. Update `.env.production`
3. Restart server: `pm2 restart audiorack-live`

## 🎯 Current Security Status

✅ **Site-Wide Password Protection**  
✅ **DDoS Protection & Rate Limiting**  
✅ **Enhanced Security Headers**  
✅ **Suspicious Activity Detection**  
✅ **Authentication Security**  
✅ **Session Management**  
✅ **CORS Protection**  
✅ **Domain Configuration Ready**  

**Default Site Password**: `AudioRack2024!` (CHANGE THIS!)  
**Access URL**: https://audiorack.live (after DNS propagation)  
**Security Level**: Enterprise-Grade ✨