/**
 * Project Starter Templates for CampusBridge Project Studio Web IDE
 */

export const PROJECT_TEMPLATES = [
  {
    id: 'react-vite',
    name: 'React + Vite',
    category: 'Frontend & Fullstack',
    icon: '⚛️',
    description: 'Modern React 18 single-page application with component structure and live browser preview.',
    techs: ['React', 'JavaScript', 'CSS', 'Vite'],
    projectType: 'react',
    defaultTitle: 'React Capstone Project',
    files: [
      {
        path: 'src/App.jsx',
        content: `import React, { useState } from 'react';
import './styles.css';

export default function App() {
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState('Online');

  return (
    <div className="app-container">
      <div className="card">
        <div className="header-badge">🚀 CampusBridge React IDE</div>
        <h1>CampusBridge React Application</h1>
        <p className="subtitle">
          Edit <code>src/App.jsx</code> and preview changes live in the built-in browser runtime!
        </p>

        <div className="status-pill">
          <span className="dot"></span> System Status: <strong>{status}</strong>
        </div>

        <div className="counter-row">
          <button className="primary-btn" onClick={() => setCount(c => c + 1)}>
            Clicked {count} {count === 1 ? 'time' : 'times'}
          </button>
          <button className="secondary-btn" onClick={() => setCount(0)}>
            Reset Counter
          </button>
        </div>

        <div className="info-box">
          <p>✨ Real-time JSX compilation with sandboxed execution, terminal console logs, and instant hot reload.</p>
        </div>
      </div>
    </div>
  );
}
`
      },
      {
        path: 'src/main.jsx',
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`
      },
      {
        path: 'src/styles.css',
        content: `:root {
  --primary: #6366f1;
  --primary-hover: #4f46e5;
  --bg: #090d16;
  --card-bg: rgba(26, 34, 52, 0.75);
  --border: rgba(99, 102, 241, 0.25);
  --text: #f8fafc;
  --text-muted: #94a3b8;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: var(--bg);
  background-image: radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
  color: var(--text);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.app-container {
  width: 100%;
  max-width: 580px;
}

.card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  padding: 2.5rem 2rem;
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5), 0 0 25px rgba(99, 102, 241, 0.15);
  text-align: center;
}

.header-badge {
  display: inline-block;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.35);
  color: #a5b4fc;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 9999px;
  margin-bottom: 1.25rem;
}

h1 {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  color: var(--text-muted);
  font-size: 0.95rem;
  line-height: 1.5;
  margin-bottom: 1.5rem;
}

.subtitle code {
  background: rgba(99, 102, 241, 0.2);
  color: #c7d2fe;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #34d399;
  font-size: 0.85rem;
  padding: 6px 14px;
  border-radius: 9999px;
  margin-bottom: 1.75rem;
}

.dot {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  box-shadow: 0 0 8px #10b981;
}

.counter-row {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 1.75rem;
}

button {
  cursor: pointer;
  font-weight: 600;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 0.95rem;
  transition: all 0.2s ease;
}

.primary-btn {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  color: white;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
}

.primary-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
}

.secondary-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
}

.secondary-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.info-box {
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 1rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}
`
      },
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CampusBridge React Project</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`
      },
      {
        path: 'package.json',
        content: `{
  "name": "campusbridge-react-project",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.0"
  }
}
`
      },
      {
        path: 'README.md',
        content: `# CampusBridge React Project

A modern React 18 single-page application built on CampusBridge Project Studio.

## Architecture
- **Framework:** React 18 with Hooks
- **Bundler:** Vite
- **Styling:** CSS3 Design Tokens & Glassmorphism

## Features
- Multi-component hierarchical layout
- State management with React Hooks (\`useState\`)
- Real-time preview with console log streaming
`
      }
    ]
  },
  {
    id: 'html-css-js',
    name: 'HTML / CSS / JavaScript',
    category: 'Web Development',
    icon: '🌐',
    description: 'Standard responsive frontend web application with interactive DOM manipulation.',
    techs: ['HTML5', 'CSS3', 'JavaScript'],
    projectType: 'vanilla',
    defaultTitle: 'Web Frontend Project',
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Interactive Web App</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <header class="hero">
      <div class="badge">CampusBridge Web Studio</div>
      <h1>Interactive Frontend Application</h1>
      <p>Modern HTML5, CSS3, and JavaScript running live inside your browser.</p>
    </header>

    <main class="card">
      <h2>Live Feature Demo</h2>
      <div class="interactive-panel">
        <input type="text" id="userInput" placeholder="Type a task or note here..." />
        <button id="addBtn">Add Item</button>
      </div>

      <ul id="itemList" class="item-list">
        <li><span>Sample Item #1</span><button class="delete-btn">×</button></li>
      </ul>

      <div class="stats-bar">
        <span id="itemCount">1 Item</span>
        <button id="clearBtn" class="link-btn">Clear All</button>
      </div>
    </main>
  </div>

  <script src="script.js"></script>
</body>
</html>
`
      },
      {
        path: 'styles.css',
        content: `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #0f172a;
  color: #f8fafc;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  padding: 2rem 1rem;
}

