const Admin = require('../models/Admin');
const adminMiddleware = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Access is restricted to administrators.' });
    }
    const admin = await Admin.findById(req.user.userId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin user not found.' });
    }
    next();

  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ message: 'Server error during admin verification.' });
  }
};

module.exports = adminMiddleware;
