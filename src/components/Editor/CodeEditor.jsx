import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import useStore from '../../store/useStore';

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
  // - On the temporary shared tab, student is read-only.
  // - On welcome.py, student is read-only under broadcast lock ONLY IF sharing is not active.
  // - Student's custom shared tabs are always editable.
  const isReadOnly = !isInstructor && (
    activeTab === 'instructor_code' 
      ? true 
      : (activeTab === 'welcome.py' 
          ? (isSharing ? false : activeMode === 'broadcast')
          : false)
  );
  
  // Display code logic:
  // - Instructor sees the current active tab code.
  // - Student sees:
  //   - instructorCode if viewing 'instructor_code'.
  //   - instructorCode if viewing 'welcome.py' in broadcast lock AND NOT sharing.
  //   - studentLocalCode if viewing 'welcome.py' in independent/execute mode OR if sharing.
  //   - tab.code if viewing a custom shared tab.
  const currentCode = isInstructor 
    ? (tabs.find(t => t.id === activeTab)?.code || '')
    : (activeTab === 'instructor_code' 
        ? instructorCode 
        : (activeTab === 'welcome.py' 
            ? ((activeMode === 'broadcast' && !isSharing) ? instructorCode : studentLocalCode)
            : (tabs.find(t => t.id === activeTab)?.code || '')));

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
  };

  const handleEditorChange = (value) => {
    if (activeTab !== 'instructor_code') {
      updateTabCode(activeTab, value);
    }
  };

  return (
    <Editor
      height="100%"
      defaultLanguage="python"
      theme="vs-dark"
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
