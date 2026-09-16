require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const contactRoute = require('./routes/contact');
const newsletterRoute = require('./routes/newsletter');
const checkoutRoute = require('./routes/checkout');

const app = express();

// Hostinger's Node.js App Manager (and most other Node hosts) inject
// the real port via process.env.PORT — 3000 is only for local dev.
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '100kb' }));

const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({ origin: allowedOrigin }));

// Generous but real limits: stops a script from hammering the forms
// or checkout without getting in a real customer's way.
const formLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const checkoutLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40 });

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/contact', formLimiter, contactRoute);
app.use('/api/newsletter', formLimiter, newsletterRoute);
app.use('/api/checkout', checkoutLimiter, checkoutRoute);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ ok: false, error: 'Something went wrong. Please try again.' });
});

app.listen(PORT, () => {
  console.log(`Brine & Shell API listening on port ${PORT}`);
});