.container {
  width: 100%;
  max-width: 520px;
}

.hero {
  text-align: center;
  margin-bottom: 2rem;
}

.badge {
  display: inline-block;
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.4);
  color: #60a5fa;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 9999px;
  margin-bottom: 0.75rem;
}

h1 {
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
}

.hero p {
  color: #94a3b8;
  font-size: 0.95rem;
}

.card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 1.75rem;
  box-shadow: 0 10px 25px rgba(0,0,0,0.4);
}

.card h2 {
  font-size: 1.2rem;
  margin-bottom: 1rem;
  color: #e2e8f0;
}

.interactive-panel {
  display: flex;
  gap: 8px;
  margin-bottom: 1.25rem;
}

input {
  flex: 1;
  background: #0f172a;
  border: 1px solid #475569;
  border-radius: 6px;
  padding: 10px 14px;
  color: #f8fafc;
  font-size: 0.95rem;
}

input:focus {
  outline: none;
  border-color: #3b82f6;
}

button#addBtn {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 10px 18px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

button#addBtn:hover {
  background: #2563eb;
}

.item-list {
  list-style: none;
  margin-bottom: 1rem;
  max-height: 250px;
  overflow-y: auto;
}

.item-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 6px;
  font-size: 0.95rem;
}

.delete-btn {
  background: transparent;
  color: #ef4444;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
}

.stats-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid #334155;
  color: #94a3b8;
  font-size: 0.85rem;
}

.link-btn {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  font-size: 0.85rem;
}
`
      },
      {
        path: 'script.js',
        content: `// CampusBridge Interactive Web Application Logic
console.log('[System] Web project initialized in browser runtime.');

const userInput = document.getElementById('userInput');
const addBtn = document.getElementById('addBtn');
const itemList = document.getElementById('itemList');
const itemCount = document.getElementById('itemCount');
const clearBtn = document.getElementById('clearBtn');

