import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import useStore from '../../store/useStore';
import AboutPanel from './AboutPanel';

const MODULE_FUNCTIONS = {
  numpy: [
    { label: 'array', insert: 'array($0)', doc: 'Create an array from a list or nested list.' },
    { label: 'arange', insert: 'arange($0)', doc: 'Return evenly spaced values within a given interval.' },
    { label: 'linspace', insert: 'linspace($0)', doc: 'Return evenly spaced numbers over a specified interval.' },
    { label: 'zeros', insert: 'zeros($0)', doc: 'Return a new array of given shape and type, filled with zeros.' },
    { label: 'ones', insert: 'ones($0)', doc: 'Return a new array of given shape and type, filled with ones.' },
    { label: 'mean', insert: 'mean($0)', doc: 'Compute the arithmetic mean along the specified axis.' },
    { label: 'std', insert: 'std($0)', doc: 'Compute the standard deviation along the specified axis.' },
    { label: 'dot', insert: 'dot($0)', doc: 'Dot product of two arrays.' }
  ],
  pandas: [
    { label: 'DataFrame', insert: 'DataFrame($0)', doc: 'Two-dimensional, size-mutable, potentially heterogeneous tabular data structure.' },
    { label: 'Series', insert: 'Series($0)', doc: 'One-dimensional ndarray with axis labels.' },
    { label: 'read_csv', insert: 'read_csv($0)', doc: 'Read a comma-separated values (csv) file into a DataFrame.' },
    { label: 'concat', insert: 'concat($0)', doc: 'Concatenate pandas objects along a particular axis.' },
    { label: 'merge', insert: 'merge($0)', doc: 'Merge DataFrame or named Series objects with a database-style join.' }
  ],
  matplotlib: [
    { label: 'plot', insert: 'plot($0)', doc: 'Plot y versus x as lines and/or markers.' },
    { label: 'show', insert: 'show()', doc: 'Display all open figures.' },
    { label: 'scatter', insert: 'scatter($0)', doc: 'A scatter plot of y vs. x with varying marker size and/or color.' },
    { label: 'bar', insert: 'bar($0)', doc: 'Make a bar plot.' },
    { label: 'title', insert: 'title($0)', doc: 'Set a title for the Axes.' },
    { label: 'xlabel', insert: 'xlabel($0)', doc: 'Set the label for the x-axis.' },
    { label: 'ylabel', insert: 'ylabel($0)', doc: 'Set the label for the y-axis.' },
    { label: 'legend', insert: 'legend()', doc: 'Place a legend on the Axes.' }
  ],
  scipy: [
    { label: 'integrate', insert: 'integrate', doc: 'Integration routines (quad, doublequad, etc.).' },
    { label: 'optimize', insert: 'optimize', doc: 'Optimization and root-finding routines.' },
    { label: 'stats', insert: 'stats', doc: 'Statistical functions and distributions.' }
  ],
  'scikit-learn': [
    { label: 'model_selection', insert: 'model_selection', doc: 'Dataset splitting and cross-validation tools.' },
    { label: 'linear_model', insert: 'linear_model', doc: 'Linear regression, Ridge, Lasso, and Logistic models.' },
    { label: 'metrics', insert: 'metrics', doc: 'Score functions, performance metrics, and pairwise metrics.' }
  ],
  sympy: [
    { label: 'Symbol', insert: 'Symbol($0)', doc: 'Define a symbolic mathematical variable.' },
    { label: 'symbols', insert: 'symbols($0)', doc: 'Define multiple symbolic variables at once.' },
    { label: 'solve', insert: 'solve($0)', doc: 'Solve algebraic equations symbolically.' },
    { label: 'diff', insert: 'diff($0)', doc: 'Differentiate a mathematical expression.' },
    { label: 'integrate', insert: 'integrate($0)', doc: 'Integrate a mathematical expression.' }
  ],
  networkx: [
    { label: 'Graph', insert: 'Graph()', doc: 'Create an undirected graph container.' },
    { label: 'DiGraph', insert: 'DiGraph()', doc: 'Create a directed graph container.' },
    { label: 'shortest_path', insert: 'shortest_path($0)', doc: 'Compute shortest paths in the graph.' },
    { label: 'draw', insert: 'draw($0)', doc: 'Draw the graph G with Matplotlib.' }
  ],
  beautifulsoup4: [
    { label: 'BeautifulSoup', insert: 'BeautifulSoup($0)', doc: 'Create a parser object for HTML/XML parsing.' }
  ],
  requests: [
    { label: 'get', insert: 'get($0)', doc: 'Sends a GET request to a URL.' },
    { label: 'post', insert: 'post($0)', doc: 'Sends a POST request to a URL.' },
    { label: 'put', insert: 'put($0)', doc: 'Sends a PUT request to a URL.' },
    { label: 'delete', insert: 'delete($0)', doc: 'Sends a DELETE request to a URL.' }
  ],
  urllib3: [
    { label: 'PoolManager', insert: 'PoolManager()', doc: 'Create a connection pool manager for requests.' }
  ],
  pillow: [
    { label: 'Image', insert: 'Image', doc: 'PIL module for image opening, resizing, and filters.' }
  ],
  sqlite3: [
    { label: 'connect', insert: 'connect($0)', doc: 'Open a connection to an SQLite database file or :memory:.' }
  ],
  micropip: [
    { label: 'install', insert: 'install($0)', doc: 'Install a package from PyPI or url asynchronously (await).' }
  ],
  plotly: [
    { label: 'express', insert: 'express', doc: 'Plotly Express high-level graphing interface.' }
  ],
  sqlalchemy: [
    { label: 'create_engine', insert: 'create_engine($0)', doc: 'Database engine configuration interface.' },
    { label: 'select', insert: 'select($0)', doc: 'Construct SQL SELECT statements.' }
  ],
  math: [
    { label: 'sqrt', insert: 'sqrt($0)', doc: 'Return the square root of x.' },
    { label: 'sin', insert: 'sin($0)', doc: 'Return the sine of x (measured in radians).' },
    { label: 'cos', insert: 'cos($0)', doc: 'Return the cosine of x (measured in radians).' },
    { label: 'tan', insert: 'tan($0)', doc: 'Return the tangent of x (measured in radians).' },
    { label: 'pi', insert: 'pi', doc: 'The mathematical constant pi (3.141592...).' },
    { label: 'e', insert: 'e', doc: 'The mathematical constant e (2.718281...).' },
    { label: 'log', insert: 'log($0)', doc: 'Return the logarithm of x to the given base.' }
  ],
  random: [
    { label: 'random', insert: 'random()', doc: 'Return the next random floating point number in the range [0.0, 1.0).' },
    { label: 'randint', insert: 'randint($0)', doc: 'Return a random integer N such that a <= N <= b.' },
    { label: 'choice', insert: 'choice($0)', doc: 'Return a random element from a non-empty sequence.' },
    { label: 'shuffle', insert: 'shuffle($0)', doc: 'Shuffle the sequence in place.' }
  ],
  json: [
    { label: 'dumps', insert: 'dumps($0)', doc: 'Serialize an object to a JSON formatted string.' },
    { label: 'loads', insert: 'loads($0)', doc: 'Deserialize a string containing a JSON document to a Python object.' },
    { label: 'dump', insert: 'dump($0)', doc: 'Serialize an object as a JSON formatted stream to a file.' },
    { label: 'load', insert: 'load($0)', doc: 'Deserialize a file containing a JSON document to a Python object.' }
  ],
  datetime: [
    { label: 'datetime', insert: 'datetime($0)', doc: 'Classes representing dates, times, and zones.' },
    { label: 'date', insert: 'date($0)', doc: 'Idealized date (year, month, day).' },
    { label: 'timedelta', insert: 'timedelta($0)', doc: 'A duration expressing the difference between two dates/times.' }
  ],
  re: [
    { label: 'search', insert: 'search($0)', doc: 'Scan through a string looking for the first regex match.' },
    { label: 'match', insert: 'match($0)', doc: 'Determine if regex matches at the beginning of a string.' },
    { label: 'findall', insert: 'findall($0)', doc: 'Return a list of all non-overlapping matches in the string.' },
    { label: 'sub', insert: 'sub($0)', doc: 'Replace matches of a pattern with a replacement string.' }
  ],
  collections: [
    { label: 'Counter', insert: 'Counter($0)', doc: 'Dict subclass for counting hashable objects.' },
    { label: 'defaultdict', insert: 'defaultdict($0)', doc: 'Dict subclass that calls a factory function to supply missing values.' },
    { label: 'deque', insert: 'deque($0)', doc: 'Double-ended queue supporting fast append and pops from both ends.' }
  ],
  itertools: [
    { label: 'count', insert: 'count($0)', doc: 'Generate an infinite sequence of consecutive numbers.' },
    { label: 'cycle', insert: 'cycle($0)', doc: 'Cycle indefinitely through an iterable sequence.' },
    { label: 'chain', insert: 'chain($0)', doc: 'Chain multiple iterables together into a single sequence.' }
  ]
};

