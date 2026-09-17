const { getRows, appendRow } = require('../services/sheets.service');
const { sendEmail } = require('../services/resend.service');
const COL = { id: 0, email: 4, items: 6 };

async function requestReturn(req, res) {
  const orderId = String(req.body?.orderId || '').trim();
  const reason = String(req.body?.reason || '').trim().slice(0, 1000);

  if (!orderId || !reason) {
    return res.status(400).json({ ok: false, error: 'Please select an order and describe the issue.' });
  }

  let rows;
  try {
    rows = await getRows('Orders');
  } catch (err) {
    console.error('Sheets read failed (returns):', err.message);
    return res.status(502).json({ ok: false, error: 'Could not look up that order right now.' });
  }

  const order = rows.slice(1).find(r => r[COL.id] === orderId);
  if (!order || (order[COL.email] || '').toLowerCase() !== req.user.email.toLowerCase()) {
    return res.status(404).json({ ok: false, error: 'Order not found.' });
  }

  try {
    await appendRow('Returns', [
      new Date().toISOString(),
      orderId,
      req.user.email,
      order[COL.items] || '',
      reason,
      'Requested',
    ]);
  } catch (err) {
    console.error('Sheets append failed (returns):', err.message);
    return res.status(502).json({ ok: false, error: 'Could not submit your return request right now.' });
  }

  try {
    await sendEmail({
      to: process.env.CONTACT_TO_EMAIL,
      replyTo: req.user.email,
      subject: `Return requested for order ${orderId}`,
      html: `
        <p><strong>Order:</strong> ${orderId}</p>
        <p><strong>Customer:</strong> ${req.user.name} (${req.user.email})</p>
        <p><strong>Items:</strong> ${order[COL.items] || ''}</p>
        <p><strong>Reason:</strong> ${reason}</p>
      `,
    });
  } catch (err) {
    console.error('Email send failed (returns):', err.message);
    // Not fatal — the request is already logged in the sheet above.
  }

  res.json({ ok: true });
}

module.exports = { requestReturn };