function updateCount() {
  const count = itemList.children.length;
  itemCount.textContent = count === 1 ? '1 Item' : \`\${count} Items\`;
}

function addItem() {
  const text = userInput.value.trim();
  if (!text) return;

  const li = document.createElement('li');
  const span = document.createElement('span');
  span.textContent = text;

  const delBtn = document.createElement('button');
  delBtn.className = 'delete-btn';
  delBtn.textContent = '×';
  delBtn.onclick = () => {
    li.remove();
    updateCount();
    console.log(\`[User] Removed item: "\${text}"\`);
  };

  li.appendChild(span);
  li.appendChild(delBtn);
  itemList.appendChild(li);

  userInput.value = '';
  updateCount();
  console.log(\`[User] Added item: "\${text}"\`);
}

addBtn.addEventListener('click', addItem);
userInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addItem();
});

clearBtn.addEventListener('click', () => {
  itemList.innerHTML = '';
  updateCount();
  console.log('[User] Cleared all items.');
});
`
      },
      {
        path: 'README.md',
        content: `# HTML / CSS / JavaScript Web Project

Standard responsive web application built with semantic HTML5, CSS3, and modern ES6 JavaScript.
`
      }
    ]
  },
  {
    id: 'python',
    name: 'Python Application',
    category: 'Backend & Data Science',
    icon: '🐍',
    description: 'Python 3 application ready to run in the isolated backend execution sandbox.',
    techs: ['Python', 'Standard Library'],
    projectType: 'python',
    defaultTitle: 'Python Application Project',
    files: [
      {
        path: 'main.py',
        content: `"""
CampusBridge Python Project
Execute directly in the sandbox with structured execution results!
"""

import sys
import time

def process_data(items):
    print("=== Processing Dataset ===")
    total = sum(items)
    avg = total / len(items) if items else 0
    squares = [x ** 2 for x in items]
    return {
        "count": len(items),
        "sum": total,
        "average": round(avg, 2),
        "squares": squares
    }

def main():
    print(f"Python Runtime: {sys.version.split()[0]}")
    sample_data = [12, 45, 68, 23, 89, 34, 91]
    
    start = time.perf_counter()
    results = process_data(sample_data)
    elapsed = time.perf_counter() - start
    
    print(f"Items: {sample_data}")
    print(f"Computed Results: {results}")
    print(f"Time Taken: {elapsed * 1000:.3f} ms")
    print("✓ Python program executed successfully.")

if __name__ == '__main__':
    main()
`
      },
      {
        path: 'requirements.txt',
        content: `# Project Dependencies
# e.g., requests>=2.31.0
# numpy>=1.26.0
`
      },
      {
        path: 'README.md',
        content: `# Python Project

Execute by selecting \`main.py\` and clicking **▶ Run Code** in the IDE toolbar.
`
      }
    ]
  },
  {
    id: 'node-express',
    name: 'Node.js + Express',
    category: 'Backend APIs',
    icon: '🟩',
    description: 'Node.js server with Express routes, middleware, and REST API controllers.',
    techs: ['Node.js', 'Express', 'JavaScript'],
    projectType: 'node',
    defaultTitle: 'Express REST API',
    files: [
      {
        path: 'index.js',
        content: `/**
 * CampusBridge Node.js + Express REST API
 */

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Sample dataset
let students = [
  { id: 1, name: 'Adithya', rollNumber: '23241A12D5', cgpa: 8.5 },
  { id: 2, name: 'Sravani', rollNumber: '23241A12D6', cgpa: 9.1 }
];

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'CampusBridge API', timestamp: new Date() });
});

app.get('/api/students', (req, res) => {
  res.json({ success: true, count: students.length, data: students });
});

app.post('/api/students', (req, res) => {
  const { name, rollNumber, cgpa } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const newStudent = { id: students.length + 1, name, rollNumber, cgpa: Number(cgpa) || 0 };
  students.push(newStudent);
  res.status(201).json({ success: true, data: newStudent });
});

console.log('Express API configured. Ready for deployment and execution.');
`
      },
      {
        path: 'package.json',
        content: `{
  "name": "campusbridge-express-api",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.19.2"
  }
}
`
      },
      {
        path: 'README.md',
        content: `# Node.js Express API

RESTful API backend designed for student capstone and semester projects.
`
      }
    ]
  },
  {
    id: 'flask',
    name: 'Python Flask',
    category: 'Backend & Fullstack',
    icon: '🧪',
    description: 'Python Flask web framework with route handlers and HTML templates.',
    techs: ['Python', 'Flask', 'Jinja2'],
    projectType: 'python',
    defaultTitle: 'Flask Web Application',
    files: [
      {
        path: 'app.py',
        content: `from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

@app.route('/')
def home():
    return jsonify({
        "message": "Welcome to CampusBridge Flask API",
        "status": "active"
    })

@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.get_json() or {}
    features = data.get('features', [])
    score = sum(features) / len(features) if features else 0
    return jsonify({
        "status": "success",
        "predicted_score": round(score, 2)
    })

if __name__ == '__main__':
    print("Flask app starting on port 5000...")
    app.run(debug=True)
`
      },
      {
        path: 'templates/index.html',
        content: `<!DOCTYPE html>
<html>
<head>
  <title>Flask App</title>
</head>
<body>
  <h1>Flask Web Interface</h1>
  <p>{{ message }}</p>
</body>
</html>
`
      },
      {
        path: 'requirements.txt',
        content: `Flask>=3.0.0
Werkzeug>=3.0.0
`
      },
      {
        path: 'README.md',
        content: `# Flask Web Project

Python Flask microframework application for academic projects and ML model deployments.
`
      }
    ]
  },
  {
    id: 'fastapi',
    name: 'FastAPI Service',
    category: 'Backend APIs',
    icon: '⚡',
    description: 'High performance modern Python REST API with async support and Pydantic validation.',
    techs: ['Python', 'FastAPI', 'Pydantic', 'Uvicorn'],
    projectType: 'python',
    defaultTitle: 'FastAPI Microservice',
    files: [
      {
        path: 'main.py',
        content: `from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="CampusBridge Student API", version="1.0.0")

class Student(BaseModel):
    id: Optional[int] = None
    name: str
    roll_number: str
    cgpa: float

database: List[Student] = [
    Student(id=1, name="Baimuthakala Ajay Kumar", roll_number="23241A12D5", cgpa=8.8)
]

@app.get("/")
def read_root():
    return {"message": "CampusBridge FastAPI backend running", "docs_url": "/docs"}

@app.get("/students", response_model=List[Student])
def get_students():
    return database

@app.post("/students", response_model=Student)
def create_student(student: Student):
    student.id = len(database) + 1
    database.append(student)
    return student
`
      },
      {
        path: 'requirements.txt',
        content: `fastapi>=0.110.0
uvicorn>=0.28.0
pydantic>=2.6.0
`
      },
      {
        path: 'README.md',
        content: `# FastAPI Project

High-performance Python API service. Run \`uvicorn main:app --reload\` locally.
`
      }
    ]
  },
  {
    id: 'java',
    name: 'Java Console / OOP',
    category: 'Object Oriented',
    icon: '☕',
    description: 'Java application with object-oriented class hierarchy and algorithmic methods.',
    techs: ['Java', 'OpenJDK'],
    projectType: 'java',
    defaultTitle: 'Java Core Project',
    files: [
      {
        path: 'Main.java',
        content: `/**
 * CampusBridge Java Application
 * Ready to execute in sandbox compiler!
 */

import java.util.*;

class Student {
    private String name;
    private String rollNumber;
    private double cgpa;

    public Student(String name, String rollNumber, double cgpa) {
        this.name = name;
        this.rollNumber = rollNumber;
        this.cgpa = cgpa;
    }

    public void display() {
        System.out.println("Student: " + name + " | Roll: " + rollNumber + " | CGPA: " + cgpa);
    }
}

public class Main {
    public static void main(String[] args) {
        System.out.println("========================================");
        System.out.println("  CampusBridge Java Sandbox Execution   ");
        System.out.println("========================================");

        List<Student> list = new ArrayList<>();
        list.add(new Student("Adithya", "23241A12D5", 8.45));
        list.add(new Student("Baimuthakala", "23241A12D6", 8.92));

        for (Student s : list) {
            s.display();
        }

        System.out.println("\\n✓ Java program completed successfully.");
    }
}
`
      },
      {
        path: 'README.md',
        content: `# Java Project

Compile and run via **▶ Run Code** in Project Studio.
`
      }
    ]
  },
  {
    id: 'cpp',
    name: 'C++ Project',
    category: 'Systems & Algorithms',
    icon: '⚡',
    description: 'C++ program with STL data structures, high performance execution and algorithms.',
    techs: ['C++', 'STL', 'GCC'],
    projectType: 'cpp',
    defaultTitle: 'C++ Systems Project',
    files: [
      {
        path: 'main.cpp',
        content: `#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    cout << "========================================" << endl;
    cout << " CampusBridge C++ Sandbox Execution     " << endl;
    cout << "========================================" << endl;

    vector<int> numbers = {45, 12, 85, 32, 89, 39, 69, 44, 42, 1, 10, 8};

    cout << "Original vector: ";
    for (int n : numbers) cout << n << " ";
    cout << endl;

    sort(numbers.begin(), numbers.end());

    cout << "Sorted vector:   ";
    for (int n : numbers) cout << n << " ";
    cout << endl;

    cout << "\\n✓ C++ Program finished with return code 0." << endl;
    return 0;
}
`
      },
      {
        path: 'README.md',
        content: `# C++ Project

Systems and DSA project compiled via GCC/G++ sandbox.
`
      }
    ]
  },
  {
    id: 'c',
    name: 'C Programming',
    category: 'Systems & Algorithms',
    icon: '🔷',
    description: 'Standard ANSI C program with pointers, memory structures, and file I/O.',
    techs: ['C', 'GCC'],
    projectType: 'c',
    defaultTitle: 'C Programming Project',
    files: [
      {
        path: 'main.c',
        content: `#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int id;
    char name[50];
    float marks;
} Student;

int main() {
    printf("========================================\\n");
    printf("  CampusBridge C Program Execution       \\n");
    printf("========================================\\n");

    Student s1 = {1, "Ajay Kumar", 94.5f};
    printf("ID: %d\\nName: %s\\nMarks: %.2f\\n", s1.id, s1.name, s1.marks);

    printf("\\n✓ Program executed successfully.\\n");
    return 0;
}
`
      },
      {
        path: 'README.md',
        content: `# C Programming Project

Standard C program compiled and executed in sandbox.
`
      }
    ]
  },
  {
    id: 'nextjs',
    name: 'Next.js App',
    category: 'Fullstack Framework',
    icon: '▲',
    description: 'Next.js React fullstack application with server-rendered pages and API routing.',
    techs: ['Next.js', 'React', 'Node.js'],
    projectType: 'react',
    defaultTitle: 'Next.js Web Portal',
    files: [
      {
        path: 'pages/index.js',
        content: `import React from 'react';

export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: '#f8fafc', background: '#0f172a', minHeight: '100vh' }}>
      <h1>▲ Next.js Campus Application</h1>
      <p>Server-rendered pages and dynamic API routes.</p>
    </div>
  );
}
`
      },
      {
        path: 'styles/globals.css',
        content: `body {
  margin: 0;
  background: #0f172a;
  color: #f8fafc;
}
`
      },
      {
        path: 'package.json',
        content: `{
  "name": "campusbridge-next-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
`
      },
      {
        path: 'README.md',
        content: `# Next.js Fullstack Project
`
      }
    ]
  }
];
