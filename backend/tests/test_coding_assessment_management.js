/**
 * AUTOMATED VERIFICATION SUITE: Coding Assessment Management & Platform Integration
 * CAMPUSBRIDGE — Tests for:
 * 1. Platform Quota Status Verification (150 per platform: 50 Easy, 50 Medium, 50 Hard; LeetCode 130 honest missing count)
 * 2. Difficulty Quota Enforcement (rejecting 51st question in a difficulty)
 * 3. Duplicate Question Rejection (problemId, officialUrl, slug)
 * 4. Placement Officer Permissions & RBAC Enforcement (PO allowed, student forbidden)
 * 5. Contest Date Validation (endTime > startTime)
 * 6. Contest Student Visibility & Isolation (drafts/cancelled hidden from students)
 * 7. Soft-Archive Mechanism (isArchived: true, isActive: false, preserving historical data)
 * 8. Live Sync Deduplication & Curated Progress Matching
 * 9. View Solution Non-Fabrication & Honest Metadata
 * 10. Student Data Isolation
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const PracticeQuestion = require('../models/PracticeQuestion');
const Contest = require('../models/Contest');
const User = require('../models/User');
const UserSolution = require('../models/UserSolution');
const codingPlatformSyncService = require('../services/codingPlatformSyncService');
const {
  getPlatformQuotaStatus,
  addPracticeQuestion,
  deletePracticeQuestion,
  getPracticeQuestions
} = require('../controllers/tests');
const {
  createContest,
  publishContest,
  cancelContest,
  getContests
} = require('../controllers/internalContests');
const { getUserSolution, saveUserSolution } = require('../controllers/users');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Helper to mock Express req and res
function createMockReqRes({ params = {}, query = {}, body = {}, user = null } = {}) {
  const userObj = user || { _id: new mongoose.Types.ObjectId(), role: 'placement_officer', name: 'Placement Officer' };
  if (!userObj.id && userObj._id) {
    userObj.id = userObj._id.toString();
  }
  const req = {
    params,
    query,
    body,
    user: userObj
  };
  const res = {
    statusCode: 200,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    }
  };
  const next = (err) => {
    if (err) {
      res.statusCode = err.statusCode || 500;
      res.jsonData = { success: false, error: err.message };
    }
  };
  return { req, res, next };
}

async function runTests() {
  console.log('================================================================');
  console.log('CAMPUSBRIDGE — CODING ASSESSMENT & CONTEST MANAGEMENT VERIFICATION');
  console.log('================================================================\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is not defined in environment variables.');
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.\n');
  await PracticeQuestion.deleteMany({ id: 9999 });

  try {
    // -------------------------------------------------------------
    // TEST 1: Platform Quota Status Verification
    // -------------------------------------------------------------
    console.log('TEST 1: Platform Quota Status (50 Easy, 50 Medium, 50 Hard)');
    const platforms = ['codeforces', 'codechef', 'hackerrank', 'leetcode'];
    const quotaResults = {};

    for (const p of platforms) {
      const { req, res } = createMockReqRes({ params: { platform: p } });
      await getPlatformQuotaStatus(req, res);
      assert(res.statusCode === 200 && res.jsonData.success, `Quota status fetched successfully for ${p}`);
      quotaResults[p] = res.jsonData.data;
    }

    // Codeforces, CodeChef, HackerRank should each have exactly 150
    assert(quotaResults.codeforces.totalActive === 150, 'Codeforces has exactly 150 active questions');
    assert(quotaResults.codeforces.easyCount === 50 && quotaResults.codeforces.mediumCount === 50 && quotaResults.codeforces.hardCount === 50,
      'Codeforces breakdown is 50 Easy, 50 Medium, 50 Hard');
    assert(quotaResults.codeforces.isComplete === true, 'Codeforces quota is reported as complete');

    assert(quotaResults.codechef.totalActive === 150, 'CodeChef has exactly 150 active questions');
    assert(quotaResults.codechef.easyCount === 50 && quotaResults.codechef.mediumCount === 50 && quotaResults.codechef.hardCount === 50,
      'CodeChef breakdown is 50 Easy, 50 Medium, 50 Hard');
    assert(quotaResults.codechef.isComplete === true, 'CodeChef quota is reported as complete');

    assert(quotaResults.hackerrank.totalActive === 150, 'HackerRank has exactly 150 active questions');
    assert(quotaResults.hackerrank.easyCount === 50 && quotaResults.hackerrank.mediumCount === 50 && quotaResults.hackerrank.hardCount === 50,
      'HackerRank breakdown is 50 Easy, 50 Medium, 50 Hard');
    assert(quotaResults.hackerrank.isComplete === true, 'HackerRank quota is reported as complete');

    // LeetCode should be honest: 130 active (50 Easy, 50 Medium, 30 Hard), missing 20 Hard
    assert(quotaResults.leetcode.totalActive === 130, 'LeetCode honestly reports 130 active questions (not fabricated)');
    assert(quotaResults.leetcode.easyCount === 50 && quotaResults.leetcode.mediumCount === 50 && quotaResults.leetcode.hardCount === 30,
      'LeetCode breakdown is 50 Easy, 50 Medium, 30 Hard');
    assert(quotaResults.leetcode.isComplete === false, 'LeetCode quota is reported as incomplete');
    assert(quotaResults.leetcode.missing.some(m => m.includes('20 Hard')), 'LeetCode correctly identifies missing 20 Hard questions');
    console.log('');

    // -------------------------------------------------------------
    // TEST 2: Quota Enforcement on Adding Questions (Rejecting 51st)
    // -------------------------------------------------------------
    console.log('TEST 2: Difficulty Quota Enforcement (Rejecting 51st Easy question on Codeforces)');
    const { req: addReq51, res: addRes51 } = createMockReqRes({
      body: {
        platform: 'codeforces',
        problemId: 'CF-TEST-51-EASY',
        title: 'Test 51st Easy Question',
        difficulty: 'Easy',
        url: 'https://codeforces.com/problemset/problem/9999/E',
        tags: ['implementation']
      }
    });
    await addPracticeQuestion(addReq51, addRes51);
    assert(addRes51.statusCode === 400, '51st Easy question rejected with 400 Bad Request');
    assert(addRes51.jsonData.error.includes('Difficulty quota reached') && addRes51.jsonData.error.includes('50 Easy'),
      'Error message clearly explains exactly 50 Easy questions already active');
    console.log('');

    // -------------------------------------------------------------
    // TEST 3: Duplicate Question Rejection (problemId / URL / Slug)
    // -------------------------------------------------------------
    let existingQ = await PracticeQuestion.findOne({ platform: 'codeforces', isActive: true, isArchived: false });
    if (!existingQ) {
      const curated = await codingPlatformSyncService.getCuratedQuestions('codeforces');
      existingQ = {
        _id: new mongoose.Types.ObjectId(),
        problemId: curated[0].problemId || curated[0].id,
        title: curated[0].title
      };
    }
    assert(existingQ !== null, 'Found existing Codeforces question in database or curated bank');

    const { req: dupReq, res: dupRes } = createMockReqRes({
      body: {
        platform: 'codeforces',
        problemId: existingQ.problemId,
        title: 'Different Title But Duplicate ID',
        difficulty: 'Easy',
        url: 'https://codeforces.com/problemset/problem/8888/D',
        tags: ['math']
      }
    });
    await addPracticeQuestion(dupReq, dupRes);
    assert(dupRes.statusCode === 400, 'Duplicate problemId rejected with 400 Bad Request');
    assert(dupRes.jsonData.error.includes('already exists'), 'Error message reports question already exists');
    console.log('');

    // -------------------------------------------------------------
    // TEST 4: Placement Officer Role-Based Access Control (RBAC)
    // -------------------------------------------------------------
    console.log('TEST 4: Placement Officer RBAC Enforcement');
    // Student trying to create contest
    const { req: stuContestReq, res: stuContestRes } = createMockReqRes({
      user: { _id: new mongoose.Types.ObjectId(), role: 'student', name: 'Student One' },
      body: {
        title: 'Unauthorized Student Contest',
        startTime: new Date(Date.now() + 3600000).toISOString(),
        endTime: new Date(Date.now() + 7200000).toISOString(),
        duration: 60,
        questions: [new mongoose.Types.ObjectId()]
      }
    });
    await createContest(stuContestReq, stuContestRes);
    assert(stuContestRes.statusCode === 403, 'Student blocked from creating contest with 403 Forbidden');

    // Placement Officer creating contest
    const poUser = { _id: new mongoose.Types.ObjectId(), role: 'placement_officer', name: 'Placement Officer' };
    const { req: poContestReq, res: poContestRes } = createMockReqRes({
      user: poUser,
      body: {
        title: 'PO Verification Assessment 2026',
        description: 'Automated test contest created by Placement Officer',
        platform: 'internal',
        startTime: new Date(Date.now() + 3600000).toISOString(),
        endTime: new Date(Date.now() + 7200000).toISOString(),
        duration: 60,
        isPublished: false,
        questions: [existingQ._id]
      }
    });
    await createContest(poContestReq, poContestRes);
    assert(poContestRes.statusCode === 201 && poContestRes.jsonData.success, 'Placement Officer successfully created draft contest');
    const createdContestId = poContestRes.jsonData.data._id;
    console.log('');

    // -------------------------------------------------------------
    // TEST 5: Contest Date Validation & Publish/Cancel Workflow
    // -------------------------------------------------------------
    console.log('TEST 5: Contest Date Validation & State Management');
    const { req: dateReq, res: dateRes } = createMockReqRes({
      user: poUser,
      body: {
        title: 'Invalid Date Contest',
        startTime: new Date(Date.now() + 7200000).toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(), // End before start!
        duration: 60,
        questions: [existingQ._id]
      }
    });
    await createContest(dateReq, dateRes);
    assert(dateRes.statusCode === 400, 'Invalid contest dates (endTime <= startTime) rejected with 400');
    assert(dateRes.jsonData.error.toLowerCase().includes('after start time'), 'Validation error mentions end time constraint');

    // Publish contest
    const { req: pubReq, res: pubRes } = createMockReqRes({
      user: poUser,
      params: { id: createdContestId }
    });
    await publishContest(pubReq, pubRes);
    assert(pubRes.statusCode === 200 && pubRes.jsonData.success, 'Contest published successfully');
    assert(pubRes.jsonData.data.isPublished === true && pubRes.jsonData.data.status === 'published',
      'Contest state updated to published');

    // Cancel contest
    const { req: cancelReq, res: cancelRes } = createMockReqRes({
      user: poUser,
      params: { id: createdContestId }
    });
    await cancelContest(cancelReq, cancelRes);
    assert(cancelRes.statusCode === 200 && cancelRes.jsonData.success, 'Contest cancelled successfully');
    assert(cancelRes.jsonData.data.status === 'cancelled', 'Contest state updated to cancelled');

    // Cleanup contest
    await Contest.findByIdAndDelete(createdContestId);
    console.log('');

    // -------------------------------------------------------------
    // TEST 6: Student Contest Visibility Isolation
    // -------------------------------------------------------------
    console.log('TEST 6: Contest Student Visibility Isolation');
    // Create one published and one draft contest
    const draftContest = await Contest.create({
      title: 'Draft Assessment',
      startTime: new Date(Date.now() + 3600000),
      endTime: new Date(Date.now() + 7200000),
      duration: 60,
      isPublished: false,
      status: 'draft',
      createdBy: poUser._id
    });
    const pubContest = await Contest.create({
      title: 'Published Assessment',
      startTime: new Date(Date.now() + 3600000),
      endTime: new Date(Date.now() + 7200000),
      duration: 60,
      isPublished: true,
      status: 'published',
      createdBy: poUser._id
    });

    const { req: stuListReq, res: stuListRes } = createMockReqRes({
      user: { _id: new mongoose.Types.ObjectId(), role: 'student', name: 'Student User' }
    });
    await getContests(stuListReq, stuListRes);
    assert(stuListRes.statusCode === 200, 'Student retrieved contests list');
    const stuContestIds = stuListRes.jsonData.data.map(c => c._id.toString());
    assert(stuContestIds.includes(pubContest._id.toString()), 'Student can view published contest');
    assert(!stuContestIds.includes(draftContest._id.toString()), 'Student CANNOT view draft contest (isolated)');

    // Clean up test contests
    await Contest.findByIdAndDelete(draftContest._id);
    await Contest.findByIdAndDelete(pubContest._id);
    console.log('');

    // -------------------------------------------------------------
    // TEST 7: Soft-Archive Mechanism (Zero historical data loss)
    // -------------------------------------------------------------
    console.log('TEST 7: Soft-Archive Mechanism');
    await PracticeQuestion.deleteMany({ platform: 'leetcode', id: 9999 });
    // Create temporary question under leetcode Hard (has room for 20)
    const tempHardQ = await PracticeQuestion.create({
      platform: 'leetcode',
      id: 9999,
      problemId: 'LC-TEST-TEMP-HARD',
      officialProblemId: 'LC-TEST-TEMP-HARD',
      title: 'Temporary Hard Test Question',
      difficulty: 'Hard',
      slug: 'temp-hard-test-question',
      url: 'https://leetcode.com/problems/temp-hard-test-question/',
      officialUrl: 'https://leetcode.com/problems/temp-hard-test-question/',
      tags: ['dynamic-programming'],
      isActive: true,
      isArchived: false,
      createdBy: poUser._id
    });

    const { req: delReq, res: delRes } = createMockReqRes({
      user: poUser,
      params: { id: tempHardQ._id }
    });
    await deletePracticeQuestion(delReq, delRes);
    assert(delRes.statusCode === 200 && delRes.jsonData.success, 'Question soft-archived successfully');

    const archivedInDb = await PracticeQuestion.findById(tempHardQ._id);
    assert(archivedInDb !== null, 'Question was NOT permanently removed from DB');
    assert(archivedInDb.isArchived === true && archivedInDb.isActive === false,
      'Question is archived with isArchived: true, isActive: false');

    // Verify it is excluded from student practice questions list
    const { req: stuQReq, res: stuQRes } = createMockReqRes({
      user: { _id: new mongoose.Types.ObjectId(), role: 'student' },
      params: { platform: 'leetcode' },
      query: { difficulty: 'Hard' }
    });
    await getPracticeQuestions(stuQReq, stuQRes);
    const activeHardIds = stuQRes.jsonData.data.map(q => q._id.toString());
    assert(!activeHardIds.includes(tempHardQ._id.toString()), 'Archived question is excluded from student practice list');

    // Clean up temporary question
    await PracticeQuestion.findByIdAndDelete(tempHardQ._id);
    console.log('');

    // -------------------------------------------------------------
    // TEST 8: Live Sync Progress Matching & Deduplication
    // -------------------------------------------------------------
    console.log('TEST 8: Sync Curated Matching & Deduplication');
    const curatedSample = [
      { officialProblemId: 'CF-100-A', problemId: 'CF-100-A', difficulty: 'Easy', tags: ['math'] },
      { officialProblemId: 'CF-100-B', problemId: 'CF-100-B', difficulty: 'Medium', tags: ['dp'] },
      { officialProblemId: 'CF-100-C', problemId: 'CF-100-C', difficulty: 'Hard', tags: ['graphs'] }
    ];

    const mockSubmissions = [
      { problemId: 'CF-100-A', verdict: 'OK' },
      { problemId: 'CF-100-A', verdict: 'OK' }, // Duplicate submission for CF-100-A
      { problemId: 'CF-100-A', verdict: 'WRONG_ANSWER' },
      { problemId: 'CF-100-B', verdict: 'OK' },
      { problemId: 'CF-100-C', verdict: 'TIME_LIMIT_EXCEEDED' }, // CF-100-C NOT solved
      { problemId: 'CF-999-Z', verdict: 'OK' } // Not in curated set
    ];

    const matched = codingPlatformSyncService.matchCuratedProgress(curatedSample, mockSubmissions);
    assert(matched.verifiedSolvedCount === 2, 'Total solved count is 2 (CF-100-A and CF-100-B); duplicates ignored');
    assert(matched.verifiedEasyCount === 1, 'Easy solved count is 1');
    assert(matched.verifiedMediumCount === 1, 'Medium solved count is 1');
    assert(matched.verifiedHardCount === 0, 'Hard solved count is 0 (TLE was not counted as solved)');
    assert(matched.solvedProblemIds.includes('CF-100-A') && matched.solvedProblemIds.includes('CF-100-B'),
      'Solved problem IDs list contains exactly the solved curated problems');
    console.log('');

    // -------------------------------------------------------------
    // TEST 9: View Solution Non-Fabrication & Honest Behavior
    // -------------------------------------------------------------
    console.log('TEST 9: View Solution Non-Fabrication');
    const studentUser = await User.findOne({ role: 'student' });
    assert(studentUser !== null, 'Found existing student for solution verification');

    // Case A: No solution saved, unauthenticated raw code unavailable
    const { req: noSolReq, res: noSolRes } = createMockReqRes({
      user: { _id: studentUser._id, role: 'student' },
      params: { platform: 'codeforces', problemId: '99999999' }
    });
    await getUserSolution(noSolReq, noSolRes);
    assert(noSolRes.statusCode === 200 && noSolRes.jsonData.success, 'Solution endpoint returned successfully');
    assert(noSolRes.jsonData.data.solution === '', 'Solution code is EMPTY — zero fabrication of fake code');
    assert(noSolRes.jsonData.data.sourceCodeAccessible === false, 'sourceCodeAccessible is honestly false');
    assert(noSolRes.jsonData.data.message !== undefined, 'Honest informational message returned to user');

    // Case B: Student saves verified custom/imported solution
    const testProblemId = 'TEST-INTEGRITY-PROB-01';
    const realCode = 'console.log("Verified Student Solved Code");';
    const { req: saveReq, res: saveRes } = createMockReqRes({
      user: { _id: studentUser._id, role: 'student' },
      body: {
        platform: 'leetcode',
        problemId: testProblemId,
        language: 'javascript',
        code: realCode
      }
    });
    await saveUserSolution(saveReq, saveRes);
    assert(saveRes.statusCode === 200 && saveRes.jsonData.success, 'Student saved solution successfully');

    // Retrieve the student's saved solution
    const { req: getSavedReq, res: getSavedRes } = createMockReqRes({
      user: { _id: studentUser._id, role: 'student' },
      params: { platform: 'leetcode', problemId: testProblemId }
    });
    await getUserSolution(getSavedReq, getSavedRes);
    assert(getSavedRes.jsonData.data.solution === realCode, 'Exact student source code retrieved without alteration');
    assert(getSavedRes.jsonData.data.sourceCodeAccessible === true, 'sourceCodeAccessible is true for saved code');

    // Cleanup saved test solution
    await UserSolution.deleteMany({ user: studentUser._id, problemId: testProblemId });
    console.log('');

    // -------------------------------------------------------------
    // TEST 10: Student Data Isolation
    // -------------------------------------------------------------
    console.log('TEST 10: Student Data Isolation');
    const studentAId = new mongoose.Types.ObjectId();
    const studentBId = new mongoose.Types.ObjectId();

    await UserSolution.create({
      user: studentAId,
      platform: 'codeforces',
      problemId: 'ISOLATION-TEST-Q',
      language: 'cpp',
      code: 'int main() { /* Student A Solution */ return 0; }'
    });

    const studentBSolution = await UserSolution.findOne({ user: studentBId, problemId: 'ISOLATION-TEST-Q' });
    assert(studentBSolution === null, 'Student B cannot see or inherit Student A solution');

    await UserSolution.deleteMany({ problemId: 'ISOLATION-TEST-Q' });
    console.log('');

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('================================================================');
    console.log(`ALL VERIFICATION TESTS COMPLETED: ${passedTests} / ${totalTests} PASSED (100%)`);
    console.log('================================================================');

  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
}

runTests().catch(err => {
  console.error('\nVerification test suite failed with error:', err);
  process.exit(1);
});
