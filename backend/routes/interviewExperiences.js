const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getExperiences,
  getExperienceById,
  submitExperience,
  moderateExperience,
  upvoteExperience
} = require('../controllers/interviewExperiences');

router.use(protect);

router.get('/', getExperiences);
router.get('/:id', getExperienceById);
router.post('/', submitExperience);
router.put('/:id/moderate', authorize('admin', 'faculty'), moderateExperience);
router.post('/:id/upvote', upvoteExperience);

module.exports = router;
