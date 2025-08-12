const { sequelize } = require('../database');
const User = require('./User');
const Equipment = require('./Equipment');
const EquipmentHistory = require('./EquipmentHistory');
const DeletedEquipment = require('./DeletedEquipment');

// Define relationships
Equipment.belongsTo(User, { 
  foreignKey: 'checkedBy', 
  as: 'checker' 
});

Equipment.belongsTo(User, { 
  foreignKey: 'reservedBy', 
  as: 'reserver' 
});

Equipment.hasMany(EquipmentHistory, { 
  foreignKey: 'equipmentId', 
  as: 'history' 
});

EquipmentHistory.belongsTo(Equipment, { 
  foreignKey: 'equipmentId', 
  as: 'equipment' 
});

EquipmentHistory.belongsTo(User, { 
  foreignKey: 'userId', 
  as: 'user' 
});

User.hasMany(Equipment, { 
  foreignKey: 'checkedBy', 
  as: 'checkedEquipment' 
});

User.hasMany(Equipment, { 
  foreignKey: 'reservedBy', 
  as: 'reservedEquipment' 
});

User.hasMany(EquipmentHistory, { 
  foreignKey: 'userId', 
  as: 'activities' 
});

// Deleted Equipment relationships
DeletedEquipment.belongsTo(User, { 
  foreignKey: 'deletedBy', 
  as: 'deleter' 
});

DeletedEquipment.belongsTo(User, { 
  foreignKey: 'checkedBy', 
  as: 'checker' 
});

User.hasMany(DeletedEquipment, { 
  foreignKey: 'deletedBy', 
  as: 'deletedEquipment' 
});

module.exports = {
  sequelize,
  User,
  Equipment,
  EquipmentHistory,
  DeletedEquipment
};