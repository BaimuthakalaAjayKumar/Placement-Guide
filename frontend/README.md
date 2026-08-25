# Frontend Client: AI-Powered Placement Portal

This directory contains the robust React.js client interface for the **AI-Powered Placement Preparation Portal**. 

The frontend implements a unified, rich, and highly responsive user experience ensuring that students can access learning tracking, assessment, and placement management tools without fragmented contexts. Administrators and faculty access a granular centralized dashboard enabling advanced analytics and tracking of institutional cohorts.

## Core Implementations

- **Web Development & Components Base**: Modern, scalable component structures governed by React and styled securely with advanced visual aesthetics.
- **Monaco Code Sandbox**: Embedded React component integrating Microsoft's Monaco IDE directly onto the coding workspace page, providing syntax highlighting, snippet tracking, and live test-case interactions.
- **AI-Powered Interfaces**: Forms and dialogs that stream AI generated questions dynamically from backend APIs, directly tracking behavioral and technical metrics.
- **Data Presentation Visualizations**: Custom, responsive chart graphs computing readiness ratios based on code logic metrics, aptitude completion rates, and learning progression parameters, seamlessly rendering for dashboards.
- **Socket IO Connections**: Instant real-time UI synchronizations rendering notifications for external contests, mock drives, or doubt forums.

## Running the Frontend Locally

This client template relies on the optimized Vite bundler.

### Installation & Execution
```bash
# Ensure you are within the frontend directory
npm install

# Start the Vite development hot-reload server
npm run dev
```

Remember to sync this frontend with the active backend express server on the proper configured HTTP port.
