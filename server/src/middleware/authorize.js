module.exports = function authorize(...allowedRoles) {
  return function roleGuard(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized access' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: 'Insufficient permissions' });
    }

    next();
  };
};
