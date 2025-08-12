const axios = require('axios');

class CyphorLogsService {
  constructor() {
    this.baseUrl = process.env.CYPHOR_LOGS_URL || 'http://192.168.4.154:3000/api/audiorack';
    this.source = process.env.CYPHOR_LOGS_SOURCE || 'equipment-checker-192.168.4.50';
  }

  async sendLog(level, message, equipmentData = null, user = null, metadata = null) {
    try {
      const logEntry = {
        level: level.toUpperCase(),
        message,
        source: this.source,
        ...(equipmentData && { equipment: equipmentData }),
        ...(user && { user }),
        ...(metadata && { metadata })
      };

      console.log('🔄 Sending log to CyphorLogs:', { url: this.baseUrl, logEntry });

      const response = await axios.post(this.baseUrl, logEntry, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });

      console.log('✅ CyphorLogs response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to send log to CyphorLogs:', error.message);
      if (error.response) {
        console.error('❌ Response data:', error.response.data);
        console.error('❌ Response status:', error.response.status);
      }
      return null;
    }
  }

  // Equipment operation helpers
  async logEquipmentCreate(equipment, user) {
    return this.sendLog('INFO', `Equipment created: ${equipment.name}`, {
      id: equipment.id,
      name: equipment.name,
      location: equipment.location,
      operation: 'CREATE'
    }, user);
  }

  async logEquipmentUpdate(equipment, oldValues, newValues, user) {
    return this.sendLog('INFO', `Equipment updated: ${equipment.name}`, {
      id: equipment.id,
      name: equipment.name,
      location: equipment.location || newValues.location,
      operation: 'UPDATE',
      oldValue: oldValues,
      newValue: newValues
    }, user);
  }

  async logEquipmentDelete(equipment, user) {
    return this.sendLog('WARN', `Equipment deleted: ${equipment.name}`, {
      id: equipment.id,
      name: equipment.name,
      location: equipment.location,
      operation: 'DELETE'
    }, user);
  }

  async logEquipmentMove(equipment, oldLocation, newLocation, user) {
    return this.sendLog('INFO', `Equipment moved: ${equipment.name} from ${oldLocation} to ${newLocation}`, {
      id: equipment.id,
      name: equipment.name,
      location: newLocation,
      operation: 'MOVE',
      oldValue: { location: oldLocation },
      newValue: { location: newLocation }
    }, user);
  }

  async logStatusChange(equipment, oldStatus, newStatus, user) {
    return this.sendLog('INFO', `Equipment status changed: ${equipment.name} from ${oldStatus} to ${newStatus}`, {
      id: equipment.id,
      name: equipment.name,
      location: equipment.location,
      operation: 'STATUS_CHANGE',
      oldValue: { status: oldStatus },
      newValue: { status: newStatus }
    }, user);
  }

  async logEquipmentRestore(equipment, user) {
    return this.sendLog('INFO', `Equipment restored: ${equipment.name}`, {
      id: equipment.id,
      name: equipment.name,
      location: equipment.location,
      operation: 'RESTORE'
    }, user);
  }
}

module.exports = new CyphorLogsService();