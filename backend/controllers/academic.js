const Subject = require('../models/Subject');
const Project = require('../models/Project');
const User = require('../models/User');
const Notification = require('../models/Notification');
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
  if (!user.managedScopes || user.managedScopes.length === 0) {
    if (user.managedAcademicYears && user.managedAcademicYears.length > 0) {
      return canManageYear(user, academicYear);
    }
    return true;
  }
  return user.managedScopes.some(scope => {
    const sYear = (scope.academicYear || '').trim().toLowerCase();
    const sBranch = (scope.branch || '').trim().toLowerCase();
    const sSection = (scope.section || '').trim().toLowerCase();
    const reqYear = (academicYear || '').trim().toLowerCase();
    const reqBranch = (branch || '').trim().toLowerCase();
    const reqSection = (section || '').trim().toLowerCase();

    const yearMatch = !sYear || sYear === 'all' || !reqYear || sYear === reqYear || reqYear.includes(sYear) || sYear.includes(reqYear);
    const branchMatch = !sBranch || sBranch === 'all' || !reqBranch || sBranch === reqBranch;
    const sectionMatch = !reqSection || !sSection || sSection === 'all' || sSection === reqSection || reqSection === `section ${sSection}` || `section ${reqSection}` === sSection;
    return yearMatch && branchMatch && sectionMatch;
  });
};

const escapeRegex = (str) => (str || '').replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

