const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const DeletedEquipment = sequelize.define('DeletedEquipment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  originalEquipmentId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Original ID from Equipment table'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('Camera', 'Audio', 'Lighting', 'Switching', 'Storage', 'Cables', 'Accessories'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'checked', 'issue'),
    allowNull: false
  },
  condition: {
    type: DataTypes.ENUM('excellent', 'good', 'fair', 'needs_repair'),
    allowNull: false
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT
  },
  serialNumber: {
    type: DataTypes.STRING(50)
  },
  purchaseDate: {
    type: DataTypes.DATEONLY
  },
  warrantyExpiry: {
    type: DataTypes.DATEONLY
  },
  purchasePrice: {
    type: DataTypes.DECIMAL(10, 2)
  },
  vendor: {
    type: DataTypes.STRING(100)
  },
  model: {
    type: DataTypes.STRING(100)
  },
  barcode: {
    type: DataTypes.STRING(50)
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium'
  },
  maintenanceDate: {
    type: DataTypes.DATE
  },
  isReserved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  reservedBy: {
    type: DataTypes.STRING(100)
  },
  reservedUntil: {
    type: DataTypes.DATE
  },
  lastChecked: {
    type: DataTypes.DATE,
    allowNull: false
  },
  checkedBy: {
    type: DataTypes.UUID,
    allowNull: false
  },
  checkedByName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  teamId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'global'
  },
  // Deletion tracking fields
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  deletedBy: {
    type: DataTypes.UUID,
    allowNull: false
  },
  deletedByName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  deletionReason: {
    type: DataTypes.STRING(255),
    comment: 'Optional reason for deletion'
  },
  // Original timestamps from Equipment table
  originalCreatedAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  originalUpdatedAt: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'deleted_equipment',
  indexes: [
    {
      fields: ['deletedAt']
    },
    {
      fields: ['deletedBy']
    },
    {
      fields: ['category']
    },
    {
      fields: ['teamId']
    },
    {
      fields: ['originalEquipmentId']
    }
  ]
});

module.exports = DeletedEquipment;