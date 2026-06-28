const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// Helper to generate and send token
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });

  // Remove password from output if present
  const userObj = user.toObject();
  delete userObj.password;

  res.status(statusCode).json({
    success: true,
    token,
    user: userObj
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, leetcodeUsername, codeforcesUsername, codechefUsername, hackerrankUsername } = req.body;
    const normalizedRole = role || 'student';
    const trimmedLeetCode = (leetcodeUsername || '').trim();
    const trimmedCodeforces = (codeforcesUsername || '').trim();
    const trimmedCodeChef = (codechefUsername || '').trim();
    const trimmedHackerrank = (hackerrankUsername || '').trim();

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
    }

    let leetcodeStats = { easySolved: 0, mediumSolved: 0, hardSolved: 0, totalSolved: 0, solvedSlugs: [] };
    if (trimmedLeetCode) {
      try {
        const { fetchLeetcodeData } = require('./users');
        leetcodeStats = await fetchLeetcodeData(trimmedLeetCode);
      } catch (err) {
        return res.status(400).json({
          success: false,
          error: `LeetCode user '${trimmedLeetCode}' not found. Please verify the handle.`
        });
      }
    }

    let codeforcesStats = { rating: 0, maxRating: 0, rank: 'Unrated', solvedCount: 0 };
    if (trimmedCodeforces) {
      try {
        const { fetchCodeforcesData } = require('./users');
        codeforcesStats = await fetchCodeforcesData(trimmedCodeforces);
      } catch (err) {
        return res.status(400).json({
          success: false,
          error: `Codeforces user '${trimmedCodeforces}' not found. Please verify the handle.`
        });
      }
    }

    let codechefStats = { rating: 0, stars: '1★', globalRank: 0, countryRank: 0 };
    if (trimmedCodeChef) {
      try {
        const { fetchCodechefData } = require('./users');
        codechefStats = await fetchCodechefData(trimmedCodeChef);
      } catch (err) {
        return res.status(400).json({
          success: false,
          error: `CodeChef user '${trimmedCodeChef}' not found. Please verify the handle.`
        });
      }
    }

    let hackerrankStats = { solvedCount: 0, score: 0, badgesCount: 0 };
    if (trimmedHackerrank) {
      try {
        const { fetchHackerrankData } = require('./users');
        hackerrankStats = await fetchHackerrankData(trimmedHackerrank);
      } catch (err) {
        return res.status(400).json({
          success: false,
          error: `HackerRank user '${trimmedHackerrank}' not found. Please verify the handle.`
        });
      }
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: normalizedRole,
      leetcodeUsername: trimmedLeetCode,
      leetcodeStats,
      codeforcesUsername: trimmedCodeforces,
      codeforcesStats,
      codechefUsername: trimmedCodeChef,
      codechefStats,
      hackerrankUsername: trimmedHackerrank,
      hackerrankStats
    });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    let user = await User.findById(req.user.id);

    // Auto-replicate LeetCode status on load
    if (user && user.leetcodeUsername) {
      try {
        const { fetchLeetcodeData } = require('./users');
        const syncPromise = fetchLeetcodeData(user.leetcodeUsername);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500));
        const freshStats = await Promise.race([syncPromise, timeoutPromise]);

        user = await User.findByIdAndUpdate(
          req.user.id,
          { leetcodeStats: freshStats },
          { new: true }
        );
      } catch (err) {
        console.warn(`Auto-sync skipped during getMe: ${err.message}`);
      }
    }

    // Auto-replicate Codeforces status on load
    if (user && user.codeforcesUsername) {
      try {
        const { fetchCodeforcesData } = require('./users');
        const syncPromise = fetchCodeforcesData(user.codeforcesUsername);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500));
        const freshStats = await Promise.race([syncPromise, timeoutPromise]);

        user = await User.findByIdAndUpdate(
          req.user.id,
          { codeforcesStats: freshStats },
          { new: true }
        );
      } catch (err) {
        console.warn(`Codeforces auto-sync skipped during getMe: ${err.message}`);
      }
    }

    // Auto-replicate CodeChef status on load
    if (user && user.codechefUsername) {
      try {
        const { fetchCodechefData } = require('./users');
        const syncPromise = fetchCodechefData(user.codechefUsername);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500));
        const freshStats = await Promise.race([syncPromise, timeoutPromise]);

        user = await User.findByIdAndUpdate(
          req.user.id,
          { codechefStats: freshStats },
          { new: true }
        );
      } catch (err) {
        console.warn(`CodeChef auto-sync skipped during getMe: ${err.message}`);
      }
    }

    // Auto-replicate HackerRank status on load
    if (user && user.hackerrankUsername) {
      try {
        const { fetchHackerrankData } = require('./users');
        const syncPromise = fetchHackerrankData(user.hackerrankUsername);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500));
        const freshStats = await Promise.race([syncPromise, timeoutPromise]);

        user = await User.findByIdAndUpdate(
          req.user.id,
          { hackerrankStats: freshStats },
          { new: true }
        );
      } catch (err) {
        console.warn(`HackerRank auto-sync skipped during getMe: ${err.message}`);
      }
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      bio: req.body.bio,
      skills: req.body.skills,
      targetRole: req.body.targetRole,
      rollNumber: req.body.rollNumber,
      branch: req.body.branch,
      year: req.body.year,
      leetcodeUsername: req.body.leetcodeUsername,
      codeforcesUsername: req.body.codeforcesUsername,
      codechefUsername: req.body.codechefUsername,
      hackerrankUsername: req.body.hackerrankUsername,
      sgpaSem1: req.body.sgpaSem1 !== undefined ? Number(req.body.sgpaSem1) : undefined,
      sgpaSem2: req.body.sgpaSem2 !== undefined ? Number(req.body.sgpaSem2) : undefined,
      sgpaSem3: req.body.sgpaSem3 !== undefined ? Number(req.body.sgpaSem3) : undefined,
      sgpaSem4: req.body.sgpaSem4 !== undefined ? Number(req.body.sgpaSem4) : undefined,
      sgpaSem5: req.body.sgpaSem5 !== undefined ? Number(req.body.sgpaSem5) : undefined,
      sgpaSem6: req.body.sgpaSem6 !== undefined ? Number(req.body.sgpaSem6) : undefined,
      sgpaSem7: req.body.sgpaSem7 !== undefined ? Number(req.body.sgpaSem7) : undefined,
      sgpaSem8: req.body.sgpaSem8 !== undefined ? Number(req.body.sgpaSem8) : undefined
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(
      key => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    // If leetcodeUsername is changing, verify and sync stats!
    if (req.body.leetcodeUsername !== undefined && req.body.leetcodeUsername !== req.user.leetcodeUsername) {
      const username = req.body.leetcodeUsername;
      if (username && username.trim() !== '') {
        try {
          const { fetchLeetcodeData } = require('./users');
          fieldsToUpdate.leetcodeStats = await fetchLeetcodeData(username);
        } catch (err) {
          return res.status(400).json({
            success: false,
            error: `LeetCode user '${username}' not found. Please verify the handle.`
          });
        }
      } else {
        // Reset stats if they clear their username
        fieldsToUpdate.leetcodeStats = { easySolved: 0, mediumSolved: 0, hardSolved: 0, totalSolved: 0, solvedSlugs: [] };
      }
    }

    // If codeforcesUsername is changing, verify and sync stats!
    if (req.body.codeforcesUsername !== undefined && req.body.codeforcesUsername !== req.user.codeforcesUsername) {
      const username = req.body.codeforcesUsername;
      if (username && username.trim() !== '') {
        try {
          const { fetchCodeforcesData } = require('./users');
          fieldsToUpdate.codeforcesStats = await fetchCodeforcesData(username);
        } catch (err) {
          return res.status(400).json({
            success: false,
            error: `Codeforces user '${username}' not found. Please verify the handle.`
          });
        }
      } else {
        // Reset stats if they clear their username
        fieldsToUpdate.codeforcesStats = { rating: 0, maxRating: 0, rank: 'Unrated', solvedCount: 0 };
      }
    }

    // If codechefUsername is changing, verify and sync stats!
    if (req.body.codechefUsername !== undefined && req.body.codechefUsername !== req.user.codechefUsername) {
      const username = req.body.codechefUsername;
      if (username && username.trim() !== '') {
        try {
          const { fetchCodechefData } = require('./users');
          fieldsToUpdate.codechefStats = await fetchCodechefData(username);
        } catch (err) {
          return res.status(400).json({
            success: false,
            error: `CodeChef user '${username}' not found. Please verify the handle.`
          });
        }
      } else {
        // Reset stats if they clear their username
        fieldsToUpdate.codechefStats = { rating: 0, stars: '1★', globalRank: 0, countryRank: 0 };
      }
    }

    // If hackerrankUsername is changing, verify and sync stats!
    if (req.body.hackerrankUsername !== undefined && req.body.hackerrankUsername !== req.user.hackerrankUsername) {
      const username = req.body.hackerrankUsername;
      if (username && username.trim() !== '') {
        try {
          const { fetchHackerrankData } = require('./users');
          fieldsToUpdate.hackerrankStats = await fetchHackerrankData(username);
        } catch (err) {
          return res.status(400).json({
            success: false,
            error: `HackerRank user '${username}' not found. Please verify the handle.`
          });
        }
      } else {
        // Reset stats if they clear their username
        fieldsToUpdate.hackerrankStats = { solvedCount: 0, score: 0, badgesCount: 0 };
      }
    }

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Please provide an email' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, error: 'There is no user with that email' });
    }

    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire (10 minutes)
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    // Create reset url
    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) have requested the reset of a password. Please use the following link to reset your password within 10 minutes:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`;

    try {
      await sendEmail({
        to: user.email,
        subject: 'PrepPortal - Password Reset Token',
        text: message,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #4f46e5; margin-bottom: 20px;">Password Reset Request</h2>
            <p style="font-size: 16px; color: #333;">Hello <strong>${user.name}</strong>,</p>
            <p style="font-size: 14px; color: #555;">You requested a password reset for your PrepPortal account. Please click the button below to choose a new password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">Reset Password</a>
            </div>
            
            <p style="font-size: 14px; color: #555;">Or copy and paste the following URL into your browser:</p>
            <p style="font-size: 12px; background-color: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all; color: #4b5563;">${resetUrl}</p>
            
            <p style="font-size: 12px; color: #9ca3af; margin-top: 25px;">Note: This link will expire in 10 minutes. If you did not make this request, you can safely ignore this email.</p>
          </div>
        `
      });

      res.status(200).json({ success: true, data: 'Email sent successfully' });
    } catch (err) {
      console.error(err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ success: false, error: 'Email could not be sent' });
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:token
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, error: 'Please provide a password' });
    }

    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};
