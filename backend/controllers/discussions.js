const Discussion = require('../models/Discussion');
const User = require('../models/User');

// @desc    Get all discussions with filters
// @route   GET /api/discussions
// @access  Private
exports.getPosts = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const query = {};

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    // Don't show reported posts unless admin
    if (req.user.role !== 'admin') {
      query.reported = { $ne: true };
    }

    const posts = await Discussion.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a discussion post
// @route   POST /api/discussions
// @access  Private
exports.createPost = async (req, res, next) => {
  try {
    const { title, content, category } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Please provide title and content' });
    }

    const post = await Discussion.create({
      user: req.user.id,
      userName: req.user.name,
      title,
      content,
      category: category || 'Placement',
      likes: [],
      comments: []
    });

    res.status(201).json({
      success: true,
      data: post
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Like/Unlike a post
// @route   POST /api/discussions/:id/like
// @access  Private
exports.likePost = async (req, res, next) => {
  try {
    const post = await Discussion.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const index = post.likes.indexOf(req.user.id);
    if (index >= 0) {
      // Unlike
      post.likes.splice(index, 1);
    } else {
      // Like
      post.likes.push(req.user.id);
    }

    await post.save();

    res.status(200).json({
      success: true,
      data: post
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add comment to post
// @route   POST /api/discussions/:id/comment
// @access  Private
exports.addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'Comment text is required' });
    }

    const post = await Discussion.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    post.comments.push({
      user: req.user.id,
      userName: req.user.name,
      text,
      replies: []
    });

    await post.save();

    res.status(201).json({
      success: true,
      data: post
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add reply to a comment
// @route   POST /api/discussions/:id/comment/:commentId/reply
// @access  Private
exports.addReply = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'Reply text is required' });
    }

    const post = await Discussion.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    comment.replies.push({
      user: req.user.id,
      userName: req.user.name,
      text
    });

    await post.save();

    res.status(201).json({
      success: true,
      data: post
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Report post as inappropriate
// @route   POST /api/discussions/:id/report
// @access  Private
exports.reportPost = async (req, res, next) => {
  try {
    const post = await Discussion.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    post.reported = true;
    await post.save();

    res.status(200).json({
      success: true,
      message: 'Post reported successfully.'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete post
// @route   DELETE /api/discussions/:id
// @access  Private
exports.deletePost = async (req, res, next) => {
  try {
    const post = await Discussion.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    // Only author or admin can delete
    if (post.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, error: 'Not authorized to delete this post' });
    }

    await post.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
};