exports.getSubjects = async (req, res, next) => {
  try {
    const query = { isActive: true };

    if (req.user.role === 'student') {
      const studentYear = (getStudentAcademicYear(req.user) || '').trim();
      const studentBranch = (req.user.branch || '').trim();

      const yearConditions = [
        { academicYear: { $regex: /^all$/i } },
        { academicYear: '' },
        { academicYear: null }
      ];

      if (studentYear) {
        yearConditions.push({ academicYear: new RegExp(`^${escapeRegex(studentYear)}$`, 'i') });

        // Match digit token e.g. "4th Year" -> "4", "2027" -> "2027"
        const digits = studentYear.match(/\d+/);
        if (digits) {
          yearConditions.push({ academicYear: new RegExp(digits[0], 'i') });
        }
        if (/4th|final|IV|^4$/i.test(studentYear)) {
          yearConditions.push({ academicYear: { $regex: /4th|final|IV|^4$/i } });
        } else if (/3rd|III|^3$/i.test(studentYear)) {
          yearConditions.push({ academicYear: { $regex: /3rd|III|^3$/i } });
        } else if (/2nd|II|^2$/i.test(studentYear)) {
          yearConditions.push({ academicYear: { $regex: /2nd|II|^2$/i } });
        } else if (/1st|I|^1$/i.test(studentYear)) {
          yearConditions.push({ academicYear: { $regex: /1st|I|^1$/i } });
        }
      }

      const branchConditions = [
        { branch: '' },
        { branch: null },
        { branch: { $regex: /^all$/i } }
      ];

      if (studentBranch) {
        const cleanBranch = studentBranch.split('(')[0].trim();
        branchConditions.push({ branch: new RegExp(`^${escapeRegex(studentBranch)}$`, 'i') });
        if (cleanBranch && cleanBranch.toLowerCase() !== studentBranch.toLowerCase()) {
          branchConditions.push({ branch: new RegExp(`^${escapeRegex(cleanBranch)}$`, 'i') });
        }

        const acronyms = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'CSD', 'CSM', 'CSBS', 'AIDS'];
        for (const acr of acronyms) {
          if (new RegExp(`\\b${acr}\\b`, 'i').test(studentBranch)) {
            branchConditions.push({ branch: new RegExp(`^${acr}$`, 'i') });
          }
        }
      }

      const andClauses = [];
      if (studentYear) {
        andClauses.push({ $or: yearConditions });
      }
      if (studentBranch) {
        andClauses.push({ $or: branchConditions });
      }
      if (andClauses.length > 0) {
        query.$and = andClauses;
      }
      // Note: NO SECTION RESTRICTION for students! All students in that year and branch can see all subjects!

    } else if (req.user.role === 'faculty') {
      // If a Scope is added to the Faculty, show registered Academic Preparation Subjects based on Year and Branch
      if (req.user.managedScopes && req.user.managedScopes.length > 0) {
        const scopeConditions = req.user.managedScopes.map(scope => {
          const scopeYear = (scope.academicYear || '').trim();
          const scopeBranch = (scope.branch || '').trim();

          const yearConditions = [
            { academicYear: { $regex: /^all$/i } },
            { academicYear: '' },
            { academicYear: null }
          ];

          if (scopeYear && scopeYear.toLowerCase() !== 'all') {
            yearConditions.push({ academicYear: new RegExp(`^${escapeRegex(scopeYear)}$`, 'i') });

            const digits = scopeYear.match(/\d+/);
            if (digits) {
              yearConditions.push({ academicYear: new RegExp(digits[0], 'i') });
            }
            if (/4th|final|IV|^4$/i.test(scopeYear)) {
              yearConditions.push({ academicYear: { $regex: /4th|final|IV|^4$/i } });
            } else if (/3rd|III|^3$/i.test(scopeYear)) {
              yearConditions.push({ academicYear: { $regex: /3rd|III|^3$/i } });
            } else if (/2nd|II|^2$/i.test(scopeYear)) {
              yearConditions.push({ academicYear: { $regex: /2nd|II|^2$/i } });
            } else if (/1st|I|^1$/i.test(scopeYear)) {
              yearConditions.push({ academicYear: { $regex: /1st|I|^1$/i } });
            }
          }

          const branchConditions = [
            { branch: '' },
            { branch: null },
            { branch: { $regex: /^all$/i } }
          ];

          if (scopeBranch && scopeBranch.toLowerCase() !== 'all') {
            const cleanBranch = scopeBranch.split('(')[0].trim();
            branchConditions.push({ branch: new RegExp(`^${escapeRegex(scopeBranch)}$`, 'i') });
            if (cleanBranch && cleanBranch.toLowerCase() !== scopeBranch.toLowerCase()) {
              branchConditions.push({ branch: new RegExp(`^${escapeRegex(cleanBranch)}$`, 'i') });
            }

            const acronyms = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'CSD', 'CSM', 'CSBS', 'AIDS'];
            for (const acr of acronyms) {
              if (new RegExp(`\\b${acr}\\b`, 'i').test(scopeBranch)) {
                branchConditions.push({ branch: new RegExp(`^${acr}$`, 'i') });
              }
            }
          }

          return {
            $and: [
              { $or: yearConditions },
              { $or: branchConditions }
            ]
          };
        });

        query.$or = scopeConditions;
      }
    } else {
      const academicYear = req.query.academicYear || '';
      const branch = req.query.branch || '';

      if (academicYear) {
        query.academicYear = new RegExp(`^${escapeRegex(academicYear)}$`, 'i');
      }
      if (branch) {
        query.$or = [
          { branch: new RegExp(`^${escapeRegex(branch)}$`, 'i') },
          { branch: '' },
          { branch: null },
          { branch: { $regex: /^all$/i } }
        ];
      }
    }

    let subjects = await Subject.find(query).sort({ code: 1, name: 1 });

    if (req.user.role === 'student') {
      const studentSection = (req.user.section || '').trim().toLowerCase();
      const studentBranch = (req.user.branch || '').trim().toLowerCase();
      const studentYear = (req.user.academicYear || req.user.year || '').toString().trim().toLowerCase();
      subjects = subjects.map(s => {
        const subjObj = s.toObject ? s.toObject() : s;
        if (subjObj.notes && subjObj.notes.length > 0) {
          subjObj.notes = subjObj.notes.filter(note => {
            if (note.academicYear && note.academicYear.trim() !== '' && note.academicYear.toLowerCase() !== 'all') {
              const noteYr = note.academicYear.trim().toLowerCase();
              if (!studentYear) return false;
              const matchesYr = studentYear === noteYr || studentYear.includes(noteYr) || noteYr.includes(studentYear);
              if (!matchesYr) return false;
            }
            if (note.branch && note.branch.trim() !== '' && note.branch.toLowerCase() !== 'all') {
              const noteBr = note.branch.trim().toLowerCase();
              if (!studentBranch) return false;
              const matchesBr = studentBranch === noteBr || studentBranch.includes(noteBr) || noteBr.includes(studentBranch);
              if (!matchesBr) return false;
            }
            if (note.section && note.section.trim() !== '' && note.section.toLowerCase() !== 'all') {
              const noteSec = note.section.trim().toLowerCase();
              if (!studentSection) return false;
              const matchesSec = studentSection === noteSec || studentSection === `section ${noteSec}` || `section ${studentSection}` === noteSec;
              if (!matchesSec) return false;
            }
            return true;
          });
        }
        return subjObj;
      });
    }

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
    if (!canManageScope(req.user, academicYear, branch)) {
      return res.status(403).json({ success: false, error: 'You are not assigned to manage this academic year.' });
    }

    const subject = await Subject.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description ? description.trim() : '',
      academicYear: academicYear.trim(),
      branch: branch ? branch.trim() : '',
      section: section ? section.trim() : '',
      createdBy: req.user.id
    });
    res.status(201).json({ success: true, data: subject });
  } catch (err) {
    next(err);
  }
};

