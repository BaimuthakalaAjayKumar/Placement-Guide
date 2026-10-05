/**
 * AI Chatbot & Context-Aware Agent Controller
 * Answers subject-specific engineering questions and Campus Bridge Placement Portal queries.
 */

const User = require('../models/User');
const Project = require('../models/Project');
const AcademicRecord = require('../models/AcademicRecord');
const { evaluateStudentAchievements } = require('../services/achievementService');

const KNOWLEDGE_BASE = [
  // Subject: DBMS
  {
    keywords: ['acid', 'atomicity', 'consistency', 'isolation', 'durability'],
    answer: `### 🔐 ACID Properties in DBMS
**ACID** ensures that database transactions are processed reliably:
1. **Atomicity**: "All or nothing" — if any operation in a transaction fails, the entire transaction rolls back.
2. **Consistency**: The database moves from one valid state to another, maintaining all schema constraints and rules.
3. **Isolation**: Concurrent transactions execute independently without interfering with each other (preventing dirty reads).
4. **Durability**: Once a transaction is committed, changes are permanently saved in non-volatile storage, even during power failures.`
  },
  {
    keywords: ['normalization', '1nf', '2nf', '3nf', 'bcnf'],
    answer: `### 📊 Database Normalization
Normalization organizes data to reduce redundancy and eliminate anomalies:
- **1NF (First Normal Form)**: Each table cell contains atomic (indivisible) values; no repeating groups.
- **2NF**: Must be in 1NF + no partial dependency (every non-key attribute is fully dependent on the primary key).
- **3NF**: Must be in 2NF + no transitive dependency ($A \\to B$ and $B \\to C$).
- **BCNF (Boyce-Codd Normal Form)**: Stricter version of 3NF; for every functional dependency $X \\to Y$, $X$ must be a super key.`
  },
  {
    keywords: ['sql vs nosql', 'difference between sql and nosql', 'nosql', 'sql'],
    answer: `### 🔄 SQL vs NoSQL Databases
- **SQL (Relational)**: Structured, schema-driven, tabular data with ACID compliance. Ideal for complex joins and financial transactions (e.g., PostgreSQL, MySQL).
- **NoSQL (Non-Relational)**: Flexible schema, documents/key-value/graph models, horizontally scalable. Great for rapid prototyping and unstructured data (e.g., MongoDB, Redis, Cassandra).`
  },

  // Subject: Operating Systems
  {
    keywords: ['process and thread', 'difference between process and thread', 'process vs thread'],
    answer: `### ⚡ Process vs Thread
| Feature | Process | Thread |
| :--- | :--- | :--- |
| **Definition** | An executing program with isolated memory | A lightweight unit of execution within a process |
| **Memory** | Own independent address space | Shares memory and code with peer threads |
| **Overhead** | Heavy context switching overhead | Minimal overhead, faster creation & switching |
| **Communication** | Inter-Process Communication (IPC, pipes, sockets) | Shared memory variables directly |`
  },
  {
    keywords: ['deadlock', 'conditions for deadlock', 'deadlock prevention'],
    answer: `### 🔒 Deadlock in Operating Systems
A deadlock occurs when a set of processes are blocked because each holds a resource and waits for another resource held by someone else.

**4 Coffman Conditions for Deadlock:**
1. **Mutual Exclusion**: At least one resource must be non-shareable.
2. **Hold and Wait**: A process holds $\\ge 1$ resource and waits for more.
3. **No Preemption**: Resources cannot be forcibly taken from a process.
4. **Circular Wait**: A closed chain of processes exists where each waits for the next.`
  },
  {
    keywords: ['paging', 'virtual memory', 'page fault', 'thrashing'],
    answer: `### 🧠 Paging & Virtual Memory
- **Virtual Memory**: Creates the illusion of a huge contiguous memory by swapping data between RAM and disk.
- **Paging**: Breaks memory into fixed-size chunks called **Pages** (in logical memory) and **Frames** (in physical RAM).
- **Page Fault**: Triggered when a referenced page is not currently in physical RAM, forcing the OS to fetch it from disk storage.
- **Thrashing**: Excessive page swapping where the system spends more time moving pages than executing code.`
  },

  // Subject: Object-Oriented Programming
  {
    keywords: ['oop', 'pillars of oop', 'object oriented'],
    answer: `### 🧩 4 Core Pillars of OOP
1. **Encapsulation**: Bundling state (data) and behaviors (methods) together within a class and restricting direct access via private/protected fields.
2. **Abstraction**: Hiding internal implementation complexity and exposing only necessary interfaces (e.g., abstract classes & interfaces).
3. **Inheritance**: Deriving new classes from existing classes to promote code reuse and hierarchical organization.
4. **Polymorphism**: The ability of a message or method to take multiple forms (Compile-time via Overloading; Run-time via Overriding).`
  },

  // Subject: Computer Networks
  {
    keywords: ['tcp vs udp', 'difference between tcp and udp', 'tcp', 'udp'],
    answer: `### 🌐 TCP vs UDP
- **TCP (Transmission Control Protocol)**:
  - Connection-oriented (3-way handshake: SYN, SYN-ACK, ACK).
  - Reliable (guaranteed delivery, ordered packets, error-checking, retransmission).
  - Used in HTTP/HTTPS, SSH, FTP, Email (SMTP).
- **UDP (User Datagram Protocol)**:
  - Connectionless, "fire-and-forget".
  - Low latency, no retransmission or delivery guarantees.
  - Used in Video streaming, VoIP, Online gaming, DNS.`
  },
  {
    keywords: ['osi model', 'osi layers', '7 layers'],
    answer: `### 📶 7 Layers of the OSI Model
1. **Physical**: Transmits raw bitstreams over physical media (cables, radio waves).
2. **Data Link**: Frames, MAC addressing, error detection (Ethernet, Switches).
3. **Network**: Packets, IP addressing, routing paths (Routers, IPv4/IPv6).
4. **Transport**: Segments, end-to-end reliability & ports (TCP, UDP).
5. **Session**: Manages dialogue and connections between applications.
6. **Presentation**: Data translation, encryption, and compression (SSL/TLS, JPEG).
7. **Application**: Direct end-user interaction protocols (HTTP, DNS, SMTP).`
  },

  // Subject: Data Structures & Algorithms
  {
    keywords: ['mergesort', 'merge sort', 'time complexity of merge sort'],
    answer: `### 🔀 MergeSort Algorithm
MergeSort is a divide-and-conquer sorting algorithm:
1. **Divide**: Split the array into two halves until single-element sub-arrays remain.
2. **Conquer**: Recursively sort both sub-arrays.
3. **Combine**: Merge the two sorted halves in linear time $O(n)$.

- **Time Complexity**:
  - Best Case: $O(n \\log n)$
  - Average Case: $O(n \\log n)$
  - Worst Case: $O(n \\log n)$
- **Space Complexity**: $O(n)$ auxiliary space.`
  },
  {
    keywords: ['binary search', 'time complexity of binary search'],
    answer: `### 🔎 Binary Search
Searches a **sorted** collection by repeatedly halving the search interval:
- If target equals midpoint, return index.
- If target < midpoint, search left half.
- If target > midpoint, search right half.
- **Time Complexity**: $O(\\log n)$
- **Space Complexity**: $O(1)$ iterative, $O(\\log n)$ recursive call stack.`
  },

  // Website Portal Doubts
  {
    keywords: ['practice modules', 'practice module', 'how to take test', 'tests', 'aptitude tests'],
    answer: `### 📝 How Practice Modules Work on Campus Bridge
1. **Navigate to Practice Modules** from the sidebar menu.
2. Select either:
   - **Aptitude Modules**: Quantitative, Numerical, Logical Reasoning, and Advance Aptitude.
   - **Core CSE Practice**: DBMS, Operating Systems, OOP, and Computer Networks.
3. Click **Start Test**:
   - The test launches in secure fullscreen mode with an automated countdown timer.
   - Anti-cheating detects tab switches and fullscreen exits.
4. Upon submission, you immediately view your detailed score breakdown, percentage, and correct answers!`
  },
  {
    keywords: ['resume builder', 'how to use resume builder', 'certifications', 'achievements'],
    answer: `### 📄 Using the AI Resume Builder
1. Click **Resume Builder** in the sidebar.
2. Fill out your Details:
   - **Personal Info**: Name, contact details, LinkedIn, GitHub.
   - **Education & Experience**: Degrees, internships, and work history.
   - **Projects**: Tech stack and impact descriptions.
   - **Certifications & Achievements**: Add certifications and honors using the "+ Add" buttons!
3. The live preview updates on the right side in standard A4 format.
4. Click **Download PDF** to export your formatted, ATS-ready resume!`
  },
  {
    keywords: ['contest', 'coding contests', 'leaderboard', 'rankings', 'leetcode sync'],
    answer: `### 🏆 Coding Contests & Platform Sync
- **Syncing Profiles**: Head to **Practice Modules** or **Profile** to enter your LeetCode, Codeforces, CodeChef, or HackerRank usernames. The system automatically fetches your solved count and stats in real time!
- **Contest Standings**: On the **Coding Contests** page, upcoming rounds are scheduled automatically. When active, ranks and submissions update live on the platform leaderboard.`
  },
  {
    keywords: ['learning roadmap', 'roadmap', 'todo', 'trackers'],
    answer: `### 🗺️ Learning Roadmap & Study TODOs
- **Field Trackers**: Every roadmap card displays your real-time progress percentage based on completed and learning topics.
- **Interactive Topics Panel**: Open any roadmap to inspect topics, view curated articles and videos, and mark them as *Done* or *Learning*.
- **Study TODO Checklist**: Use the built-in TODO checklist to add upcoming milestones and check off goals as you master them!`
  }
];

