const express = require('express');
const { signInWithGoogle, signOut, meHandler } = require('../controllers/auth.controller');

const router = express.Router();
router.post('/google', signInWithGoogle);
router.post('/logout', signOut);
router.get('/me', meHandler);

module.exports = router;
