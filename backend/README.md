# Backend Server: AI-Powered Placement Portal

This directory contains the secure and scalable Node.js + Express backend server for the **AI-Powered Placement Preparation Portal**.

The API architecture functions as the robust operational back-bone, handling high-concurrency requests ranging from automated codebase compilations in sandboxes to streaming natural language prompt responses for simulated CV and Interview analytics.

## Operational Features

- **JSON Web Token (JWT) Security Gateway**: Utilizes secure cookies and middleware signatures to verify role-based traffic and limit API controller invocations to Student, Faculty, or Admin parameters exclusively.
- **MongoDB + Mongoose Schemas**: Object relation mappers dynamically handling nested collections across Users, Placements drives, Aptitude pools, Jobs details, and User code execution snapshots.
- **RESTful Endpoints & MVC Model**: Controllers efficiently isolate bulk administration imports (e.g. JSON extraction to CSV databases) and dynamic query sorting for personalized user feeds.
- **AI Generative Wrappers**: Integration handlers formatting structured parameters bridging frontend queries with external Gen-AI APIs (Gemini/OpenAI) utilized within Resume analyzers and interview algorithms.

## Running the Backend Locally

### Installation & Execution
```bash
# Move into the backend directory
npm install

# Create required environment keys
# Generate a .env file and set PORT, MONGO_URI, JWT_SECRET, AI_API_KEYS

# Run local development mode (via nodemon, if configured)
npm run dev
# OR for standard execution
npm start
```