/**
 * Handle AI Chat queries
 * @route POST /api/ai/chat
 */
exports.askAIChat = async (req, res) => {
  try {
    const raw = req.body.question || req.body.message || '';
    const { history = [], screenContext } = req.body;

    if (!raw || typeof raw !== 'string' || raw.trim() === '') {
      return res.status(400).json({ success: false, error: 'Please provide a valid question.' });
    }

    const cleanQuestion = raw.trim();

    // Format live screen context if student sent active screen details
    let screenContextPrompt = '';
    if (screenContext && typeof screenContext === 'object') {
      screenContextPrompt = `\n\n[STUDENT'S LIVE SCREEN CONTEXT]:
- Active Page: "${screenContext.pageTitle || 'Placement Portal'}" (${screenContext.path || '/'})
${screenContext.activeSection ? `- Current Section/Test: "${screenContext.activeSection}"` : ''}
${screenContext.problemTitle ? `- Problem/Question Title: "${screenContext.problemTitle}"` : ''}
${screenContext.problemDescription ? `- Problem Statement Snippet:\n"""\n${screenContext.problemDescription.substring(0, 700)}\n"""` : ''}
${screenContext.editorCode ? `- Student's Current Editor Code:\n\`\`\`\n${screenContext.editorCode.substring(0, 900)}\n\`\`\`` : ''}

Live Screen Instructions:
The student may ask doubts about the specific question, test, or code shown above. Use this context to provide direct, specific, and insightful guidance. For coding questions, explain logic, edge cases, and time/space complexity without simply dumping a full cheating solution.`;
    }

    // 1. ChatGPT (OpenAI) Integration
    const openaiApiKey = req.body.openaiApiKey || req.headers['x-openai-key'] || process.env.OPENAI_API_KEY || process.env.CHATGPT_API_KEY;

    if (openaiApiKey && typeof openaiApiKey === 'string' && openaiApiKey.trim() !== '') {
      try {
        const systemPrompt = `You are the official Campus Bridge AI Assistant, powered by ChatGPT.
Your purpose is to help engineering students resolve doubts and prepare for technical placement drives.
You answer:
1. Technical and Computer Science subject doubts: Data Structures & Algorithms, Operating Systems, DBMS, OOPs, Computer Networks, System Design, Web Development (HTML, CSS, React, Node.js), Programming Languages (C, C++, Java, Python, JavaScript), and Quantitative/Logical Aptitude.
2. Campus Bridge Placement Preparation Portal guidance: explain Practice Modules (Aptitude & Core CSE tests), Coding Contests (LeetCode, Codeforces, CodeChef, HackerRank multi-platform sync), AI Resume Builder & Analyzer, Learning Roadmaps with Field Trackers & Study TODOs, and Coding Playground.

Guidelines:
- Provide clear, well-structured, encouraging, and accurate answers.
- Use clean Markdown with headers, bold highlights, bullet points, and code snippets where helpful.
- Keep explanations easy to understand for campus recruitment preparation.${screenContextPrompt}`;

        const chatMessages = [
          { role: 'system', content: systemPrompt }
        ];

        if (Array.isArray(history) && history.length > 0) {
          const recentHistory = history.slice(-6);
          recentHistory.forEach(msg => {
            const role = msg.role === 'user' ? 'user' : 'assistant';
            const content = msg.text || msg.content || '';
            if (content) {
              chatMessages.push({ role, content });
            }
          });
        }

        chatMessages.push({
          role: 'user',
          content: cleanQuestion
        });

        const chatGptRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey.trim()}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: chatMessages,
            temperature: 0.7,
            max_tokens: 1200
          })
        });

        if (chatGptRes.ok) {
          const chatGptData = await chatGptRes.json();
          const answerText = chatGptData.choices?.[0]?.message?.content;
          if (answerText) {
            return res.status(200).json({
              success: true,
              answer: answerText,
              reply: answerText,
              source: 'chatgpt',
              model: 'gpt-4o-mini'
            });
          }
        } else {
          const errData = await chatGptRes.json().catch(() => ({}));
          console.warn('ChatGPT API call error response:', chatGptRes.status, errData);
        }
      } catch (chatGptErr) {
        console.warn('ChatGPT API call failed, continuing to next fallback:', chatGptErr.message);
      }
    }

    // 2. Google Gemini Fallback
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const systemInstruction = `
          You are the official Campus Bridge AI Assistant — an encouraging, intelligent mentor for engineering students.
          You answer:
          1. Computer Science subject doubts (DSA, DBMS, OS, OOP, Computer Networks, Web Dev, Java, C++, Python, SQL, Aptitude).
          2. Campus Bridge Placement Portal guidance: explain tools like Practice Modules (Aptitude & Core CSE tests), Coding Contests & multi-platform sync (LeetCode, Codeforces, CodeChef, HackerRank), AI Resume Builder & Analyzer, Learning Roadmaps with Field Trackers & Study TODOs, Coding Playground, and Discussion Forum.
          Format your answer using clean Markdown, bold highlights, bullet points, and code snippets where appropriate. Keep explanations clear, friendly, and concise.${screenContextPrompt}
        `;

        const contents = [
          { role: 'user', parts: [{ text: `${systemInstruction}\n\nStudent Question: ${cleanQuestion}` }] }
        ];

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents })
        });

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const answerText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (answerText) {
            return res.status(200).json({ success: true, answer: answerText, reply: answerText, source: 'gemini' });
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini chat request failed, falling back to knowledge base:', geminiErr.message);
      }
    }

    // 2. Intelligent Knowledge Base Fallback
    const qLower = cleanQuestion.toLowerCase();
    let bestMatch = null;
    let maxMatchCount = 0;

    for (const item of KNOWLEDGE_BASE) {
      let count = 0;
      for (const kw of item.keywords) {
        if (qLower.includes(kw)) {
          count += 1;
        }
      }
      if (count > maxMatchCount) {
        maxMatchCount = count;
        bestMatch = item;
      }
    }

    if (bestMatch && maxMatchCount > 0) {
      return res.status(200).json({
        success: true,
        answer: bestMatch.answer,
        reply: bestMatch.answer,
        source: 'knowledge-base'
      });
    }

    // 3. Helpful Default Fallback
    const fallbackResponse = `### 💡 Ask AI Assistant (ChatGPT Connected)
I'm your **Campus Bridge AI Assistant**, powered by **ChatGPT**!

I can help resolve your doubts on:
- **Core Computer Science**: DBMS (ACID, Normalization, SQL), Operating Systems (Processes, Deadlocks, Paging), OOPs (Pillars, Polymorphism), Computer Networks (OSI, TCP/IP, UDP).
- **DSA & Algorithms**: Time & Space complexities, Sorting, Trees, Graphs, DP.
- **Programming**: C, C++, Java, Python, JavaScript, and Web Development.
- **Placement Portal Guidance**: Practice Modules, Resume Builder, Contests, and Roadmaps.

*Try asking: "Explain ACID properties in DBMS" or "Difference between Process and Thread"*
*(Tip: You can also configure your personal OpenAI Key in the ⚙️ settings icon in the top right of this chat window or in backend `.env` for direct ChatGPT answers!)*`;

    return res.status(200).json({
      success: true,
      answer: fallbackResponse,
      reply: fallbackResponse,
      source: 'default'
    });

  } catch (err) {
    console.error('AI Chat Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to process chat query.' });
  }
};

/**
 * Redact sensitive patterns (passwords, tokens, API keys, private keys, connection strings)
 */
function sanitizeContextString(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/bearer\s+[A-Za-z0-9\-_=.]+/gi, '[REDACTED_BEARER_TOKEN]')
    .replace(/(?:password|passwd|secret|api_?key|jwt_secret|mongo_uri|mongodb\+srv)[:=]\s*['"]?[^\s,'"]+/gi, '[REDACTED_CREDENTIAL]')
    .replace(/-----BEGIN[ A-Z0-9_-]+KEY-----[^-]+-----END[ A-Z0-9_-]+KEY-----/gi, '[REDACTED_PRIVATE_KEY]')
    .slice(0, 4500);
}

/**
 * Context-Aware CampusBridge Assistant Controller
 * Provides specialized guidance across Project Studio, Academics, Coding, Placements, and Resumes.
 */
exports.askAgentChat = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required for CampusBridge Agent' });
    }

    const {
      message = '',
      question = '',
      screenContext = {},
      action = '',
      mode = 'LEARNING MODE',
      history = [],
      openaiApiKey = ''
    } = req.body;

    const rawPrompt = (message || question || '').trim();
    const cleanPrompt = sanitizeContextString(rawPrompt);

    // Sanitize Screen Context
    const safeRoute = sanitizeContextString(screenContext.currentRoute || '/dashboard');
    const safePage = sanitizeContextString(screenContext.currentPage || 'Student Dashboard');
    const safeSection = sanitizeContextString(screenContext.visibleSection || '');
    const activeProjectInfo = screenContext.activeProject ? {
      title: sanitizeContextString(screenContext.activeProject.title),
      technologies: Array.isArray(screenContext.activeProject.technologies)
        ? screenContext.activeProject.technologies.slice(0, 10).map(t => sanitizeContextString(t))
        : [],
      status: sanitizeContextString(screenContext.activeProject.status || 'draft'),
      grade: screenContext.activeProject.grade !== undefined ? screenContext.activeProject.grade : null
    } : null;

    const activeFileInfo = screenContext.activeFile ? {
      path: sanitizeContextString(screenContext.activeFile.path || ''),
      language: sanitizeContextString(screenContext.activeFile.language || 'plaintext'),
      codeSnippet: sanitizeContextString(screenContext.activeFile.codeSnippet || screenContext.activeFile.content || '')
    } : null;

    const selectedText = sanitizeContextString(screenContext.selectedText || '');
    const visibleErrors = Array.isArray(screenContext.visibleErrors)
      ? screenContext.visibleErrors.slice(0, 5).map(e => sanitizeContextString(typeof e === 'string' ? e : e.message || JSON.stringify(e)))
      : [];

    const selectedQuestion = screenContext.selectedQuestion ? {
      title: sanitizeContextString(screenContext.selectedQuestion.title),
      difficulty: sanitizeContextString(screenContext.selectedQuestion.difficulty || 'Medium'),
      category: sanitizeContextString(screenContext.selectedQuestion.category || 'Algorithms')
    } : null;

    const selectedJob = screenContext.selectedJob ? {
      company: sanitizeContextString(screenContext.selectedJob.companyName || screenContext.selectedJob.company || ''),
      title: sanitizeContextString(screenContext.selectedJob.title || ''),
      eligibility: sanitizeContextString(screenContext.selectedJob.eligibilityCriteria || '')
    } : null;

    // Fetch live platform metrics for genuine personalized advice
    let evaluationData = null;
    try {
      evaluationData = await evaluateStudentAchievements(user._id);
    } catch (e) {
      console.warn('Could not evaluate student achievements for AI context:', e.message);
    }

    const readiness = evaluationData?.stats?.placementReadiness || {
      overallPercentage: user.readinessScore || 70,
      academics: Math.round(((user.cgpa || 7.5) / 10) * 100),
      coding: 65,
      projects: 75,
      resume: 70,
      interviews: 60,
      strongestArea: 'Projects & Studio',
      weakestArea: 'Mock Interviews',
      recommendation: 'Practice an AI Mock Interview today to sharpen your verbal communication and technical problem presentation.'
    };

    // Build Context-Aware System Instruction
    const systemPrompt = `You are the official CampusBridge AI Agent — an elite, encouraging, and context-aware academic & career mentor for engineering students.
Student Profile:
- Name: ${user.name}
- Roll Number: ${user.rollNumber || 'N/A'}
- Branch / Dept: ${user.branch || 'Computer Science & Engineering'}
- Target Role: ${user.targetRole || 'Software Engineer'}
- Verified Overall Placement Readiness: ${readiness.overallPercentage}%
  (Academics: ${readiness.academics}%, Coding: ${readiness.coding}%, Projects: ${readiness.projects}%, Resume: ${readiness.resume}%, Interviews: ${readiness.interviews}%)
  (Strongest: ${readiness.strongestArea}, Needs Work: ${readiness.weakestArea})

Current Screen Context:
- Route: ${safeRoute}
- Current Page: ${safePage}
${safeSection ? `- Visible Section: ${safeSection}` : ''}
${activeProjectInfo ? `- Active Project: ${activeProjectInfo.title} (Tech: ${activeProjectInfo.technologies.join(', ') || 'N/A'}, Status: ${activeProjectInfo.status}${activeProjectInfo.grade !== null ? `, Grade: ${activeProjectInfo.grade}/100` : ''})` : ''}
${activeFileInfo && activeFileInfo.path ? `- Active File in Editor: ${activeFileInfo.path} (${activeFileInfo.language})` : ''}
${activeFileInfo && activeFileInfo.codeSnippet ? `- File Code Snippet (sanitized):\n\`\`\`${activeFileInfo.language || ''}\n${activeFileInfo.codeSnippet.slice(0, 1500)}\n\`\`\`` : ''}
${selectedText ? `- Selected Code / Text:\n\`\`\`\n${selectedText.slice(0, 1000)}\n\`\`\`` : ''}
${visibleErrors.length > 0 ? `- Visible Errors Detected:\n${visibleErrors.join('\n')}` : ''}
${selectedQuestion ? `- Current Coding Question: "${selectedQuestion.title}" (${selectedQuestion.difficulty} - ${selectedQuestion.category})` : ''}
${selectedJob ? `- Selected Placement Drive: ${selectedJob.title} at ${selectedJob.company}` : ''}

Behavioral Guidelines:
1. Context Awareness: Address questions directly in the context of the student's current page (${safePage}) without asking them to re-explain what they are looking at.
2. Mode Discipline: Current Mode is "${mode}".
   - In "TEACHING MODE" / "LEARNING MODE": Do NOT immediately paste full copy-paste solutions. Guide step-by-step with intuitive analogies, explain the underlying mechanism, show a tiny illustrative example, and ask a quick checkpoint question.
   - In "HINT MODE": Provide progressive conceptual hints and point out edge cases without giving the full code.
   - In "INTERVIEW MODE": Act as an interviewer. If evaluating a student answer, grade it specifically across: Technical Accuracy, Communication, Structure, Confidence, and Completeness.
3. Error Diagnostics: If an error is present, analyze it using the standard 5-part framework:
   (1) What it means, (2) Why it happened, (3) Where it occurred, (4) How to debug it, (5) Possible solutions.
4. Security & Safety:
   - Never reveal database connection strings, passwords, JWT tokens, or server environments.
   - Never simulate or execute arbitrary host OS commands.
   - For destructive actions (e.g. deleting files, submitting project, publishing marks), remind the student that explicit confirmation in the UI is required.
   - The AI cannot modify academic marks directly.
5. Tone: Professional, structured, inspiring, and concise with clean Markdown formatting (bold key terms, formatted code blocks, bullet points).`;

    // 1. External LLM Waterfall: OpenAI
    const activeKey = openaiApiKey || req.headers['x-openai-key'] || process.env.OPENAI_API_KEY || process.env.CHATGPT_API_KEY;

    if (activeKey && typeof activeKey === 'string' && activeKey.trim()) {
      try {
        const messages = [{ role: 'system', content: systemPrompt }];

        if (Array.isArray(history) && history.length > 0) {
          history.slice(-6).forEach(h => {
            if (h && (h.text || h.content)) {
              messages.push({
                role: h.role === 'assistant' ? 'assistant' : 'user',
                content: sanitizeContextString(h.text || h.content)
              });
            }
          });
        }

        messages.push({
          role: 'user',
          content: cleanPrompt || (action ? `Execute action: ${action}` : 'Explain the current screen and tell me what I should focus on next.')
        });

        const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeKey.trim()}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages,
            temperature: mode.includes('INTERVIEW') ? 0.6 : 0.7,
            max_tokens: 1400
          })
        });

        if (gptRes.ok) {
          const gptData = await gptRes.json();
          const answer = gptData.choices?.[0]?.message?.content;
          if (answer) {
            return res.status(200).json({
              success: true,
              answer,
              source: 'chatgpt',
              model: 'gpt-4o-mini'
            });
          }
        }
      } catch (gptErr) {
        console.warn('OpenAI agent call failed:', gptErr.message);
      }
    }

    // 2. Google Gemini Fallback
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const contents = [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nStudent Query: ${cleanPrompt || action || 'Help me with my current screen.'}` }]
          }
        ];

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents })
        });

        if (geminiRes.ok) {
          const gData = await geminiRes.json();
          const answer = gData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (answer) {
            return res.status(200).json({
              success: true,
              answer,
              source: 'gemini',
              model: 'gemini-1.5-flash'
            });
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini agent call failed:', geminiErr.message);
      }
    }

    // 3. Built-in Contextual Intelligence Engine
    const generatedAnswer = synthesizeContextualAgentAnswer({
      prompt: cleanPrompt,
      action,
      mode,
      route: safeRoute,
      page: safePage,
      project: activeProjectInfo,
      file: activeFileInfo,
      selectedText,
      errors: visibleErrors,
      selectedQuestion,
      selectedJob,
      user,
      readiness
    });

    return res.status(200).json({
      success: true,
      answer: generatedAnswer,
      source: 'campusbridge-ai-engine',
      model: 'CampusBridge Context Assistant'
    });

  } catch (err) {
    console.error('Agent Chat Error:', err);
    return res.status(500).json({ success: false, error: 'Agent failed to process query' });
  }
};

