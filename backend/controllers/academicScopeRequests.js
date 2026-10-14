const mongoose = require('mongoose');
const AcademicScopeRequest = require('../models/AcademicScopeRequest');
const User = require('../models/User');
const Department = require('../models/Department');
const { PERMISSIONS, ROLES, normalizeRole, getRolePermissions } = require('../config/permissions');
const { getCampusFilter, canAccessCampus, canAccessDepartment, isSuperAdmin, getBranchPatterns } = require('../utils/scopeFilter');
const { logActivity } = require('../utils/auditLogger');

// Institutional standard lists
const INSTITUTIONAL_BRANCHES = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'CSD', 'CSM', 'CSBS', 'AIDS'];
const INSTITUTIONAL_SECTIONS = ['A', 'B', 'C', 'D'];
const INSTITUTIONAL_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

/**
 * Normalizes any academic year representation to ordinal format
 */
const toOrdinalYear = (val) => {
  if (!val) return 'N/A';
  const s = String(val).trim();
  if (/^1(st)?(\s*year)?$/i.test(s) || s === 'I') return '1st Year';
  if (/^2(nd)?(\s*year)?$/i.test(s) || s === 'II') return '2nd Year';
  if (/^3(rd)?(\s*year)?$/i.test(s) || s === 'III') return '3rd Year';
  if (/^4(th)?(\s*year)?$/i.test(s) || s === 'IV' || /final/i.test(s)) return '4th Year';
  if (s === '2026') return '4th Year';
  if (s === '2027') return '3rd Year';
  if (s === '2028') return '2nd Year';
  if (s === '2029') return '1st Year';
  return s.toLowerCase().includes('year') ? s : `${s} Year`;
};

/**
 * Classifies a scope change request based on authoritative student state and requested scope
 */
const classifyScopeChange = (currentScope, requestedScope) => {
  const currentBranch = (currentScope.branch || '').trim();
  const targetBranch = (requestedScope.branch || '').trim();
  const currentYear = toOrdinalYear(currentScope.academicYear);
  const targetYear = toOrdinalYear(requestedScope.academicYear);
  const currentSection = (currentScope.section || '').trim();
  const targetSection = (requestedScope.section || '').trim();

  const isBranchChange = currentBranch.toUpperCase() !== targetBranch.toUpperCase();
  const isYearChange = currentYear !== targetYear;
  const isSectionChange = currentSection.toUpperCase() !== targetSection.toUpperCase();
  const isSectionOnly = !isBranchChange && !isYearChange && isSectionChange;

  return {
    isBranchChange,
    isYearChange,
    isSectionChange,
    isSectionOnly,
    currentBranch,
    targetBranch,
    currentYear,
    targetYear,
    currentSection,
    targetSection
  };
};

/**
 * @desc    Submit student academic scope change request
 * @route   POST /api/academic-scope-requests
 * @access  Private (Student only)
 */
