const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many authentication attempts, please try again later.' }
});

// @route   POST /api/auth/register
// @desc    Register a new user (simplified - only phone and name)
// @access  Public
router.post('/register', [
  authLimiter,
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2-50 characters'),
  body('phone').trim().isLength({ min: 8, max: 20 }).withMessage('Phone number must be between 8-20 digits'),
  body('teamId').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Team ID must be between 1-50 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { name, phone, teamId = 'main_team' } = req.body;

    // Clean phone number
    const cleanedPhone = phone.replace(/\D/g, '');

    const existingUser = await User.findOne({ where: { phone: cleanedPhone } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this phone number' });
    }

    const user = await User.create({
      name,
      phone: cleanedPhone,
      teamId,
      role: 'member'
    });

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        teamId: user.teamId
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ message: 'User already exists with this phone number' });
    } else {
      res.status(500).json({ message: 'Server error during registration' });
    }
  }
});

// @route   POST /api/auth/login
// @desc    Login user (simplified - only phone number)
// @access  Public
router.post('/login', [
  authLimiter,
  body('phone').trim().isLength({ min: 8, max: 20 }).withMessage('Phone number is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { phone } = req.body;
    const cleanedPhone = phone.replace(/\D/g, '');

    const user = await User.findOne({ 
      where: { phone: cleanedPhone }
    });

    if (!user) {
      return res.status(401).json({ message: 'No user found with this phone number. Please register first.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is inactive. Please contact an administrator.' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user.id);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        teamId: user.teamId,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

module.exports = router;