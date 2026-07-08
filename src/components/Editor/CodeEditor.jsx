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
    studentLocalCode,
    tabs,
    setStudentLocalCode,
    updateTabCode,
    fontSize
  } = useStore();

  const isInstructor = role === 'instructor';

  // Auto-initialize student's local workspace with instructor's code when sharing starts
  useEffect(() => {
    if (!isInstructor && isSharing && !studentLocalCode && instructorCode) {
      setStudentLocalCode(instructorCode);
    }
  }, [isInstructor, isSharing, studentLocalCode, instructorCode, setStudentLocalCode]);
  
  // Read-only logic:
  // - Instructor is never read-only.
  // - On the shared lecture workspace tab, student is read-only.
  // - Student's custom files/tabs are always editable.
  const isReadOnly = !isInstructor && activeTab === 'instructor_code';
  
  // Display code logic:
  // - Instructor sees the current active tab code.
  // - Student sees:
  //   - instructorCode if viewing 'instructor_code'.
  //   - tab.code if viewing any of their workspace files.
  const currentCode = isInstructor 
    ? (tabs.find(t => t.id === activeTab)?.code || '')
    : (activeTab === 'instructor_code' 
        ? instructorCode 
        : (tabs.find(t => t.id === activeTab)?.code || ''));

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
  };

  const handleEditorChange = (value) => {
    if (activeTab !== 'instructor_code') {
      updateTabCode(activeTab, value);
    }
  };

  const activeTabObj = tabs.find(t => t.id === activeTab);
  const activeTabName = activeTabObj?.name || 'about';
  const getEditorLanguage = (name) => {
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'py') return 'python';
    return 'plaintext';
  };

  const getEditorTheme = (name) => {
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'py') return 'vs-dark';
    return 'vs'; // Monaco default light theme
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
