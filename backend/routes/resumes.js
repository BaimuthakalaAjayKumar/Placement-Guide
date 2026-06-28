const express = require('express');
const { analyzeResume, getLatestResume } = require('../controllers/resumes');

const router = express.Router();

const { protect } = require('../middleware/auth');

router.post('/upload', protect, analyzeResume);
router.get('/latest', protect, getLatestResume);

module.exports = router;
