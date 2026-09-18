const express = require('express');
const { getRows } = require('../lib/sheets');
const { requireAuth } = require('../lib/auth');
const { STAGES, stageIndex } = require('../lib/orderStatus');
const { RETURNS_COL } = require('../lib/returnsSchema');
const { REVIEWS_COL } = require('../lib/reviewsSchema');

const router = express.Router();

// Orders sheet columns (0-indexed): 0 Order ID, 1 Date, 2 Payment
// Status, 3 Name, 4 Email, 5 Phone, 6 Items, 7 Total, 8 Fulfillment
// Status, 9 Delivered At, 10 Account Email, 11 Address, 12 Item IDs.
// See backend/README.md for the header row to use.
const COL = { id: 0, date: 1, paymentStatus: 2, name: 3, email: 4, phone: 5, items: 6, total: 7, status: 8, deliveredAt: 9, accountEmail: 10, address: 11, itemIds: 12 };

// "cubes:2;dual:1" -> ['cubes', 'dual'] -- see backend/routes/reviews.js,
// which is the other place this same parsing happens.
function orderProductIds(itemIdsCell) {
  return String(itemIdsCell || '')
    .split(';')
    .map(pair => pair.split(':')[0])
    .filter(Boolean);
}

function rowToSummary(row) {
  return {
    orderId: row[COL.id],
    date: row[COL.date],
    items: row[COL.items],
    total: row[COL.total],
    status: row[COL.status] || null,
    deliveredAt: row[COL.deliveredAt] || null,
    phone: row[COL.phone] || '',
    address: row[COL.address] || '',
    // Orders placed before this column existed come back as [] --
    // orders.html simply won't offer a "Write a Review" button for
    // those, same as it can't offer a return on a guest-checkout order.
    itemIds: orderProductIds(row[COL.itemIds]),
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

  // Latest return request (if any) filed against this order, so the
  // customer sees "Waiting for approval" / the decision instead of
  // just being able to file a duplicate request while one is pending.
  let returnStatus = null;
  try {
    const returnRows = await getRows('Returns');
    const matches = returnRows.slice(1).filter(r => r[RETURNS_COL.orderId] === req.params.orderId);
    if (matches.length) returnStatus = matches[matches.length - 1][RETURNS_COL.status] || 'Requested';
  } catch (err) {
    console.error('Sheets read failed (orders/:id return lookup):', err.message);
    // Non-fatal -- the order itself still loads, just without return status.
  }

  // Per-product review status for this order -- 'Pending' / 'Approved'
  // / 'Rejected' if one's already been filed for that product+order,
  // so orders.html shows the right thing instead of offering "Write a
  // Review" for something already reviewed.
  let reviewStatuses = {};
  try {
    const reviewRows = await getRows('Reviews');
    reviewRows.slice(1)
      .filter(r => r[REVIEWS_COL.orderId] === req.params.orderId)
      .forEach(r => { reviewStatuses[r[REVIEWS_COL.productId]] = r[REVIEWS_COL.status] || 'Pending'; });
  } catch (err) {
    console.error('Sheets read failed (orders/:id review lookup):', err.message);
    // Non-fatal -- the order itself still loads, just without review status.
  }

  const currentIndex = stageIndex(row[COL.status]);
  res.json({
    ok: true,
    order: rowToSummary(row),
    stages: STAGES.map((label, i) => ({ label, done: currentIndex >= 0 && i <= currentIndex })),
    returnStatus,
    reviewStatuses,
  });
});

module.exports = router;
