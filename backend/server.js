require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');

const contactRoute = require('./routes/contact');
const newsletterRoute = require('./routes/newsletter');
const checkoutRoute = require('./routes/checkout');
const authRoute = require('./routes/auth');
const ordersRoute = require('./routes/orders');
const returnsRoute = require('./routes/returns');
const adminRoute = require('./routes/admin');

const app = express();

// Hostinger's Node.js App Manager (and most other Node hosts) inject
// the real port via process.env.PORT — 3000 is only for local dev.
const PORT = process.env.PORT || 3000;

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
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
app.use(cors({ origin: allowedOrigin, credentials: true }));

// Generous but real limits: stops a script from hammering the forms,
// checkout, or login without getting in a real customer's way.
const formLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
const adminLoginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.get('/api/me', authRoute.meHandler);

app.use('/api/contact', formLimiter, contactRoute);
app.use('/api/newsletter', formLimiter, newsletterRoute);
app.use('/api/checkout', checkoutRoute);
app.use('/api/auth', authLimiter, authRoute);
app.use('/api/orders', formLimiter, ordersRoute);
app.use('/api/returns', formLimiter, returnsRoute);
app.use('/api/admin/login', adminLoginLimiter);
app.use('/api/admin', adminRoute);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ ok: false, error: 'Something went wrong. Please try again.' });
});

// Serve the frontend statically so the whole site works from this one
// origin (this is what makes local testing at http://localhost:3000
// match the origin registered in Google Cloud for Sign-In). /backend
// is explicitly blocked first so .env, node_modules, etc. are never
// web-accessible.
app.use('/backend', (req, res) => res.status(404).end());
app.use(express.static(path.join(__dirname, '..'), { dotfiles: 'ignore' }));

app.listen(PORT, () => {
  console.log(`Brine & Shell API listening on port ${PORT}`);
});
