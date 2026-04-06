const ApiError = require('../utils/api-error');

module.exports = function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      details: err.details,
    });
  }

  console.error('[UNHANDLED_ERROR]', err);
  return res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
};
