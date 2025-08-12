const EquipmentHistory = require('../models/EquipmentHistory');

/**
 * Logs equipment activity for audit trail
 */
const logEquipmentActivity = async (actionType, equipmentId, userId, userName, teamId, oldValues = null, newValues = null, req = null) => {
  try {
    const activityData = {
      equipmentId,
      actionType,
      oldValues,
      newValues,
      userId,
      userName,
      teamId,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('User-Agent')
    };

    await EquipmentHistory.create(activityData);
  } catch (error) {
    console.error('Activity logging error:', error);
    // Don't throw - activity logging shouldn't break the main operation
  }
};

/**
 * Express middleware to capture request data for activity logging
 */
const captureRequestData = (req, res, next) => {
  // Store original body for comparison after updates
  req.originalBody = { ...req.body };
  next();
};

module.exports = {
  logEquipmentActivity,
  captureRequestData
};