// ─── ROLE-BASED ROADMAPS ───────────────────────────────────────────────────
const roleRoadmapSlugs = [
  'frontend', 'backend', 'full-stack', 'android', 'devops', 'devsecops',
  'data-analyst', 'ai-engineer', 'ai-data-scientist', 'data-engineer',
  'machine-learning', 'product-design', 'postgresql-dba', 'ios', 'blockchain',
  'qa', 'software-architect', 'api-design', 'cyber-security', 'ux-design',
  'technical-writer', 'game-developer', 'server-side-game-developer', 'mlops',
  'product-manager', 'engineering-manager', 'devrel', 'bi-analyst',
  'ai-red-teaming', 'network-engineer', 'forward-deployed-engineer',
];

// ─── SKILL-BASED ROADMAPS ──────────────────────────────────────────────────
const skillRoadmapSlugs = [
  'ai-agents', 'ai-product-builder', 'claude-code', 'python-data-analysis',
  'r-programming', 'vibe-coding', 'power-bi', 'leetcode', 'python',
  'computer-science', 'sql', 'openclaw', 'react', 'vue', 'angular',
  'javascript', 'typescript', 'nodejs', 'system-design', 'java', 'aspnet-core',
  'spring-boot', 'flutter', 'c', 'cpp', 'rust', 'golang', 'software-design-architecture',
  'react-native', 'design-system', 'prompt-engineering', 'mongodb', 'linux',
  'kubernetes', 'docker', 'aws', 'terraform', 'datastructures-and-algorithms',
  'redis', 'git-github', 'php', 'cloudflare', 'nextjs', 'kotlin', 'html',
  'css', 'swift-ui', 'shell-bash', 'laravel', 'elasticsearch', 'wordpress',
  'django', 'ruby', 'ruby-on-rails', 'scala',
  // Beginner tracks
  'frontend-beginner', 'backend-beginner', 'devops-beginner', 'git-github-beginner',
  // Additional skill
  'code-review',
];

// ─── TITLE OVERRIDES ───────────────────────────────────────────────────────
const titleOverrides = {
  'ai-agents': 'AI Agents',
  'ai-data-scientist': 'AI & Data Scientist',
  'ai-engineer': 'AI Engineer',
  'ai-product-builder': 'AI Product Builder',
  'ai-red-teaming': 'AI Red Teaming',
  'api-design': 'API Design',
  'aspnet-core': 'ASP.NET Core',
  'bi-analyst': 'BI Analyst',
  'c': 'C Programming',
  'claude-code': 'Claude Code',
  'code-review': 'Code Review',
  'computer-science': 'Computer Science',
  'cpp': 'C++',
  'css': 'CSS',
  'cyber-security': 'Cyber Security',
  'data-analyst': 'Data Analyst',
  'data-engineer': 'Data Engineer',
  'datastructures-and-algorithms': 'Data Structures & Algorithms',
  'design-system': 'Design System',
  'devrel': 'Developer Relations',
  'devsecops': 'DevSecOps',
  'devops-beginner': 'DevOps Beginner',
  'engineering-manager': 'Engineering Manager',
  'forward-deployed-engineer': 'Forward Deployed Engineer',
  'frontend-beginner': 'Frontend Beginner',
  'full-stack': 'Full Stack',
  'game-developer': 'Game Developer',
  'git-github-beginner': 'Git & GitHub Beginner',
  'git-github': 'Git & GitHub',
  'golang': 'Go',
  'ios': 'iOS',
  'java': 'Java',
  'javascript': 'JavaScript',
  'kotlin': 'Kotlin',
  'mlops': 'MLOps',
  'mongodb': 'MongoDB',
  'nextjs': 'Next.js',
  'nodejs': 'Node.js',
  'openclaw': 'OpenClaw',
  'power-bi': 'Power BI',
  'product-design': 'Product Design',
  'product-manager': 'Product Manager',
  'prompt-engineering': 'Prompt Engineering',
  'python-data-analysis': 'Python for Data Analysis',
  'r-programming': 'R Programming',
  'qa': 'QA',
  'react-native': 'React Native',
  'ruby-on-rails': 'Ruby on Rails',
  'server-side-game-developer': 'Server Side Game Developer',
  'shell-bash': 'Shell / Bash',
  'software-architect': 'Software Architect',
  'software-design-architecture': 'Software Design & Architecture',
  'spring-boot': 'Spring Boot',
  'sql': 'SQL',
  'swift-ui': 'Swift & SwiftUI',
  'system-design': 'System Design',
  'technical-writer': 'Technical Writer',
  'ux-design': 'UX Design',
  'vibe-coding': 'Vibe Coding',
  'backend-beginner': 'Backend Beginner',
  'frontend-beginner': 'Frontend Beginner',
};

