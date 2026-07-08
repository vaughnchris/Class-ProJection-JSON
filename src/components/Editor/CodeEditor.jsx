import React, { useRef } from 'react';
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
    studentSharedLocalCode,
    allowEdit,
    setStudentLocalCode,
    setStudentSharedLocalCode,
    setInstructorCode 
  } = useStore();

  const isInstructor = role === 'instructor';
  
  // Read-only logic:
  // - Instructor is never read-only.
  // - On the shared tab, student is read-only ONLY if allowEdit is false.
  // - On welcome.py, student is read-only under broadcast lock ONLY IF sharing is not active.
  const isReadOnly = !isInstructor && (
    activeTab === 'instructor_code' 
      ? !allowEdit 
      : (isSharing ? false : activeMode === 'broadcast')
  );
  
  // Display code logic:
  // - Instructor always sees instructorCode.
  // - Student sees:
  //   - studentSharedLocalCode if viewing 'instructor_code' AND allowEdit is active.
  //   - instructorCode if viewing 'instructor_code' AND allowEdit is inactive.
  //   - instructorCode if viewing 'welcome.py' in broadcast lock AND NOT sharing.
  //   - studentLocalCode if viewing 'welcome.py' in independent/execute mode OR if sharing.
  const currentCode = isInstructor 
    ? instructorCode 
    : (activeTab === 'instructor_code' 
        ? (allowEdit ? studentSharedLocalCode : instructorCode)
        : ((activeMode === 'broadcast' && !isSharing) ? instructorCode : studentLocalCode));

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
  };

  const handleEditorChange = (value) => {
    if (isInstructor) {
      setInstructorCode(value);
    } else {
      // Students can edit:
      // - Their own welcome.py tab (if not in broadcast lock OR if sharing is active)
      // - The shared instructor_code tab (if allowEdit is active)
      if (activeTab === 'welcome.py' && (isSharing || activeMode !== 'broadcast')) {
        setStudentLocalCode(value);
      } else if (activeTab === 'instructor_code' && allowEdit) {
        setStudentSharedLocalCode(value);
      }
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
