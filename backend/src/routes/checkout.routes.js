const express = require('express');
const { checkoutLimiter } = require('../middleware/rate-limit.middleware');
const { createCheckoutOrder, verifyCheckoutPayment, handleWebhook } = require('../controllers/checkout.controller');

const router = express.Router();
router.post('/create-order', checkoutLimiter, createCheckoutOrder);
router.post('/verify', checkoutLimiter, verifyCheckoutPayment);
router.post('/webhook', handleWebhook);

module.exports = router;
