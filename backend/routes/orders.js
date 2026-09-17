const express = require('express');
const { getRows } = require('../lib/sheets');
const { requireAuth } = require('../lib/auth');
const { STAGES, stageIndex } = require('../lib/orderStatus');

const router = express.Router();

// Orders sheet columns (0-indexed): 0 Order ID, 1 Date, 2 Payment
// Status, 3 Name, 4 Email, 5 Phone, 6 Items, 7 Total, 8 Fulfillment
// Status, 9 Delivered At, 10 Account Email. See backend/README.md for the header row to use.
const COL = { id: 0, date: 1, paymentStatus: 2, name: 3, email: 4, phone: 5, items: 6, total: 7, status: 8, deliveredAt: 9, accountEmail: 10 };

function rowToSummary(row) {
  return {
    orderId: row[COL.id],
    date: row[COL.date],
    items: row[COL.items],
    total: row[COL.total],
    status: row[COL.status] || null,
    deliveredAt: row[COL.deliveredAt] || null,
  };
}

/* Every order whose Account Email column matches the logged-in user's
   email. Account Email is set once at checkout time from the signed-in
   session and never edited afterwards -- it's kept separate from the
   customer-facing "Email" (contact) column specifically so that column
   can stay freely editable without breaking this lookup. */
router.get('/mine', requireAuth, async (req, res) => {
  let rows;
  try {
    rows = await getRows('Orders');
  } catch (err) {
    console.error('Sheets read failed (orders/mine):', err.message);
    return res.status(502).json({ ok: false, error: 'Could not load your orders right now.' });
  }

  const email = req.user.email.toLowerCase();
  const orders = rows
    .slice(1) // skip header row
    .filter(row => row[COL.paymentStatus] === 'paid' && (row[COL.accountEmail] || '').toLowerCase() === email)
    .map(rowToSummary)
    .reverse(); // most recent first

  res.json({ ok: true, orders });
});

/* A single order's detail + which stages are complete, for the
   stepper UI. Checks the order actually belongs to the requesting
   user before returning anything — otherwise anyone could read any
   order just by guessing/incrementing an order id. */
router.get('/:orderId', requireAuth, async (req, res) => {
  let rows;
  try {
    rows = await getRows('Orders');
  } catch (err) {
    console.error('Sheets read failed (orders/:id):', err.message);
    return res.status(502).json({ ok: false, error: 'Could not load this order right now.' });
  }

  const row = rows.slice(1).find(r => r[COL.id] === req.params.orderId);
  if (!row || (row[COL.accountEmail] || '').toLowerCase() !== req.user.email.toLowerCase()) {
    return res.status(404).json({ ok: false, error: 'Order not found.' });
  }

  const currentIndex = stageIndex(row[COL.status]);
  res.json({
    ok: true,
    order: rowToSummary(row),
    stages: STAGES.map((label, i) => ({ label, done: currentIndex >= 0 && i <= currentIndex })),
  });
});

module.exports = router;
