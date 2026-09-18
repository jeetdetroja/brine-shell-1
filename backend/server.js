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
const profileRoute = require('./routes/profile');
const addressesRoute = require('./routes/addresses');
const reviewsRoute = require('./routes/reviews');
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
app.use('/api/profile', formLimiter, profileRoute);
app.use('/api/addresses', formLimiter, addressesRoute);
app.use('/api/reviews', formLimiter, reviewsRoute);
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
// no-store on the page files themselves (html/js/css) -- without this,
// browsers will sometimes keep serving an already-open page's OLD
// version of orders.html/admin.html/etc after an edit here, making a
// real code change look like it "isn't reflecting" when it's really
// just a stale cached copy. Images/uploads aren't affected -- those
// are fine to cache normally.
app.use(express.static(path.join(__dirname, '..'), {
  dotfiles: 'ignore',
  setHeaders: (res, filePath) => {
    if (/\.(html|js|css)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-store');
    }
  },
}));

app.listen(PORT, () => {
  console.log(`Brine & Shell API listening on port ${PORT}`);
});
