const express = require('express');
const { priceCart } = require('../lib/catalog');
const { createOrder, verifySignature, getKeyId } = require('../lib/razorpay');
const { appendRow, updateRowByKey } = require('../lib/sheets');
const { sendEmail } = require('../lib/resend');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Step 1: browser sends { items: [{id, qty}], customer: {name, email, phone} }.
   We price the cart ourselves from data/products.json — the amount
   the browser thinks the total is never gets trusted — then ask
   Razorpay to create an order for that (server-computed) amount. */
router.post('/create-order', async (req, res) => {
  const { items, customer } = req.body || {};
  const name = String(customer?.name || '').trim().slice(0, 120);
  const email = String(customer?.email || '').trim().slice(0, 200);
  const phone = String(customer?.phone || '').trim().slice(0, 20);

  if (!name || !email || !phone) {
    return res.status(400).json({ ok: false, error: 'Please fill in your name, email and phone.' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: 'That email address doesn\'t look right.' });
  }
  if (phone.replace(/\D/g, '').length !== 10) {
    return res.status(400).json({ ok: false, error: 'Enter a valid 10-digit phone number.' });
  }

  let priced;
  try {
    priced = priceCart(items);
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }

  const receipt = `bs_${Date.now()}`;
  let order;
  try {
    order = await createOrder({
      amountInPaise: priced.total * 100,
      currency: priced.currency,
      receipt,
      notes: { name, email, phone },
    });
  } catch (err) {
    console.error('Razorpay order creation failed:', err.message || err);
    return res.status(502).json({ ok: false, error: 'Could not start checkout right now. Please try again shortly.' });
  }

  try {
    await appendRow('Orders', [
      order.id,
      new Date().toISOString(),
      'pending',
      name,
      email,
      phone,
      priced.lineItems.map(i => `${i.name} x${i.qty}`).join('; '),
      priced.total,
    ]);
  } catch (err) {
    console.error('Sheets append failed (order):', err.message);
    // Not fatal — the order still exists in Razorpay; don't block checkout.
  }

  res.json({
    ok: true,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: getKeyId(),
    summary: priced,
  });
});

/* Step 2: after Razorpay's checkout modal completes, the browser
   sends back the payment id + signature. We verify the signature
   ourselves (never trust "it worked" from the client alone) before
   marking the order paid and emailing a confirmation. */
router.post('/verify', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, customerEmail } = req.body || {};

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ ok: false, error: 'Missing payment verification fields.' });
  }

  const valid = verifySignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  if (!valid) {
    console.error('Razorpay signature mismatch for order', razorpay_order_id);
    return res.status(400).json({ ok: false, error: 'Payment could not be verified.' });
  }

  try {
    await updateRowByKey('Orders', razorpay_order_id, { C: 'paid' });
  } catch (err) {
    console.error('Sheets update failed (order verify):', err.message);
  }

  if (customerEmail && EMAIL_RE.test(customerEmail)) {
    try {
      await sendEmail({
        to: customerEmail,
        subject: 'Your Brine & Shell order is confirmed',
        html: `<p>Thanks for your order! Payment reference: <strong>${razorpay_payment_id}</strong>.</p><p>We'll be in touch with delivery updates.</p>`,
      });
    } catch (err) {
      console.error('Email send failed (order confirmation):', err.message);
    }
  }

  res.json({ ok: true });
});

module.exports = router;