exports.deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ success: false, error: 'Subject not found.' });

    await Subject.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: `Subject "${subject.name}" (${subject.code}) removed successfully.` });
  } catch (err) {
    next(err);
  }
};

exports.getSubjectNotes = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ success: false, error: 'Subject not found.' });

    let notes = subject.notes || [];
    if (req.user.role === 'student') {
      const studentSection = (req.user.section || '').trim().toLowerCase();
      const studentBranch = (req.user.branch || '').trim().toLowerCase();
      const studentYear = (req.user.academicYear || req.user.year || '').toString().trim().toLowerCase();

      notes = notes.filter(note => {
        if (note.academicYear && note.academicYear.trim() !== '' && note.academicYear.toLowerCase() !== 'all') {
          const noteYr = note.academicYear.trim().toLowerCase();
          if (!studentYear) return false;
          const matchesYr = studentYear === noteYr || studentYear.includes(noteYr) || noteYr.includes(studentYear);
          if (!matchesYr) return false;
        }
        if (note.branch && note.branch.trim() !== '' && note.branch.toLowerCase() !== 'all') {
          const noteBr = note.branch.trim().toLowerCase();
          if (!studentBranch) return false;
          const matchesBr = studentBranch === noteBr || studentBranch.includes(noteBr) || noteBr.includes(studentBranch);
          if (!matchesBr) return false;
        }
        if (note.section && note.section.trim() !== '' && note.section.toLowerCase() !== 'all') {
          const noteSec = note.section.trim().toLowerCase();
          if (!studentSection) return false;
          const matchesSec = studentSection === noteSec || studentSection === `section ${noteSec}` || `section ${studentSection}` === noteSec;
          if (!matchesSec) return false;
        }
        return true;
      });
    }

    res.status(200).json({ success: true, count: notes.length, data: notes });
  } catch (err) {
    next(err);
  }
};

