const Subject = require('../models/Subject');
const Project = require('../models/Project');
const getStudentAcademicYear = (user) => user.academicYear || user.year || '';

const canManageYear = (user, academicYear) => {
  if (user.role === 'admin') return true;
  if (user.role !== 'faculty') return false;
  if (!user.managedAcademicYears || user.managedAcademicYears.length === 0) return true;
  const targetYear = (academicYear || '').trim().toLowerCase();
  return user.managedAcademicYears.some(y => !y || y.trim().toLowerCase() === 'all' || y.trim().toLowerCase() === targetYear || targetYear.includes(y.trim().toLowerCase()) || y.trim().toLowerCase().includes(targetYear));
};

const canManageScope = (user, academicYear, branch = '', section = '') => {
  if (user.role === 'admin') return true;
  if (user.role !== 'faculty') return false;
  if (!user.managedScopes || user.managedScopes.length === 0) return true;
  return user.managedScopes.some(scope => {
    const sYear = (scope.academicYear || '').trim().toLowerCase();
    const sBranch = (scope.branch || '').trim().toLowerCase();
    const sSection = (scope.section || '').trim().toLowerCase();
    const reqYear = (academicYear || '').trim().toLowerCase();
    const reqBranch = (branch || '').trim().toLowerCase();
    const reqSection = (section || '').trim().toLowerCase();
    const yearMatch = !sYear || sYear === 'all' || !reqYear || sYear === reqYear || reqYear.includes(sYear) || sYear.includes(reqYear);
    const branchMatch = !sBranch || sBranch === 'all' || !reqBranch || sBranch === reqBranch;
    const sectionMatch = !sSection || sSection === 'all' || !reqSection || sSection === reqSection;
    return yearMatch && branchMatch && sectionMatch;
  });
};

exports.getSubjects = async (req, res, next) => {
  try {
    const academicYear = req.query.academicYear || (req.user.role === 'student' ? getStudentAcademicYear(req.user) : '');
    const branch = req.query.branch || (req.user.role === 'student' ? req.user.branch : '');
    const section = req.query.section || (req.user.role === 'student' ? req.user.section : '');
    const query = { isActive: true };

    if (req.user.role === 'student' && req.query.academicYear && req.query.academicYear !== getStudentAcademicYear(req.user)) {
      return res.status(403).json({ success: false, error: 'You can only view subjects for your academic year.' });
    } else if (req.user.role === 'faculty' && !req.query.academicYear) {
      if (req.user.managedScopes && req.user.managedScopes.length > 0) {
        query.$or = req.user.managedScopes.map(scope => ({
          academicYear: new RegExp(`^${scope.academicYear}$`, 'i'),
          ...(scope.branch ? { branch: new RegExp(`^${scope.branch}$`, 'i') } : {}),
          ...(scope.section ? { section: new RegExp(`^${scope.section}$`, 'i') } : {})
        }));
      }
    } else if (academicYear) {
      if (req.user.role === 'faculty' && !canManageScope(req.user, academicYear, branch, section)) {
        return res.status(403).json({ success: false, error: 'You are not assigned to manage this academic year.' });
      }
      query.academicYear = academicYear;
      if (branch) query.branch = branch;
      if (section) query.section = section;
    }

    const subjects = await Subject.find(query).sort({ code: 1, name: 1 });
    res.status(200).json({ success: true, count: subjects.length, data: subjects });
  } catch (err) {
    next(err);
  }
};

exports.createSubject = async (req, res, next) => {
  try {
    const { name, code, description, academicYear, branch = '', section = '' } = req.body;
    if (!name || !code || !academicYear) {
      return res.status(400).json({ success: false, error: 'Name, code, and academic year are required.' });
    }
    if (!canManageScope(req.user, academicYear, branch, section)) {
      return res.status(403).json({ success: false, error: 'You are not assigned to manage this academic year.' });
    }

    const subject = await Subject.create({ name, code, description, academicYear, branch, section, createdBy: req.user.id });
    res.status(201).json({ success: true, data: subject });
  } catch (err) {
    next(err);
  }
};

exports.getProjects = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'faculty' && !req.query.academicYear) {
      query.academicYear = { $in: req.user.managedAcademicYears };
    } else if (req.query.academicYear) {
      if (!canManageScope(req.user, req.query.academicYear, req.query.branch || '', req.query.section || '')) {
        return res.status(403).json({ success: false, error: 'You are not assigned to manage this academic year.' });
      }
      query.academicYear = req.query.academicYear;
    }

    const projects = await Project.find(query)
      .populate('student', 'name email rollNumber branch year academicYear')
      .populate('reviewedBy', 'name email')
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, count: projects.length, data: projects });
  } catch (err) {
    next(err);
  }
};

exports.createProject = async (req, res, next) => {
  try {
    const academicYear = req.user.academicYear || req.user.year;
    if (!academicYear) {
      return res.status(400).json({ success: false, error: 'Set your academic year before creating a project.' });
    }

    const project = await Project.create({
      ...req.body,
      student: req.user.id,
      academicYear,
      status: 'draft'
    });
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

exports.updateProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, error: 'Project not found.' });

    const isOwner = project.student.toString() === req.user.id;
    const canReview = ['admin', 'faculty'].includes(req.user.role) && canManageYear(req.user, project.academicYear);
    if (!isOwner && !canReview) return res.status(403).json({ success: false, error: 'Not authorized to update this project.' });

    const allowedFields = ['title', 'description', 'technologies', 'files', 'repositoryUrl', 'previewUrl', 'milestones'];
    if (canReview) allowedFields.push('status', 'feedback', 'grade');
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) project[field] = req.body[field];
    });

    if (req.body.submit === true && isOwner) project.status = 'submitted';
    if (canReview && req.body.status) {
      project.reviewedBy = req.user.id;
      project.reviewedAt = new Date();
    }

    await project.save();
    res.status(200).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, error: 'Project not found.' });
    if (project.student.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Only the project owner can delete this project.' });
    }

    await project.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};
