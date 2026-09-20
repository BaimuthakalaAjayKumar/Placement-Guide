const express = require('express');
const {
  getSubjects,
  createSubject,
  deleteSubject,
  getProjects,
  createProject,
  updateProject,
  deleteProject
} = require('../controllers/academic');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/subjects', getSubjects);
router.post('/subjects', authorize('admin'), createSubject);
router.delete('/subjects/:id', authorize('admin'), deleteSubject);
router.get('/projects', getProjects);
router.post('/projects', authorize('student'), createProject);
router.put('/projects/:id', updateProject);
router.delete('/projects/:id', authorize('student'), deleteProject);

module.exports = router;
