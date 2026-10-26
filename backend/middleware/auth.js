// middleware/auth.js — JWT verification and role-based access control
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verifies JWT and attaches user to req.user
exports.requireAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'You are not logged in. Please log in to get access.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, message: 'Invalid token. Please log in again.' });
      }
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Your session has expired. Please log in again.' });
      }
      throw err;
    }

    const user = await User.findById(decoded.id).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'The user belonging to this token no longer exists.' });
    }
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'This account has been deactivated. Contact your administrator.' });
    }
    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({ success: false, message: 'Password was recently changed. Please log in again.' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

// Restrict access to specific roles
exports.requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
      });
    }
    next();
  };
};
