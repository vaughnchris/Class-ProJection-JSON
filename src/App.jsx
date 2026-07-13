import React, { useState, useEffect, useRef } from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import { 
  Play, 
  Sparkles, 
  Upload, 
  Menu, 
  Settings, 
  User,
  ChevronUp,
  ChevronDown,
  Download,
  FileCode,
  Table,
  File,
  Lock
} from 'lucide-react';
import Sidebar from './components/Sidebar/Sidebar';
import CodeEditor from './components/Editor/CodeEditor';
import ConsolePanel from './components/Console/ConsolePanel';
import TestingPanel from './components/Sidebar/TestingPanel';
import PresentationViewer from './components/Editor/PresentationViewer';
import AuthModal from './components/Auth/AuthModal';
import ProfileModal from './components/Auth/ProfileModal';
import SessionModal from './components/SessionModal';
import LeaveRoomModal from './components/LeaveRoomModal';
import PromptModal from './components/PromptModal';
import useStore from './store/useStore';
import { useSync } from './hooks/useSync';
import { useWorkspaceSync } from './hooks/useWorkspaceSync';
import PyodideWorker from './utils/pyodide.worker.js?worker';
import { auth, db } from './firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import './App.css';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('ide_is_sidebar_open');
    return saved !== null ? saved === 'true' : true;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [swReady, setSwReady] = useState(false);
  const [dragOverTabId, setDragOverTabId] = useState(null);
  const [isDragOverEditor, setIsDragOverEditor] = useState(false);
  const [promptState, setPromptState] = useState({
    isOpen: false,
    title: '',
    subtitle: '',
    defaultValue: '',
    placeholder: '',
    onConfirm: () => {}
  });

  // Initialize sync hooks
  useWorkspaceSync();

  useEffect(() => {
    localStorage.setItem('ide_is_sidebar_open', isSidebarOpen);
  }, [isSidebarOpen]);
  
  const workerRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const { 
    user,
    role,
    activeMode,
    isSharing,
    instructorCode,
    studentLocalCode,
    isExecuting,
    setExecuting,
    setInteractiveExecuting,
    appendToConsole,
    appendToInteractive,
    clearConsole,
    setUser,
    activeTab: storeActiveTab,
    setActiveTab,
    tabs: storeTabs,
    addTab,
    closeTab,
    openTab,
    renameTab,
    updateTabCode,
    fontSize,
    increaseFontSize,
    decreaseFontSize,
    sessionId,
    leaveSession,
    updateSession,
    lastExecuteSignal,
    lockStudentActivity,
    sessionTitle
  } = useStore();

  const viewedStudentId = useStore(state => state.viewedStudentId);
  const viewedStudentTabs = useStore(state => state.viewedStudentTabs);
  const viewedStudentActiveTab = useStore(state => state.viewedStudentActiveTab);
  const viewedStudentMode = useStore(state => state.viewedStudentMode);

  const instructorTabs = useStore(state => state.instructorTabs);
  const instructorActiveTab = useStore(state => state.instructorActiveTab);

  const isInstructor = role === 'instructor';
  const showSharedLecture = !isInstructor && isSharing && activeMode === 'broadcast';

  const tabs = viewedStudentId 
    ? viewedStudentTabs 
    : (showSharedLecture && instructorTabs && instructorTabs.length > 0 ? instructorTabs : storeTabs);

  const activeTab = viewedStudentId 
    ? viewedStudentActiveTab 
    : (showSharedLecture && instructorTabs && instructorTabs.length > 0 ? instructorActiveTab : storeActiveTab);

  const isPresentationActive = activeTab && (tabs.find(t => t.id === activeTab)?.isPresentation || (activeTab.startsWith('presentation_') && tabs.some(t => t.id === activeTab)));
  const hideConsole = isPresentationActive;

  // Initialize Real-time synchronization
  useSync();

  // Prompt for session if logged in but no session
  useEffect(() => {
    if (user && !sessionId) {
      setIsSessionModalOpen(true);
    }
  }, [user, sessionId]);

  const getActiveTabCode = () => {
    const isInstructor = role === 'instructor';
    if (isInstructor) {
      if (activeTab === 'about') {
        return instructorCode;
      } else {
        const tab = tabs.find((t) => t.id === activeTab);
        return tab ? tab.code : '';
      }
    } else {
      if (activeTab === 'instructor_code') {
        return instructorCode;
      } else if (activeTab === 'about') {
        return (activeMode === 'broadcast' && !isSharing) ? instructorCode : studentLocalCode;
      } else {
        const tab = tabs.find((t) => t.id === activeTab);
        return tab ? tab.code : '';
      }
    }
  };

  const handleExport = () => {
    const code = getActiveTabCode();
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    let filename = 'code.py';
    if (activeTab === 'about') {
      filename = 'about.txt';
    } else if (activeTab === 'instructor_code') {
      filename = 'instructor_code.py';
    } else {
      const tab = tabs.find((t) => t.id === activeTab);
      if (tab) {
        filename = tab.name;
      }
    }
    
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportModuleToTab = (tabId, moduleData) => {
    if (tabId === 'about') {
      alert("Imports can only be added to Python (.py) files.");
      return;
    }
    const targetTab = tabs.find(t => t.id === tabId);
    if (!targetTab) return;
    
    const name = targetTab.name || '';
    const ext = name.split('.').pop().toLowerCase();
    const isPython = ext === 'py' || tabId === 'instructor_code' || (tabId && typeof tabId === 'string' && tabId.startsWith('shared_'));
    
    if (!isPython) {
      alert(`Cannot add import to non-Python file: "${name}"`);
      return;
    }

    const isReadOnlyTab = viewedStudentId 
      ? (viewedStudentMode === 'view')
      : (showSharedLecture || (!isInstructor && tabId === 'instructor_code'));
      
    if (isReadOnlyTab) {
      alert("This tab is read-only. You cannot insert imports here.");
      return;
    }

    const currentCode = targetTab.code || '';
    
    // Check if already imported
    const normalizedCode = currentCode.replace(/\s/g, '');
    const normalizedImport = moduleData.importStmt.replace(/\s/g, '');
    if (normalizedCode.includes(normalizedImport)) {
      alert(`"${moduleData.name}" is already imported in this file.`);
      return;
    }

    // Format import block
    let importBlock = `${moduleData.importStmt}\n`;
    if (moduleData.commonFunctions && moduleData.commonFunctions.length > 0) {
      importBlock += `# Common functions:\n`;
      moduleData.commonFunctions.forEach(f => {
        importBlock += `# - ${f}\n`;
      });
    }
    importBlock += `\n`;

    const newCode = importBlock + currentCode;
    updateTabCode(tabId, newCode);
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      case 'py':
        return <FileCode size={14} className="file-icon-color" style={{ color: '#fbbf24' }} />;
      case 'txt':
        return <FileText size={14} className="txt-icon-color" style={{ color: '#94a3b8' }} />;
      case 'csv':
        return <Table size={14} className="csv-icon-color" style={{ color: '#10b981' }} />;
      case 'tsv':
        return <Table size={14} className="tsv-icon-color" style={{ color: '#14b8a6' }} />;
      default:
        return <File size={14} className="default-file-icon-color" style={{ color: '#64748b' }} />;
    }
  };

  const handleCreateNewTab = () => {
    setPromptState({
      isOpen: true,
      title: 'New File',
      subtitle: 'Create a new python script or text document',
      placeholder: 'e.g., script.py, data.csv, notes.txt',
      defaultValue: '',
      onConfirm: (filename) => {
        if (!filename || filename.trim() === '') return;
        const name = filename.trim();
        const hasExtension = name.includes('.');
        const finalName = hasExtension ? name : name + '.py';
        const newTabId = 'custom_' + Date.now();
        addTab({
          id: newTabId,
          name: finalName,
          code: '',
          isCloseable: true
        });
      }
    });
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleOpenFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const code = event.target.result;
      const newTabId = 'custom_' + Date.now();
      addTab({
        id: newTabId,
        name: file.name,
        code: code,
        isCloseable: true
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRenameTab = (tabId, currentName) => {
    if (tabId === 'about') return;
    setPromptState({
      isOpen: true,
      title: 'Rename File',
      subtitle: `Rename "${currentName}"`,
      placeholder: 'Enter new file name',
      defaultValue: currentName,
      onConfirm: (newName) => {
        if (newName && newName.trim() !== '') {
          const trimmed = newName.trim();
          const hasExtension = trimmed.includes('.');
          const finalName = hasExtension ? trimmed : trimmed + '.py';
          renameTab(tabId, finalName);
        }
      }
    });
  };

  const handleCloseTab = (tab) => {
    closeTab(tab.id);
  };

  const handleHorizontalResize = (sizes) => {
    if (isSidebarOpen && sizes[0] > 48) {
      localStorage.setItem('ide_sidebar_width', sizes[0]);
    }
  };

  const handleVerticalResize = (sizes) => {
    const total = sizes[0] + sizes[1];
    if (total > 0) {
      const percentage = (sizes[0] / total) * 100;
      localStorage.setItem('ide_editor_height_percent', percentage);
    }
  };

  useEffect(() => {
    if (!swReady) return;

    // Initialize Web Worker
    workerRef.current = new PyodideWorker();
    
    workerRef.current.onmessage = (event) => {
      const { type, text, id } = event.data;
      if (type === 'output' || type === 'error') {
        appendToConsole(text, type);
      } else if (type === 'repl_output') {
        appendToInteractive(text, 'output');
      } else if (type === 'repl_error') {
        appendToInteractive(text, 'error');
      } else if (type === 'done') {
        if (event.data.isRepl) {
          setInteractiveExecuting(false);
        } else {
          setExecuting(false);
        }
      }
    };
    
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [swReady, appendToConsole, setExecuting, appendToInteractive, setInteractiveExecuting]);

  // Always display the About tab at the beginning of each session
  useEffect(() => {
    openTab('about');
    setActiveTab('about');
  }, [openTab, setActiveTab]);

  // Register Service Worker and listen for synchronous stdin INPUT_REQUEST messages
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const checkController = () => {
        if (navigator.serviceWorker.controller) {
          setSwReady(true);
        }
      };

      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          if (navigator.serviceWorker.controller) {
            setSwReady(true);
          } else {
            // Wait for controller to claim focus
            navigator.serviceWorker.ready.then(() => {
              if (navigator.serviceWorker.controller) {
                setSwReady(true);
              } else if (reg.active) {
                // If it is active but not controlling, notify page that controller changed
                reg.active.postMessage({ type: 'CLAIM_CLIENTS' });
              }
            });
          }
        })
        .catch((err) => {
          console.error('Service Worker registration failed:', err);
          setSwReady(true); // fallback so we don't break app boot
        });

      navigator.serviceWorker.addEventListener('controllerchange', checkController);

      const handleSWMessage = (event) => {
        if (event.data && event.data.type === 'INPUT_REQUEST') {
          const { requestId, prompt: promptText } = event.data;
          
          // Show the native browser input dialog to the user
          const userInput = prompt(decodeURIComponent(promptText) || 'Python input:') || '';
          
          // Send the response back to the service worker controller
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'INPUT_RESPONSE',
              requestId,
              text: userInput
            });
          }
        }
      };

      navigator.serviceWorker.addEventListener('message', handleSWMessage);
      
      // Perform initial check
      checkController();

      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', checkController);
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      };
    } else {
      setSwReady(true);
    }
  }, []);

  // Presence Tracking & Session Restoration
  useEffect(() => {
    let currentUserUid = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        currentUserUid = firebaseUser.uid;
        
        // Auto-restore user session from Firestore if logged in
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUser({ ...data, uid: firebaseUser.uid });
            
            // Hydrate cloud workspace if it exists
            if (data.workspace && data.workspace.tabs) {
              useStore.getState().syncFromFirebase({
                tabs: data.workspace.tabs,
                activeTab: data.workspace.activeTab || data.workspace.tabs[0].id
              });
            }
          }
        } catch (err) {
          console.warn("Could not restore user session data:", err);
        }

        try {
          const email = firebaseUser.email || '';
          const role = email.endsWith('@yosemite.edu') && !email.endsWith('@my.yosemite.edu') ? 'instructor' : 'student';
          
          // Use updateDoc (NOT setDoc) so we only update the isOnline flag on an
          // EXISTING document. setDoc with merge would create a minimal document
          // that races with initializeOrGetUser, wiping out firstName/lastName/avatarUrl.
          await updateDoc(doc(db, 'users', currentUserUid), { 
            isOnline: true,
            email,
            role
          });
        } catch (e) {
          // Ignore — doc may not exist yet for brand-new users.
          // initializeOrGetUser() in the login flow will create the full document.
          console.warn("Note: could not set online status (new user or doc missing)", e);
        }
      } else {
        setUser(null);
        if (currentUserUid) {
          try {
            await updateDoc(doc(db, 'users', currentUserUid), { isOnline: false });
          } catch (e) {
            console.warn("Failed to set offline status", e);
          }
          currentUserUid = null;
        }
      }
    });

    const handleBeforeUnload = () => {
      if (currentUserUid) {
        // We use keepalive or just fire and forget, browser might cancel it but it's best effort
        updateDoc(doc(db, 'users', currentUserUid), { isOnline: false }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [setUser]);

  const handleRun = () => {
    if (isExecuting) return;
    
    const currentCode = getActiveTabCode();
    
    clearConsole();
    setExecuting(true);
    
    const filesToMount = tabs.map((t) => ({
      name: t.name,
      code: t.code
    }));

    workerRef.current.postMessage({
      python: currentCode,
      id: Date.now(),
      isRepl: false,
      files: filesToMount
    });

    if (role === 'instructor' && sessionId && isSharing) {
      updateSession({ lastExecuteSignal: Date.now() });
    }
  };

  const prevExecuteSignal = useRef(lastExecuteSignal);
  useEffect(() => {
    if (role !== 'instructor' && lastExecuteSignal && lastExecuteSignal !== prevExecuteSignal.current) {
      prevExecuteSignal.current = lastExecuteSignal;
      handleRun();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastExecuteSignal, role]);

  const handleRunInteractive = (code) => {
    if (!workerRef.current) return;
    
    setInteractiveExecuting(true);
    
    const filesToMount = tabs.map((t) => ({
      name: t.name,
      code: t.code
    }));

    workerRef.current.postMessage({
      python: code,
      id: Date.now(),
      isRepl: true,
      files: filesToMount
    });
  };

  const handleSignOut = async () => {
    try {
      if (auth.currentUser) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), { isOnline: false });
      }
      await signOut(auth);
      setUser(null);
      // Reset local workspace so the next user doesn't see the previous user's files
      useStore.getState().resetWorkspace();
    } catch (err) {
      console.error('Error signing out', err);
    }
  };

  const handleCloseRoom = async (saveBackup) => {
    if (saveBackup && storeTabs) {
      const data = JSON.stringify(storeTabs, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateString = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.href = url;
      link.download = `room-${sessionId}-backup-${dateString}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    
    try {
      if (sessionId) {
        await deleteDoc(doc(db, 'sessions', sessionId));
      }
    } catch(err) {
      console.error('Error deleting session:', err);
    }
    
    leaveSession();
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="navbar">
        <div className="navbar-left">
          <button 
            className="icon-btn" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle Sidebar"
          >
            <Menu size={18} />
          </button>
          <div className="logo">
            Class ProJection - {sessionTitle || 'Python Editor'}
            {viewedStudentId && (
              <span style={{ 
                marginLeft: '12px', 
                fontSize: '0.8rem', 
                fontWeight: 600, 
                padding: '3px 10px', 
                borderRadius: '4px',
                backgroundColor: viewedStudentMode === 'view' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                color: viewedStudentMode === 'view' ? 'var(--accent-blue)' : 'var(--accent-purple)',
                border: viewedStudentMode === 'view' ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(139, 92, 246, 0.2)'
              }}>
                {viewedStudentMode === 'view' ? '👁 Viewing Student' : '✍ Editing Student'}
              </span>
            )}
          </div>
        </div>
        
        <div className="navbar-center">
          <button 
            className="btn btn-primary run-btn" 
            onClick={handleRun}
            disabled={isExecuting || !swReady || showSharedLecture || (!isInstructor && lockStudentActivity)}
            style={{ opacity: (isExecuting || !swReady || showSharedLecture || (!isInstructor && lockStudentActivity)) ? 0.7 : 1, cursor: (isExecuting || !swReady || showSharedLecture || (!isInstructor && lockStudentActivity)) ? 'not-allowed' : 'pointer' }}
            title={showSharedLecture ? "Instructor controls execution during broadcast" : (!isInstructor && lockStudentActivity ? "Instructor has locked student activity" : "")}
          >
            <Play size={16} /> {isExecuting ? 'Running...' : (!swReady ? 'Initializing...' : 'Run')}
          </button>
          
          {sessionId && (
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-tertiary)', padding: '4px 12px', borderRadius: '20px', margin: '0 16px', border: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginRight: '6px' }}>Room:</span>
              <span style={{ fontWeight: 600, letterSpacing: '1px', color: 'var(--accent-primary)', fontSize: '0.9rem' }}>{sessionId}</span>
            </div>
          )}
          
          <button className="btn btn-secondary ai-btn">
            <Sparkles size={16} /> AI Check
          </button>
          <button className="btn btn-accent submit-btn">
            <Upload size={16} /> Submit
          </button>
        </div>
        
        <div className="navbar-right">
          {user ? (
            <div className="user-menu" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="user-name" style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                {user.firstName} {user.lastName}
              </span>
              <img 
                src={user.avatarUrl} 
                alt="Avatar" 
                onClick={() => setIsProfileModalOpen(true)}
                style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#334155', cursor: 'pointer' }} 
              />
              {sessionId ? (
                <button className="btn btn-outline" onClick={() => setIsLeaveModalOpen(true)} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                  Leave Room
                </button>
              ) : (
                <button className="btn btn-primary" onClick={() => setIsSessionModalOpen(true)} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                  {role === 'instructor' ? 'Start Session' : 'Join Session'}
                </button>
              )}
              <button className="btn btn-outline signin-btn" onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          ) : (
            <button className="btn btn-outline signin-btn" onClick={() => setIsAuthModalOpen(true)}>
              <User size={16} /> Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Content with Split Panes */}
      <div className="main-workspace" style={{ position: 'relative' }}>
        {!isInstructor && lockStudentActivity && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            color: 'var(--text-primary)'
          }}>
            <Lock size={64} color="var(--accent-primary)" style={{ marginBottom: '24px' }} />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '12px' }}>Activity Locked</h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>The instructor has temporarily paused student activity for a lecture.</p>
          </div>
        )}
        <Allotment onChange={handleHorizontalResize}>
          {/* Left Sidebar */}
          <Allotment.Pane 
            minSize={isSidebarOpen ? 200 : 48} 
            maxSize={isSidebarOpen ? 600 : 48} 
            preferredSize={isSidebarOpen ? (Number(localStorage.getItem('ide_sidebar_width')) || 250) : 48}
          >
            <div className={`sidebar-wrapper ${isSidebarOpen ? 'open' : 'closed'}`} style={{ height: '100%', overflow: 'hidden' }}>
              <Sidebar 
                isOpen={isSidebarOpen} 
                setIsOpen={setIsSidebarOpen} 
              />
            </div>
          </Allotment.Pane>
          
          {/* Right Area (Editor + Console) */}
          <Allotment.Pane>
            <Allotment vertical onChange={handleVerticalResize}>
              {/* Top: Editor */}
              <Allotment.Pane preferredSize={localStorage.getItem('ide_editor_height_percent') ? `${localStorage.getItem('ide_editor_height_percent')}%` : "70%"}>
                <div className="editor-container">
                  <div className="editor-tabs" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', height: '100%', overflowX: 'auto', overflowY: 'hidden', alignItems: 'center' }}>
                      {tabs.filter(t => t.isOpen).map((tab) => (
                        <div 
                          key={tab.id}
                          className={`tab ${activeTab === tab.id ? 'active' : ''} ${(viewedStudentId || showSharedLecture) ? 'shared-tab' : ''} ${dragOverTabId === tab.id ? 'tab-drag-over' : ''}`}
                          onClick={() => !showSharedLecture && setActiveTab(tab.id)}
                          onDoubleClick={() => !showSharedLecture && handleRenameTab(tab.id, tab.name)}
                          style={{ cursor: 'pointer', position: 'relative', paddingRight: (tab.isCloseable && !showSharedLecture) ? '28px' : '16px', userSelect: 'none', display: 'flex', alignItems: 'center' }}
                          title={showSharedLecture ? "Shared Lecture File" : "Double-click to rename tab"}
                          onDragOver={(e) => {
                            if (e.dataTransfer.types.includes('application/json')) {
                              e.preventDefault();
                            }
                          }}
                          onDragEnter={(e) => {
                            if (e.dataTransfer.types.includes('application/json')) {
                              setDragOverTabId(tab.id);
                            }
                          }}
                          onDragLeave={() => {
                            setDragOverTabId(null);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragOverTabId(null);
                            const dataStr = e.dataTransfer.getData('application/json');
                            if (dataStr) {
                              try {
                                const moduleData = JSON.parse(dataStr);
                                handleImportModuleToTab(tab.id, moduleData);
                              } catch (err) {
                                console.error("Error parsing dropped module:", err);
                              }
                            }
                          }}
                        >
                          {getFileIcon(tab.name)}
                          <span style={{ marginLeft: '6px' }}>{tab.name}</span>
                          {tab.isCloseable && !showSharedLecture && (
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCloseTab(tab);
                              }}
                              style={{ 
                                position: 'absolute', 
                                right: '6px', 
                                top: '50%', 
                                transform: 'translateY(-50%)', 
                                color: 'var(--text-secondary)',
                                fontSize: '0.75rem',
                                padding: '2px',
                                borderRadius: '3px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '16px',
                                height: '16px'
                              }}
                              title="Close tab"
                              className="tab-close-btn"
                            >
                              ✕
                            </span>
                          )}
                        </div>
                      ))}
                      {!showSharedLecture && (
                        <button 
                          onClick={handleCreateNewTab}
                          className="btn btn-outline"
                          style={{ padding: '0 8px', border: 'none', height: '100%', borderRadius: 0, minWidth: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
                          title="New Blank Tab"
                        >
                          +
                        </button>
                      )}

                      {!showSharedLecture && (
                        <>
                          <button 
                            onClick={triggerFileInput}
                            className="btn btn-outline"
                            style={{ padding: '0 8px', border: 'none', height: '100%', borderRadius: 0, minWidth: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
                            title="Open Local File"
                          >
                            <Upload size={14} />
                          </button>
                          <input 
                            type="file"
                            ref={fileInputRef}
                            onChange={handleOpenFile}
                            accept=".py,.txt,.csv,.tsv"
                            style={{ display: 'none' }}
                          />
                        </>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '12px' }}>
                      <button 
                        onClick={decreaseFontSize}
                        className="btn btn-outline"
                        style={{ padding: '2px 6px', display: 'flex', alignItems: 'center', justifyContents: 'center', height: '26px', minWidth: '26px', border: '1px solid var(--border-light)' }}
                        title="Decrease Editor Font Size"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', userSelect: 'none', minWidth: '28px', textAlign: 'center' }}>
                        {fontSize}px
                      </span>
                      <button 
                        onClick={increaseFontSize}
                        className="btn btn-outline"
                        style={{ padding: '2px 6px', display: 'flex', alignItems: 'center', justifyContents: 'center', height: '26px', minWidth: '26px', border: '1px solid var(--border-light)' }}
                        title="Increase Editor Font Size"
                      >
                        <ChevronUp size={14} />
                      </button>
                      
                      <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-light)', margin: '0 4px' }}></div>
                      
                      <button 
                        onClick={handleExport}
                        className="btn btn-outline"
                        style={{ padding: '2px 10px', display: 'flex', alignItems: 'center', gap: '6px', height: '26px', minWidth: 'auto', border: '1px solid var(--border-light)' }}
                        title="Export Tab Code to .py File"
                      >
                        <Download size={13} />
                        <span style={{ fontSize: '0.75rem' }}>Export</span>
                      </button>
                    </div>
                  </div>
                  <div 
                    className={`editor-wrapper ${isDragOverEditor ? 'editor-drag-over' : ''}`}
                    onDragOver={(e) => {
                      if (e.dataTransfer.types.includes('application/json')) {
                        e.preventDefault();
                      }
                    }}
                    onDragEnter={(e) => {
                      if (e.dataTransfer.types.includes('application/json')) {
                        setIsDragOverEditor(true);
                      }
                    }}
                    onDragLeave={() => {
                      setIsDragOverEditor(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOverEditor(false);
                      const dataStr = e.dataTransfer.getData('application/json');
                      if (dataStr) {
                        try {
                          const moduleData = JSON.parse(dataStr);
                          handleImportModuleToTab(activeTab, moduleData);
                        } catch (err) {
                          console.error("Error parsing dropped module:", err);
                        }
                      }
                    }}
                  >
                    {!activeTab ? (
                      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                        No open tabs
                      </div>
                    ) : tabs.find(t => t.id === activeTab)?.isPresentation || (activeTab.startsWith('presentation_') && tabs.some(t => t.id === activeTab)) ? (
                      <PresentationViewer activeTab={activeTab} />
                    ) : (
                      <CodeEditor activeTab={activeTab} />
                    )}
                  </div>
                </div>
              </Allotment.Pane>
              
              {/* Bottom: Console */}
              <Allotment.Pane minSize={hideConsole ? 0 : 150} visible={!hideConsole}>
                <ConsolePanel onRunInteractive={handleRunInteractive} />
              </Allotment.Pane>
            </Allotment>
          </Allotment.Pane>
        </Allotment>
      </div>
      
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      <SessionModal isOpen={isSessionModalOpen} onClose={() => setIsSessionModalOpen(false)} />
      <LeaveRoomModal 
        isOpen={isLeaveModalOpen} 
        onClose={() => setIsLeaveModalOpen(false)} 
        onLeave={leaveSession}
        onCloseRoom={handleCloseRoom}
        role={role}
      />
      <PromptModal
        isOpen={promptState.isOpen}
        onClose={() => setPromptState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={promptState.onConfirm}
        title={promptState.title}
        subtitle={promptState.subtitle}
        defaultValue={promptState.defaultValue}
        placeholder={promptState.placeholder}
      />
    </div>
  );
}

export default App;
