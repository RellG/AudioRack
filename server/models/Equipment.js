const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const Equipment = sequelize.define('Equipment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  category: {
    type: DataTypes.ENUM('Camera', 'Audio', 'Lighting', 'Switching', 'Storage', 'Cables', 'Accessories'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'checked', 'issue'),
    defaultValue: 'pending'
  },
  condition: {
    type: DataTypes.ENUM('excellent', 'good', 'fair', 'needs_repair'),
    defaultValue: 'good'
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  notes: {
    type: DataTypes.TEXT,
    validate: {
      len: [0, 500]
    }
  },
  serialNumber: {
    type: DataTypes.STRING(50),
    unique: true,
    validate: {
      len: [0, 50]
    }
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
    type: DataTypes.STRING(50),
    unique: true
  },
  priority: {
    type: DataTypes.STRING(20),
    defaultValue: 'medium',
    validate: {
      isIn: [['low', 'medium', 'high', 'critical']]
    }
  },
  maintenanceDate: {
    type: DataTypes.DATE
  },
  isReserved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  reservedBy: {
    type: DataTypes.UUID,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  reservedUntil: {
    type: DataTypes.DATE
  },
  lastChecked: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  checkedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  checkedByName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  teamId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'main_team'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'equipment',
  timestamps: true,
  indexes: [
    {
      name: 'equipment_team_status_idx',
      fields: ['teamId', 'status']
    },
    {
      name: 'equipment_category_condition_idx',
      fields: ['category', 'condition']
    },
    {
      name: 'equipment_search_idx',
      fields: ['name', 'location']
    },
    {
      name: 'equipment_updated_at_idx',
      fields: ['updatedAt']
    },
    {
      name: 'equipment_priority_status_idx',
      fields: ['priority', 'status']
    },
    {
      name: 'equipment_location_category_idx',
      fields: ['location', 'category']
    },
    {
      name: 'equipment_active_team_idx',
      fields: ['isActive', 'teamId']
    }
  ],
  hooks: {
    beforeSave: (equipment) => {
      equipment.updatedAt = new Date();
    }
  }
});

module.exports = Equipment;