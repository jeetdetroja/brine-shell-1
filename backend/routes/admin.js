const express = require('express');
const {
  ADMIN_COOKIE_NAME, checkAdminPassword, signAdminSession, adminCookieOptions, requireAdmin,
} = require('../lib/auth');
const { getRows, updateRowByKey } = require('../lib/sheets');
const { sendEmail } = require('../lib/resend');
const { STAGES } = require('../lib/orderStatus');

const router = express.Router();
const COL = { id: 0, date: 1, paymentStatus: 2, name: 3, email: 4, phone: 5, items: 6, total: 7, status: 8, deliveredAt: 9 };

router.post('/login', (req, res) => {
  const { password } = req.body || {};
  if (!checkAdminPassword(password)) {
    return res.status(401).json({ ok: false, error: 'Incorrect password.' });
  }
  res.cookie(ADMIN_COOKIE_NAME, signAdminSession(), adminCookieOptions());
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  res.clearCookie(ADMIN_COOKIE_NAME, adminCookieOptions());
  res.json({ ok: true });
});

/* Every paid order, for the admin table — unlike /api/orders/mine,
   this isn't filtered to one customer. */
router.get('/orders', requireAdmin, async (req, res) => {
  let rows;
  try {
    rows = await getRows('Orders');
  } catch (err) {
    console.error('Sheets read failed (admin/orders):', err.message);
    return res.status(502).json({ ok: false, error: 'Could not load orders right now.' });
  }

  const orders = rows.slice(1)
    .filter(r => r[COL.paymentStatus] === 'paid')
    .map(r => ({
      orderId: r[COL.id],
      date: r[COL.date],
      name: r[COL.name],
      email: r[COL.email],
      items: r[COL.items],
      total: r[COL.total],
      status: r[COL.status] || 'Order Placed',
    }))
    .reverse();

  res.json({ ok: true, orders, stages: STAGES });
});

router.post('/orders/:orderId/status', requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  if (!STAGES.includes(status)) {
    return res.status(400).json({ ok: false, error: `Status must be one of: ${STAGES.join(', ')}` });
  }

  // Stamp the exact date/time only when the order actually reaches
  // "Delivered" — that's the timestamp customers see on their order.
  const updates = { I: status };
  if (status === 'Delivered') {
    updates.J = new Date().toISOString();
  }

  let updated;
  try {
    updated = await updateRowByKey('Orders', req.params.orderId, updates);
  } catch (err) {
    console.error('Sheets update failed (admin status):', err.message);
    return res.status(502).json({ ok: false, error: 'Could not update that order right now.' });
  }
  if (!updated) {
    return res.status(404).json({ ok: false, error: 'Order not found.' });
  }

  // Best-effort: let the customer know their order moved forward.
  try {
    const rows = await getRows('Orders');
    const row = rows.slice(1).find(r => r[COL.id] === req.params.orderId);
    if (row?.[COL.email]) {
      await sendEmail({
        to: row[COL.email],
        subject: `Your Brine & Shell order is now: ${status}`,
        html: `<p>Order <strong>${req.params.orderId}</strong> status update: <strong>${status}</strong>.</p>`,
      });
    }
  } catch (err) {
    console.error('Email send failed (status update):', err.message);
  }

  res.json({ ok: true });
});

module.exports = router;
