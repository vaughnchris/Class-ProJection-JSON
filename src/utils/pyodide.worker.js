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
    
    // Write workspace files into Pyodide virtual filesystem (FS)
    if (event.data.files && Array.isArray(event.data.files)) {
      for (const file of event.data.files) {
        if (file.name) {
          try {
            pyodide.FS.writeFile(file.name, file.code || '');
          } catch (fsErr) {
            console.error(`Failed to write file ${file.name} to Pyodide FS:`, fsErr);
          }
        }
      }
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
