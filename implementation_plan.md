Comprehensive Feature Addition Plan
We will resolve the settings tab layout shifting, make the "Learning Consistency" daily calendar functional with holidays and missed day slashes, link the "Live Query Resolution" banner to the Doubt Solver, and extend the admin panel with student SGPA/CGPA management, CSV reporting, and bulk deletion features.

User Review Required
IMPORTANT

SGPAs will be stored in the User schema as 8 individual fields (sgpaSem1 to sgpaSem8).
The CGPA is computed automatically on-the-fly as the average of all semesters where SGPA > 0.
Admin will can assign holidays using a simple calendar/date setting in Admin Panel Settings. The Student Dashboard will retrieve these holidays to show blank cells.
Proposed Changes
1. Database & Backend Models
[MODIFY] 
User.js
Add fields sgpaSem1, sgpaSem2, sgpaSem3, sgpaSem4, sgpaSem5, sgpaSem6, sgpaSem7, sgpaSem8 (type: Number, default: 0).
[NEW] 
Holiday.js
Create a new Holiday Schema storing 
date
 (Date, unique) and description (String).
2. Backend Routes & Controllers
[NEW] 
holidays.js (Controller)
Implement getHolidays, createHoliday, and deleteHoliday.
[NEW] 
holidays.js (Router)
Define standard endpoints for holidays:
GET / (Public/Student/Admin)
POST / (Admin protect)
DELETE /:id (Admin protect)
[MODIFY] 
server.js
Import and mount holiday router at /api/holidays.
[MODIFY] 
users.js (Controller)
Update 
getDashboardStats
:
Fetch student contest attempts (ContestAttempt.find({ user: userId })) and include them in the returned payload.
Create updateStudentAcademics controller to set SGPAs 1-8 for a given student ID.
Create bulkDeleteStudents controller to delete all student accounts and dependencies matching year.
Create exportStudentReport controller to fetch student list and return full academic attributes (name, roll, branch, year, SGPAs, CGPA).
[MODIFY] 
users.js (Router)
Add new endpoints:
PUT /students/:id/academics (Admin protect)
POST /students/bulk-delete (Admin protect)
GET /students/export (Admin protect)
3. Frontend Pages & Components
[MODIFY] 
DoubtSolver.css
Add styles to handle query submission and response cards appropriately.
[MODIFY] 
Dashboard.jsx
Fetch /api/holidays and include holidays in calendar rendering.
Retrieve contestAttempts and include them in the overall active contributions (green cells).
Render missed days (past, non-holiday, no contributions/contests) with a red diagonal line.
Render holidays as blank (plain color cells).
Change clickable "Live Query Resolution" banner behavior to redirect the student to /doubt-solver directly.
[MODIFY] 
Dashboard.css
Clean up .grid-cell.missed and .grid-cell.holiday selectors so .missed has the diagonal red slash line, and .holiday has a blank dashboard design.
[MODIFY] 
AdminPanel.jsx
Move Settings JSX container code inside the main content-wrapper div.
Implement Holiday Manager inside Settings tab (add and remove holidays).
Create a student editing modal to input/update SGPAs (1-8) for individual students.
Render "Download Student Report" button (generates and downloads CSV from exported students).
Render "Bulk Delete by Year" control with confirmation prompt.
[MODIFY] 
AdminPanel.css
Implement layout classes for settings wrappers, grid columns, tables, and modal adjustments.
Verification Plan
Automated / Browser-based Verification
We will use the browser subagent to:

Log in as Admin to configure academic SGPAs for a test student and add a holiday date.
Verify bulk-delete selection and verify the CSV export download triggers.
Log in as Student to verify the dashboard:
Check that the holiday is styled correctly as blank.
Check that a day with no solved problems has a red diagonal line.
Check that clicking the "Live Query Resolution" banner redirects to /doubt-solver.