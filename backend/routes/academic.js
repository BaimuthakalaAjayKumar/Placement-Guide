const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
  getSubjects,
  createSubject,
  deleteSubject,
  getSubjectNotes,
  addSubjectNote,
  deleteSubjectNote,
  getProjects,
  createProject,
  updateProject,
  deleteProject
} = require('../controllers/academic');
const { protect, authorize } = require('../middleware/auth');

// Configure Multer storage for study notes PDF & documents
const notesUploadDir = path.join(__dirname, '../uploads/notes');
if (!fs.existsSync(notesUploadDir)) {
  fs.mkdirSync(notesUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, notesUploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `note-${Date.now()}-${safeBase}${ext}`);
  }
});

const uploadNoteFile = multer({
  storage: storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB limit
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.zip'];
    if (allowed.includes(ext) || (file.mimetype && file.mimetype.includes('pdf'))) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and document files (.pdf, .docx, .ppt, .txt) are supported'));
    }
  }
});

const router = express.Router();
router.use(protect);

router.get('/subjects', getSubjects);
router.post('/subjects', authorize('admin'), createSubject);
router.delete('/subjects/:id', authorize('admin'), deleteSubject);
router.get('/subjects/:id/notes', getSubjectNotes);
router.post('/subjects/:id/notes', authorize('admin', 'faculty'), uploadNoteFile.single('pdfFile'), addSubjectNote);
router.delete('/subjects/:id/notes/:noteId', authorize('admin', 'faculty'), deleteSubjectNote);
router.get('/projects', getProjects);
router.post('/projects', authorize('student'), createProject);
router.put('/projects/:id', updateProject);
router.delete('/projects/:id', authorize('student'), deleteProject);

module.exports = router;
