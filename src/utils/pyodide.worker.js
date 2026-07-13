/* eslint-disable no-restricted-globals */

// Load pyodide from CDN to avoid bundler complexities
importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js');

let pyodideReadyPromise;
let currentMode = 'script';

let lastStdout = '';

// Expose get_user_input on self so it can be called from Pyodide
self.get_user_input = (promptText) => {
  try {
    const xhr = new XMLHttpRequest();
    const promptParam = encodeURIComponent(promptText || 'Input requested:');
    // Synchronous XMLHttpRequest to Service Worker Intercept
    xhr.open('GET', `/api/input?prompt=${promptParam}&r=${Math.random()}`, false);
    xhr.send(null);
    return xhr.responseText;
  } catch (err) {
    console.error("Error fetching stdin from service worker:", err);
    return '';
  }
};

async function loadPyodideAndPackages() {
  self.pyodide = await loadPyodide({
    stdout: (text) => {
      lastStdout = text;
      self.postMessage({ type: currentMode === 'repl' ? 'repl_output' : 'output', text });
    },
    stderr: (text) => {
      self.postMessage({ type: currentMode === 'repl' ? 'repl_error' : 'error', text });
    }
  });

  // Inject the custom builtins.input override immediately after loading Pyodide
  try {
    await self.pyodide.runPythonAsync(`
import builtins
import js

def custom_input(prompt=""):
    if prompt:
        print(prompt, end="")
    val = js.get_user_input(str(prompt))
    print(val)
    return val

builtins.input = custom_input
    `);
  } catch (err) {
    console.error("Failed to override builtins.input in Pyodide:", err);
  }

  return self.pyodide;
}

pyodideReadyPromise = loadPyodideAndPackages();

self.onmessage = async (event) => {
  const { id, python, isRepl, ...context } = event.data;
  
  if (!python) {
    self.postMessage({ type: 'done', id, isRepl });
    return;
  }

  currentMode = isRepl ? 'repl' : 'script';

  try {
    const pyodide = await pyodideReadyPromise;
    
    // Force working directory to root / so that Python scripts and JS FS sync match paths
    try {
      pyodide.FS.chdir('/');
    } catch (chdirErr) {
      console.error("Failed to chdir to / in Pyodide:", chdirErr);
    }
    
    // Write workspace files into Pyodide virtual filesystem (FS)
    if (event.data.files && Array.isArray(event.data.files)) {
      const incomingNames = new Set(event.data.files.map(f => f.name).filter(Boolean));
      
      // Clean up files in Pyodide FS that are no longer in the workspace tabs list
      try {
        const allFiles = pyodide.FS.readdir('/');
        const ignoreFiles = new Set(['.', '..', 'dev', 'proc', 'sys', 'tmp', 'home', 'lib', 'mnt']);
        for (const fileName of allFiles) {
          if (!ignoreFiles.has(fileName) && !incomingNames.has(fileName)) {
            try {
              pyodide.FS.unlink(fileName);
            } catch (unlinkErr) {
              console.error(`Failed to delete obsolete file ${fileName} from Pyodide FS:`, unlinkErr);
            }
          }
        }
      } catch (fsCleanErr) {
        console.error("Failed to clean up obsolete files in Pyodide FS:", fsCleanErr);
      }

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
    
    // Read files back from Pyodide virtual FS to sync back to the main thread
    const fsFiles = [];
    try {
      const allFiles = pyodide.FS.readdir('/');
      const ignoreFiles = new Set(['.', '..', 'dev', 'proc', 'sys', 'tmp', 'home', 'lib', 'mnt']);
      for (const fileName of allFiles) {
        if (!ignoreFiles.has(fileName)) {
          try {
            const stat = pyodide.FS.stat(fileName);
            const isDir = pyodide.FS.isDir(stat.mode);
            if (!isDir) {
              const content = pyodide.FS.readFile(fileName, { encoding: 'utf8' });
              fsFiles.push({ name: fileName, code: content });
            }
          } catch (statErr) {
            // ignore files we can't read or system links
          }
        }
      }
    } catch (fsErr) {
      console.error("Error reading back files from Pyodide FS:", fsErr);
    }

    self.postMessage({ type: 'done', id, isRepl, files: fsFiles });
  } catch (error) {
    self.postMessage({ type: isRepl ? 'repl_error' : 'error', text: error.message, id });
    
    // Attempt FS scan even on error in case partial file modifications occurred
    const fsFiles = [];
    try {
      const pyodide = await pyodideReadyPromise;
      const allFiles = pyodide.FS.readdir('/');
      const ignoreFiles = new Set(['.', '..', 'dev', 'proc', 'sys', 'tmp', 'home', 'lib', 'mnt']);
      for (const fileName of allFiles) {
        if (!ignoreFiles.has(fileName)) {
          try {
            const stat = pyodide.FS.stat(fileName);
            const isDir = pyodide.FS.isDir(stat.mode);
            if (!isDir) {
              const content = pyodide.FS.readFile(fileName, { encoding: 'utf8' });
              fsFiles.push({ name: fileName, code: content });
            }
          } catch (statErr) {}
        }
      }
    } catch (fsErr) {}

    self.postMessage({ type: 'done', id, isRepl, files: fsFiles });
  }
};
