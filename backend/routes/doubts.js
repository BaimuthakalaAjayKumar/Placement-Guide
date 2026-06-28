const express = require('express');
const {
    createDoubt,
    getMyDoubts,
    getAllDoubts,
    answerDoubt,
    submitContactUs
} = require('../controllers/doubts');

const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
    .post(createDoubt);

router.get('/my', getMyDoubts);
router.get('/admin', authorize('admin'), getAllDoubts);
router.put('/:id/answer', authorize('admin'), answerDoubt);
router.post('/contact', submitContactUs);

module.exports = router;
