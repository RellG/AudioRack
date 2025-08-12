# Equipment Checker - Team Equipment Management System

A modern MERN stack web application for managing A/V equipment in teams. Built specifically for audio/video professionals who need to track equipment status during events and setups.

## Features

### 🔐 Authentication & Security
- **Site-wide Password Protection**: Domain-level access control (KingdomAudio223%)
- **Simplified Authentication**: Phone number + name only (no passwords)
- JWT-based session management
- Team-based access control
- Role-based permissions (admin/member)
- **Enterprise Security**: DDoS protection, rate limiting, security headers
- **Domain Access**: audiorack.live with SSL-ready configuration
- **Network Flexibility**: Local ethernet + external domain access

### 📋 Equipment Management
- Add/edit/remove equipment
- Real-time status updates (pending/checked/issue)
- Condition tracking (excellent/good/fair/needs_repair)
- Category organization (Camera, Audio, Lighting, Switching, Storage, Cables, Accessories)
- Location tracking
- Notes and maintenance history
- Serial number tracking
- Search and filter capabilities

### 📊 Dashboard & Analytics
- Live equipment statistics
- Status overview cards
- Team activity tracking
- Real-time updates every 30 seconds

### 🎨 Modern UI/UX
- Dark theme optimized for low-light environments
- Responsive design for mobile and desktop
- Tailwind CSS with custom components
- Lucide React icons

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: Simplified JWT (phone + name only)
- **State Management**: TanStack Query (React Query)
- **Build Tools**: Vite for fast development and builds
- **Deployment**: Single-port production build (port 1314)

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+ (local installation recommended for Raspberry Pi)
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
# Install server dependencies
npm install

# Install client dependencies  
cd client && npm install && cd ..
```

2. **Set up environment variables:**
```bash
# Copy example files
cp .env.example .env
cp client/.env.example client/.env

# Edit .env files with your settings
```

3. **Start PostgreSQL:**
```bash
# On Raspberry Pi with local PostgreSQL
sudo systemctl start postgresql
sudo -u postgres createdb equipmentcheck

# Or use Docker
docker run -d -p 5432:5432 --name postgres -e POSTGRES_DB=equipmentcheck -e POSTGRES_PASSWORD=password postgres:13
```

4. **Run the application:**
```bash
# Production mode (recommended - single port 1314)
npm start

# Development mode (runs both frontend and backend separately)
npm run dev

# Or run separately:
npm run server    # Backend on port 1314
npm run client    # Frontend on port 3000
```

5. **Access the application:**
- **External Domain**: http://audiorack.live (with DNS configured)
- **Local Network**: http://192.168.4.50:1314 (ethernet interface)
- **Localhost**: http://localhost:1314
- **Backend API**: http://audiorack.live/api or http://192.168.4.50:1314/api
- **Health Check**: http://audiorack.live/api/health

## Network Configuration & Domain Setup

### 🌐 External Access via audiorack.live

**Domain Configuration:**
- **Primary Domain**: audiorack.live
- **Public IP**: 32.216.215.252
- **Site Password**: KingdomAudio223%
- **SSL Support**: Ready for HTTPS upgrade

**DNS Setup Required:**
```
A Record: audiorack.live → 32.216.215.252
A Record: www.audiorack.live → 32.216.215.252
```

**Router Port Forwarding:**
- External Port 80 → Internal 192.168.4.50:1314
- Alternative: External Port 8080 → Internal 192.168.4.50:1314

### 🏠 Local Network Access

- **Production Server**: http://192.168.4.50:1314
- **Ethernet Interface**: 192.168.4.50 ✅ ENABLED
- **CORS**: Configured for both local and domain access
- **Firewall**: UFW configured for secure access

**Local Access Methods:**
1. **Same Network**: http://192.168.4.50:1314
2. **Via Domain**: http://audiorack.live (after DNS setup)
3. **Localhost**: http://localhost:1314 (Pi only)

## Production Deployment

### Recommended Startup Method:

**Using Auto-Restart Script (Recommended):**
```bash
# Build the client
cd client && npm run build && cd ..

# Start with auto-restart and error recovery
chmod +x start-server.sh
nohup ./start-server.sh > startup.log 2>&1 &

# Monitor status
tail -f startup.log
```

**The startup script provides:**
- Automatic database connection cleanup
- Server crash recovery
- Continuous operation
- Error logging

### Alternative: Using PM2:

```bash
# Install PM2 for process management
npm install -g pm2

# Start in production
NODE_ENV=production pm2 start server/server.js --name equipment-checker

