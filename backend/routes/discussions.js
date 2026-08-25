const express = require('express');
const {
  getPosts,
  createPost,
  likePost,
  addComment,
  addReply,
  reportPost,
  deletePost
} = require('../controllers/discussions');

const router = express.Router();

const { protect } = require('../middleware/auth');

router.use(protect); // Require auth for all discussion routes

router.route('/')
  .get(getPosts)
  .post(createPost);

router.post('/:id/like', likePost);
router.post('/:id/comment', addComment);
router.post('/:id/comment/:commentId/reply', addReply);
router.post('/:id/report', reportPost);
router.delete('/:id', deletePost);

module.exports = router;
