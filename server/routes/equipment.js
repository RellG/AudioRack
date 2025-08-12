const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op, fn, col } = require('sequelize');
const { sequelize } = require('../database');
const Equipment = require('../models/Equipment');
const User = require('../models/User');
const EquipmentHistory = require('../models/EquipmentHistory');
const DeletedEquipment = require('../models/DeletedEquipment');
const { protect } = require('../middleware/auth');
const { logEquipmentActivity, captureRequestData } = require('../middleware/activityLogger');
const cyphorLogs = require('../services/cyphorLogs');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(captureRequestData);

// @route   GET /api/equipment
// @desc    Get all equipment for user's team
// @access  Private
router.get('/', [
  query('search').optional().trim().escape(),
  query('category').optional().isIn(['Camera', 'Audio', 'Lighting', 'Switching', 'Storage', 'Cables', 'Accessories']),
  query('status').optional().isIn(['pending', 'checked', 'issue']),
  query('condition').optional().isIn(['excellent', 'good', 'fair', 'needs_repair'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { search, category, status, condition } = req.query;
    
    let whereClause = { 
      isActive: true
    };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { location: { [Op.iLike]: `%${search}%` } },
        { notes: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (category) {
      whereClause.category = category;
    }

    if (status) {
      whereClause.status = status;
    }

    if (condition) {
      whereClause.condition = condition;
    }

    const equipment = await Equipment.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'checker',
        attributes: ['name'],
        foreignKey: 'checkedBy'
      }],
      order: [['updatedAt', 'DESC']]
    });

    // Format response to match frontend expectations
    const formattedEquipment = equipment.map(item => ({
      _id: item.id, // Frontend expects _id
      ...item.toJSON()
    }));

    res.json({
      success: true,
      count: equipment.length,
      data: formattedEquipment
    });
  } catch (error) {
    console.error('Get equipment error:', error);
    res.status(500).json({ message: 'Server error fetching equipment' });
  }
});

// @route   POST /api/equipment
// @desc    Create new equipment
// @access  Private
router.post('/', [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name must be between 1-100 characters'),
  body('category').isIn(['Camera', 'Audio', 'Lighting', 'Switching', 'Storage', 'Cables', 'Accessories']).withMessage('Invalid category'),
  body('location').trim().isLength({ min: 1, max: 100 }).withMessage('Location must be between 1-100 characters'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
  body('serialNumber').optional().trim().isLength({ max: 50 }).withMessage('Serial number cannot exceed 50 characters'),
  body('condition').optional().isIn(['excellent', 'good', 'fair', 'needs_repair']).withMessage('Invalid condition')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Equipment creation validation failed:');
      console.log('Request body:', req.body);
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const equipmentData = {
      ...req.body,
      checkedBy: req.user.id,
      checkedByName: req.user.name,
      lastChecked: new Date()
    };

    const equipment = await Equipment.create(equipmentData);

    // Log activity
    await logEquipmentActivity(
      'created',
      equipment.id,
      req.user.id,
      req.user.name,
      'global',
      null,
      equipment.toJSON(),
      req
    );

    // Send to CyphorLogs
    await cyphorLogs.logEquipmentCreate(equipment, req.user.name);

    // Format response to match frontend expectations
    const formattedEquipment = {
      _id: equipment.id,
      ...equipment.toJSON()
    };

    res.status(201).json({
      success: true,
      data: formattedEquipment
    });
  } catch (error) {
    console.error('Create equipment error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ message: 'Serial number already exists' });
    } else {
      res.status(500).json({ message: 'Server error creating equipment' });
    }
  }
});

