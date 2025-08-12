const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const EquipmentHistory = sequelize.define('EquipmentHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  equipmentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'equipment',
      key: 'id'
    }
  },
  actionType: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      isIn: [['created', 'updated', 'status_changed', 'deleted', 'restored']]
    }
  },
  oldValues: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  newValues: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  userName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  teamId: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT
  },
  ipAddress: {
    type: DataTypes.INET
  },
  userAgent: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'equipment_history',
  timestamps: true,
  updatedAt: false, // Only track creation time
  indexes: [
    {
      name: 'equipment_history_equipment_idx',
      fields: ['equipmentId']
    },
    {
      name: 'equipment_history_team_idx',
      fields: ['teamId']
    },
    {
      name: 'equipment_history_user_idx',
      fields: ['userId']
    },
    {
      name: 'equipment_history_action_idx',
      fields: ['actionType', 'createdAt']
    }
  ]
});

module.exports = EquipmentHistory;