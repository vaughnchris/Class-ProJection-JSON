import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';
import useStore from '../../store/useStore';

const CodeEditor = () => {
  const editorRef = useRef(null);
  const { 
    instructorCode, 
    activeMode, 
    role, 
    studentLocalCode,
    setStudentLocalCode,
    setInstructorCode 
  } = useStore();

  const isInstructor = role === 'instructor';
  const isReadOnly = !isInstructor && activeMode === 'broadcast';
  const currentCode = (isInstructor || activeMode === 'broadcast') ? instructorCode : studentLocalCode;

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
  };

  const handleEditorChange = (value) => {
    if (isInstructor) {
      setInstructorCode(value);
    } else {
      setStudentLocalCode(value);
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
        fontSize: 14,
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
