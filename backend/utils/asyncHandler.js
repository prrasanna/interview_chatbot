// utils/asyncHandler.js — Wraps async route handlers to forward errors to Express
module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
