/* =========================================
   Razorpay order creation + payment verification.
   The amount is NEVER taken from the client — see routes/checkout.js,
   which recomputes it from data/products.json before calling
   createOrder(). This is the fix for the "client can edit the total
   in devtools" red flag from the site audit.
   ========================================= */
const crypto = require('crypto');
const Razorpay = require('razorpay');

function getClient() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error('Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing in .env)');
  }
  return new Razorpay({ key_id, key_secret });
}

async function createOrder({ amountInPaise, currency, receipt, notes }) {
  const rzp = getClient();
  return rzp.orders.create({ amount: amountInPaise, currency, receipt, notes });
}

function verifySignature({ orderId, paymentId, signature }) {
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  const expected = crypto
    .createHmac('sha256', key_secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
}

module.exports = { createOrder, verifySignature, getKeyId: () => process.env.RAZORPAY_KEY_ID };
