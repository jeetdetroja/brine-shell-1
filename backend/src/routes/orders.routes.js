const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { getMyOrders, getOrderById } = require('../controllers/orders.controller');

const router = express.Router();
router.get('/mine', requireAuth, getMyOrders);
router.get('/:orderId', requireAuth, getOrderById);

module.exports = router;
