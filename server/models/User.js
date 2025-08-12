const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 50]
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [8, 20]
    },
    set(value) {
      // Clean up phone number - remove spaces, dashes, etc.
      const cleaned = value.replace(/\D/g, '');
      this.setDataValue('phone', cleaned);
    }
  },
  role: {
    type: DataTypes.ENUM('admin', 'member'),
    defaultValue: 'member'
  },
  teamId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'main_team'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastLogin: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'users',
  timestamps: true
});

User.prototype.toJSON = function() {
  const values = { ...this.get() };
  return values;
};

module.exports = User;