const toTitle = (name) =>
  name.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const makeRoadmap = (slug, category) => ({
  slug,
  name: titleOverrides[slug] || toTitle(slug),
  category,
  url: `https://roadmap.sh/${slug}`,
  imageUrl: `https://roadmap.sh/roadmaps/${slug}.png`,
  sourceUrl: `https://github.com/nilbuild/developer-roadmap/tree/master/src/data/roadmaps/${slug}`,
});

export const developerRoadmaps = [
  ...roleRoadmapSlugs.map((s) => makeRoadmap(s, 'Role')),
  ...skillRoadmapSlugs.map((s) => makeRoadmap(s, 'Skill')),
];

export const roadmapCategories = ['All', 'Role', 'Skill', 'Best Practices', 'Projects'];

// ─── BEST PRACTICES ────────────────────────────────────────────────────────
export const bestPractices = [
  {
    slug: 'aws-best-practices',
    name: 'AWS Best Practices',
    description: 'Best practices for building scalable, secure and cost-efficient solutions on AWS.',
    icon: '☁️',
    url: 'https://roadmap.sh/aws-best-practices',
    imageUrl: 'https://roadmap.sh/roadmaps/aws-best-practices.png',
  },
  {
    slug: 'api-security-best-practices',
    name: 'API Security Best Practices',
    description: 'Best practices for securing your APIs against common vulnerabilities and attacks.',
    icon: '🔒',
    url: 'https://roadmap.sh/api-security-best-practices',
    imageUrl: 'https://roadmap.sh/roadmaps/api-security-best-practices.png',
  },
  {
    slug: 'backend-performance-best-practices',
    name: 'Backend Performance',
    description: 'Best practices for improving the performance of your backend applications.',
    icon: '⚡',
    url: 'https://roadmap.sh/backend-performance-best-practices',
    imageUrl: 'https://roadmap.sh/roadmaps/backend-performance-best-practices.png',
  },
  {
    slug: 'frontend-performance-best-practices',
    name: 'Frontend Performance',
    description: 'Best practices for optimizing and improving the performance of frontend apps.',
    icon: '🚀',
    url: 'https://roadmap.sh/frontend-performance-best-practices',
    imageUrl: 'https://roadmap.sh/roadmaps/frontend-performance-best-practices.png',
  },
  {
    slug: 'code-review-best-practices',
    name: 'Code Review Best Practices',
    description: 'Best practices for conducting effective and constructive code reviews.',
    icon: '🔍',
    url: 'https://roadmap.sh/code-review-best-practices',
    imageUrl: 'https://roadmap.sh/roadmaps/code-review-best-practices.png',
  },
];

