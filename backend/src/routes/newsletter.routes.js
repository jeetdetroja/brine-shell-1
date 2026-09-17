const express = require('express');
const { subscribeToNewsletter } = require('../controllers/newsletter.controller');

const router = express.Router();
router.post('/', subscribeToNewsletter);

module.exports = router;