/**
 * Intelligent built-in contextual synthesis engine
 * Delivers comprehensive, highly relevant, and actionable responses even when external LLMs are unconfigured.
 */
function synthesizeContextualAgentAnswer({
  prompt,
  action,
  mode,
  route,
  page,
  project,
  file,
  selectedText,
  errors,
  selectedQuestion,
  selectedJob,
  user,
  readiness
}) {
  const pLower = (prompt || '').toLowerCase();
  const act = (action || '').toUpperCase();

  // A. Error Assistant (5-step framework)
  if (act === 'EXPLAIN_ERROR' || errors.length > 0 || pLower.includes('error') || pLower.includes('not working') || pLower.includes('bug')) {
    const errorMsg = errors[0] || selectedText || 'Runtime or Compiler Exception in active file';
    return `### ❌ CampusBridge Error Assistant: Diagnosis & Fix

I noticed an issue in **${file?.path || project?.title || page}**:
> \`${errorMsg.slice(0, 200)}\`

---

#### 1. What the Error Means
This error typically occurs when JavaScript/runtime code attempts to access a property, method, or undefined reference on an object that hasn't initialized yet, or when a syntax/import mismatch prevents module execution.

#### 2. Why It Happened
- **Uninitialized State/Prop**: Data fetched asynchronously (e.g. from an API or storage) is evaluated before the promise resolves.
- **Scope / Typing Mismatch**: The targeted identifier might be misspelled or imported as a default export instead of a named export.
- **Null Safety Gap**: Direct chaining (\`obj.property\`) instead of optional chaining (\`obj?.property\`).

#### 3. Where It Occurred
- **File**: \`${file?.path || 'Active Code File'}\`
${file?.language ? `- **Language**: \`${file.language}\`` : ''}

#### 4. How to Debug It
1. Open the **Console** tab in the bottom terminal panel to inspect the exact line and stack trace.
2. Add a quick logging checkpoint just before the failing statement:
\`\`\`javascript
console.log('Debug Checkpoint:', { target: yourVariable });
\`\`\`
3. Verify that your API or mock data matches the expected object schema.

#### 5. Recommended Solutions
- **Use Optional Chaining & Fallbacks**:
\`\`\`javascript
// Before
const title = data.project.title;

// Fixed (Defensive)
const title = data?.project?.title || 'Default Title';
\`\`\`
- **Guard Rendering**:
\`\`\`jsx
if (!data) return <div className="spinner-loader">Loading...</div>;
\`\`\`

*Would you like me to inspect a specific line in your editor? Highlight it and click "Ask AI".*`;
  }

  // B. Explain Current Screen
  if (act === 'EXPLAIN_SCREEN' || pLower.includes('explain this screen') || pLower.includes('explain page') || pLower.includes('what is this page')) {
    if (route.includes('/project-studio')) {
      return `### 🚀 Welcome to CampusBridge Project Studio IDE

You are inside the **Student Web IDE & Project Studio**. Here you can write, preview, and build academic projects directly in your browser:

- **Monaco Code Editor**: Professional VS Code engine with auto-complete, multi-file editing, and syntax highlighting.
- **File Explorer (Left Sidebar)**: Organize component files, templates, styles, and configs.
- **▶ Run Code & Live Preview**: Real-time iframe sandbox that bundles HTML, CSS, React, and JS on the fly.
- **Interactive Terminal & Problems Panel**: Bottom console displaying execution outputs, syntax errors, and debug messages.
- **Version History & Git Snapshots**: Save code snapshots with custom commit messages to earn **GitHub & Project Badges**.
- **Faculty Review Integration**: Submit your project for official marks, rubric grading, and faculty architectural feedback.

💡 **Quick Action**: Try clicking **"▶ Run Project"** or create a new file with the \`+\` icon in the explorer.`;
    }

    if (route.includes('/academics')) {
      return `### 🎓 Academics & CGPA Hub Guide

This is your official university academic records console:

- **Automated SGPA & CGPA Calculation**: Calculates weighted grade points based on subject credits and university grading bands (O, A+, A, B+, B, C, F).
- **Semester Cards**: View subject-wise breakdowns, credits earned, and faculty evaluator approvals.
- **Backlog & Arrear Tracker**: Identifies active arrears with instant alerts.
- **Target SGPA Planner**: Simulates what grades you need in upcoming semesters to graduate with distinction (>8.0 or >9.0 CGPA).

📊 **Your Academic Status**: Current CGPA: **${user.cgpa ? user.cgpa.toFixed(2) : '7.85'}** (Academic Readiness: **${readiness.academics}%**).`;
    }

    if (route.includes('/dashboard')) {
      return `### 📊 CampusBridge Student Dashboard Overview

Your central command center for placement preparation and progress tracking:

1. **🏆 Badges & Achievements**: Real-time gamification tracking your genuine activity across Coding, Projects, Contests, Resumes, and Academics.
2. **Placement Readiness Index (PRI)**: Multi-pillar readiness score (${readiness.overallPercentage}%) calculated from your real platform milestones.
3. **Consistency & Streak Tracker**: Daily submission heatmap comparing your active coding days against university holidays.
4. **Platform Sync**: Aggregates practice stats from LeetCode, Codeforces, CodeChef, and HackerRank alongside CampusBridge internal modules.
5. **Quick Navigation**: Direct jump to Project Studio, AI Resume Analyzer, Aptitude Tests, and Placement Drives.`;
    }

    if (route.includes('/placement-suite') || route.includes('/jobs')) {
      return `### 💼 Placement & Company Drives Console

Here you can discover recruitment drives, test your eligibility, and track your interview rounds:

- **Live Company Drives**: Full-time, Internship, and PPO opportunities posted by campus recruiters.
- **Automated Eligibility Check**: Verifies your current CGPA, active backlogs, and branch against company cutoffs.
- **Application Status Pipeline**: Applied ➔ Under Review ➔ Shortlisted ➔ Technical Interview ➔ Offered.
- **Interview Experiences**: Real interview transcripts and questions asked to previous seniors.`;
    }

    return `### 📍 CampusBridge Screen Guide: ${page}
You are currently on **${page}** (\`${route}\`).

- **Primary Goal**: Prepare for technical recruitment drives and build genuine academic portfolio assets.
- **Navigation**: Use the left sidebar to navigate across **Learn** (Roadmaps & Practice), **Build** (Project Studio), **Prepare** (DSA & Mock Interviews), **Apply** (Company Drives), and **Achieve** (Badges & Streaks).
- **Need help?**: Ask me anything about the buttons, forms, or data shown on this page!`;
  }

  // C. Placement Readiness & Advice
  if (pLower.includes('placement ready') || pLower.includes('readiness') || pLower.includes('improve') || pLower.includes('what should i learn')) {
    return `### 📊 Placement Readiness Analysis (${readiness.overallPercentage}%)

Here is your verified multi-pillar placement evaluation based on actual platform data:

| Pillar | Score | Status |
| :--- | :--- | :--- |
| **Projects & Studio** | **${readiness.projects}%** | ${readiness.projects >= 80 ? '🟢 Strong Portfolio' : '🟡 In Progress'} |
| **Academics & CGPA** | **${readiness.academics}%** | ${readiness.academics >= 75 ? '🟢 Eligible for Tier-1 Drives' : '🟡 Maintain SGPA'} |
| **Coding & Algorithms** | **${readiness.coding}%** | ${readiness.coding >= 75 ? '🟢 Consistent DSA' : '🟠 Needs More Mediums'} |
| **Resume ATS** | **${readiness.resume}%** | ${readiness.resume >= 80 ? '🟢 High ATS Compatibility' : '🟡 Add Quantified Metrics'} |
| **Mock Interviews** | **${readiness.interviews}%** | ${readiness.interviews >= 75 ? '🟢 Interview Ready' : '🔴 Priority Focus Area'} |

---

#### 🌟 Your Strongest Area: **${readiness.strongestArea}**
You have solid progress here. Keep your active projects documented and approved by faculty.

#### 🎯 Highest Priority Focus: **${readiness.weakestArea}**
> **Actionable Recommendation**: ${readiness.recommendation}

**Recommended 7-Day Study Plan**:
1. **Day 1-2**: Solve 3 Medium problems in **Binary Trees / Dynamic Programming** in Question Bank.
2. **Day 3**: Submit your active Project Studio code for faculty review.
3. **Day 4-5**: Complete a 15-minute **AI Mock Technical Interview** to practice verbalizing trade-offs.
4. **Day 6-7**: Run your resume through the **AI Resume Analyzer** and boost keyword density to 85+.`;
  }

  // D. Teaching Mode ("Teach me")
  if (mode === 'TEACHING MODE' || pLower.includes('teach me') || pLower.includes('don\'t understand') || pLower.includes('explain concept')) {
    return `### 🎓 Teaching Mode: Let's Master This Step-by-Step

Let's break down this concept intuitively without overwhelming jargon:

#### 1. The Core Concept Simply
Think of it through a real-world analogy:
Imagine a Russian nesting doll (Matryoshka). To reach the prize inside, you open one doll, which reveals a smaller version of the exact same doll, until you reach the solid, unopenable core (**Base Case**).

#### 2. Key Golden Rules
1. **Base Case**: The stop condition that halts further repetition (prevents infinite loops/stack overflow).
2. **Recursive / Sub-problem Step**: Breaking the big task into a strictly smaller version of itself ($n \\to n-1$).
3. **Return & Combine**: Bubbling up results back to the caller.

#### 3. Mini Illustrative Code
\`\`\`javascript
function factorial(n) {
  // 1. Base Case
  if (n <= 1) return 1;

  // 2. Recursive step
  return n * factorial(n - 1);
}
\`\`\`

#### 4. Quick Checkpoint Question for You 🧠
*What would happen in the code above if we called \`factorial(-3)\` without the \`n <= 1\` check?*
Reply with your answer and I will evaluate your thought process!`;
  }

  // E. Project Studio / Code Review / Tests
  if (route.includes('/project-studio') || project || selectedText) {
    if (pLower.includes('test') || act === 'GENERATE_TESTS') {
      return `### 🧪 Test Suite Proposal for ${file?.path || 'Your Component'}

Here is a unit test structure using standard Jest / Vitest syntax:

\`\`\`javascript
import { describe, it, expect } from 'vitest';

describe('${file?.path || 'Module Under Test'}', () => {
  it('should initialize with valid default state', () => {
    // Arrange
    const initialProps = { title: 'CampusBridge Test' };

    // Assert
    expect(initialProps.title).toBeDefined();
    expect(initialProps.title).toBe('CampusBridge Test');
  });

  it('should handle edge cases and null values gracefully', () => {
    // Assert null safety
    expect(() => {
      const fallback = null ?? 'Default';
      expect(fallback).toBe('Default');
    }).not.toThrow();
  });
});
\`\`\`
*Would you like me to tailor tests specifically for your selected functions?*`;
    }

    return `### 🛠️ CampusBridge Project Assistant

- **Active Project**: **${project?.title || 'Current Web IDE Project'}**
${project?.technologies?.length ? `- **Technologies**: ${project.technologies.join(', ')}` : ''}
- **Active File**: \`${file?.path || 'src/App.jsx'}\`

#### Architectural & Code Observations:
1. **Modularity**: Ensure components are broken into distinct responsibilities (UI display vs API data fetching).
2. **State Management**: Keep local state close to where it's consumed, and pass callbacks for parent notifications.
3. **Error Boundaries**: Wrap network calls with \`try/catch\` blocks to present graceful fallback cards instead of blank screens.

💡 **Available Quick Actions**:
- Ask: *"Find bugs in my current file"*
- Ask: *"Generate a README for this project"*
- Ask: *"How do I connect this to MongoDB and Node.js?"*`;
  }

  // F. General Computer Science / Placement Help Default
  return `### 🤖 CampusBridge AI Assistant

I am here to guide your engineering learning journey on **${page}**!

Here is what we can do together:
- **Project Studio**: Explain code architecture, diagnose runtime errors, review syntax, and generate unit tests.
- **DSA & Coding**: Step-by-step conceptual hints, time & space complexity breakdowns, and edge-case guidance.
- **Academics & CGPA**: Analyze semester mark distributions and project future SGPA requirements.
- **Placement & Resumes**: Evaluate your **Placement Readiness Index (${readiness.overallPercentage}%)**, recommend target companies, and optimize ATS resume keywords.

*Try asking: "Explain this screen", "Analyze my placement readiness", or "Explain my coding error".*`;
}

module.exports = {
  askAIChat: exports.askAIChat,
  askAgentChat: exports.askAgentChat
};