exports.addSubjectNote = async (req, res, next) => {
  try {
    const { title, description = '', content = '', fileUrl = '' } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: 'Note title is required.' });
    }

    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ success: false, error: 'Subject not found.' });

    if (req.user.role === 'faculty' && !canManageScope(req.user, subject.academicYear, subject.branch)) {
      return res.status(403).json({ success: false, error: 'You are not assigned to manage this subject.' });
    }

    // Determine target scope (Year, Branch, Section) for the note
    let noteAcademicYear = req.body.academicYear || '';
    let noteBranch = req.body.branch || '';
    let noteSection = req.body.section || '';

    if (req.user.role === 'faculty') {
      const matchingScope = req.user.managedScopes?.find(s => {
        if (s.subject && String(s.subject) === String(subject._id)) return true;
        const yearMatch = !s.academicYear || s.academicYear.toLowerCase() === 'all' ||
          !subject.academicYear ||
          s.academicYear.trim().toLowerCase() === subject.academicYear.trim().toLowerCase() ||
          subject.academicYear.toLowerCase().includes(s.academicYear.toLowerCase());
        const branchMatch = !s.branch || s.branch.toLowerCase() === 'all' ||
          !subject.branch ||
          s.branch.trim().toLowerCase() === subject.branch.trim().toLowerCase();
        return yearMatch && branchMatch;
      }) || req.user.managedScopes?.[0];

      if (!noteAcademicYear) noteAcademicYear = matchingScope?.academicYear || subject.academicYear || '';
      if (!noteBranch) noteBranch = matchingScope?.branch || subject.branch || '';
      if (!noteSection) noteSection = matchingScope?.section || '';
    } else {
      if (!noteAcademicYear) noteAcademicYear = subject.academicYear || '';
      if (!noteBranch) noteBranch = subject.branch || '';
      if (!noteSection) noteSection = subject.section || '';
    }

    let finalFileUrl = fileUrl || '';
    let finalFileName = req.body.fileName || '';
    let finalFileType = '';
    let finalFileSize = 0;

    if (req.file) {
      finalFileUrl = `/uploads/notes/${req.file.filename}`;
      finalFileName = req.file.originalname;
      finalFileType = req.file.mimetype || 'application/pdf';
      finalFileSize = req.file.size || 0;
    }

    const newNote = {
      title,
      description,
      content,
      fileUrl: finalFileUrl,
      fileName: finalFileName,
      fileType: finalFileType,
      fileSize: finalFileSize,
      uploadedBy: req.user.id,
      uploaderName: req.user.name || 'Instructor',
      uploaderRole: req.user.role,
      academicYear: noteAcademicYear,
      branch: noteBranch,
      section: noteSection,
      createdAt: new Date()
    };

    subject.notes.push(newNote);
    await subject.save();

    const createdNote = subject.notes[subject.notes.length - 1];

    // Notify relevant students in the assigned scope
    try {
      const studentQuery = { role: 'student' };
      if (noteAcademicYear && noteAcademicYear !== 'All' && noteAcademicYear !== 'All Years') {
        studentQuery.$or = [{ academicYear: noteAcademicYear }, { year: noteAcademicYear }];
      }
      if (noteBranch && noteBranch !== 'All' && noteBranch !== 'All Branches') {
        studentQuery.branch = new RegExp(`^${noteBranch}$`, 'i');
      }
      if (noteSection && noteSection !== 'All' && noteSection !== 'All Sections') {
        studentQuery.section = new RegExp(`^(?:Section\\s*)?${escapeRegex(noteSection)}$`, 'i');
      }

      const students = await User.find(studentQuery).select('_id');
      if (students && students.length > 0) {
        const notifDocs = students.map(s => ({
          user: s._id,
          type: 'academic_update',
          message: `📚 New Study Notes / PDF Posted for ${subject.code} (${subject.name}): "${title}".`,
          metadata: {
            subjectId: subject._id,
            subjectName: subject.name
          }
        }));
        await Notification.insertMany(notifDocs);
        const io = req.app.get('socketio');
        if (io) {
          notifDocs.forEach(n => io.to(`user_${n.user}`).emit('new_notification', n));
        }
      }
    } catch (notifErr) {
      console.warn('Error dispatching student note notification:', notifErr.message);
    }

    res.status(201).json({ success: true, data: createdNote });
  } catch (err) {
    next(err);
  }
};