// ─── PROJECT IDEAS ─────────────────────────────────────────────────────────
// Source: https://roadmap.sh/projects  (112 projects as of 2026)
export const projectIdeas = [
  // ── Beginner CLI ──────────────────────────────────────────────────────────
  { slug: 'task-tracker', name: 'Task Tracker', description: 'Build a CLI app to track your tasks and manage your to-do list.', difficulty: 'beginner', type: 'CLI', tags: ['Backend', 'JavaScript', 'Python', 'Go', 'Java'] },
  { slug: 'github-user-activity', name: 'GitHub User Activity', description: 'Use GitHub API to fetch user activity and display it in the terminal.', difficulty: 'beginner', type: 'CLI', tags: ['Backend', 'JavaScript', 'Python'] },
  { slug: 'expense-tracker', name: 'Expense Tracker', description: 'Build a simple expense tracker to manage your finances.', difficulty: 'beginner', type: 'CLI', tags: ['Backend', 'JavaScript', 'Python'] },
  { slug: 'number-guessing-game', name: 'Number Guessing Game', description: 'Build a simple number guessing game to test your luck.', difficulty: 'beginner', type: 'CLI', tags: ['Backend', 'JavaScript', 'Python', 'Java', 'Go'] },
  { slug: 'github-trending-cli', name: 'GitHub Trending CLI', description: 'CLI application that talks to GitHub API and shows the trending repositories.', difficulty: 'beginner', type: 'CLI', tags: ['Backend', 'Python', 'Go'] },
  { slug: 'tmdb-cli', name: 'TMDB CLI Tool', description: 'Use TMDB API to fetch movie information and display it in the terminal.', difficulty: 'beginner', type: 'CLI', tags: ['Backend', 'JavaScript', 'Python'] },
  // ── Beginner Web App ──────────────────────────────────────────────────────
  { slug: 'unit-converter', name: 'Unit Converter', description: 'Unit converter to convert between different units of measurement.', difficulty: 'beginner', type: 'Web App', tags: ['Frontend', 'JavaScript', 'HTML', 'CSS'] },
  { slug: 'personal-blog', name: 'Personal Blog', description: 'Build a personal blog to write and publish articles on various topics.', difficulty: 'beginner', type: 'Web App', tags: ['Frontend', 'HTML', 'CSS'] },
  { slug: 'countdown-timer', name: 'Countdown Timer', description: 'Build a countdown timer that counts down from a specified time.', difficulty: 'beginner', type: 'Web App', tags: ['Frontend', 'JavaScript', 'HTML', 'CSS'] },
  { slug: 'task-tracker-app', name: 'Task Tracker App', description: 'Build a web-based task tracker to manage your to-do items.', difficulty: 'beginner', type: 'Web App', tags: ['Frontend', 'JavaScript', 'React', 'Vue', 'Angular'] },
  { slug: 'accordion', name: 'Accordion', description: 'Build an accordion component that shows and hides content sections.', difficulty: 'beginner', type: 'Web App', tags: ['Frontend', 'HTML', 'CSS', 'JavaScript'] },
  { slug: 'image-grid', name: 'Image Grid', description: 'Create an image grid layout like Pinterest using CSS Grid.', difficulty: 'beginner', type: 'Web App', tags: ['Frontend', 'HTML', 'CSS'] },
  { slug: 'tooltip-ui', name: 'Tooltip UI', description: 'Build a tooltip UI component using HTML and CSS.', difficulty: 'beginner', type: 'Web App', tags: ['Frontend', 'HTML', 'CSS'] },
  { slug: 'age-calculator', name: 'Age Calculator', description: 'Build an age calculator that calculates the age from a given date.', difficulty: 'beginner', type: 'Web App', tags: ['Frontend', 'JavaScript', 'HTML'] },
  { slug: 'temperature-converter', name: 'Temperature Converter', description: 'Build a temperature converter that converts between Celsius, Fahrenheit, and Kelvin.', difficulty: 'beginner', type: 'Web App', tags: ['Frontend', 'JavaScript', 'HTML', 'CSS'] },
  { slug: 'github-profile-page', name: 'GitHub Profile Page', description: 'Build a GitHub profile page using the GitHub API.', difficulty: 'beginner', type: 'Web App', tags: ['Frontend', 'JavaScript', 'HTML', 'CSS'] },
  { slug: 'quiz-app', name: 'Quiz App', description: 'Build a quiz app that tests your knowledge on various topics.', difficulty: 'beginner', type: 'Web App', tags: ['Frontend', 'JavaScript', 'React'] },
  { slug: 'tab-component', name: 'Tab Component', description: 'Build a tab UI component that shows and hides content on tab click.', difficulty: 'beginner', type: 'Web App', tags: ['Frontend', 'HTML', 'CSS', 'JavaScript'] },
  { slug: 'cookie-consent', name: 'Cookie Consent', description: 'Build a cookie consent banner that is shown to the user on first visit.', difficulty: 'beginner', type: 'Web App', tags: ['Frontend', 'JavaScript', 'HTML', 'CSS'] },
  { slug: 'restricted-textarea', name: 'Restricted Textarea', description: 'Build a textarea with character count and a limit on characters.', difficulty: 'beginner', type: 'Web App', tags: ['Frontend', 'HTML', 'CSS', 'JavaScript'] },
  { slug: 'flash-cards', name: 'Flash Cards', description: 'Build a flash card app to help you study and memorize things.', difficulty: 'beginner', type: 'Web App', tags: ['Frontend', 'JavaScript', 'React'] },
  { slug: 'random-quote-generator', name: 'Random Quote Generator', description: 'Build a page that shows a random quote from a list.', difficulty: 'beginner', type: 'Web App', tags: ['Frontend', 'JavaScript', 'HTML', 'CSS'] },
  { slug: 'custom-dropdown', name: 'Custom Dropdown', description: 'Build a custom dropdown component with keyboard navigation.', difficulty: 'beginner', type: 'Web App', tags: ['Frontend', 'HTML', 'CSS', 'JavaScript'] },
  { slug: 'changelog-component', name: 'Changelog Component', description: 'Build a changelog component that shows product updates.', difficulty: 'beginner', type: 'Web App', tags: ['Frontend', 'HTML', 'CSS'] },
  { slug: 'datepicker-ui', name: 'Datepicker UI', description: 'Build a simple datepicker UI component.', difficulty: 'beginner', type: 'Web App', tags: ['Frontend', 'HTML', 'CSS', 'JavaScript'] },
  { slug: 'testimonial-cards', name: 'Testimonial Cards', description: 'Build testimonial cards to showcase customer reviews.', difficulty: 'beginner', type: 'Web App', tags: ['Frontend', 'HTML', 'CSS'] },
  { slug: 'tweet-component', name: 'Tweet Component', description: 'Build a tweet component like the ones you see on Twitter/X.', difficulty: 'beginner', type: 'Web App', tags: ['Frontend', 'HTML', 'CSS'] },
  { slug: 'star-rating', name: 'Star Rating', description: 'Build an interactive star rating component.', difficulty: 'beginner', type: 'Web App', tags: ['Frontend', 'HTML', 'CSS', 'JavaScript'] },
  { slug: 'progress-bar', name: 'Progress Bar', description: 'Build a progress bar component that fills based on input.', difficulty: 'beginner', type: 'Web App', tags: ['Frontend', 'HTML', 'CSS', 'JavaScript'] },
  { slug: 'pomodoro-timer', name: 'Pomodoro Timer', description: 'Build a Pomodoro timer to help you focus and take breaks.', difficulty: 'beginner', type: 'Web App', tags: ['Frontend', 'JavaScript', 'HTML', 'CSS'] },
  // ── Beginner API ──────────────────────────────────────────────────────────
  { slug: 'weather-api-wrapper-service', name: 'Weather API', description: 'Build a weather API that fetches and returns weather data.', difficulty: 'beginner', type: 'API', tags: ['Backend', 'JavaScript', 'Python', 'Go'] },
  { slug: 'blogging-platform-api', name: 'Blogging Platform API', description: 'Build a RESTful API for a personal blogging platform.', difficulty: 'beginner', type: 'API', tags: ['Backend', 'JavaScript', 'Python', 'Go', 'Java'] },
  { slug: 'todo-list-api', name: 'Todo List API', description: 'Build a RESTful API to allow users to manage their to-do list.', difficulty: 'beginner', type: 'API', tags: ['Backend', 'JavaScript', 'Python', 'Go', 'Java'] },
  { slug: 'expense-tracker-api', name: 'Expense Tracker API', description: 'Build an API for an expense tracker application.', difficulty: 'beginner', type: 'API', tags: ['Backend', 'JavaScript', 'Python', 'Go'] },
  { slug: 'url-shortening-service', name: 'URL Shortening Service', description: 'Build a URL shortener service like bit.ly.', difficulty: 'beginner', type: 'API', tags: ['Backend', 'JavaScript', 'Python', 'Go', 'Java'] },
  { slug: 'broadcast-server', name: 'Broadcast Server', description: 'Build a simple broadcast server that sends messages to all clients.', difficulty: 'beginner', type: 'API', tags: ['Backend', 'Go', 'Node.js'] },
  // ── Beginner Web Scraping / Data Analysis ─────────────────────────────────
  { slug: 'job-listings-scraper', name: 'Python Job Listings Scraper', description: 'Build a scraper that collects job listings from a job site.', difficulty: 'beginner', type: 'Web Scraping', tags: ['Python', 'Backend'] },
  { slug: 'pharmaceutical-sales-data', name: 'Analysing Pharma Sales Data', description: 'Analyse pharmaceutical sales data using Python, Pandas, and Matplotlib.', difficulty: 'beginner', type: 'Data Analysis', tags: ['Python', 'AI and Data Scientist'] },
  { slug: 'cleaning-netflix-dataset', name: 'Clean the Netflix Dataset', description: 'Learn to clean the Netflix dataset using Python and Pandas effectively.', difficulty: 'beginner', type: 'Data Analysis', tags: ['Python', 'AI and Data Scientist'] },
  { slug: 'titanic-eda-python', name: 'Titanic Survival EDA', description: 'Perform exploratory data analysis on the Titanic dataset using Python.', difficulty: 'beginner', type: 'Data Analysis', tags: ['Python', 'AI and Data Scientist'] },
  // ── Intermediate CLI / API ────────────────────────────────────────────────
  { slug: 'caching-server', name: 'Caching Server', description: 'Build a caching proxy server that caches responses from a real server.', difficulty: 'intermediate', type: 'API', tags: ['Backend', 'Go', 'Node.js'] },
  { slug: 'markdown-note-taking-app', name: 'Markdown Note-taking App', description: 'Build a markdown note-taking app with file-based storage.', difficulty: 'intermediate', type: 'CLI', tags: ['Backend', 'JavaScript', 'Python', 'Go'] },
  { slug: 'basic-dns-server', name: 'Basic DNS Server', description: 'Build a basic DNS server that resolves domain names to IP addresses.', difficulty: 'intermediate', type: 'CLI', tags: ['Backend', 'Go'] },
  { slug: 'file-storage-service', name: 'File Storage Service', description: 'Build a file storage service that allows users to upload and download files.', difficulty: 'intermediate', type: 'API', tags: ['Backend', 'JavaScript', 'Python', 'AWS'] },
  { slug: 'database-backup-utility', name: 'Database Backup Utility', description: 'Build a CLI utility to automate database backups and restoration.', difficulty: 'intermediate', type: 'CLI', tags: ['Backend', 'DevOps', 'Python'] },
  { slug: 'movie-reservation-system', name: 'Movie Reservation System', description: 'Build a simple movie seat reservation system backend.', difficulty: 'intermediate', type: 'API', tags: ['Backend', 'JavaScript', 'Python', 'Java'] },
  { slug: 'personal-finance-tracker', name: 'Personal Finance Tracker', description: 'Build a personal finance tracker with budgeting and analytics.', difficulty: 'intermediate', type: 'Web App', tags: ['Frontend', 'Backend', 'React', 'Node.js'] },
  { slug: 'real-time-leaderboard', name: 'Real-Time Leaderboard', description: 'Build a real-time leaderboard using WebSockets and Redis.', difficulty: 'intermediate', type: 'API', tags: ['Backend', 'Node.js', 'Redis'] },
  { slug: 'ecommerce-api', name: 'E-Commerce Platform API', description: 'Build a RESTful API for an e-commerce platform.', difficulty: 'intermediate', type: 'API', tags: ['Backend', 'JavaScript', 'Python', 'Java'] },
  { slug: 'recipe-sharing-platform', name: 'Recipe Sharing Platform', description: 'Build a recipe sharing platform where users can share their recipes.', difficulty: 'intermediate', type: 'Web App', tags: ['Frontend', 'Backend', 'React', 'Node.js'] },
  { slug: 'portfolio-website', name: 'Portfolio Website', description: 'Build a portfolio website to showcase your work and skills.', difficulty: 'intermediate', type: 'Web App', tags: ['Frontend', 'HTML', 'CSS', 'JavaScript'] },
  { slug: 'multi-player-battleship', name: 'Multiplayer Battleship', description: 'Build a real-time multiplayer battleship game using WebSockets.', difficulty: 'intermediate', type: 'Web App', tags: ['Backend', 'Frontend', 'Node.js', 'JavaScript'] },
  { slug: 'social-media-dashboard', name: 'Social Media Dashboard', description: 'Build a social media analytics dashboard showing key metrics.', difficulty: 'intermediate', type: 'Web App', tags: ['Frontend', 'React', 'JavaScript'] },
  { slug: 'contact-form-app', name: 'Contact Form', description: 'Build a contact form with validation, email sending, and spam protection.', difficulty: 'intermediate', type: 'Web App', tags: ['Frontend', 'Backend', 'Node.js', 'React'] },
  { slug: 'news-aggregator-api', name: 'News Aggregator API', description: 'Build an API that aggregates news articles from multiple sources.', difficulty: 'intermediate', type: 'API', tags: ['Backend', 'JavaScript', 'Python', 'Go'] },
  { slug: 'library-management-system', name: 'Library Management System', description: 'Build a system to manage books, members, and loans in a library.', difficulty: 'intermediate', type: 'API', tags: ['Backend', 'Java', 'Python', 'Node.js'] },
  { slug: 'event-management-api', name: 'Event Management API', description: 'Build an API for creating and managing events with attendees.', difficulty: 'intermediate', type: 'API', tags: ['Backend', 'JavaScript', 'Python', 'Go'] },
  { slug: 'ssh-remote-executor', name: 'SSH Remote Server Executor', description: 'Build a tool that executes commands on a remote server over SSH.', difficulty: 'intermediate', type: 'CLI', tags: ['DevOps', 'Backend', 'Go'] },
  { slug: 'roadmap-search', name: 'Roadmap Search CLI', description: 'Build a CLI tool to search across roadmap.sh content.', difficulty: 'intermediate', type: 'CLI', tags: ['Backend', 'JavaScript', 'Go'] },
  // ── Intermediate DevOps ───────────────────────────────────────────────────
  { slug: 'docker-service-deployment', name: 'Docker Service Deployment', description: 'Containerize and deploy a multi-service application using Docker Compose.', difficulty: 'intermediate', type: 'DevOps', tags: ['DevOps', 'Docker'] },
  { slug: 'ci-cd-pipeline', name: 'CI/CD Pipeline', description: 'Set up a complete CI/CD pipeline for a web application.', difficulty: 'intermediate', type: 'DevOps', tags: ['DevOps', 'AWS'] },
  { slug: 'log-archive-tool', name: 'Log Archive Tool', description: 'Build a tool that archives and compresses old logs automatically.', difficulty: 'intermediate', type: 'DevOps', tags: ['DevOps', 'Shell / Bash'] },
  { slug: 'nginx-log-analyser', name: 'Nginx Log Analyser', description: 'Build a CLI tool to analyse Nginx access logs and produce stats.', difficulty: 'intermediate', type: 'CLI', tags: ['DevOps', 'Backend', 'Shell / Bash'] },
  { slug: 'server-stats', name: 'Server Performance Stats', description: 'Build a bash script to analyse server performance and display stats.', difficulty: 'intermediate', type: 'CLI', tags: ['DevOps', 'Shell / Bash', 'Linux'] },
  // ── Intermediate Data Analysis ────────────────────────────────────────────
  { slug: 'predictive-sales-forecasting', name: 'Predictive Sales Forecasting', description: 'Build a machine learning model to forecast future sales.', difficulty: 'intermediate', type: 'Data Analysis', tags: ['Python', 'AI and Data Scientist', 'Machine Learning'] },
  { slug: 'customer-segmentation', name: 'Customer Segmentation', description: 'Segment customers using clustering algorithms on purchase data.', difficulty: 'intermediate', type: 'Data Analysis', tags: ['Python', 'AI and Data Scientist'] },
  // ── Advanced API / Systems ────────────────────────────────────────────────
  { slug: 'scalable-ecommerce', name: 'Scalable E-Commerce App', description: 'Build a production-grade, horizontally scalable e-commerce application.', difficulty: 'advanced', type: 'Web App', tags: ['Backend', 'Frontend', 'AWS', 'Docker', 'Kubernetes'] },
  { slug: 'chat-server', name: 'Chat Server', description: 'Build a real-time chat server with rooms, direct messages, and history.', difficulty: 'advanced', type: 'API', tags: ['Backend', 'Node.js', 'Redis', 'JavaScript'] },
  { slug: 'image-processing-service', name: 'Image Processing Service', description: 'Build a microservice that processes and transforms images on demand.', difficulty: 'advanced', type: 'API', tags: ['Backend', 'Python', 'AWS'] },
  { slug: 'web-crawler', name: 'Web Crawler', description: 'Build a concurrent web crawler that indexes pages and follows links.', difficulty: 'advanced', type: 'CLI', tags: ['Backend', 'Go', 'Python'] },
  { slug: 'photo-sharing-service', name: 'Photo Sharing App', description: 'Build a full-stack photo sharing service like Instagram.', difficulty: 'advanced', type: 'Web App', tags: ['Frontend', 'Backend', 'React', 'Node.js', 'AWS'] },
  { slug: 'multiplayer-tetris', name: 'Multiplayer Tetris', description: 'Build a real-time multiplayer Tetris game.', difficulty: 'advanced', type: 'Web App', tags: ['Frontend', 'Backend', 'JavaScript', 'Node.js'] },
  { slug: 'ott-platform', name: 'OTT Platform', description: 'Build a streaming platform with video upload, playback, and subscriptions.', difficulty: 'advanced', type: 'Web App', tags: ['Backend', 'Frontend', 'AWS', 'Node.js'] },
  { slug: 'payment-gateway', name: 'Payment Gateway', description: 'Integrate a payment gateway and build a checkout flow with webhooks.', difficulty: 'advanced', type: 'API', tags: ['Backend', 'JavaScript', 'Node.js'] },
  { slug: 'ml-pipeline', name: 'ML Pipeline', description: 'Build a complete machine learning pipeline from data ingestion to serving.', difficulty: 'advanced', type: 'Data Analysis', tags: ['Python', 'AI and Data Scientist', 'Machine Learning', 'MLOps'] },
  { slug: 'serverless-api', name: 'Serverless API', description: 'Build a serverless REST API using AWS Lambda and API Gateway.', difficulty: 'advanced', type: 'DevOps', tags: ['AWS', 'Backend', 'JavaScript'] },
  { slug: 'kubernetes-deployment', name: 'Kubernetes Deployment', description: 'Deploy a microservices application on a Kubernetes cluster.', difficulty: 'advanced', type: 'DevOps', tags: ['DevOps', 'Kubernetes', 'Docker'] },
  { slug: 'terraform-infrastructure', name: 'Terraform Infrastructure', description: 'Provision complete cloud infrastructure using Terraform IaC.', difficulty: 'advanced', type: 'DevOps', tags: ['DevOps', 'Terraform', 'AWS'] },
];

export const projectDifficulties = ['All', 'beginner', 'intermediate', 'advanced'];

export const projectTypes = [
  'All', 'CLI', 'Web App', 'API', 'Web Scraping', 'Data Analysis', 'DevOps',
];

export const projectTechTags = [
  'All', 'Frontend', 'Backend', 'DevOps',
  'JavaScript', 'TypeScript', 'Python', 'Go', 'Java', 'Rust',
  'React', 'Vue', 'Angular', 'Node.js', 'Next.js',
  'HTML', 'CSS',
  'Docker', 'Kubernetes', 'AWS', 'Terraform',
  'Redis', 'MongoDB',
  'Machine Learning', 'AI and Data Scientist', 'MLOps',
  'Shell / Bash', 'Linux',
];
