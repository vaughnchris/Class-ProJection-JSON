/* eslint-disable no-restricted-globals */

// Load pyodide from CDN to avoid bundler complexities
importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js');

let pyodideReadyPromise;
let currentMode = 'script';

async function loadPyodideAndPackages() {
  self.pyodide = await loadPyodide({
    stdout: (text) => {
      self.postMessage({ type: currentMode === 'repl' ? 'repl_output' : 'output', text });
    },
    stderr: (text) => {
      self.postMessage({ type: currentMode === 'repl' ? 'repl_error' : 'error', text });
    },
  });
  return self.pyodide;
}

pyodideReadyPromise = loadPyodideAndPackages();

self.onmessage = async (event) => {
  const { id, python, isRepl, ...context } = event.data;
  
  if (!python) return;

  currentMode = isRepl ? 'repl' : 'script';

  try {
    const pyodide = await pyodideReadyPromise;
    
    // Pass context variables (if any) to the python environment
    for (const key of Object.keys(context)) {
      self[key] = context[key];
    }
    
    await pyodide.loadPackagesFromImports(python);
    
    // Execute python code
    const result = await pyodide.runPythonAsync(python);
    
    if (isRepl && result !== undefined) {
      self.postMessage({ type: 'repl_output', text: result.toString(), id });
    }
    
    self.postMessage({ type: 'done', id, isRepl });
  } catch (error) {
    self.postMessage({ type: isRepl ? 'repl_error' : 'error', text: error.message, id });
    self.postMessage({ type: 'done', id, isRepl });
  }
};
