const express = require('express');
const router = express.Router();
const { sendDemoRequest } = require('../controllers/contactController');

router.post('/demo', sendDemoRequest);

module.exports = router;