exports.submitScopeRequest = async (req, res, next) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        error: 'Only students are permitted to submit academic scope change requests.'
      });
    }

    const {
      branch,
      section,
      academicYear,
      requestedScope,
      justification,
      reason
    } = req.body;

    const targetBranch = (requestedScope?.branch || branch || '').trim();
    const targetSection = (requestedScope?.section || section || '').trim();
    const targetYear = (requestedScope?.academicYear || academicYear || '').trim();
    const justificationText = (justification || reason || '').trim();

    if (!targetBranch) {
      return res.status(400).json({ success: false, error: 'Please specify the target branch.' });
    }
    if (!targetSection) {
      return res.status(400).json({ success: false, error: 'Please specify the target section.' });
    }
    if (!targetYear) {
      return res.status(400).json({ success: false, error: 'Please specify the target academic year.' });
    }
    if (!justificationText || justificationText.length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid justification explaining the academic or administrative reason (minimum 5 characters).'
      });
    }

    // Check if student already has an active pending request
    const existingPending = await AcademicScopeRequest.findOne({
      student: req.user._id,
      status: 'PENDING'
    });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        error: 'You already have an active scope change request awaiting administrative review. Please wait for it to be processed or withdraw it before submitting a new one.',
        pendingRequest: existingPending
      });
    }

    // Capture snapshot of authoritative current academic scope at time of submission
    const currentScopeSnapshot = {
      academicYear: toOrdinalYear(req.user.academicYear || req.user.year),
      academicSession: req.user.academicSession || '2026–2027',
      branch: req.user.branch || 'N/A',
      section: req.user.section || '—'
    };

    const newRequest = await AcademicScopeRequest.create({
      student: req.user._id,
      campusId: req.user.campusId || null,
      departmentId: req.user.departmentId || null,
      currentScope: currentScopeSnapshot,
      requestedScope: {
        academicYear: toOrdinalYear(targetYear),
        branch: targetBranch,
        section: targetSection
      },
      justification: justificationText,
      status: 'PENDING',
      previousScopeSnapshot: currentScopeSnapshot
    });

    res.status(201).json({
      success: true,
      message: 'Academic scope change request submitted successfully and queued for administrative review.',
      data: newRequest
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get student's own academic scope requests
 * @route   GET /api/academic-scope-requests/my
 * @access  Private (Student only)
 */
exports.getMyScopeRequests = async (req, res, next) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        error: 'Only students can access their personal scope change history.'
      });
    }

    const requests = await AcademicScopeRequest.find({ student: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Withdraw / cancel pending scope request
 * @route   DELETE /api/academic-scope-requests/:id
 * @access  Private (Student only)
 */
exports.withdrawScopeRequest = async (req, res, next) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        error: 'Only students may withdraw their own scope change requests.'
      });
    }

    const request = await AcademicScopeRequest.findOneAndUpdate(
      {
        _id: req.params.id,
        student: req.user._id,
        status: 'PENDING'
      },
      {
        $set: {
          status: 'CANCELLED',
          reviewNotes: 'Withdrawn by student'
        }
      },
      { new: true }
    );

    if (!request) {
      const existing = await AcademicScopeRequest.findOne({
        _id: req.params.id,
        student: req.user._id
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Academic scope change request not found.'
        });
      }

      return res.status(400).json({
        success: false,
        error: `Cannot withdraw request with status '${existing.status}'. Only pending requests can be withdrawn.`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Pending academic scope change request withdrawn successfully.',
      data: request
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get pending academic scope change requests (Tier-aware inspection)
 * @route   GET /api/academic-scope-requests/pending
 * @access  Private (Admin, Campus Admin, Administrator, HOD, Director, Principal, Super Admin)
 */
exports.getPendingScopeRequests = async (req, res, next) => {
  try {
    const reviewer = req.user;
    const userRole = normalizeRole(reviewer.role);
    const campusFilter = getCampusFilter(reviewer);
    const filter = { status: 'PENDING', ...campusFilter };

    // HOD scope constraint: HOD sees pending requests within their department branch
    if (userRole === ROLES.HOD) {
      const branchPatterns = getBranchPatterns(reviewer.branch || 'IT');
      filter['currentScope.branch'] = { $in: branchPatterns };
    }

    const requests = await AcademicScopeRequest.find(filter)
      .populate('student', 'name email rollNumber branch section academicYear year campusId departmentId')
      .sort({ createdAt: -1 })
      .lean();

    // Annotate requests with tier-aware decision rights
    const annotatedRequests = requests.map(reqItem => {
      const classification = classifyScopeChange(
        reqItem.currentScope || {},
        reqItem.requestedScope || {}
      );

      let canReview = false;
      let reviewLevelRequired = 'CAMPUS_ADMIN_BRANCH_YEAR';

      if (classification.isSectionOnly) {
        reviewLevelRequired = 'HOD_SECTION';
        if (userRole === ROLES.HOD) {
          canReview = canAccessCampus(reviewer, reqItem.campusId) &&
            canAccessDepartment(reviewer, reqItem.departmentId, classification.currentBranch);
        } else {
          // Campus admins can also approve section changes
          canReview = canAccessCampus(reviewer, reqItem.campusId);
        }
      } else {
        // Branch or year changes strictly require campus administrator
        reviewLevelRequired = 'CAMPUS_ADMIN_BRANCH_YEAR';
        if (userRole === ROLES.HOD) {
          canReview = false; // HOD cannot review branch or year transfers
        } else {
          canReview = canAccessCampus(reviewer, reqItem.campusId);
        }
      }

      return {
        ...reqItem,
        classification,
        canReview,
        reviewLevelRequired
      };
    });

    res.status(200).json({
      success: true,
      count: annotatedRequests.length,
      data: annotatedRequests
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Approve academic scope change request (Tiered Approval)
 * @route   PUT /api/academic-scope-requests/:id/approve
 * @access  Private (HOD for section-only; Campus Administrator for branch/year)
 */
exports.approveScopeRequest = async (req, res, next) => {
  let session = null;
  let useTransaction = false;

  try {
    const reviewer = req.user;
    if (!reviewer) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const reviewerRole = normalizeRole(reviewer.role);
    const reviewerPermissions = getRolePermissions(reviewerRole, reviewer.customPermissions || []);

    // 1. Fetch pending scope request
    const scopeRequest = await AcademicScopeRequest.findById(req.params.id);
    if (!scopeRequest) {
      return res.status(404).json({ success: false, error: 'Academic scope request not found.' });
    }

    if (scopeRequest.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: `Cannot approve request with status '${scopeRequest.status}'. Only pending requests can be approved.`
      });
    }

    // 2. Prohibit self-review
    if (scopeRequest.student.toString() === reviewer._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Prohibited: You cannot review or approve your own scope change request.'
      });
    }

    // 3. Verify campus access
    if (!canAccessCampus(reviewer, scopeRequest.campusId)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Cannot approve request for a student outside your assigned campus.'
      });
    }

    // 4. Fetch authoritative student record
    const student = await User.findById(scopeRequest.student);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ success: false, error: 'Target student record not found.' });
    }

    // 5. STALE REQUEST PROTECTION:
    // Verify that current student scope still matches the request's recorded original scope
    const recordedBranch = (scopeRequest.currentScope?.branch || '').trim().toUpperCase();
    const recordedSection = (scopeRequest.currentScope?.section || '').trim().toUpperCase();
    const recordedYear = toOrdinalYear(scopeRequest.currentScope?.academicYear);

    const currentActualBranch = (student.branch || '').trim().toUpperCase();
    const currentActualSection = (student.section || '').trim().toUpperCase();
    const currentActualYear = toOrdinalYear(student.academicYear || student.year);

    const isScopeStale = (recordedBranch && recordedBranch !== currentActualBranch) ||
      (recordedSection && recordedSection !== currentActualSection) ||
      (recordedYear && recordedYear !== 'N/A' && recordedYear !== currentActualYear);

    if (isScopeStale) {
      return res.status(409).json({
        success: false,
        error: `Conflict: Stale request baseline. The student's academic scope has changed since this request was submitted (Recorded: [${recordedBranch} Sec ${recordedSection} ${recordedYear}], Current: [${currentActualBranch} Sec ${currentActualSection} ${currentActualYear}]). A fresh request reflecting the current assignment is required.`
      });
    }

    // 6. Classify the request based on current student record vs requested target
    const currentScopeEffective = {
      branch: student.branch || scopeRequest.currentScope?.branch || '',
      academicYear: student.academicYear || student.year || scopeRequest.currentScope?.academicYear || '',
      section: student.section || scopeRequest.currentScope?.section || ''
    };

    const classification = classifyScopeChange(currentScopeEffective, scopeRequest.requestedScope);
    const { isBranchChange, isYearChange, isSectionOnly, targetBranch, targetSection, targetYear } = classification;

    // 7. AUTHORITATIVE SCOPE VALIDATION (Sections, Branches, Years)
    // A. Section Validation: Verify section against configured institutional assignments
    const isCanonicalSection = INSTITUTIONAL_SECTIONS.includes(targetSection.toUpperCase());
    let isConfiguredSection = isCanonicalSection;

    if (!isConfiguredSection && student.campusId) {
      const activeSectionExists = await User.exists({
        campusId: student.campusId,
        branch: targetBranch,
        section: new RegExp(`^${targetSection}$`, 'i')
      });
      if (activeSectionExists) {
        isConfiguredSection = true;
      }
    }

    if (!isConfiguredSection) {
      return res.status(400).json({
        success: false,
        error: `Invalid target section '${targetSection}'. Target section is not a configured institutional section for this campus and branch.`
      });
    }

    // B. Target Branch & Department Mapping Validation
    let targetDeptId = null;
    if (student.campusId) {
      const campusDepts = await Department.find({ campusId: student.campusId, isActive: true })
        .select('code branches name')
        .lean();

      const validBranches = new Set(INSTITUTIONAL_BRANCHES);
      let matchingDept = null;

      campusDepts.forEach(d => {
        if (d.code) validBranches.add(d.code.toUpperCase());
        if (Array.isArray(d.branches)) {
          d.branches.forEach(b => validBranches.add(b.toUpperCase()));
        }
        const dCode = (d.code || '').toUpperCase();
        const dName = (d.name || '').toUpperCase();
        const dBranches = Array.isArray(d.branches) ? d.branches.map(b => b.toUpperCase()) : [];
        const tBranchUpper = targetBranch.toUpperCase();

        if (dCode === tBranchUpper || dBranches.includes(tBranchUpper) || dName === tBranchUpper) {
          matchingDept = d;
        }
      });

      if (!validBranches.has(targetBranch.toUpperCase())) {
        return res.status(400).json({
          success: false,
          error: `Invalid target branch '${targetBranch}'. Branch does not exist in institutional configuration for this campus.`
        });
      }

      if (isBranchChange && !matchingDept) {
        return res.status(400).json({
          success: false,
          error: `Invalid target branch '${targetBranch}'. Target branch does not belong to any active department in the student's campus.`
        });
      }

      if (matchingDept) {
        targetDeptId = matchingDept._id;
      }
    } else {
      if (!INSTITUTIONAL_BRANCHES.includes(targetBranch.toUpperCase())) {
        return res.status(400).json({
          success: false,
          error: `Invalid target branch '${targetBranch}'. Branch does not exist in institutional configuration.`
        });
      }
    }

    // C. Academic Year Validation
    if (!INSTITUTIONAL_YEARS.includes(targetYear)) {
      return res.status(400).json({
        success: false,
        error: `Invalid target academic year '${targetYear}'. Must be in 1st to 4th Year sequence.`
      });
    }

    // 8. TIERED AUTHORIZATION CHECK
    if (reviewerRole === ROLES.HOD) {
      // HOD Rule A: Must be section-only change
      if (isBranchChange || isYearChange) {
        return res.status(403).json({
          success: false,
          error: 'Access Denied: Head of Department (HOD) is authorized for section-only changes within their department. Branch and academic-year transfers require Campus Administrator / Registrar approval.'
        });
      }

      // HOD Rule B: Student's department must fall within HOD's verified department
      if (!canAccessDepartment(reviewer, student.departmentId || scopeRequest.departmentId, classification.currentBranch)) {
        return res.status(403).json({
          success: false,
          error: 'Access Denied: Student belongs to a department outside your departmental authority.'
        });
      }
    } else {
      // Campus-level administrator path:
      const hasAdminRights = isSuperAdmin(reviewer) ||
        reviewerPermissions.has(PERMISSIONS.SCOPE_ASSIGN) ||
        reviewerPermissions.has(PERMISSIONS.STUDENT_UPDATE);

      if (!hasAdminRights) {
        return res.status(403).json({
          success: false,
          error: 'Access Denied: Reviewer lacks institutional scope assignment authority.'
        });
      }
    }

    // 9. ATOMIC CONCURRENCY-SAFE UPDATE WITH RECOVERABLE COMPENSATION PATTERN
    const previousScope = {
      branch: student.branch,
      section: student.section,
      academicYear: student.academicYear,
      year: student.year
    };
    const reviewNotes = (req.body.reviewNotes || req.body.notes || '').trim();

    // Check if MongoDB transaction is supported on active connection
    const canAttemptTransaction = mongoose.connection && mongoose.connection.readyState === 1 && typeof mongoose.startSession === 'function';
    if (canAttemptTransaction) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
        useTransaction = true;
      } catch (sessionErr) {
        if (session) {
          try {
            if (typeof session.inTransaction === 'function' && session.inTransaction()) {
              await session.abortTransaction();
            }
          } catch (_) {}
          try { await session.endSession(); } catch (_) {}
          session = null;
        }
        useTransaction = false;
      }
    }

    let updatedRequest = null;

    if (useTransaction) {
      try {
        updatedRequest = await AcademicScopeRequest.findOneAndUpdate(
          { _id: scopeRequest._id, status: 'PENDING' },
          {
            $set: {
              status: 'APPROVED',
              reviewedBy: reviewer._id,
              reviewedAt: new Date(),
              reviewDecision: 'APPROVED',
              reviewNotes,
              previousScopeSnapshot: previousScope
            }
          },
          { new: true, session }
        );

        if (!updatedRequest) {
          if (typeof session.inTransaction === 'function' && session.inTransaction()) {
            await session.abortTransaction();
          }
          await session.endSession();
          session = null;
          return res.status(409).json({
            success: false,
            error: 'Conflict: This scope change request was already processed or updated by another reviewer.'
          });
        }

        student.section = targetSection;
        student.branch = targetBranch;
        student.academicYear = targetYear;
        if (student.year && !/20\d\d/.test(student.year)) {
          student.year = targetYear;
        }
        if (isBranchChange && targetDeptId) {
          student.departmentId = targetDeptId;
        }

        await student.save({ session });

        // Auto-cancel any other superseded pending requests for this student
        await AcademicScopeRequest.updateMany(
          {
            student: student._id,
            _id: { $ne: scopeRequest._id },
            status: 'PENDING'
          },
          {
            $set: {
              status: 'CANCELLED',
              reviewNotes: `Superseded by approval of request ${scopeRequest._id}.`
            }
          },
          { session }
        );

        await session.commitTransaction();
        await session.endSession();
        session = null;
      } catch (txErr) {
        if (session) {
          try {
            if (typeof session.inTransaction === 'function' && session.inTransaction()) {
              await session.abortTransaction();
            }
          } catch (_) {}
          try { await session.endSession(); } catch (_) {}
          session = null;
        }
        throw txErr;
      }
    } else {
      // Non-replica set / Standalone environment: Two-Phase Lease with Compensation Rollback
      updatedRequest = await AcademicScopeRequest.findOneAndUpdate(
        { _id: scopeRequest._id, status: 'PENDING' },
        {
          $set: {
            status: 'APPROVED',
            reviewedBy: reviewer._id,
            reviewedAt: new Date(),
            reviewDecision: 'APPROVED',
            reviewNotes,
            previousScopeSnapshot: previousScope
          }
        },
        { new: true }
      );

      if (!updatedRequest) {
        return res.status(409).json({
          success: false,
          error: 'Conflict: This scope change request was already processed or updated by another reviewer.'
        });
      }

      try {
        student.section = targetSection;
        student.branch = targetBranch;
        student.academicYear = targetYear;
        if (student.year && !/20\d\d/.test(student.year)) {
          student.year = targetYear;
        }
        if (isBranchChange && targetDeptId) {
          student.departmentId = targetDeptId;
        }

        await student.save();
      } catch (studentSaveErr) {
        // CRITICAL COMPENSATION ROLLBACK: Revert request lease back to PENDING
        console.error('[ACADEMIC_SCOPE_ROLLBACK] Student scope update failed; executing compensation rollback:', studentSaveErr.message);
        try {
          await AcademicScopeRequest.updateOne(
            { _id: scopeRequest._id, status: 'APPROVED' },
            {
              $set: {
                status: 'PENDING',
                reviewedBy: null,
                reviewedAt: null,
                reviewDecision: null,
                reviewNotes: `[AUTO-ROLLBACK: Student update failed: ${studentSaveErr.message}]`
              }
            }
          );
        } catch (rollbackErr) {
          console.error('[ACADEMIC_SCOPE_ROLLBACK_CRITICAL] Failed to execute compensation rollback on request:', rollbackErr);
        }

        return res.status(500).json({
          success: false,
          error: `Failed to update student academic scope: ${studentSaveErr.message}. The request has been safely rolled back to pending.`
        });
      }

      // Auto-cancel any other superseded pending requests for this student
      try {
        await AcademicScopeRequest.updateMany(
          {
            student: student._id,
            _id: { $ne: scopeRequest._id },
            status: 'PENDING'
          },
          {
            $set: {
              status: 'CANCELLED',
              reviewNotes: `Superseded by approval of request ${scopeRequest._id}.`
            }
          }
        );
      } catch (supersedeErr) {
        console.warn('[ACADEMIC_SCOPE_WARNING] Failed to auto-cancel superseded pending requests:', supersedeErr.message);
      }
    }

    // 10. Record Auditable Decision via logActivity
    let auditLogSuccess = false;
    try {
      const auditResult = await logActivity({
        user: reviewer,
        action: 'ACADEMIC_SCOPE_REQUEST_APPROVED',
        category: 'Academic Administration',
        description: `${reviewer.name} (${reviewerRole.toUpperCase()}) approved academic scope change for student ${student.name} (${student.rollNumber || student.email}). Scope: [${previousScope.branch} Sec ${previousScope.section} ${previousScope.academicYear}] -> [${student.branch} Sec ${student.section} ${student.academicYear}]`,
        details: {
          requestId: updatedRequest._id,
          studentId: student._id,
          studentName: student.name,
          rollNumber: student.rollNumber,
          previousScope,
          newScope: {
            branch: student.branch,
            section: student.section,
            academicYear: student.academicYear
          },
          changeClassification: isSectionOnly ? 'SECTION_ONLY' : (isBranchChange ? 'BRANCH_CHANGE' : 'YEAR_CHANGE'),
          reviewNotes,
          transactionApplied: useTransaction
        },
        req
      });

      if (auditResult) {
        auditLogSuccess = true;
      } else {
        console.warn('[AUDIT_WARNING] Secondary AuditLog entry was not persisted for scope approval of request:', updatedRequest._id);
      }
    } catch (auditErr) {
      console.warn('[AUDIT_WARNING] Error invoking activity log for scope approval:', auditErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Academic scope change request approved and authoritative student scope updated successfully.',
      data: updatedRequest,
      audit: {
        recordedOnRequest: true,
        activityLogPersisted: auditLogSuccess
      }
    });
  } catch (err) {
    if (session) {
      try {
        if (typeof session.inTransaction === 'function' && session.inTransaction()) {
          await session.abortTransaction();
        }
      } catch (_) {}
      try { await session.endSession(); } catch (_) {}
      session = null;
    }
    next(err);
  }
};

