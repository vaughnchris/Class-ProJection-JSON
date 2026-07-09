import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import useStore from '../../store/useStore';
import AboutPanel from './AboutPanel';

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


  
  // Read-only logic:
  // - Instructor is never read-only (unless viewing a student in 'view' mode).
  // - On the shared lecture workspace tab, student is read-only.
  // - Student's custom files/tabs are always editable.
  const isReadOnly = viewedStudentId 
    ? (viewedStudentMode === 'view')
    : (showSharedLecture || (!isInstructor && activeTab === 'instructor_code'));
  
  // Display code logic:
  // - Instructor sees the current active tab code.
  // - Student sees:
  //   - instructorCode if viewing 'instructor_code'.
  //   - tab.code if viewing any of their workspace files.
  const currentCode = (viewedStudentId || isInstructor || showSharedLecture)
    ? (tabs.find(t => t.id === activeTab)?.code || '')
    : (activeTab === 'instructor_code' 
        ? instructorCode 
        : (tabs.find(t => t.id === activeTab)?.code || ''));

  // Cleanup autocomplete provider on unmount to avoid duplicates
  useEffect(() => {
    return () => {
      if (editorRef.current && editorRef.current._completionProvider) {
        editorRef.current._completionProvider.dispose();
      }
    };
  }, []);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Register custom completions for Python in Monaco Editor
    const provider = monaco.languages.registerCompletionItemProvider('python', {
      provideCompletionItems: (model, position) => {
        try {
          const word = model.getWordUntilPosition(position);
          const range = new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn
          );

          const workspaceTabs = useStore.getState().tabs || [];
          const suggestions = [];

          // 1. Module name completions from local .py files
          workspaceTabs.forEach(tab => {
            if (tab && tab.name && typeof tab.name === 'string' && tab.name.endsWith('.py') && tab.id !== 'about') {
              const moduleName = tab.name.replace('.py', '');
              suggestions.push({
                label: moduleName,
                kind: monaco.languages.CompletionItemKind.Module,
                documentation: `Local module '${tab.name}'`,
                insertText: moduleName,
                range: range
              });
            }
          });

          // 2. Scan code inside local files to suggest defined functions!
          workspaceTabs.forEach(tab => {
            if (tab && tab.name && typeof tab.name === 'string' && tab.name.endsWith('.py') && tab.id !== 'about') {
              const moduleName = tab.name.replace('.py', '');
              const code = tab.code || '';
              const lines = code.split('\n');
              lines.forEach(line => {
                const defMatch = line.match(/^\s*def\s+(\w+)\s*\(([^)]*)\)/);
                if (defMatch) {
                  const funcName = defMatch[1];
                  const args = defMatch[2];
                  
                  // Directly suggest function
                  suggestions.push({
                    label: funcName,
                    kind: monaco.languages.CompletionItemKind.Function,
                    documentation: `Local function defined in '${tab.name}'\nArguments: (${args})`,
                    insertText: `${funcName}(${args ? '' : ''})`,
                    range: range
                  });

                  // Suggest module-prefixed function call (e.g. math.sqrt)
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

          // 3. Python built-in function completions (inserted as snippets)
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

          // 4. Standard Python module imports suggestions
          const commonModules = [
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

    editorRef.current._completionProvider = provider;
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
    if (isPythonTab(name)) return 'python';
    return 'plaintext';
  };

  const getEditorTheme = (name) => {
    if (isPythonTab(name)) return 'vs-dark';
    return 'vs'; // Light theme for data/text files
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
