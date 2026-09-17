const rateLimit = require('express-rate-limit');

const formLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
const adminLoginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
const checkoutLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40 });

module.exports = { formLimiter, authLimiter, adminLoginLimiter, checkoutLimiter };
