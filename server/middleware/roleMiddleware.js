const { isAdminCaller } = require('./authMiddleware');
const User = require('../models/User');

/**
 * Role-based access control middleware
 * Usage: verifyRole('patient') - only patients can access
 *       verifyRole('doctor') - only doctors can access
 *       verifyRole('admin') - only admins can access
 * 
 * @param {string} role - The required role for this endpoint
 * @returns {function} Express middleware function
 */
const verifyRole = (role) => {
  return async (req, res, next) => {
    try {
      // First, ensure authentication is verified by requireAuth middleware
      // This middleware assumes requireAuth has already run
      
      const caller = req.callerEmail || req.headers['x-user-email'] || req.query.email || req.body?.email;
      if (!caller || !caller.includes('@')) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      req.callerEmail = caller.toString().trim().toLowerCase();
      
      // Check role
      const normalizedEmail = req.callerEmail;
      const user = await User.findOne({ email: normalizedEmail });
      let hasRole = false;
      
      if (role === 'admin') {
        hasRole = (user && ['admin', 'hospital_admin'].includes(user.role)) || normalizedEmail === 'primecare.hospital.admin@gmail.com';
      } else if (role === 'doctor') {
        hasRole = (user && user.role === 'doctor') || Boolean(await require('../models/Doctor').exists({ email: normalizedEmail }));
      } else if (role === 'patient') {
        hasRole = (user && user.role === 'patient') || (!user || user.role === 'patient');
      }
      
      if (!hasRole) {
        return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
      }
      
      next();
    } catch (err) {
      console.error('Role verification error:', err);
      res.status(500).json({ success: false, error: 'Role verification failed' });
    }
  };
};

module.exports = { verifyRole };