const CodeEditor = ({ activeTab }) => {
  const editorRef = useRef(null);
  const { 
    instructorCode, 
    activeMode, 
    role, 
    isSharing,
    tabs: storeTabs,
    updateTabCode,
    fontSize
  } = useStore();

  const viewedStudentId = useStore(state => state.viewedStudentId);
  const viewedStudentTabs = useStore(state => state.viewedStudentTabs);
  const viewedStudentMode = useStore(state => state.viewedStudentMode);

  const instructorTabs = useStore(state => state.instructorTabs);
  const instructorActiveTab = useStore(state => state.instructorActiveTab);

  const isInstructor = role === 'instructor';
  const showSharedLecture = !isInstructor && isSharing && activeMode === 'broadcast';

  const tabs = viewedStudentId 
    ? viewedStudentTabs 
    : (showSharedLecture && instructorTabs && instructorTabs.length > 0 ? instructorTabs : storeTabs);

  const isReadOnly = viewedStudentId 
    ? (viewedStudentMode === 'view')
    : (showSharedLecture || (!isInstructor && activeTab === 'instructor_code'));
  
  const currentCode = (viewedStudentId || isInstructor || showSharedLecture)
    ? (tabs.find(t => t.id === activeTab)?.code || '')
    : (activeTab === 'instructor_code' 
        ? instructorCode 
        : (tabs.find(t => t.id === activeTab)?.code || ''));

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Register a single global completion item provider for Python
    if (!window._monacoPythonCompletionProvider) {
      window._monacoPythonCompletionProvider = monaco.languages.registerCompletionItemProvider('python', {
        triggerCharacters: ['.'],
        provideCompletionItems: (model, position) => {
          try {
            const word = model.getWordUntilPosition(position);
            const range = new monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              word.endColumn
            );

            const codeText = model.getValue();
            const workspaceTabs = useStore.getState().tabs || [];
            const suggestions = [];

            // 1. Extract standard imports and aliases in the active editor file
            const importedModules = new Map(); // alias/name -> resolved module name
            
            // Match "import numpy as np" or "import math"
            const importRegex = /^\s*import\s+(\w+(?:\.\w+)*)(?:\s+as\s+(\w+))?/gm;
            let match;
            while ((match = importRegex.exec(codeText)) !== null) {
              const moduleName = match[1];
              const alias = match[2] || moduleName.split('.').pop();
              importedModules.set(alias, moduleName);
              importedModules.set(moduleName, moduleName);
            }

            // Match "from bs4 import BeautifulSoup" or "from utils import add"
            const fromImportRegex = /^\s*from\s+(\w+(?:\.\w+)*)\s+import\s+([\w\s,*]+)/gm;
            while ((match = fromImportRegex.exec(codeText)) !== null) {
              const moduleName = match[1];
              importedModules.set(moduleName, moduleName);
            }

            // 2. Scan text immediately before cursor to check for dot-prefixed autocomplete
            const lineContent = model.getLineContent(position.lineNumber);
            const textBeforeCursor = lineContent.substring(0, position.column - 1);
            const dotMatch = textBeforeCursor.match(/(\w+)\.\w*$/);

            if (dotMatch) {
              const prefix = dotMatch[1];
              const resolvedModule = importedModules.get(prefix);

              if (resolvedModule) {
                // Normalize names (e.g. matplotlib.pyplot -> matplotlib)
                let lookupName = resolvedModule;
                if (resolvedModule.startsWith('matplotlib')) {
                  lookupName = 'matplotlib';
                } else if (resolvedModule === 'bs4') {
                  lookupName = 'beautifulsoup4';
                }

                // If pre-defined module suggestions exist
                if (MODULE_FUNCTIONS[lookupName]) {
                  MODULE_FUNCTIONS[lookupName].forEach(func => {
                    suggestions.push({
                      label: func.label,
                      kind: monaco.languages.CompletionItemKind.Method,
                      documentation: func.doc,
                      insertText: func.insert,
                      insertTextRules: func.insert.includes('$0')
                        ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                        : undefined,
                      range: range
                    });
                  });
                } else {
                  // Fallback: Check if it is a local workspace module
                  const localTab = workspaceTabs.find(
                    t => t.name === `${resolvedModule}.py` && t.id !== 'about'
                  );
                  if (localTab) {
                    const code = localTab.code || '';
                    const lines = code.split('\n');
                    lines.forEach(line => {
                      const defMatch = line.match(/^\s*def\s+(\w+)\s*\(([^)]*)\)/);
                      if (defMatch) {
                        const funcName = defMatch[1];
                        const args = defMatch[2];
                        suggestions.push({
                          label: funcName,
                          kind: monaco.languages.CompletionItemKind.Function,
                          documentation: `Local function defined in '${localTab.name}'\nArguments: (${args})`,
                          insertText: `${funcName}(${args ? '' : ''})`,
                          range: range
                        });
                      }
                    });
                  }
                }
              }
            } else {
              // 3. Typings without dot-prefix (Built-ins, imports suggestions, workspace files names)
              
              // Workspace module files
              workspaceTabs.forEach(tab => {
                if (tab && tab.name && tab.name.endsWith('.py') && tab.id !== 'about') {
                  const moduleName = tab.name.replace('.py', '');
                  suggestions.push({
                    label: moduleName,
                    kind: monaco.languages.CompletionItemKind.Module,
                    documentation: `Local workspace module '${tab.name}'`,
                    insertText: moduleName,
                    range: range
                  });
                }
              });

              // Scan defined functions in all workspace local scripts
              workspaceTabs.forEach(tab => {
                if (tab && tab.name && tab.name.endsWith('.py') && tab.id !== 'about') {
                  const moduleName = tab.name.replace('.py', '');
                  const code = tab.code || '';
                  const lines = code.split('\n');
                  lines.forEach(line => {
                    const defMatch = line.match(/^\s*def\s+(\w+)\s*\(([^)]*)\)/);
                    if (defMatch) {
                      const funcName = defMatch[1];
                      const args = defMatch[2];
                      suggestions.push({
                        label: funcName,
                        kind: monaco.languages.CompletionItemKind.Function,
                        documentation: `Local function defined in '${tab.name}'\nArguments: (${args})`,
                        insertText: `${funcName}(${args ? '' : ''})`,
                        range: range
                      });

                      suggestions.push({
                        label: `${moduleName}.${funcName}`,
                        kind: monaco.languages.CompletionItemKind.Method,
                        documentation: `Method in local module '${moduleName}'\nArguments: (${args})`,
                        insertText: `${moduleName}.${funcName}(${args ? '' : ''})`,
                        range: range
                      });
                    }
                  });
                }
              });

              // Python built-ins
              const pythonBuiltins = [
                { label: 'print', insert: 'print($0)', doc: 'Prints values to the console stream.' },
                { label: 'len', insert: 'len($0)', doc: 'Return the length (number of items) of an object.' },
                { label: 'range', insert: 'range($0)', doc: 'Returns an immutable range sequence.' },
                { label: 'input', insert: 'input($0)', doc: 'Read a string from standard input.' },
                { label: 'open', insert: 'open($0)', doc: 'Open file and return a stream.' },
                { label: 'int', insert: 'int($0)', doc: 'Convert a value to an integer.' },
                { label: 'str', insert: 'str($0)', doc: 'Create a new string object.' },
                { label: 'float', insert: 'float($0)', doc: 'Convert value to a float.' },
                { label: 'list', insert: 'list($0)', doc: 'Built-in list sequence.' },
                { label: 'dict', insert: 'dict($0)', doc: 'Associative dictionary.' },
                { label: 'set', insert: 'set($0)', doc: 'Unordered set of unique elements.' },
                { label: 'sum', insert: 'sum($0)', doc: 'Return the sum of an iterable.' },
                { label: 'min', insert: 'min($0)', doc: 'Return the minimum item.' },
                { label: 'max', insert: 'max($0)', doc: 'Return the maximum item.' },
                { label: 'abs', insert: 'abs($0)', doc: 'Return absolute value.' },
                { label: 'type', insert: 'type($0)', doc: 'Return type of an object.' },
                { label: 'enumerate', insert: 'enumerate($0)', doc: 'Return enumerate object.' },
                { label: 'zip', insert: 'zip($0)', doc: 'Return zip iterator.' },
                { label: 'sorted', insert: 'sorted($0)', doc: 'Return a sorted list.' },
                { label: 'append', insert: 'append($0)', doc: 'Append object to the end of the list.' }
              ];

              pythonBuiltins.forEach(builtin => {
                suggestions.push({
                  label: builtin.label,
                  kind: monaco.languages.CompletionItemKind.Function,
                  documentation: builtin.doc,
                  insertText: builtin.insert,
                  insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                  range: range
                });
              });

              // Standard package imports
              const commonModules = [
                { label: 'import numpy as np', insert: 'import numpy as np', doc: 'Fundamental package for scientific computing.' },
                { label: 'import pandas as pd', insert: 'import pandas as pd', doc: 'High-performance data analysis and manipulation.' },
                { label: 'import matplotlib.pyplot as plt', insert: 'import matplotlib.pyplot as plt', doc: 'Comprehensive plotting library.' },
                { label: 'import math', insert: 'import math', doc: 'Mathematical functions (sin, cos, sqrt, pi).' },
                { label: 'import random', insert: 'import random', doc: 'Pseudo-random number generator.' },
                { label: 'import json', insert: 'import json', doc: 'JSON parsing and generation.' },
                { label: 'import datetime', insert: 'import datetime', doc: 'Date and time formatting.' },
                { label: 'import time', insert: 'import time', doc: 'Time operations.' },
                { label: 'import sys', insert: 'import sys', doc: 'System parameter helpers.' },
                { label: 'import os', insert: 'import os', doc: 'Operating system helpers.' },
                { label: 'import csv', insert: 'import csv', doc: 'CSV parser.' }
              ];

              commonModules.forEach(mod => {
                suggestions.push({
                  label: mod.label,
                  kind: monaco.languages.CompletionItemKind.Keyword,
                  documentation: mod.doc,
                  insertText: mod.insert,
                  range: range
                });
              });
            }

            // Deduplicate suggestions by label
            const uniqueSuggestions = [];
            const seenLabels = new Set();
            suggestions.forEach(s => {
              if (s && s.label && !seenLabels.has(s.label)) {
                seenLabels.add(s.label);
                uniqueSuggestions.push(s);
              }
            });

            return { suggestions: uniqueSuggestions };
          } catch (err) {
            console.error("Error in Monaco completions provider:", err);
            return { suggestions: [] };
          }
        }
      });
    }
  };

  const handleEditorChange = (value) => {
    if (activeTab !== 'instructor_code') {
      updateTabCode(activeTab, value);
    }
  };

  const activeTabObj = tabs.find(t => t.id === activeTab);
  const activeTabName = activeTabObj?.name || 'about';
  const isPythonTab = (name) => {
    if (!name) return false;
    const ext = name.split('.').pop().toLowerCase();
    return ext === 'py'
      || activeTab === 'instructor_code'
      || (activeTab && typeof activeTab === 'string' && activeTab.startsWith('shared_'));
  };

  const getEditorLanguage = (name) => {
    if (!name) return 'plaintext';
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'json') return 'json';
    if (isPythonTab(name)) return 'python';
    return 'plaintext';
  };

  const getEditorTheme = (name) => {
    if (!name) return 'vs';
    const ext = name.split('.').pop().toLowerCase();
    if (isPythonTab(name) || ext === 'json') return 'vs-dark';
    return 'vs'; // Light theme for simple plaintext files
  };

  if (activeTab === 'about') {
    return <AboutPanel />;
  }

  return (
    <Editor
      height="100%"
      language={getEditorLanguage(activeTabName)}
      theme={getEditorTheme(activeTabName)}
      value={currentCode}
      onChange={handleEditorChange}
      onMount={handleEditorDidMount}
      options={{
        readOnly: isReadOnly,
        minimap: { enabled: false },
        fontSize: fontSize,
        fontFamily: 'Fira Code, monospace',
        wordWrap: 'on',
        padding: { top: 16 },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
      }}
    />
  );
};

export default CodeEditor;