// @route   PUT /api/equipment/:id
// @desc    Update equipment
// @access  Private
router.put('/:id', [
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be between 1-100 characters'),
  body('category').optional().isIn(['Camera', 'Audio', 'Lighting', 'Switching', 'Storage', 'Cables', 'Accessories']).withMessage('Invalid category'),
  body('location').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Location must be between 1-100 characters'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
  body('status').optional().isIn(['pending', 'checked', 'issue']).withMessage('Invalid status'),
  body('condition').optional().isIn(['excellent', 'good', 'fair', 'needs_repair']).withMessage('Invalid condition')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const equipment = await Equipment.findOne({
      where: {
        id: req.params.id,
        isActive: true
      }
    });

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // Store old values for activity log
    const oldValues = equipment.toJSON();

    // Update tracking info if status changed
    if (req.body.status) {
      req.body.lastChecked = new Date();
      req.body.checkedBy = req.user.id;
      req.body.checkedByName = req.user.name;
    }

    await equipment.update(req.body);

    // Log activity - Temporarily disabled to prevent deadlocks
    // const actionType = req.body.status ? 'status_changed' : 'updated';
    // await logEquipmentActivity(
    //   actionType,
    //   equipment.id,
    //   req.user.id,
    //   req.user.name,
    //   'global',
    //   oldValues,
    //   equipment.toJSON(),
    //   req
    // );

    // Send to CyphorLogs
    const newValues = equipment.toJSON();
    if (req.body.status && oldValues.status !== req.body.status) {
      await cyphorLogs.logStatusChange(equipment, oldValues.status, req.body.status, req.user.name);
    }
    if (req.body.location && oldValues.location !== req.body.location) {
      await cyphorLogs.logEquipmentMove(equipment, oldValues.location, req.body.location, req.user.name);
    }
    await cyphorLogs.logEquipmentUpdate(equipment, oldValues, newValues, req.user.name);

    // Format response to match frontend expectations
    const formattedEquipment = {
      _id: equipment.id,
      ...equipment.toJSON()
    };

    res.json({
      success: true,
      data: formattedEquipment
    });
  } catch (error) {
    console.error('Update equipment error:', error);
    res.status(500).json({ message: 'Server error updating equipment' });
  }
});

