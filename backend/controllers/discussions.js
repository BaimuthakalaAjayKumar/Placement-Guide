const Discussion = require('../models/Discussion');
const Subject = require('../models/Subject');
const User = require('../models/User');
const { logActivity } = require('../utils/auditLogger');

const escapeRegex = (str) => (str || '').replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

// @desc    Get all discussions with filters (separated into General vs Subject-wise)
// @route   GET /api/discussions
// @access  Private
exports.getPosts = async (req, res, next) => {
  try {
    const {
      category,
      search,
      forumType = 'general', // 'general' | 'subject' | 'all'
      subjectId,
      academicYear,
      branch,
      section
    } = req.query;

    const query = {};

    // 1. Separate Forum Type Handling
    if (forumType === 'subject') {
      query.forumType = 'subject';

      if (subjectId && subjectId !== 'All') {
        query.subject = subjectId;
      } else if (req.user.role === 'faculty') {
        // Scope-based filtering for faculty
        if (req.user.managedScopes && req.user.managedScopes.length > 0) {
          const directSubjectIds = req.user.managedScopes.map(s => s.subject).filter(Boolean);

          const scopeConditions = req.user.managedScopes.map(scope => {
            const cond = {};
            if (scope.academicYear && scope.academicYear.toLowerCase() !== 'all') {
              cond.academicYear = new RegExp(`^${escapeRegex(scope.academicYear.trim())}$`, 'i');
            }
            if (scope.branch && scope.branch.toLowerCase() !== 'all') {
              cond.branch = new RegExp(`^${escapeRegex(scope.branch.trim())}$`, 'i');
            }
            if (scope.section && scope.section.toLowerCase() !== 'all') {
              cond.section = new RegExp(`^${escapeRegex(scope.section.trim())}$`, 'i');
            }
            return cond;
          });

          const orClauses = [
            { user: req.user.id }
          ];

          if (directSubjectIds.length > 0) {
            orClauses.push({ subject: { $in: directSubjectIds } });
          }

          if (scopeConditions.length > 0) {
            orClauses.push(...scopeConditions);
          }

          query.$or = orClauses;
        }
      } else if (req.user.role === 'student') {
        // Students see discussions for their year/branch or enrolled subjects
        const studentYear = req.user.academicYear || req.user.year || '';
        const studentBranch = req.user.branch || '';

        const orStudentClauses = [
          { user: req.user.id },
          { academicYear: { $in: ['', null, 'All', 'all'] } }
        ];

        if (studentYear) {
          orStudentClauses.push({ academicYear: new RegExp(`^${escapeRegex(studentYear.trim())}$`, 'i') });
        }
        if (studentBranch) {
          orStudentClauses.push({ branch: new RegExp(`^${escapeRegex(studentBranch.trim())}$`, 'i') });
        }

        // Also fetch subject IDs accessible to student
        const studentSubjects = await Subject.find({
          isActive: true,
          $or: [
            { academicYear: new RegExp(`^${escapeRegex(studentYear.trim())}$`, 'i') },
            { academicYear: { $in: ['', null, 'All', 'all'] } }
          ]
        }).select('_id');

        if (studentSubjects.length > 0) {
          orStudentClauses.push({ subject: { $in: studentSubjects.map(s => s._id) } });
        }

        query.$or = orStudentClauses;
      }
      // Admin sees ALL subject discussions without restriction

      if (academicYear && academicYear !== 'All') {
        query.academicYear = new RegExp(`^${escapeRegex(academicYear.trim())}$`, 'i');
      }
      if (branch && branch !== 'All') {
        query.branch = new RegExp(`^${escapeRegex(branch.trim())}$`, 'i');
      }
      if (section && section !== 'All') {
        query.section = new RegExp(`^${escapeRegex(section.trim())}$`, 'i');
      }

    } else if (forumType === 'general') {
      // Present one: General placement forum
      query.forumType = { $in: ['general', null, undefined] };

      if (category && category !== 'All') {
        query.category = category;
      }
    }

    // 2. Search Keyword
    if (search && search.trim()) {
      const s = search.trim();
      const searchConditions = [
        { title: { $regex: s, $options: 'i' } },
        { content: { $regex: s, $options: 'i' } },
        { userName: { $regex: s, $options: 'i' } },
        { subjectName: { $regex: s, $options: 'i' } },
        { subjectCode: { $regex: s, $options: 'i' } }
      ];

      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: searchConditions }
        ];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    // Don't show reported posts unless admin or author
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

// @desc    Create a discussion post (General or Subject-wise)
// @route   POST /api/discussions
// @access  Private
exports.createPost = async (req, res, next) => {
  try {
    const {
      title,
      content,
      category,
      forumType = 'general',
      subjectId,
      academicYear,
      branch,
      section
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Please provide title and content' });
    }

    let subjectDoc = null;
    let sName = '';
    let sCode = '';
    let sYear = academicYear || '';
    let sBranch = branch || '';
    let sSection = section || '';

    if (forumType === 'subject') {
      if (!subjectId) {
        return res.status(400).json({ success: false, error: 'Please select an academic subject for subject-wise discussion' });
      }

      subjectDoc = await Subject.findById(subjectId);
      if (!subjectDoc) {
        return res.status(404).json({ success: false, error: 'Selected subject not found' });
      }

      sName = subjectDoc.name;
      sCode = subjectDoc.code;
      sYear = sYear || subjectDoc.academicYear || '';
      sBranch = sBranch || subjectDoc.branch || '';
      sSection = sSection || subjectDoc.section || '';
    }

    const post = await Discussion.create({
      user: req.user.id,
      userName: req.user.name,
      userRole: req.user.role || 'student',
      userRollNumber: req.user.rollNumber || '',
      title: title.trim(),
      content: content.trim(),
      forumType: forumType === 'subject' ? 'subject' : 'general',
      category: forumType === 'subject' ? (category || 'Technical Subjects') : (category || 'Placement'),
      subject: subjectDoc ? subjectDoc._id : null,
      subjectName: sName,
      subjectCode: sCode,
      academicYear: sYear,
      branch: sBranch,
      section: sSection,
      likes: [],
      comments: []
    });

    // Log Activity for Audit Trail
    await logActivity({
      user: req.user,
      action: 'DISCUSSION_POST',
      category: 'Discussions',
      description: `Started ${forumType === 'subject' ? `subject discussion [${sName || sCode}]` : `general discussion [${category || 'Placement'}]`}: "${title.trim()}"`,
      details: {
        postId: post._id,
        forumType,
        subjectId: subjectDoc?._id,
        subjectName: sName,
        category: post.category
      },
      req
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
      post.likes.splice(index, 1);
    } else {
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
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Comment text is required' });
    }

    const post = await Discussion.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    post.comments.push({
      user: req.user.id,
      userName: req.user.name,
      userRole: req.user.role || 'student',
      text: text.trim(),
      replies: []
    });

    await post.save();

    // Log Activity for Audit Trail
    await logActivity({
      user: req.user,
      action: 'DISCUSSION_COMMENT',
      category: 'Discussions',
      description: `Commented on discussion: "${post.title}"`,
      details: {
        postId: post._id,
        forumType: post.forumType,
        subjectName: post.subjectName
      },
      req
    });

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
    if (!text || !text.trim()) {
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
      userRole: req.user.role || 'student',
      text: text.trim()
    });

    await post.save();

    // Log Activity for Audit Trail
    await logActivity({
      user: req.user,
      action: 'DISCUSSION_REPLY',
      category: 'Discussions',
      description: `Replied to a comment on discussion: "${post.title}"`,
      details: {
        postId: post._id,
        commentId: comment._id
      },
      req
    });

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

    // Authorization: Author, Admin, or Faculty assigned to the subject can delete
    const isAuthor = post.user.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    let isAssignedFaculty = false;

    if (req.user.role === 'faculty' && post.forumType === 'subject') {
      if (!req.user.managedScopes || req.user.managedScopes.length === 0) {
        isAssignedFaculty = true;
      } else {
        isAssignedFaculty = req.user.managedScopes.some(scope => {
          if (scope.subject && post.subject && String(scope.subject) === String(post.subject)) return true;
          const yearMatch = !scope.academicYear || scope.academicYear.toLowerCase() === 'all' || (post.academicYear && post.academicYear.toLowerCase().includes(scope.academicYear.toLowerCase()));
          const branchMatch = !scope.branch || scope.branch.toLowerCase() === 'all' || (post.branch && post.branch.toLowerCase() === scope.branch.toLowerCase());
          return yearMatch && branchMatch;
        });
      }
    }

    if (!isAuthor && !isAdmin && !isAssignedFaculty) {
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
