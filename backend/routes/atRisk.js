const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getAtRiskStudents, sendInterventionNotice } = require('../controllers/atRisk');

router.use(protect);
router.use(authorize('faculty', 'admin'));

router.get('/students', getAtRiskStudents);
router.post('/notify', sendInterventionNotice);

module.exports = router;