// @route   DELETE /api/equipment/:id
// @desc    Delete equipment (move to deleted equipment table)
// @access  Private
router.delete('/:id', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const equipment = await Equipment.findOne({
      where: {
        id: req.params.id,
        isActive: true
      }
    });

    if (!equipment) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // Store equipment data for deleted equipment table
    const equipmentData = equipment.toJSON();
    
    // Create record in DeletedEquipment table
    await DeletedEquipment.create({
      originalEquipmentId: equipmentData.id,
      name: equipmentData.name,
      category: equipmentData.category,
      status: equipmentData.status,
      condition: equipmentData.condition,
      location: equipmentData.location,
      notes: equipmentData.notes,
      serialNumber: equipmentData.serialNumber,
      purchaseDate: equipmentData.purchaseDate,
      warrantyExpiry: equipmentData.warrantyExpiry,
      purchasePrice: equipmentData.purchasePrice,
      vendor: equipmentData.vendor,
      model: equipmentData.model,
      barcode: equipmentData.barcode,
      priority: equipmentData.priority,
      maintenanceDate: equipmentData.maintenanceDate,
      isReserved: equipmentData.isReserved,
      reservedBy: equipmentData.reservedBy,
      reservedUntil: equipmentData.reservedUntil,
      lastChecked: equipmentData.lastChecked,
      checkedBy: equipmentData.checkedBy,
      checkedByName: equipmentData.checkedByName,
      teamId: 'global',
      deletedBy: req.user.id,
      deletedByName: req.user.name,
      deletionReason: req.body.reason || null,
      originalCreatedAt: equipmentData.createdAt,
      originalUpdatedAt: equipmentData.updatedAt
    }, { transaction });

    // Delete from Equipment table
    await equipment.destroy({ transaction });

    // Log activity - Temporarily disabled to prevent deadlocks
    // await logEquipmentActivity(
    //   'deleted',
    //   equipment.id,
    //   req.user.id,
    //   req.user.name,
    //   'global',
    //   equipmentData,
    //   null,
    //   req
    // );

    // Send to CyphorLogs
    await cyphorLogs.logEquipmentDelete(equipment, req.user.name);

    await transaction.commit();

    res.json({
      success: true,
      message: 'Equipment moved to recently deleted',
      data: {
        deletedAt: new Date(),
        deletedBy: req.user.name
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Delete equipment error:', error);
    res.status(500).json({ message: 'Server error deleting equipment' });
  }
});

// @route   GET /api/equipment/history/:id
// @desc    Get equipment activity history
// @access  Private
router.get('/history/:id', async (req, res) => {
  try {
    const equipment = await Equipment.findOne({
      where: {
        id: req.params.id,
        teamId: 'global'
      }
    });

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    const history = await EquipmentHistory.findAll({
      where: {
        equipmentId: req.params.id,
        teamId: 'global'
      },
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ message: 'Server error fetching history' });
  }
});

// @route   GET /api/equipment/activity
// @desc    Get recent team activity
// @access  Private
router.get('/activity', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const activity = await EquipmentHistory.findAll({
      where: {
        teamId: 'global'
      },
      include: [{
        model: Equipment,
        attributes: ['name', 'category'],
        required: false
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ message: 'Server error fetching activity' });
  }
});

// @route   GET /api/equipment/stats
// @desc    Get equipment statistics
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    // Start with basic stats that work with current schema
    const [totalCount, checkedCount, pendingCount, issuesCount] = await Promise.all([
      Equipment.count({ where: { isActive: true } }),
      Equipment.count({ where: { isActive: true, status: 'checked' } }),
      Equipment.count({ where: { isActive: true, status: 'pending' } }),
      Equipment.count({ where: { isActive: true, status: 'issue' } })
    ]);

    // Enhanced stats with category breakdown
    const categoryStats = await Equipment.findAll({
      where: { isActive: true },
      attributes: ['category', [fn('COUNT', col('category')), 'count']],
      group: ['category'],
      raw: true
    });

    const conditionStats = await Equipment.findAll({
      where: { isActive: true },
      attributes: ['condition', [fn('COUNT', col('condition')), 'count']],
      group: ['condition'],
      raw: true
    });

    // Try to get recent activity count (may fail if history table doesn't exist yet)
    let recentActivity = 0;
    try {
      recentActivity = await EquipmentHistory.count({
        where: {
            createdAt: {
            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });
    } catch (historyError) {
      console.log('History table not yet created, skipping recent activity count');
    }

    res.json({
      success: true,
      data: {
        overview: {
          total: totalCount,
          checked: checkedCount,
          pending: pendingCount,
          issues: issuesCount,
          reserved: 0, // Will be enabled after database migration
          critical: 0, // Will be enabled after database migration
          warrantyExpiring: 0 // Will be enabled after database migration
        },
        categories: categoryStats,
        conditions: conditionStats,
        recentActivity: recentActivity,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error fetching statistics' });
  }
});

// @route   GET /api/equipment/deleted
// @desc    Get all recently deleted equipment
// @access  Private
router.get('/deleted', async (req, res) => {
  try {
    const deletedEquipment = await DeletedEquipment.findAll({
      include: [
        {
          model: User,
          as: 'deleter',
          attributes: ['name']
        }
      ],
      order: [['deletedAt', 'DESC']]
    });

    res.json({
      success: true,
      data: deletedEquipment,
      count: deletedEquipment.length
    });
  } catch (error) {
    console.error('Get deleted equipment error:', error);
    res.status(500).json({ message: 'Server error fetching deleted equipment' });
  }
});

// @route   POST /api/equipment/deleted/:id/restore
// @desc    Restore deleted equipment
// @access  Private
router.post('/deleted/:id/restore', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const deletedEquipment = await DeletedEquipment.findByPk(req.params.id);

    if (!deletedEquipment) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Deleted equipment not found' });
    }

    // Create restored equipment record
    const restoredEquipment = await Equipment.create({
      name: deletedEquipment.name,
      category: deletedEquipment.category,
      status: deletedEquipment.status,
      condition: deletedEquipment.condition,
      location: deletedEquipment.location,
      notes: deletedEquipment.notes,
      serialNumber: deletedEquipment.serialNumber,
      purchaseDate: deletedEquipment.purchaseDate,
      warrantyExpiry: deletedEquipment.warrantyExpiry,
      purchasePrice: deletedEquipment.purchasePrice,
      vendor: deletedEquipment.vendor,
      model: deletedEquipment.model,
      barcode: deletedEquipment.barcode,
      priority: deletedEquipment.priority,
      maintenanceDate: deletedEquipment.maintenanceDate,
      isReserved: false, // Reset reservation on restore
      lastChecked: new Date(), // Update last checked to now
      checkedBy: req.user.id,
      checkedByName: req.user.name,
      teamId: 'global',
      isActive: true
    }, { transaction });

    // Remove from deleted equipment table
    await deletedEquipment.destroy({ transaction });

    // Log activity
    await logEquipmentActivity(
      'restored',
      restoredEquipment.id,
      req.user.id,
      req.user.name,
      'global',
      null,
      restoredEquipment.toJSON(),
      req
    );

    // Send to CyphorLogs
    await cyphorLogs.logEquipmentRestore(restoredEquipment, req.user.name);

    await transaction.commit();

    res.json({
      success: true,
      message: 'Equipment restored successfully',
      data: restoredEquipment
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Restore equipment error:', error);
    res.status(500).json({ message: 'Server error restoring equipment' });
  }
});

// @route   DELETE /api/equipment/deleted/:id/permanent
// @desc    Permanently delete equipment from deleted items
// @access  Private
router.delete('/deleted/:id/permanent', async (req, res) => {
  try {
    const deletedEquipment = await DeletedEquipment.findByPk(req.params.id);

    if (!deletedEquipment) {
      return res.status(404).json({ message: 'Deleted equipment not found' });
    }

    await deletedEquipment.destroy();

    res.json({
      success: true,
      message: 'Equipment permanently deleted'
    });
  } catch (error) {
    console.error('Permanent delete error:', error);
    res.status(500).json({ message: 'Server error permanently deleting equipment' });
  }
});

// @route   GET /api/equipment/report
// @desc    Generate equipment inventory report
// @access  Private
router.get('/report', async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    
    const equipment = await Equipment.findAll({
      where: { isActive: true },
      include: [
        {
          model: User,
          as: 'checker',
          attributes: ['name']
        }
      ],
      order: [['category', 'ASC'], ['name', 'ASC']]
    });

    const reportData = {
      generatedAt: new Date(),
      generatedBy: req.user.name,
      totalItems: equipment.length,
      equipment: equipment.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        status: item.status,
        condition: item.condition,
        location: item.location,
        priority: item.priority,
        serialNumber: item.serialNumber,
        vendor: item.vendor,
        model: item.model,
        purchasePrice: item.purchasePrice,
        lastChecked: item.lastChecked,
        checkedByName: item.checkedByName,
        notes: item.notes
      }))
    };

    if (format === 'csv') {
      // Generate CSV format
      const csvHeaders = [
        'ID', 'Name', 'Category', 'Status', 'Condition', 'Location', 
        'Priority', 'Serial Number', 'Vendor', 'Model', 'Purchase Price', 
        'Last Checked', 'Checked By', 'Notes'
      ];
      
      let csvContent = csvHeaders.join(',') + '\n';
      
      reportData.equipment.forEach(item => {
        const row = [
          item.id,
          `"${item.name}"`,
          item.category,
          item.status,
          item.condition,
          `"${item.location}"`,
          item.priority,
          item.serialNumber || '',
          `"${item.vendor || ''}"`,
          `"${item.model || ''}"`,
          item.purchasePrice || '',
          item.lastChecked,
          `"${item.checkedByName}"`,
          `"${(item.notes || '').replace(/"/g, '""')}"`
        ];
        csvContent += row.join(',') + '\n';
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="equipment-inventory-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } else {
      // Default JSON format
      res.json({
        success: true,
        data: reportData
      });
    }
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ message: 'Server error generating report' });
  }
});

module.exports = router;