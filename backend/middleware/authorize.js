const authorize = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (requiredRole && req.user.role !== requiredRole && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied: Insufficient permissions' });
    }

    next();
  };
};

module.exports = authorize;