exports.deleteSubjectNote = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ success: false, error: 'Subject not found.' });

    const note = subject.notes.id(req.params.noteId);
    if (!note) return res.status(404).json({ success: false, error: 'Note not found.' });

    const isAuthor = note.uploadedBy && note.uploadedBy.toString() === req.user.id;
    const canManage = req.user.role === 'admin' || (req.user.role === 'faculty' && canManageScope(req.user, subject.academicYear, subject.branch));

    if (!isAuthor && !canManage) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this study note.' });
    }

    subject.notes.pull(req.params.noteId);
    await subject.save();

    res.status(200).json({ success: true, message: 'Note deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

exports.getProjects = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role === 'student') {
      // Students can view projects they created or where they are listed as a team member (by email or rollNumber)
      const userEmail = (req.user.email || '').trim().toLowerCase();
      const userRoll = (req.user.rollNumber || '').trim().toLowerCase();
      query.$or = [
        { student: req.user.id },
        { 'teamMembers.email': new RegExp(`^${userEmail}$`, 'i') },
        ...(userRoll ? [{ 'teamMembers.rollNumber': new RegExp(`^${userRoll}$`, 'i') }] : [])
      ];
    } else if (req.user.role === 'faculty') {
      const escapeRegexStr = (str) => (str || '').replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

      if (req.user.managedScopes && req.user.managedScopes.length > 0) {
        // Build conditions to find all students belonging to the faculty's assigned scopes (Year, Branch, Section)
        const orStudentConditions = req.user.managedScopes.map(scope => {
          const condList = [{ role: 'student' }];
          const sYear = String(scope.academicYear || '').trim();
          const sBranch = String(scope.branch || '').trim();
          const sSection = String(scope.section || '').trim();

          if (sYear && sYear.toLowerCase() !== 'all') {
            const escapedYear = escapeRegexStr(sYear);
            const yearPatterns = [new RegExp(`^${escapedYear}$`, 'i'), new RegExp(escapedYear, 'i')];
            const digits = sYear.match(/\d+/);
            if (digits) yearPatterns.push(new RegExp(`^${digits[0]}$`, 'i'));
            if (/4th|final|IV|^4$/i.test(sYear)) yearPatterns.push(/4th|final|IV|^4$/i);
            else if (/3rd|III|^3$/i.test(sYear)) yearPatterns.push(/3rd|III|^3$/i);
            else if (/2nd|II|^2$/i.test(sYear)) yearPatterns.push(/2nd|II|^2$/i);
            else if (/1st|I|^1$/i.test(sYear)) yearPatterns.push(/1st|I|^1$/i);

            condList.push({
              $or: [
                { academicYear: { $in: yearPatterns } },
                { year: { $in: yearPatterns } }
              ]
            });
          }

          if (sBranch && sBranch.toLowerCase() !== 'all') {
            const escapedBranch = escapeRegexStr(sBranch);
            const branchPatterns = [new RegExp(`^${escapedBranch}$`, 'i')];
            const cleanBranch = sBranch.split('(')[0].trim();
            if (cleanBranch && cleanBranch.toLowerCase() !== sBranch.toLowerCase()) {
              branchPatterns.push(new RegExp(`^${escapeRegexStr(cleanBranch)}$`, 'i'));
            }
            const acronyms = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'CSD', 'CSM', 'CSBS', 'AIDS'];
            for (const acr of acronyms) {
              if (new RegExp(`\\b${acr}\\b`, 'i').test(sBranch)) {
                branchPatterns.push(new RegExp(`^${acr}$`, 'i'));
              }
            }
            condList.push({ branch: { $in: branchPatterns } });
          }

          if (sSection && sSection.toLowerCase() !== 'all') {
            condList.push({
              section: new RegExp(`^(?:Section\\s*)?${escapeRegexStr(sSection)}$`, 'i')
            });
          }

          return { $and: condList };
        });

        // 1. Find all student IDs in these assigned scopes
        const scopedStudents = await User.find({ $or: orStudentConditions }).select('_id');
        const scopedStudentIds = scopedStudents.map(s => s._id);

        // 2. Build direct project scope conditions
        const orProjectConditions = req.user.managedScopes.map(scope => {
          const cond = {};
          const sYear = String(scope.academicYear || '').trim();
          const sBranch = String(scope.branch || '').trim();
          const sSection = String(scope.section || '').trim();

          if (sYear && sYear.toLowerCase() !== 'all') {
            cond.academicYear = new RegExp(escapeRegexStr(sYear), 'i');
          }
          if (sBranch && sBranch.toLowerCase() !== 'all') {
            cond.branch = new RegExp(`^${escapeRegexStr(sBranch)}$`, 'i');
          }
          if (sSection && sSection.toLowerCase() !== 'all') {
            cond.section = new RegExp(`^(?:Section\\s*)?${escapeRegexStr(sSection)}$`, 'i');
          }
          return cond;
        });

        query.$or = [
          { student: { $in: scopedStudentIds } },
          ...orProjectConditions
        ];
      } else if (req.user.managedAcademicYears && req.user.managedAcademicYears.length > 0 && !req.user.managedAcademicYears.includes('All')) {
        query.academicYear = { $in: req.user.managedAcademicYears };
      }
    }

    // Optional query parameter filters (for faculty dashboard filtering by year, branch, section)
    if (req.query.academicYear && req.query.academicYear !== 'all') {
      query.academicYear = new RegExp(req.query.academicYear.trim(), 'i');
    }
    if (req.query.branch && req.query.branch !== 'all') {
      query.branch = new RegExp(`^${req.query.branch.trim()}$`, 'i');
    }
    if (req.query.section && req.query.section !== 'all') {
      query.section = new RegExp(`^(?:Section\\s*)?${req.query.section.trim()}$`, 'i');
    }

    const projects = await Project.find(query)
      .populate('student', 'name email rollNumber branch year academicYear section')
      .populate('reviewedBy', 'name email')
      .sort({ updatedAt: -1 });

    // Sync branch and section from populated student record if missing on legacy project documents
    const sanitizedProjects = projects.map(p => {
      const obj = p.toObject();
      if (!obj.branch && obj.student?.branch) obj.branch = obj.student.branch;
      if (!obj.section && obj.student?.section) obj.section = obj.student.section;
      if (!obj.academicYear && (obj.student?.academicYear || obj.student?.year)) {
        obj.academicYear = obj.student.academicYear || obj.student.year;
      }
      return obj;
    });

    res.status(200).json({ success: true, count: sanitizedProjects.length, data: sanitizedProjects });
  } catch (err) {
    next(err);
  }
};

