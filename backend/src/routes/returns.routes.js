const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { requestReturn } = require('../controllers/returns.controller');

const router = express.Router();
router.post('/', requireAuth, requestReturn);

module.exports = router;