/**
 * @desc    Reject academic scope change request (Tiered Approval)
 * @route   PUT /api/academic-scope-requests/:id/reject
 * @access  Private (HOD for department students; Campus Administrator for campus students)
 */
exports.rejectScopeRequest = async (req, res, next) => {
  try {
    const reviewer = req.user;
    if (!reviewer) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const reviewerRole = normalizeRole(reviewer.role);
    const reviewerPermissions = getRolePermissions(reviewerRole, reviewer.customPermissions || []);

    const scopeRequest = await AcademicScopeRequest.findById(req.params.id);
    if (!scopeRequest) {
      return res.status(404).json({ success: false, error: 'Academic scope request not found.' });
    }

    if (scopeRequest.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: `Cannot reject request with status '${scopeRequest.status}'. Only pending requests can be rejected.`
      });
    }

    // Prohibit self-review
    if (scopeRequest.student.toString() === reviewer._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Prohibited: You cannot review your own scope change request.'
      });
    }

    // Verify campus access
    if (!canAccessCampus(reviewer, scopeRequest.campusId)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Cannot review request for a student outside your assigned campus.'
      });
    }

    // HOD review boundary check
    if (reviewerRole === ROLES.HOD) {
      if (!canAccessDepartment(reviewer, scopeRequest.departmentId, scopeRequest.currentScope?.branch)) {
        return res.status(403).json({
          success: false,
          error: 'Access Denied: Student belongs to a department outside your departmental authority.'
        });
      }
    } else {
      const hasAdminRights = isSuperAdmin(reviewer) ||
        reviewerPermissions.has(PERMISSIONS.SCOPE_ASSIGN) ||
        reviewerPermissions.has(PERMISSIONS.STUDENT_UPDATE);

      if (!hasAdminRights) {
        return res.status(403).json({
          success: false,
          error: 'Access Denied: Reviewer lacks institutional scope review authority.'
        });
      }
    }

    const reviewNotes = (req.body.reviewNotes || req.body.notes || 'Request rejected by academic administration.').trim();

    // Atomic update to REJECTED
    const updatedRequest = await AcademicScopeRequest.findOneAndUpdate(
      { _id: scopeRequest._id, status: 'PENDING' },
      {
        $set: {
          status: 'REJECTED',
          reviewedBy: reviewer._id,
          reviewedAt: new Date(),
          reviewDecision: 'REJECTED',
          reviewNotes
        }
      },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(409).json({
        success: false,
        error: 'Conflict: This scope change request was already processed.'
      });
    }

    // Audit Log for Rejection (student authoritative record untouched)
    let auditLogSuccess = false;
    try {
      const auditResult = await logActivity({
        user: reviewer,
        action: 'ACADEMIC_SCOPE_REQUEST_REJECTED',
        category: 'Academic Administration',
        description: `${reviewer.name} (${reviewerRole.toUpperCase()}) rejected academic scope change request for student ID ${scopeRequest.student}. Reason: ${reviewNotes}`,
        details: {
          requestId: updatedRequest._id,
          studentId: scopeRequest.student,
          reviewNotes
        },
        req
      });

      if (auditResult) {
        auditLogSuccess = true;
      } else {
        console.warn('[AUDIT_WARNING] Secondary AuditLog entry was not persisted for scope rejection of request:', updatedRequest._id);
      }
    } catch (auditErr) {
      console.warn('[AUDIT_WARNING] Error invoking activity log for scope rejection:', auditErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Academic scope change request rejected.',
      data: updatedRequest,
      audit: {
        recordedOnRequest: true,
        activityLogPersisted: auditLogSuccess
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  ...exports,
  toOrdinalYear,
  classifyScopeChange
};
