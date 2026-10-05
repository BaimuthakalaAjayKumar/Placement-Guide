/**
 * Preview Bundler for CampusBridge Project Studio Web IDE
 * Safely bundles HTML/CSS/JS and React applications into isolated sandboxed iframes
 */

export function isWebProject(files = []) {
  if (!files || files.length === 0) return false;
  return files.some(f => 
    f.path.endsWith('.html') || 
    f.path.endsWith('.jsx') || 
    f.path.endsWith('.tsx') ||
    (f.path.endsWith('.js') && (f.path.includes('src/') || f.path === 'script.js' || f.path === 'main.js'))
  );
}

export function isReactProject(files = []) {
  if (!files || files.length === 0) return false;
  return files.some(f => 
    f.path.endsWith('.jsx') || 
    f.path.endsWith('.tsx') || 
    f.path.includes('App.jsx') || 
    (f.path === 'package.json' && f.content && f.content.includes('"react"'))
  );
}

export function bundleProjectForPreview(files = [], projectTitle = 'CampusBridge App') {
  if (!files || files.length === 0) {
    return `<!DOCTYPE html><html><body style="background:#0f172a;color:#94a3b8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><p>No files available to preview.</p></body></html>`;
  }

  const isReact = isReactProject(files);

  // Common console & error logging harness injected into iframe
  const consoleHarness = `
    <script>
      (function() {
        const _log = console.log;
        const _warn = console.warn;
        const _error = console.error;
        const _info = console.info;

        function serialize(arg) {
          try {
            if (arg === null) return 'null';
            if (arg === undefined) return 'undefined';
            if (typeof arg === 'object') return JSON.stringify(arg);
            return String(arg);
          } catch(e) {
            return String(arg);
          }
        }

        window.addEventListener('error', function(e) {
          window.parent.postMessage({
            type: 'PREVIEW_CONSOLE',
            level: 'error',
            message: e.message || 'Script error',
            filename: e.filename || '',
            lineno: e.lineno || 1,
            colno: e.colno || 1
          }, '*');
        });

        window.addEventListener('unhandledrejection', function(e) {
          window.parent.postMessage({
            type: 'PREVIEW_CONSOLE',
            level: 'error',
            message: 'Unhandled Promise Rejection: ' + (e.reason ? serialize(e.reason) : 'Unknown error'),
            lineno: 1
          }, '*');
        });

        console.log = function(...args) {
          _log.apply(console, args);
          window.parent.postMessage({
            type: 'PREVIEW_CONSOLE',
            level: 'log',
            message: args.map(serialize).join(' ')
          }, '*');
        };

        console.info = function(...args) {
          _info.apply(console, args);
          window.parent.postMessage({
            type: 'PREVIEW_CONSOLE',
            level: 'info',
            message: args.map(serialize).join(' ')
          }, '*');
        };

        console.warn = function(...args) {
          _warn.apply(console, args);
          window.parent.postMessage({
            type: 'PREVIEW_CONSOLE',
            level: 'warn',
            message: args.map(serialize).join(' ')
          }, '*');
        };

        console.error = function(...args) {
          _error.apply(console, args);
          window.parent.postMessage({
            type: 'PREVIEW_CONSOLE',
            level: 'error',
            message: args.map(serialize).join(' ')
          }, '*');
        };

        window.addEventListener('load', function() {
          window.parent.postMessage({ type: 'PREVIEW_LOADED', title: document.title }, '*');
        });
      })();
    </script>
  `;

  // Collect all CSS files
  const cssFiles = files.filter(f => f.path.endsWith('.css'));
  const combinedCss = cssFiles.map(f => `/* ${f.path} */\n${f.content || ''}`).join('\n\n');

  if (isReact) {
    // REACT APPLICATION BUNDLE
    // Locate App component and other components
    const appFile = files.find(f => f.path.endsWith('App.jsx') || f.path.endsWith('App.js')) || 
                    files.find(f => f.path.endsWith('main.jsx') || f.path.endsWith('index.jsx')) ||
                    files.find(f => f.path.endsWith('.jsx'));

    // Other components (excluding the main entry point to avoid double definitions)
    const otherJsxFiles = files.filter(f => 
      (f.path.endsWith('.jsx') || f.path.endsWith('.js')) && 
      (!appFile || f.path !== appFile.path) &&
      !f.path.includes('main.') &&
      !f.path.includes('index.')
    );

    // Clean import/export syntax for browser Babel execution
    const cleanJsxContent = (code = '') => {
      return code
        .replace(/import\s+.*?from\s+['"][^'"]+['"];?/g, '') // remove standard imports
        .replace(/import\s+['"][^'"]+['"];?/g, '') // remove side-effect imports
        .replace(/export\s+default\s+function\s+([a-zA-Z0-9_$]+)/g, 'function $1')
        .replace(/export\s+default\s+class\s+([a-zA-Z0-9_$]+)/g, 'class $1')
        .replace(/export\s+default\s+([a-zA-Z0-9_$]+);?/g, 'window.$1 = $1;')
        .replace(/export\s+(const|let|var|function|class)\s+/g, '$1 ');
    };

    const helperScripts = otherJsxFiles.map(f => `
      <script type="text/babel">
        // File: ${f.path}
        try {
          ${cleanJsxContent(f.content)}
        } catch(err) {
          console.error("Compile Error in ${f.path}: " + err.message);
        }
      </script>
    `).join('\n');

    const appCode = appFile ? cleanJsxContent(appFile.content) : `function App() { return <div>No App component found</div>; }`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectTitle}</title>
  ${consoleHarness}
  <!-- React 18 & ReactDOM -->
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <!-- Babel Standalone for live JSX transpilation -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    ${combinedCss}
  </style>
</head>
<body>
  <div id="root"></div>

  ${helperScripts}

  <script type="text/babel">
    const { useState, useEffect, useRef, useMemo, useCallback } = React;

    try {
      ${appCode}

      const rootElement = document.getElementById('root');
      if (rootElement) {
        const root = ReactDOM.createRoot(rootElement);
        if (typeof App !== 'undefined') {
          root.render(<App />);
        } else if (typeof window.App !== 'undefined') {
          root.render(<window.App />);
        } else {
          rootElement.innerHTML = '<div style="padding: 2rem; color: #ef4444; font-family: sans-serif;"><h3>Build Error:</h3><p>Could not locate default App component function.</p></div>';
        }
      }
    } catch(err) {
      console.error("Runtime Exception: " + err.message);
      document.getElementById('root').innerHTML = '<div style="padding: 2rem; color: #ef4444; font-family: monospace; background: rgba(239,68,68,0.1); border-radius: 8px; margin: 1rem;"><h3>⚠️ Runtime Exception:</h3><pre>' + err.message + '</pre></div>';
    }
  </script>
</body>
</html>`;
  }

  // VANILLA HTML / CSS / JS APPLICATION BUNDLE
  const htmlFile = files.find(f => f.path.endsWith('.html') || f.path === 'index.html');
  const jsFiles = files.filter(f => f.path.endsWith('.js') && !f.path.includes('package'));

  if (htmlFile) {
    let html = htmlFile.content || '';

    // Remove existing external stylesheet link references and inject combined CSS
    html = html.replace(/<link\s+rel=["']stylesheet["'][^>]*>/gi, '');
    
    // Inject console harness and styles into <head>
    const styleTag = `<style>\n${combinedCss}\n</style>`;
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${consoleHarness}\n${styleTag}\n</head>`);
    } else {
      html = `${consoleHarness}\n${styleTag}\n${html}`;
    }

    // Replace external script tags or inject JS files before </body>
    html = html.replace(/<script\s+src=["'][^"']*\.js["'][^>]*><\/script>/gi, '');

    const inlinedJs = jsFiles.map(f => `
      <script>
        // File: ${f.path}
        try {
          ${f.content || ''}
        } catch(err) {
          console.error("Runtime Error in ${f.path}: " + err.message);
        }
      </script>
    `).join('\n');

    if (html.includes('</body>')) {
      html = html.replace('</body>', `${inlinedJs}\n</body>`);
    } else {
      html = `${html}\n${inlinedJs}`;
    }

    return html;
  }

  // Fallback for files without an explicit index.html
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectTitle}</title>
  ${consoleHarness}
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; }
    ${combinedCss}
  </style>
</head>
<body>
  <h2>${projectTitle}</h2>
  <div id="output"></div>
  ${jsFiles.map(f => `
    <script>
      try {
        ${f.content || ''}
      } catch(err) {
        console.error("Execution error in ${f.path}: " + err.message);
      }
    </script>
  `).join('\n')}
</body>
</html>`;
}
