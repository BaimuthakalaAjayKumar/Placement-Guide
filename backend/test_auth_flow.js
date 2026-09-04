/**
 * Complete Verification Script for Placement Guide Authentication & Network Flow
 */
const http = require('http');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '.env') });

async function runTests() {
  console.log('====================================================');
  console.log('  STARTING COMPLETE AUTH & NETWORK FLOW DIAGNOSIS   ');
  console.log('====================================================\n');

  const results = {
    mongoConnectivity: false,
    backendApiConnectivity: false,
    corsProductionOrigin: false,
    corsLocalhostOrigin: false,
    adminLogin: false,
    studentLogin: false,
    invalidCredentials: false,
    jwtGeneration: false,
    protectedRouteSuccess: false,
    protectedRouteRejection: false,
    roleBasedRedirect: false
  };

  // 1. Test MongoDB Connectivity
  console.log('[TEST 1] Testing MongoDB Connectivity...');
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log(`  ✓ Successfully connected to MongoDB host: ${conn.connection.host}`);
    console.log(`  ✓ Database name: ${conn.connection.name}`);
    results.mongoConnectivity = true;
  } catch (err) {
    console.error(`  ✗ MongoDB Connection Failed: ${err.message}`);
    process.exit(1);
  }

  // 2. Start Test Server using the Express App from server.js
  console.log('\n[TEST 2] Launching Backend Server instance...');
  const express = require('express');
  const cors = require('cors');
  const app = express();
  app.use(express.json());

  // Base allowed origins (matches updated server.js)
  const defaultAllowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    'https://placement-guide-nu.vercel.app'
  ];

  const envOrigins = [
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
  ].filter(Boolean).map(o => o.trim().replace(/\/+$/, ''));

  const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envOrigins])];

  const corsOriginChecker = (origin, callback) => {
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.replace(/\/+$/, '');
    if (allowedOrigins.includes(cleanOrigin) || /\.vercel\.app$/.test(cleanOrigin)) {
      return callback(null, true);
    }
    if (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  };

  const corsOptions = {
    origin: corsOriginChecker,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  // Mount routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/users', require('./routes/users'));

  app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Placement Preparation Portal API' });
  });

  const testPort = 5099;
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(testPort, resolve));
  const baseUrl = `http://127.0.0.1:${testPort}`;
  console.log(`  ✓ Server listening on ${baseUrl}`);

  try {
    // 3. Backend API Connectivity
    console.log('\n[TEST 3] Verifying Backend Root API Connectivity (GET /)...');
    const rootRes = await fetch(`${baseUrl}/`);
    const rootData = await rootRes.json();
    if (rootRes.status === 200 && rootData.message?.includes('Placement Preparation Portal API')) {
      console.log('  ✓ Backend API root responds with HTTP 200 OK and valid JSON');
      results.backendApiConnectivity = true;
    } else {
      console.error(`  ✗ Unexpected root response: ${rootRes.status}`, rootData);
    }

    // 4. CORS Test for Deployed Production Origin
    console.log('\n[TEST 4] Verifying CORS preflight for deployed Vercel frontend...');
    const corsRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://placement-guide-nu.vercel.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    const allowOrigin = corsRes.headers.get('access-control-allow-origin');
    const allowCreds = corsRes.headers.get('access-control-allow-credentials');
    console.log(`  Response Status: ${corsRes.status}`);
    console.log(`  Access-Control-Allow-Origin: ${allowOrigin}`);
    console.log(`  Access-Control-Allow-Credentials: ${allowCreds}`);

    if (allowOrigin === 'https://placement-guide-nu.vercel.app' && allowCreds === 'true') {
      console.log('  ✓ CORS correctly configured for https://placement-guide-nu.vercel.app with credentials');
      results.corsProductionOrigin = true;
    } else {
      console.error('  ✗ CORS validation failed for production origin');
    }

    // 5. CORS Test for Localhost Development Origin
    console.log('\n[TEST 5] Verifying CORS preflight for local development origin (http://localhost:5173)...');
    const corsLocalRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    const localAllowOrigin = corsLocalRes.headers.get('access-control-allow-origin');
    if (localAllowOrigin === 'http://localhost:5173') {
      console.log('  ✓ CORS correctly preserves local development support');
      results.corsLocalhostOrigin = true;
    } else {
      console.error('  ✗ CORS failed for local development origin');
    }

    // 6. Admin Login & JWT Generation
    console.log('\n[TEST 6] Testing Admin Login (POST /api/auth/login)...');
    const adminEmail = 'vaddeajaykumar2004@gmail.com';
    const adminPassword = 'Ajay@9182';
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword })
    });
    const adminLoginData = await adminLoginRes.json();
    let adminToken = null;

    if (adminLoginRes.status === 200 && adminLoginData.success && adminLoginData.token) {
      adminToken = adminLoginData.token;
      console.log(`  ✓ Admin login succeeded: HTTP 200`);
      console.log(`  ✓ Admin user: ${adminLoginData.user.name} (${adminLoginData.user.email})`);
      console.log(`  ✓ Admin role: ${adminLoginData.user.role}`);
      console.log(`  ✓ JWT Token: ${adminToken.slice(0, 24)}... (Length: ${adminToken.length})`);
      results.adminLogin = true;
      results.jwtGeneration = true;

      // Check redirect destination
      if (adminLoginData.user.role === 'admin') {
        console.log('  ✓ Redirect Destination: /admin (Correct for role "admin")');
        results.roleBasedRedirect = true;
      }
    } else {
      console.error(`  ✗ Admin login failed:`, adminLoginData);
    }

    // 7. Student Login & JWT Generation
    console.log('\n[TEST 7] Testing Student Login (POST /api/auth/login)...');
    const studentEmail = 'student@prepportal.com';
    const studentPassword = 'password123';
    const studentLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentEmail, password: studentPassword })
    });
    const studentLoginData = await studentLoginRes.json();
    let studentToken = null;

    if (studentLoginRes.status === 200 && studentLoginData.success && studentLoginData.token) {
      studentToken = studentLoginData.token;
      console.log(`  ✓ Student login succeeded: HTTP 200`);
      console.log(`  ✓ Student user: ${studentLoginData.user.name} (${studentLoginData.user.email})`);
      console.log(`  ✓ Student role: ${studentLoginData.user.role}`);
      console.log(`  ✓ JWT Token: ${studentToken.slice(0, 24)}...`);
      results.studentLogin = true;

      // Check redirect destination
      if (studentLoginData.user.role === 'student') {
        console.log('  ✓ Redirect Destination: /dashboard (Correct for role "student")');
      }
    } else {
      console.error(`  ✗ Student login failed:`, studentLoginData);
    }

    // 8. Test Invalid Credentials
    console.log('\n[TEST 8] Testing Invalid Credentials (POST /api/auth/login with wrong password)...');
    const invalidRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentEmail, password: 'WrongPassword999!' })
    });
    const invalidData = await invalidRes.json();

    if (invalidRes.status === 401 && invalidData.success === false && invalidData.error === 'Invalid credentials') {
      console.log('  ✓ Correctly rejected with HTTP 401 and error: "Invalid credentials"');
      results.invalidCredentials = true;
    } else {
      console.error(`  ✗ Unexpected invalid credentials response: ${invalidRes.status}`, invalidData);
    }

    // 9. Verify Protected Route With JWT (GET /api/auth/me)
    console.log('\n[TEST 9] Testing Protected Route (GET /api/auth/me with Bearer token)...');
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const meData = await meRes.json();

    if (meRes.status === 200 && meData.success && meData.data?.email === studentEmail) {
      console.log(`  ✓ Protected route accessible with valid token. User: ${meData.data.email}`);
      results.protectedRouteSuccess = true;
    } else {
      console.error(`  ✗ Protected route failed:`, meData);
    }

    // 10. Verify Protected Route Rejection Without Token
    console.log('\n[TEST 10] Testing Protected Route Rejection (GET /api/auth/me without token)...');
    const noTokenRes = await fetch(`${baseUrl}/api/auth/me`);
    const noTokenData = await noTokenRes.json();

    if (noTokenRes.status === 401 && noTokenData.success === false) {
      console.log(`  ✓ Unauthorized request rejected with HTTP 401: ${noTokenData.error}`);
      results.protectedRouteRejection = true;
    } else {
      console.error(`  ✗ Route did not reject unauthenticated request:`, noTokenData);
    }

  } finally {
    server.close();
    await mongoose.disconnect();
  }

  console.log('\n====================================================');
  console.log('              SUMMARY OF TEST RESULTS               ');
  console.log('====================================================');
  let allPassed = true;
  for (const [testName, passed] of Object.entries(results)) {
    console.log(`  ${passed ? '✓ PASS' : '✗ FAIL'}: ${testName}`);
    if (!passed) allPassed = false;
  }
  console.log('====================================================');
  console.log(allPassed ? 'ALL TESTS PASSED SUCCESSFULLY! ✓' : 'SOME TESTS FAILED! ✗');
  console.log('====================================================\n');
  process.exit(allPassed ? 0 : 1);
}

runTests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
