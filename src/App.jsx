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
  FileText,
  Table,
  File
} from 'lucide-react';
import CodeEditor from './components/Editor/CodeEditor';
import ConsolePanel from './components/Console/ConsolePanel';
import Sidebar from './components/Sidebar/Sidebar';
import AuthModal from './components/Auth/AuthModal';
import ProfileModal from './components/Auth/ProfileModal';
import useStore from './store/useStore';
import { useSync } from './hooks/useSync';
import PyodideWorker from './utils/pyodide.worker.js?worker';
import { auth, db } from './firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import './App.css';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('ide_is_sidebar_open');
    return saved !== null ? saved === 'true' : true;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

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
    activeTab,
    setActiveTab,
    tabs,
    addTab,
    closeTab,
    openTab,
    renameTab,
    fontSize,
    increaseFontSize,
    decreaseFontSize
  } = useStore();

  useEffect(() => {
    if (!isSharing && activeTab === 'instructor_code') {
      setActiveTab('about');
    }
  }, [isSharing, activeTab, setActiveTab]);

  // Initialize Real-time synchronization
  useSync();

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
    const filename = prompt("Enter file name (e.g., data.csv, notes.txt, helper.py):");
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
    const newName = prompt("Rename Tab:", currentName);
    if (newName && newName.trim() !== '') {
      const sanitizedName = newName.trim().endsWith('.py') ? newName.trim() : newName.trim() + '.py';
      renameTab(tabId, sanitizedName);
    }
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
  }, [appendToConsole, setExecuting, appendToInteractive, setInteractiveExecuting]);

  // Always display the About tab at the beginning of each session
  useEffect(() => {
    openTab('about');
    setActiveTab('about');
  }, [openTab, setActiveTab]);

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
            setUser({ ...userDoc.data(), uid: firebaseUser.uid });
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
  };

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
    } catch (err) {
      console.error('Error signing out', err);
    }
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
          <div className="logo">Class ProJection - Python Editor</div>
        </div>
        
        <div className="navbar-center">
          <button 
            className="btn btn-primary run-btn" 
            onClick={handleRun}
            disabled={isExecuting}
            style={{ opacity: isExecuting ? 0.7 : 1, cursor: isExecuting ? 'not-allowed' : 'pointer' }}
          >
            <Play size={16} /> {isExecuting ? 'Running...' : 'Run'}
          </button>
          <button className="btn btn-secondary ai-btn">
            <Sparkles size={16} /> AI Check
          </button>
          <button className="btn btn-accent submit-btn">
            <Upload size={16} /> Submit
          </button>
        </div>
        
        <div className="navbar-right">
          <button className="icon-btn"><Settings size={18} /></button>
          
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
      <div className="main-workspace">
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
                          className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                          onClick={() => setActiveTab(tab.id)}
                          onDoubleClick={() => handleRenameTab(tab.id, tab.name)}
                          style={{ cursor: 'pointer', position: 'relative', paddingRight: tab.isCloseable ? '28px' : '16px', userSelect: 'none', display: 'flex', alignItems: 'center' }}
                          title="Double-click to rename tab"
                        >
                          {getFileIcon(tab.name)}
                          <span style={{ marginLeft: '6px' }}>{tab.name}</span>
                          {tab.isCloseable && (
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
                      {isSharing && role !== 'instructor' && (
                        <div 
                          className={`tab ${activeTab === 'instructor_code' ? 'active' : ''}`}
                          onClick={() => setActiveTab('instructor_code')}
                          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <FileCode size={14} className="file-icon-color" style={{ color: '#fbbf24' }} />
                          <span style={{ marginLeft: '6px' }}>Instructor's Code (Shared)</span>
                        </div>
                      )}
                      
                      <button 
                        onClick={handleCreateNewTab}
                        className="btn btn-outline"
                        style={{ padding: '0 8px', border: 'none', height: '100%', borderRadius: 0, minWidth: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
                        title="New Blank Tab"
                      >
                        +
                      </button>

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
                  <div className="editor-wrapper">
                    <CodeEditor activeTab={activeTab} />
                  </div>
                </div>
              </Allotment.Pane>
              
              {/* Bottom: Console */}
              <Allotment.Pane minSize={150}>
                <ConsolePanel onRunInteractive={handleRunInteractive} />
              </Allotment.Pane>
            </Allotment>
          </Allotment.Pane>
        </Allotment>
      </div>
      
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </div>
  );
}

export default App;
