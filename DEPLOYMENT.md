# Equipment Checker - Ethernet-Only Deployment

## Current Configuration

The Equipment Checker application is now configured to run with **ethernet interface access only**, with no WiFi connectivity.

### 🌐 Access Points (Ethernet Only):

**Main Application (WORKING):**
- **Production**: `http://192.168.4.50:1314` (Complete app - RECOMMENDED)
- **Development Frontend**: `http://192.168.4.50:3000` (React dev server)
- **Backend API**: `http://192.168.4.50:1314/api`
- **Localhost**: `http://localhost:1314` (production) or `http://localhost:3000` (dev)

### 🔒 Security Configuration:

**Firewall Rules:**
- SSH: Allowed from ethernet network (192.168.4.0/24) and localhost
- Port 1314 (Backend): Allowed from ethernet network and localhost only
- Port 3000 (Frontend): Allowed from ethernet network and localhost only
- WiFi access: **BLOCKED** - no access from WiFi interface (192.168.4.137)

**CORS Policy:**
- Only allows requests from:
  - `localhost:3000`, `localhost:1314`
  - `127.0.0.1:3000`, `127.0.0.1:1314`
  - `192.168.4.50:3000`, `192.168.4.50:1314` (ethernet only)

### 🚀 Starting the Application:

**✅ RECOMMENDED - Production Mode:**
```bash
# Single command - serves complete app on port 1314
npm start
```

**Development Mode (optional):**
```bash
# Start both frontend and backend separately
npm run dev

# Or run separately:
npm run server  # Backend on port 1314
npm run client  # Frontend on port 3000
```

### 📱 Team Access:

Team members can access the application from devices connected to the **ethernet network** only:

1. **Connect devices** to the same ethernet network as the Raspberry Pi
2. **Navigate to**: `http://192.168.4.50:1314` (production app)
3. **First-time setup**: Register with name, phone number, and team ID
4. **Returning users**: Login with just phone number
5. **Team collaboration**: Share the same team ID to see shared equipment
6. **Ready for events**: Use during audio/video events and equipment setups

### 🔧 Production Deployment:

**✅ CURRENT STATUS: DEPLOYED AND WORKING**

Production deployment is active and serving the complete application on port 1314:

```bash
# Production server is running (serves built React app + API)
NODE_ENV=production npm start
```

**Access at**: `http://192.168.4.50:1314`

**Features working:**
- ✅ Simplified authentication (phone + name)
- ✅ Equipment management interface
- ✅ Real-time status updates
- ✅ Team-based access control
- ✅ PostgreSQL database
- ✅ JWT authentication
- ✅ Ethernet-only security

### 🔐 Future Public Access:

When ready to enable public access, you can:

1. **Update CORS settings** in `server/server.js` to allow your domain
2. **Configure firewall** to allow external access to port 1314
3. **Set up reverse proxy** (nginx) with SSL/HTTPS
4. **Update environment variables** for production domain

### 📊 Network Interface Information:

- **Ethernet (eth0)**: `192.168.4.50` ✅ **ENABLED**  
- **WiFi (wlan0)**: `192.168.4.137` ❌ **DISABLED**
- **Localhost**: `127.0.0.1` ✅ **ENABLED**

### 🎯 Current Status:
- ✅ **Application fully deployed and working**
- ✅ Production server running on port 1314
- ✅ Simplified authentication system active
- ✅ Equipment management interface functional
- ✅ Ethernet-only access configured
- ✅ WiFi access blocked for security  
- ✅ PostgreSQL database running and connected
- ✅ JWT middleware fixed and working
- ✅ Firewall properly configured
- ✅ CORS restricted to ethernet interface
- ✅ **Ready for team production use**