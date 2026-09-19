/**
 * AI Chatbot Controller
 * Answers subject-specific engineering questions and GRIET Placement Portal queries.
 */

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
    answer: `### 📝 How Practice Modules Work on GRIET Placement
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
    const { history = [] } = req.body;

    if (!raw || typeof raw !== 'string' || raw.trim() === '') {
      return res.status(400).json({ success: false, error: 'Please provide a valid question.' });
    }

    const cleanQuestion = raw.trim();
    const apiKey = process.env.GEMINI_API_KEY;

    // 1. If Gemini API key is configured, use live LLM with GRIET portal context
    if (apiKey) {
      try {
        const systemInstruction = `
          You are the official GRIET Placement AI Assistant — an encouraging, intelligent mentor for engineering students.
          You answer:
          1. Computer Science subject doubts (DSA, DBMS, OS, OOP, Computer Networks, Web Dev, Java, C++, Python, SQL, Aptitude).
          2. GRIET Placement Portal guidance: explain tools like Practice Modules (Aptitude & Core CSE tests), Coding Contests & multi-platform sync (LeetCode, Codeforces, CodeChef, HackerRank), AI Resume Builder & Analyzer, Learning Roadmaps with Field Trackers & Study TODOs, Coding Playground, and Discussion Forum.
          Format your answer using clean Markdown, bold highlights, bullet points, and code snippets where appropriate. Keep explanations clear, friendly, and concise.
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
    const fallbackResponse = `### 💡 Quick Answer
I'm here to help you prepare for technical interviews and navigate the **GRIET Placement Portal**!

You can ask me about:
- **Core CSE**: DBMS (ACID, Normalization), Operating Systems (Processes, Deadlocks), OOP (Pillars, Polymorphism), Computer Networks (OSI, TCP/IP).
- **DSA & Coding**: Time complexities, Sorting algorithms, Tree/Graph traversals.
- **Portal Guidance**: Practice Modules, Resume Builder, Coding Contests, or Learning Roadmaps.

*Try asking: "Explain ACID properties in DBMS" or "How do Practice Modules tests work?"*`;

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
