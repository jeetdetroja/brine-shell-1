const express = require('express');
const { requireAdmin } = require('../middleware/auth.middleware');
const { signIn, signOut, getOrders, updateOrderStatus } = require('../controllers/admin.controller');

const router = express.Router();
router.post('/login', signIn);
router.post('/logout', signOut);
router.get('/orders', requireAdmin, getOrders);
router.post('/orders/:orderId/status', requireAdmin, updateOrderStatus);

module.exports = router;
