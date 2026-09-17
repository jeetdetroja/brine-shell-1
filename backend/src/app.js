const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { allowedOrigin, frontendDirectory } = require('./config/app.config');
const { formLimiter, authLimiter, adminLoginLimiter } = require('./middleware/rate-limit.middleware');
const { errorHandler } = require('./middleware/error.middleware');
const contactRoutes = require('./routes/contact.routes');
const newsletterRoutes = require('./routes/newsletter.routes');
const checkoutRoutes = require('./routes/checkout.routes');
const authRoutes = require('./routes/auth.routes');
const ordersRoutes = require('./routes/orders.routes');
const returnsRoutes = require('./routes/returns.routes');
const adminRoutes = require('./routes/admin.routes');
const { meHandler } = require('./controllers/auth.controller');

const app = express();

// Captures the raw request body alongside Express's normal JSON
// parsing — the webhook route needs the exact raw bytes to verify
// Razorpay's HMAC signature; every other route just uses req.body
// as before.
app.use(express.json({
  limit: '100kb',
  verify: (req, res, buf) => { req.rawBody = buf; },
}));
app.use(cookieParser());

// credentials:true is required for the session cookie to be sent/set
// on cross-origin requests (e.g. the API on a subdomain) — it also
// means ALLOWED_ORIGIN can't be '*', it must be a real origin.
app.use(cors({ origin: allowedOrigin, credentials: true }));

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.get('/api/me', meHandler);

app.use('/api/contact', formLimiter, contactRoutes);
app.use('/api/newsletter', formLimiter, newsletterRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/orders', formLimiter, ordersRoutes);
app.use('/api/returns', formLimiter, returnsRoutes);
app.use('/api/admin/login', adminLoginLimiter);
app.use('/api/admin', adminRoutes);

app.use(errorHandler);

// Serve the frontend from the same origin for local and production parity.
app.use(express.static(path.join(__dirname, '..', '..', frontendDirectory), { dotfiles: 'ignore' }));

module.exports = app;
