const User = require('../models/User');
const Doctor = require('../models/Doctor');
const jwt = require('jsonwebtoken');

const adminEmail = () => (process.env.ADMIN_EMAIL || 'primecare.hospital.admin@gmail.com').toLowerCase();

/**
 * Role-based access control middleware
 * Checks caller identity from validated JWT / Clerk header / session header and matches role against database.
 * Usage: verifyRole('patient') - patient access (admin permitted)
 *        verifyRole('doctor')  - doctor access (admin permitted)
 *        verifyRole('admin')   - strict admin access
 * 
 * @param {string|string[]} roles - The required role or roles
 * @returns {function} Express middleware function
 */
const verifyRole = (roles) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return async (req, res, next) => {
    try {
      let callerEmail = '';

      // 1. Check Bearer token (Custom JWT or Clerk Token)
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          if (process.env.JWT_SECRET) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded && decoded.email) {
              callerEmail = decoded.email.toString().toLowerCase();
            } else if (decoded && decoded.id) {
              const u = await User.findById(decoded.id) || await Doctor.findById(decoded.id);
              if (u) callerEmail = u.email.toLowerCase();
            }
          }
        } catch {
          // Token verification error falls through to Clerk / header resolution
        }
      }

      // 2. Check x-user-email or query/body email
      if (!callerEmail) {
        const headerEmail = req.headers['x-user-email'] || req.query.email || req.body?.email;
        if (headerEmail && typeof headerEmail === 'string' && headerEmail.includes('@')) {
          callerEmail = headerEmail.trim().toLowerCase();
        }
      }

      if (!callerEmail) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      req.callerEmail = callerEmail;

      // 3. Admin bypass: designated admin or database admin has universal access to all roles
      if (callerEmail === adminEmail()) {
        return next();
      }

      const user = await User.findOne({ email: callerEmail });
      if (user && ['admin', 'hospital_admin'].includes(user.role)) {
        return next();
      }

      // 4. Role validation
      let hasRole = false;

      if (allowedRoles.includes('admin')) {
        hasRole = (user && ['admin', 'hospital_admin'].includes(user.role));
      }

      if (!hasRole && allowedRoles.includes('doctor')) {
        hasRole = (user && user.role === 'doctor') || Boolean(await Doctor.exists({ email: callerEmail }));
      }

      if (!hasRole && allowedRoles.includes('patient')) {
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