# Set up auto-start
pm2 startup
pm2 save
```

### Database Configuration:

```bash
# PostgreSQL setup (already configured)
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Database is automatically created on first run
# Connection pool optimized for stability
```

### Environment Variables for Production:

```bash
# .env
NODE_ENV=production
PORT=1314
DB_NAME=equipmentcheck
DB_USER=equipmentuser
DB_PASSWORD=equipmentpass123
DB_HOST=localhost
DB_PORT=5432
JWT_SECRET=audioRackLive2024SecretKey
SESSION_SECRET=audioRackLive2024SecretKey
SITE_PASSWORD_HASH=7ace840182b68cc1d95d4442fa0e8699434bfa71ad942749b950d2d0c6a6ed9f

# client/.env
VITE_API_URL=/api
```

**Security Notes:**
- `SITE_PASSWORD_HASH` is SHA-256 hash of "KingdomAudio223%"
- Site password protects entire application before user login
- Database connection pool optimized for concurrent operations
- Activity logging temporarily disabled to prevent deadlocks

## API Endpoints

### Site Authentication
- `POST /api/site-auth` - Site-wide password authentication
- `GET /site-login` - Site login page

### User Authentication (Simplified)
- `POST /api/auth/login` - User login (phone number only)
- `POST /api/auth/register` - User registration (phone + name + teamId)

### Equipment Management
- `GET /api/equipment` - Get all equipment (with filters)
- `POST /api/equipment` - Create equipment
- `PUT /api/equipment/:id` - Update equipment
- `DELETE /api/equipment/:id` - Delete equipment (soft delete)
- `GET /api/equipment/stats` - Get equipment statistics
- `GET /api/equipment/deleted` - Get soft-deleted equipment
- `POST /api/equipment/deleted/:id/restore` - Restore deleted equipment

### System Health
- `GET /api/health` - Server health check

## Security Features

### 🛡️ Multi-Layer Security
- **Site-Wide Protection**: Domain-level password gate (SHA-256 hashed)
- **DDoS Protection**: Advanced rate limiting with express-slow-down
- **Suspicious Activity Detection**: Automated threat monitoring
- **CORS Security**: Configured for audiorack.live domain + local access
- **Security Headers**: XSS protection, HSTS, frame protection
- **Content Security Policy**: Tailwind CDN whitelisting for login page
- **Session Management**: 24-hour secure cookies with httpOnly
- **Input Validation**: express-validator for all endpoints
- **JWT Authentication**: Secure token-based user sessions

### 🔒 Access Control
- **Dual Access**: Local network (192.168.4.50:1314) + Domain (audiorack.live)
- **Firewall Ready**: UFW configured for port security
- **Network Flexibility**: Supports both internal and external access
- **SSL Ready**: Configured for easy HTTPS upgrade

## Team Usage

### Setup for New Team:
1. **First user registers**: Enter name, phone number, and team ID (e.g., "audio_team_2024")
2. **Share team ID**: Give same team ID to other members during registration
3. **Team access**: All team members see the same equipment list
4. **Simple login**: Returning users only need their phone number to log in
5. Admin users can manage team settings (future feature)

### During Events:
1. Team members log in on their devices
2. Check equipment status in real-time
3. Mark items as checked/issue/pending
4. Add notes for problems or maintenance needs
5. Monitor overall progress on dashboard

## Development

### Project Structure:
```
/
├── server/
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express routes
│   ├── middleware/      # Auth and validation
│   └── server.js        # Main server file
├── client/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── context/     # React context
│   │   ├── services/    # API services
│   │   └── types/       # TypeScript types
│   └── public/
└── package.json
```

### Available Scripts:
- `npm run dev` - Development mode
- `npm run server` - Backend only
- `npm run client` - Frontend only
- `npm run build` - Build for production
- `npm start` - Production mode

## Troubleshooting

### Common Issues:

1. **PostgreSQL Connection Error:**
   - Check PostgreSQL is running: `sudo systemctl status postgresql`
   - Verify database exists: `sudo -u postgres psql -c "\l"`
   - Check connection settings in `.env`

2. **Port Already in Use:**
   - Change PORT in `.env` file
   - Kill existing process: `sudo lsof -ti:1314 | xargs kill -9`

3. **Network Access Issues:**
   - Check firewall settings: `sudo ufw status`
   - Verify Pi's IP address: `hostname -I`

4. **Authentication Problems:**
   - Clear browser localStorage
   - Verify JWT_SECRET in `.env`

## Contributing

This is a team equipment management tool. Contributions welcome for:
- Additional equipment categories
- Enhanced reporting features
- Mobile app companion
- Integration with equipment databases
- Backup and export features

## License

MIT License - Feel free to use for your team's equipment management needs.

---

**Built for A/V professionals who need reliable equipment tracking during live events and setups.**