import React, { useState, useEffect, useRef } from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import { 
  Play, 
  Sparkles, 
  Upload, 
  Menu, 
  Settings, 
  User 
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
  const [activeTab, setActiveTab] = useState('welcome.py');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  const workerRef = useRef(null);
  
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
    setUser
  } = useStore();

  useEffect(() => {
    if (!isSharing && activeTab === 'instructor_code') {
      setActiveTab('welcome.py');
    }
  }, [isSharing, activeTab]);

  // Initialize Real-time synchronization
  useSync();

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
    
    const isInstructor = role === 'instructor';
    const currentCode = (isInstructor || activeMode === 'broadcast') ? instructorCode : studentLocalCode;
    
    clearConsole();
    setExecuting(true);
    
    workerRef.current.postMessage({
      python: currentCode,
      id: Date.now(),
      isRepl: false
    });
  };

  const handleRunInteractive = (code) => {
    if (!workerRef.current) return;
    
    setInteractiveExecuting(true);
    workerRef.current.postMessage({
      python: code,
      id: Date.now(),
      isRepl: true
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
          <div className="logo">CodePro</div>
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
        <Allotment>
          {/* Left Sidebar */}
          <Allotment.Pane 
            minSize={isSidebarOpen ? 200 : 48} 
            maxSize={isSidebarOpen ? 600 : 48} 
            preferredSize={isSidebarOpen ? 250 : 48}
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
            <Allotment vertical>
              {/* Top: Editor */}
              <Allotment.Pane preferredSize={"70%"}>
                <div className="editor-container">
                  <div className="editor-tabs">
                    <div 
                      className={`tab ${activeTab === 'welcome.py' ? 'active' : ''}`}
                      onClick={() => setActiveTab('welcome.py')}
                      style={{ cursor: 'pointer' }}
                    >
                      <span className="file-icon python-icon"></span>
                      welcome.py
                    </div>
                    {isSharing && role !== 'instructor' && (
                      <div 
                        className={`tab ${activeTab === 'instructor_code' ? 'active' : ''}`}
                        onClick={() => setActiveTab('instructor_code')}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="file-icon python-icon"></span>
                        Instructor's Code (Shared)
                      </div>
                    )}
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
