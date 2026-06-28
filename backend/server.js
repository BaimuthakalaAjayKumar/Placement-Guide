const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors({
  origin: '*', // For development, allow all origins. Can be restricted to React app domain later
  credentials: true
}));

// Set static folder for uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const resumeRoutes = require('./routes/resumes');
const testRoutes = require('./routes/tests');
const interviewRoutes = require('./routes/interviews');
const jobRoutes = require('./routes/jobs');
const questionBankRoutes = require('./routes/questionBank');
const contestRoutes = require('./routes/contests');
const doubtRoutes = require('./routes/doubts');
const holidayRoutes = require('./routes/holidays');

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/questions', questionBankRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/doubts', doubtRoutes);
app.use('/api/holidays', holidayRoutes);

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Placement Preparation Portal API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Server Error'
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
