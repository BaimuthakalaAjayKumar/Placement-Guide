const express = require('express');
const {
    createDoubt,
    getMyDoubts,
    getAllDoubts,
    answerDoubt,
    submitContactUs,
    getDoubtAttachment
} = require('../controllers/doubts');

const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
    .post(createDoubt);

router.get('/my', getMyDoubts);
router.get('/admin', authorize('admin', 'super_admin', 'campus_admin', 'director', 'principal', 'hod'), getAllDoubts);
router.put('/:id/answer', authorize('admin', 'super_admin', 'campus_admin', 'director', 'principal', 'hod'), answerDoubt);
router.get('/:id/attachment', getDoubtAttachment);
router.post('/contact', submitContactUs);

module.exports = router;
