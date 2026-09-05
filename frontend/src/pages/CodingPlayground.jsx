import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import { API_URL } from '../config/api';
import Editor from '@monaco-editor/react';
import './CodingPlayground.css';

const TEMPLATES = {
  cpp: `#include <iostream>
using namespace std;

int main() {
    // Write your C++ code here
    cout << "Hello Coding World!" << endl;
    return 0;
}`,
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Write your Java code here
        System.out.println("Hello Coding World!");
    }
}`,
  python: `# Write your Python code here
print("Hello Coding World!")`,
  javascript: `// Write your JavaScript code here
console.log("Hello Coding World!");`,
  c: `#include <stdio.h>

int main() {
    // Write your C code here
    printf("Hello Coding World!\\n");
    return 0;
}`,
  sql: `-- Write your SQL query here
SELECT * FROM users LIMIT 5;`
};

const LANGUAGES = [
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'c', label: 'C' },
  { value: 'sql', label: 'SQL (Generic)' }
];

const CodingPlayground = () => {
  const { token } = useAuth();
  const { theme } = useTheme();

  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState(TEMPLATES.cpp);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState(null);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setCode(TEMPLATES[lang] || '');
  };

  const handleRunCode = async () => {
    try {
      setRunning(true);
      setOutput('Executing code on server sandbox...');
      setStats(null);

      const res = await fetch(`${API_URL}/questions/run-sandbox`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          code,
          language,
          input
        })
      });

      const data = await res.json();
      if (data.success) {
        if (data.error) {
          setOutput(`Error: ${data.error}\n\n${data.stdout}`);
        } else {
          setOutput(data.stdout || '(Execution successful but returned no output)');
        }
        setStats({
          timeMs: data.timeMs,
          memoryKb: data.memoryKb,
          status: data.status
        });
      } else {
        setOutput(`Server error: ${data.error || 'Failed to run code'}`);
      }
    } catch (err) {
      setOutput(`Failed to connect to execution sandbox: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <Header title="Interactive Coding Sandbox Playground" />
      <div className="content-wrapper playground-content animate-fade" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Select your preferred language, customize standard input arguments, run code securely in our containerized playground, and see real-time compile/execution outputs.</p>

          <div className="playground-workspace" style={{ display: 'flex', gap: '20px', flex: 1, minHeight: '550px' }}>
            
            {/* Left Panel: Monaco Editor */}
            <div className="glass-card editor-section" style={{ flex: 3, display: 'flex', flexDirection: 'column', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <label className="playground-label">Programming Language:</label>
                  <select
                    className="playground-select"
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang.value} value={lang.value}>{lang.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCode(TEMPLATES[language] || '')}
                >
                  Reset Template
                </button>
              </div>

              <div className="playground-editor-wrap">
                <Editor
                  height="100%"
                  theme={theme === 'light' ? 'light' : 'vs-dark'}
                  language={language}
                  value={code}
                  onChange={(val) => setCode(val || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    lineNumbers: 'on',
                    tabSize: 4,
                    padding: { top: 10, bottom: 10 }
                  }}
                />
              </div>
            </div>

            {/* Right Panel: Stdin & Stdout */}
            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Input Area */}
              <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px' }}>
                <h4 className="playground-heading">📥 Standard Input (stdin)</h4>
                <textarea
                  placeholder="Provide parameters to stdin line by line..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="playground-textarea"
                />
              </div>

              {/* Output Area */}
              <div className="glass-card" style={{ flex: 2, display: 'flex', flexDirection: 'column', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 className="playground-heading">💻 Console Output (stdout)</h4>
                  {stats && (
                    <span style={{ fontSize: '0.8rem', color: '#10b981' }}>
                      ⚡ {stats.timeMs}ms | 💾 {stats.memoryKb}KB
                    </span>
                  )}
                </div>
                <pre
                  className="playground-pre"
                  style={{
                    flex: 1,
                    background: theme === 'light' ? '#f8fafc' : '#010409',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: output.startsWith('Error:') || output.startsWith('Server error:') ? '#ef4444' : (theme === 'light' ? '#0f172a' : '#a7f3d0'),
                    padding: '15px',
                    margin: 0,
                    overflowY: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {output || '(Run code to see stdout results)'}
                </pre>
              </div>

              {/* Action Button */}
              <button
                className="btn btn-primary"
                onClick={handleRunCode}
                disabled={running}
                style={{ padding: '15px', fontSize: '1rem', fontWeight: 'bold' }}
              >
                {running ? 'Running execution in sandbox...' : '▶ Run Code'}
              </button>

            </div>

          </div>
        </div>
      </>
  );
};

export default CodingPlayground;
