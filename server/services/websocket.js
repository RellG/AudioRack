const { Server } = require('socket.io');

class WebSocketService {
  constructor() {
    this.io = null;
    this.equipmentNS = null;
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: [
          'http://localhost:3000',
          'http://localhost:1314',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:1314',
          'http://192.168.4.50:3000',
          'http://192.168.4.50:1314',
          'https://audiorack.live',
          'https://www.audiorack.live'
        ],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupNamespaces();
    console.log('✅ WebSocket service initialized');
  }

  setupNamespaces() {
    // Equipment-specific namespace
    this.equipmentNS = this.io.of('/equipment');
    
    this.equipmentNS.on('connection', (socket) => {
      console.log(`🔌 Equipment client connected: ${socket.id}`);
      
      // Join team-specific room (default to global for current setup)
      socket.on('join-team', (teamId = 'global') => {
        socket.join(`team-${teamId}`);
        console.log(`👥 Socket ${socket.id} joined team-${teamId}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`🔌 Equipment client disconnected: ${socket.id}`);
      });

      // Auto-join global team for current setup
      socket.join('team-global');
    });
  }

  // Broadcast equipment changes to all connected clients
  broadcastEquipmentUpdate(operation, equipment, teamId = 'global') {
    if (!this.equipmentNS) {
      console.warn('⚠️ WebSocket not initialized, skipping broadcast');
      return;
    }

    const updateData = {
      operation, // 'create', 'update', 'delete', 'restore'
      equipment: this.sanitizeEquipmentData(equipment),
      timestamp: new Date().toISOString()
    };

    console.log(`📡 Broadcasting equipment ${operation} to team-${teamId}:`, equipment.name || equipment.id);
    this.equipmentNS.to(`team-${teamId}`).emit('equipment-update', updateData);
  }

  // Broadcast stats updates
  broadcastStatsUpdate(stats, teamId = 'global') {
    if (!this.equipmentNS) return;

    this.equipmentNS.to(`team-${teamId}`).emit('stats-update', {
      stats,
      timestamp: new Date().toISOString()
    });
  }

  // Broadcast activity feed updates
  broadcastActivity(activity, teamId = 'global') {
    if (!this.equipmentNS) return;

    this.equipmentNS.to(`team-${teamId}`).emit('activity-update', {
      activity,
      timestamp: new Date().toISOString()
    });
  }

  // Sanitize equipment data for client consumption
  sanitizeEquipmentData(equipment) {
    if (!equipment) return null;
    
    // Convert Sequelize model to plain object if needed
    const plainEquipment = equipment.toJSON ? equipment.toJSON() : equipment;
    
    return {
      ...plainEquipment,
      _id: plainEquipment.id // Frontend expects _id
    };
  }

  // Get connection status
  getConnectionStats() {
    if (!this.equipmentNS) return { connected: 0 };
    
    return {
      connected: this.equipmentNS.sockets.size,
      rooms: Object.keys(this.equipmentNS.adapter.rooms)
    };
  }
}

// Export singleton instance
const webSocketService = new WebSocketService();
module.exports = webSocketService;