exports.createProject = async (req, res, next) => {
  try {
    const academicYear = (req.body.academicYear || req.user.academicYear || req.user.year || 'Final Year').trim();
    const branch = (req.body.branch || req.user.branch || '').trim();
    const section = (req.body.section || req.user.section || '').trim();

    const deploymentUrl = req.body.deploymentUrl || req.body.previewUrl || '';
    const previewUrl = req.body.previewUrl || deploymentUrl;
    const starterFiles = Array.isArray(req.body.files) ? req.body.files : [];

    const starterVersion = {
      versionNumber: 1,
      summary: 'Initial project setup & starter files',
      author: req.user.id,
      authorName: req.user.name || 'Student',
      authorEmail: req.user.email || '',
      files: starterFiles,
      deploymentUrl,
      previewUrl,
      createdAt: new Date()
    };

    const project = await Project.create({
      title: req.body.title || 'Untitled Project',
      description: req.body.description || '',
      goals: req.body.goals || '',
      technologies: Array.isArray(req.body.technologies) ? req.body.technologies : [],
      teamMembers: Array.isArray(req.body.teamMembers) ? req.body.teamMembers : [],
      files: starterFiles,
      repositoryUrl: req.body.repositoryUrl || '',
      previewUrl,
      deploymentUrl,
      milestones: Array.isArray(req.body.milestones) ? req.body.milestones : [],
      student: req.user.id,
      academicYear,
      branch,
      section,
      status: 'draft',
      lastUpdatedBy: req.user.id,
      lastUpdatedByName: req.user.name || 'Student',
      versionHistory: [starterVersion]
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
    const userEmail = (req.user.email || '').trim().toLowerCase();
    const userRoll = (req.user.rollNumber || '').trim().toLowerCase();
    const isTeamMember = project.teamMembers && project.teamMembers.some(m =>
      (m.email && m.email.trim().toLowerCase() === userEmail) ||
      (m.rollNumber && userRoll && m.rollNumber.trim().toLowerCase() === userRoll)
    );
    const canEditProject = isOwner || isTeamMember;
    const canReview = ['admin', 'faculty'].includes(req.user.role) && (
      req.user.role === 'admin' ||
      canManageScope(req.user, project.academicYear, project.branch, project.section) ||
      canManageYear(req.user, project.academicYear)
    );

    if (!canEditProject && !canReview) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this project.' });
    }

    const studentFields = [
      'title', 'description', 'goals', 'technologies', 'teamMembers',
      'files', 'repositoryUrl', 'previewUrl', 'deploymentUrl', 'milestones',
      'academicYear', 'branch', 'section'
    ];

    if (canEditProject) {
      let codeOrDeployChanged = false;

      studentFields.forEach(field => {
        if (req.body[field] !== undefined) {
          if (field === 'files') {
            const oldFilesStr = JSON.stringify(project.files || []);
            const newFilesStr = JSON.stringify(req.body.files || []);
            if (oldFilesStr !== newFilesStr) {
              codeOrDeployChanged = true;
            }
          } else if (field === 'deploymentUrl' || field === 'previewUrl') {
            if (project[field] !== req.body[field]) {
              codeOrDeployChanged = true;
            }
          }
          project[field] = req.body[field];
        }
      });

      // Synchronize student branch and section if missing
      if (!project.branch && req.user.branch) project.branch = req.user.branch;
      if (!project.section && req.user.section) project.section = req.user.section;

      // Synchronize previewUrl and deploymentUrl
      if (req.body.deploymentUrl !== undefined && !project.previewUrl) {
        project.previewUrl = req.body.deploymentUrl;
      } else if (req.body.previewUrl !== undefined && !project.deploymentUrl) {
        project.deploymentUrl = req.body.previewUrl;
      }

      if (req.body.submit === true) {
        project.status = 'submitted';
      }

      project.lastUpdatedBy = req.user.id;
      project.lastUpdatedByName = req.user.name || (isOwner ? 'Lead Student' : 'Team Member');

      // Create snapshot version history if files or deployment changed or requested
      if (codeOrDeployChanged || req.body.saveVersion === true || (req.body.files && (!project.versionHistory || project.versionHistory.length === 0))) {
        project.versionHistory = project.versionHistory || [];
        const nextVersionNumber = (project.versionHistory.length > 0
          ? Math.max(...project.versionHistory.map(v => v.versionNumber || 0))
          : 0) + 1;

        const newVersion = {
          versionNumber: nextVersionNumber,
          summary: req.body.commitMessage || (req.body.files ? `Code update (${project.files?.length || 0} files)` : 'Project details updated'),
          author: req.user.id,
          authorName: req.user.name || (isOwner ? 'Lead Student' : 'Team Member'),
          authorEmail: req.user.email || '',
          files: project.files || [],
          deploymentUrl: project.deploymentUrl || '',
          previewUrl: project.previewUrl || '',
          createdAt: new Date()
        };

        project.versionHistory.push(newVersion);
        if (project.versionHistory.length > 30) {
          project.versionHistory = project.versionHistory.slice(-30);
        }
      }
    }

    if (canReview) {
      if (req.body.status) project.status = req.body.status;
      if (req.body.feedback !== undefined) project.feedback = req.body.feedback;
      if (req.body.grade !== undefined) {
        project.grade = req.body.grade === '' || req.body.grade === null ? null : Number(req.body.grade);
      }
      if (req.body.leadStudentGrade !== undefined) {
        project.leadStudentGrade = req.body.leadStudentGrade === '' || req.body.leadStudentGrade === null ? null : Number(req.body.leadStudentGrade);
      }
      if (req.body.leadStudentContribution !== undefined) {
        project.leadStudentContribution = req.body.leadStudentContribution;
      }
      if (req.body.leadStudentFeedback !== undefined) {
        project.leadStudentFeedback = req.body.leadStudentFeedback;
      }

      // Handle individual team member contributions, grades, and feedback
      if (Array.isArray(req.body.teamMembers)) {
        project.teamMembers = req.body.teamMembers.map(m => ({
          _id: m._id,
          name: m.name,
          rollNumber: m.rollNumber || '',
          email: m.email || '',
          role: m.role || 'Developer',
          contribution: m.contribution || '',
          grade: m.grade === '' || m.grade === null || m.grade === undefined ? null : Number(m.grade),
          feedback: m.feedback || ''
        }));
      }

      if (req.body.codeSuggestions !== undefined) project.codeSuggestions = req.body.codeSuggestions;
      if (req.body.techSuggestions !== undefined) project.techSuggestions = req.body.techSuggestions;

      project.reviewedBy = req.user.id;
      project.reviewedAt = new Date();

      // Push to facultySuggestions history if suggestions or feedback provided
      if (req.body.codeSuggestions || req.body.techSuggestions || req.body.feedback) {
        project.facultySuggestions = project.facultySuggestions || [];
        project.facultySuggestions.push({
          faculty: req.user.id,
          facultyName: req.user.name || (req.user.role === 'admin' ? 'Administrator' : 'Faculty Evaluator'),
          facultyRole: req.user.role,
          codeSuggestion: req.body.codeSuggestions || '',
          techSuggestion: req.body.techSuggestions || '',
          generalFeedback: req.body.feedback || '',
          suggestedAt: new Date()
        });
      }

      // Send personalized notifications to Lead Student and ALL Team Members
      try {
        const io = req.app.get('socketio');

        // 1. Lead Student Notification
        const leadGradeText = project.leadStudentGrade !== null ? `Your Individual Grade: ${project.leadStudentGrade}/100.` : (project.grade !== null ? `Project Grade: ${project.grade}/100.` : '');
        const leadNotif = await Notification.create({
          user: project.student,
          type: 'academic_update',
          message: `📋 Project Evaluated: "${project.title}" was reviewed by ${req.user.name || 'Faculty'}. ${leadGradeText}`,
          metadata: {
            projectId: project._id,
            status: project.status,
            grade: project.leadStudentGrade ?? project.grade
          }
        });
        if (io) io.to(`user_${project.student}`).emit('new_notification', leadNotif);

        // 2. Teammates Notifications
        if (project.teamMembers && project.teamMembers.length > 0) {
          for (const member of project.teamMembers) {
            if (!member.email && !member.rollNumber) continue;
            const memberUser = await User.findOne({
              $or: [
                ...(member.email ? [{ email: new RegExp(`^${member.email.trim()}$`, 'i') }] : []),
                ...(member.rollNumber ? [{ rollNumber: new RegExp(`^${member.rollNumber.trim()}$`, 'i') }] : [])
              ]
            }).select('_id');

            if (memberUser && memberUser._id.toString() !== project.student.toString()) {
              const memberGradeText = member.grade !== null && member.grade !== undefined ? `Your Individual Grade: ${member.grade}/100.` : '';
              const memberNotif = await Notification.create({
                user: memberUser._id,
                type: 'academic_update',
                message: `📋 Team Project Evaluated: "${project.title}" received faculty evaluation. ${memberGradeText}`,
                metadata: {
                  projectId: project._id,
                  status: project.status,
                  grade: member.grade ?? project.grade
                }
              });
              if (io) io.to(`user_${memberUser._id}`).emit('new_notification', memberNotif);
            }
          }
        }
      } catch (notifErr) {
        console.warn('Error sending project review notifications:', notifErr.message);
      }
    }

    await project.save();
    res.status(200).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

exports.restoreProjectVersion = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, error: 'Project not found.' });

    const isOwner = project.student.toString() === req.user.id;
    const userEmail = (req.user.email || '').trim().toLowerCase();
    const userRoll = (req.user.rollNumber || '').trim().toLowerCase();
    const isTeamMember = project.teamMembers && project.teamMembers.some(m =>
      (m.email && m.email.trim().toLowerCase() === userEmail) ||
      (m.rollNumber && userRoll && m.rollNumber.trim().toLowerCase() === userRoll)
    );
    const canManage = isOwner || isTeamMember || ['admin', 'faculty'].includes(req.user.role);

    if (!canManage) {
      return res.status(403).json({ success: false, error: 'Not authorized to restore versions for this project.' });
    }

    const versionId = req.params.versionId;
    const targetVersion = (project.versionHistory || []).find(v =>
      (v._id && v._id.toString() === versionId) ||
      (String(v.versionNumber) === String(versionId))
    );

    if (!targetVersion) {
      return res.status(404).json({ success: false, error: 'Historical version not found.' });
    }

    // Restore files and deployment
    project.files = targetVersion.files || [];
    if (targetVersion.deploymentUrl) project.deploymentUrl = targetVersion.deploymentUrl;
    if (targetVersion.previewUrl) project.previewUrl = targetVersion.previewUrl;

    project.lastUpdatedBy = req.user.id;
    project.lastUpdatedByName = req.user.name || 'Team Member';

    // Add a rollback version snapshot
    const nextVersionNumber = (project.versionHistory.length > 0
      ? Math.max(...project.versionHistory.map(v => v.versionNumber || 0))
      : 0) + 1;

    project.versionHistory.push({
      versionNumber: nextVersionNumber,
      summary: `Restored to version #${targetVersion.versionNumber} ("${targetVersion.summary || 'Previous snapshot'}")`,
      author: req.user.id,
      authorName: req.user.name || 'Team Member',
      authorEmail: req.user.email || '',
      files: project.files,
      deploymentUrl: project.deploymentUrl || '',
      previewUrl: project.previewUrl || '',
      createdAt: new Date()
    });

    await project.save();
    res.status(200).json({
      success: true,
      message: `Successfully restored code files to version #${targetVersion.versionNumber}`,
      data: project
    });
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

