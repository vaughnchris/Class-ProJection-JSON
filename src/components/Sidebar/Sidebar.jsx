import React, { useState, useEffect } from 'react';
import { Search, FileCode, Users, FileText, X, Pin, Library, MessageCircle, Monitor, Upload, Play, CheckSquare, GraduationCap, Keyboard, Plus, Trash2, Lock, Folder, FolderOpen, Copy, Table, File, Download, Upload as UploadIcon } from 'lucide-react';
import useStore from '../../store/useStore';
import PromptModal from '../PromptModal';
import ChatPanel from './ChatPanel';
import RosterPanel from './RosterPanel';
import ModulesPanel from './ModulesPanel';
import SearchPanel from './SearchPanel';
import PresentationPanel from './PresentationPanel';
import TestingPanel from './TestingPanel';
import HelpPanel from './HelpPanel';
import './Sidebar.css';
import { Allotment } from 'allotment';
import { db } from '../../firebase';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { exportLecturePackage, importLecturePackage } from '../../utils/lecturePackageUtils';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const [activePanels, setActivePanels] = useState(() => {
    const saved = localStorage.getItem('ide_active_panels');
    return saved ? JSON.parse(saved) : ['explorer'];
  });
  const [maximizedPanel, setMaximizedPanel] = useState(null);
  const [isHoveringTrash, setIsHoveringTrash] = useState(false);
  const [myNeedsHelp, setMyNeedsHelp] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [packageProgress, setPackageProgress] = useState('');
  const [promptState, setPromptState] = useState({
    isOpen: false,
    title: '',
    subtitle: '',
    defaultValue: '',
    placeholder: '',
    onConfirm: () => {}
  });
  
  const { 
    user, 
    activeMode, 
    isSharing, 
    allowEdit, 
    isSessionSyncing, 
    updateSession,
    studentFeatures,
    tabs: storeTabs,
    activeTab: storeActiveTab,
    addTab,
    closeTab,
    openTab,
    deleteTab,
    clearAllCustomTabs,
    renameTab,
    setActiveTab,
    activityInstructions,
    setActivityInstructions,
    sessionId,
    setTabs
  } = useStore();

  const viewedStudentId = useStore(state => state.viewedStudentId);
  const viewedStudentTabs = useStore(state => state.viewedStudentTabs);
  const viewedStudentActiveTab = useStore(state => state.viewedStudentActiveTab);
  const lockStudentActivity = useStore(state => state.lockStudentActivity);

  const role = useStore(state => state.role);
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

  useEffect(() => {
    if (!user || user.role !== 'student') return;

    // Track own needsHelp
    const unsubscribeHelp = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        setMyNeedsHelp(!!snap.data().needsHelp);
      }
    });

    return () => unsubscribeHelp();
  }, [user]);

  
  useEffect(() => {
    localStorage.setItem('ide_active_panels', JSON.stringify(activePanels));
  }, [activePanels]);
  
  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      case 'py':
        return <FileCode size={14} className="file-icon-color" />;
      case 'txt':
        return <FileText size={14} className="txt-icon-color" />;
      case 'csv':
        return <Table size={14} className="csv-icon-color" />;
      case 'tsv':
        return <Table size={14} className="tsv-icon-color" />;
      default:
        return <File size={14} className="default-file-icon-color" />;
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

  const handleDragDelete = (id) => {
    const tab = tabs.find(t => t.id === id);
    if (!tab || tab.id === 'about') return;
    
    const confirmDelete = window.confirm(`Are you sure you want to permanently delete "${tab.name}"?`);
    if (confirmDelete) {
      const confirmSave = window.confirm(`Do you want to export/save "${tab.name}" before deleting?`);
      if (confirmSave) {
        const blob = new Blob([tab.code], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = tab.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      deleteTab(tab.id);
    }
  };

  const handleDragStart = (e, tab) => {
    e.dataTransfer.setData('text/plain', tab.id);
    e.dataTransfer.effectAllowed = 'move';
    
    // Create custom ghost element
    const dragIcon = document.createElement('div');
    dragIcon.id = 'drag-ghost-image';
    dragIcon.innerHTML = `📄 ${tab.name}`;
    dragIcon.style.position = 'absolute';
    dragIcon.style.top = '-1000px';
    dragIcon.style.padding = '6px 12px';
    dragIcon.style.background = '#1e293b';
    dragIcon.style.color = '#f8fafc';
    dragIcon.style.border = '1px solid #3b82f6';
    dragIcon.style.borderRadius = '4px';
    dragIcon.style.fontSize = '0.8rem';
    dragIcon.style.fontFamily = 'monospace';
    dragIcon.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
    document.body.appendChild(dragIcon);
    
    e.dataTransfer.setDragImage(dragIcon, 10, 10);
    
    setTimeout(() => {
      const el = document.getElementById('drag-ghost-image');
      if (el) {
        document.body.removeChild(el);
      }
    }, 0);
  };

  const hasInstructorAccess = user?.role === 'instructor' || user?.role === 'administrator';

  const handleIconClick = (panel) => {
    if (!isOpen) {
      setIsOpen(true);
      setMaximizedPanel(panel);
    } else {
      if (maximizedPanel === panel) {
        // Close flyout
        setMaximizedPanel(null);
        if (activePanels.length === 0) setIsOpen(false);
      } else {
        // Switch to this panel as flyout
        setMaximizedPanel(panel);
      }
    }
  };

  const isPanelActive = (panel) => {
    if (!isOpen) return false;
    if (maximizedPanel) return maximizedPanel === panel;
    return activePanels.includes(panel);
  };

  const handleClosePanel = (panel) => {
    if (maximizedPanel === panel) {
      setMaximizedPanel(null);
      if (activePanels.length === 0) setIsOpen(false);
    } else {
      const newPanels = activePanels.filter(p => p !== panel);
      setActivePanels(newPanels);
      if (newPanels.length === 0 && !maximizedPanel) {
        setIsOpen(false);
      }
    }
  };

  const handlePinPanel = (panel) => {
    if (!activePanels.includes(panel)) {
      setActivePanels([...activePanels, panel]);
    }
    setMaximizedPanel(null);
  };

  const handleDeleteAllFiles = () => {
    if (viewedStudentId || showSharedLecture) return;

    const deletableTabs = tabs.filter(t => t.id !== 'about');
    if (deletableTabs.length === 0) {
      alert("No files to delete.");
      return;
    }

    if (window.confirm("Are you sure you want to delete all files in your explorer? This cannot be undone.")) {
      clearAllCustomTabs();
    }
  };

  const handlePanelResize = (sizes) => {
    if (activePanels.length > 0) {
      localStorage.setItem(`sidebar_panel_sizes_${activePanels.join(',')}`, JSON.stringify(sizes));
    }
  };

  // If sidebar is opened externally (e.g. hamburger) and no panels are active, default to explorer
  useEffect(() => {
    if (isOpen && activePanels.length === 0) {
      setActivePanels(['explorer']);
    }
  }, [isOpen, activePanels]);

  const handleExportLecture = async () => {
    if (!sessionId) {
      alert("Please start a session before exporting a lecture package.");
      return;
    }
    setIsExporting(true);
    setPackageProgress('Starting export...');
    try {
      await exportLecturePackage(sessionId, tabs, studentFeatures, setPackageProgress);
    } catch (err) {
      alert("Failed to export lecture: " + err.message);
    }
    setIsExporting(false);
    setPackageProgress('');
  };

  const handleImportLecture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!sessionId) {
      alert("Please start a session before importing a lecture package. The session is required to store your quiz questions.");
      e.target.value = null;
      return;
    }

    setIsImporting(true);
    setPackageProgress('Starting import...');
    try {
      await importLecturePackage(file, sessionId, setTabs, setPackageProgress);
      alert("Lecture package imported successfully!");
    } catch (err) {
      alert("Failed to import lecture: " + err.message);
    }
    setIsImporting(false);
    setPackageProgress('');
    e.target.value = null; // reset input
  };

  const renderPanelContent = (panel) => {
    switch(panel) {
      case 'explorer':
        return (
          <div className="file-tree">
            {tabs.map((tab) => (
              <div 
                key={tab.id}
                className={`tree-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => !showSharedLecture && openTab(tab.id)}
                onDoubleClick={() => !showSharedLecture && handleRenameTab(tab.id, tab.name)}
                draggable={tab.id !== 'about' && !showSharedLecture}
                onDragStart={(e) => handleDragStart(e, tab)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: showSharedLecture ? 'default' : 'pointer', padding: '6px 12px', userSelect: 'none', color: (viewedStudentId || showSharedLecture) ? '#f87171' : undefined }}
                title={tab.id === 'about' ? "IDE Welcome Info Panel" : (showSharedLecture ? "Shared Lecture File" : "Drag to trash to delete, click to open, double-click to rename")}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {getFileIcon(tab.name)}
                  <span>{tab.name}</span>
                </div>
              </div>
            ))}
          </div>
        );
      case 'search':
        return <SearchPanel />;
      case 'instructions':
        return (
          <InstructionsPanel 
            hasInstructorAccess={hasInstructorAccess} 
            activityInstructions={activityInstructions} 
            setActivityInstructions={setActivityInstructions} 
          />
        );
      case 'instructor':
        if (!hasInstructorAccess) return null;
        return (
          <div className="instructor-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {user?.avatarUrl && (
                <img 
                  src={user.avatarUrl} 
                  alt="Instructor Avatar" 
                  style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#334155', border: '2px solid var(--accent-primary)' }} 
                />
              )}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 600 }}>
                  Instructor Controls
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '2px' }}>
                  {user?.firstName} {user?.lastName}
                </span>
              </div>
            </div>
            {activeMode === 'broadcast' ? (
              <button 
                className="btn btn-primary" 
                style={{ width: '100%' }}
                onClick={() => updateSession({ activeMode: 'execute' })}
                disabled={isSessionSyncing}
              >
                Release to Students
              </button>
            ) : (
              <button 
                className="btn btn-accent" 
                style={{ width: '100%' }}
                onClick={() => updateSession({ activeMode: 'broadcast' })}
                disabled={isSessionSyncing}
              >
                Resume Broadcast Lock
              </button>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className={`btn ${isSharing ? 'btn-accent' : 'btn-outline'}`}
                style={{ flex: 1, padding: '8px 4px', fontSize: '0.85rem' }}
                disabled={isSessionSyncing}
                onClick={() => {
                  const nextSharing = !isSharing;
                  updateSession({ 
                    isSharing: nextSharing,
                    ...(nextSharing ? {} : { allowEdit: false })
                  });
                }}
              >
                {isSharing ? 'Stop Sharing' : 'Share'}
              </button>
              <button 
                className={`btn ${allowEdit ? 'btn-accent' : 'btn-outline'}`}
                style={{ flex: 1, padding: '8px 4px', fontSize: '0.85rem' }}
                onClick={async () => {
                  await updateSession({ allowEdit: true });
                  setTimeout(() => {
                    updateSession({ isSharing: false, allowEdit: false });
                  }, 800);
                }}
                disabled={isSessionSyncing || !isSharing}
                title={!isSharing ? "Start sharing code first" : "Allow students to edit the shared code tab"}
              >
                {allowEdit ? 'Edit Allowed' : 'Allow Edit'}
              </button>
            </div>

            <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
              <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '12px' }}>
                Lecture Packages
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button 
                  className="btn btn-outline" 
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}
                  onClick={handleExportLecture}
                  disabled={isExporting || isImporting}
                >
                  <Download size={14} />
                  {isExporting ? 'Exporting...' : 'Export Session to .zip'}
                </button>
                
                <label className="btn btn-outline" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', cursor: (isExporting || isImporting) ? 'default' : 'pointer', opacity: (isExporting || isImporting) ? 0.5 : 1, textAlign: 'center', margin: 0 }}>
                  <UploadIcon size={14} />
                  {isImporting ? 'Importing...' : 'Import Session from .zip'}
                  <input 
                    type="file" 
                    accept=".zip" 
                    onChange={handleImportLecture} 
                    style={{ display: 'none' }} 
                    disabled={isExporting || isImporting}
                  />
                </label>
                {packageProgress && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '4px' }}>
                    {packageProgress}
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
              <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '12px' }}>
                Activity Lock
              </span>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Lock Student IDE
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="checkbox" 
                    checked={lockStudentActivity}
                    onChange={(e) => updateSession({ lockStudentActivity: e.target.checked })}
                    style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                  />
                  <Lock size={20} color={lockStudentActivity ? '#22c55e' : 'var(--border-light)'} /> 
                </div>
              </label>
              
              <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '12px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                Student Features
              </span>
              {['files', 'search', 'instructions', 'testing', 'modules', 'chat', 'presentations'].map(feature => (
                <label key={feature} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <span style={{ textTransform: 'capitalize' }}>{feature}</span>
                  <input 
                    type="checkbox" 
                    checked={studentFeatures?.[feature] ?? true}
                    onChange={(e) => {
                      updateSession({ 
                        studentFeatures: { 
                          ...(studentFeatures || { files: true, search: true, instructions: true, testing: true, modules: true, chat: true, presentations: true }), 
                          [feature]: e.target.checked 
                        } 
                      });
                    }}
                    disabled={isSessionSyncing}
                    style={{ accentColor: 'var(--accent-primary)' }}
                  />
                </label>
              ))}
            </div>
          </div>
        );
      case 'presentations':
        return <PresentationPanel />;
      case 'testing':
        return <TestingPanel />;
      case 'roster':
        if (!hasInstructorAccess) return null;
        return <RosterPanel />;
      case 'chat':
        return <ChatPanel />;
      case 'modules':
        return <ModulesPanel />;
      case 'help':
        return <HelpPanel />;
      default:
        return (
          <div className="empty-panel">
            {panel} functionality coming soon.
          </div>
        );
    }
  };

  const allowedPanels = activePanels.filter(panel => {
    if (panel === 'instructor' || panel === 'roster') {
      return hasInstructorAccess;
    }
    if (!hasInstructorAccess) {
      if (panel === 'explorer' && studentFeatures?.files === false) return false;
      if (panel === 'search' && studentFeatures?.search === false) return false;
      if (panel === 'instructions' && studentFeatures?.instructions === false) return false;
      if (panel === 'testing' && studentFeatures?.testing === false) return false;
      if (panel === 'modules' && studentFeatures?.modules === false) return false;
      if (panel === 'modules' && studentFeatures?.modules === false) return false;
      if (panel === 'chat' && studentFeatures?.chat === false) return false;
      if (panel === 'presentations' && studentFeatures?.presentations === false) return false;
    }
    return true;
  });

  return (
    <div className="sidebar">
      <div className="sidebar-icons">
        {(hasInstructorAccess || studentFeatures?.files !== false) && (
          <div 
            className={`sidebar-icon ${isPanelActive('explorer') ? 'active' : ''}`}
            onClick={() => handleIconClick('explorer')}
          >
            <FileCode size={24} />
          </div>
        )}
        {(hasInstructorAccess || studentFeatures?.search !== false) && (
          <div 
            className={`sidebar-icon ${isPanelActive('search') ? 'active' : ''}`}
            onClick={() => handleIconClick('search')}
          >
            <Search size={24} />
          </div>
        )}
        {(hasInstructorAccess || studentFeatures?.instructions !== false) && (
          <div 
            className={`sidebar-icon ${isPanelActive('instructions') ? 'active' : ''}`}
            onClick={() => handleIconClick('instructions')}
            title="Activity Instructions"
          >
            <FileText size={24} />
          </div>
        )}
        {(hasInstructorAccess || studentFeatures?.testing !== false) && (
          <div 
            className={`sidebar-icon ${isPanelActive('testing') ? 'active' : ''}`}
            onClick={() => handleIconClick('testing')}
          >
            <CheckSquare size={24} />
          </div>
        )}
        {(hasInstructorAccess || studentFeatures?.modules !== false) && (
          <div 
            className={`sidebar-icon ${isPanelActive('modules') ? 'active' : ''}`}
            onClick={() => handleIconClick('modules')}
            title="Pyodide Modules"
          >
            <Library size={24} />
          </div>
        )}
        {(hasInstructorAccess || studentFeatures?.chat !== false) && (
          <div 
            className={`sidebar-icon ${isPanelActive('chat') ? 'active' : ''} ${(!hasInstructorAccess && myNeedsHelp) ? 'needs-help-flash' : ''}`}
            onClick={() => handleIconClick('chat')}
            title="Chat"
          >
            <MessageCircle size={24} />
            {(!hasInstructorAccess && myNeedsHelp) && <span className="sidebar-help-badge" />}
          </div>
        )}
        {(hasInstructorAccess || studentFeatures?.presentations !== false) && (
          <div 
            className={`sidebar-icon ${isPanelActive('presentations') ? 'active' : ''}`}
            onClick={() => handleIconClick('presentations')}
            title="Presentations"
          >
            <Monitor size={24} />
          </div>
        )}
        {hasInstructorAccess && (
          <div 
            className={`sidebar-icon ${isPanelActive('instructor') ? 'active' : ''}`}
            onClick={() => handleIconClick('instructor')}
            title="Instructor Controls"
          >
            <GraduationCap size={24} />
          </div>
        )}
        {hasInstructorAccess && (
          <div 
            className={`sidebar-icon ${isPanelActive('roster') ? 'active' : ''}`}
            onClick={() => handleIconClick('roster')}
            title="Student Roster"
            style={{ marginTop: 'auto' }}
          >
            <Users size={24} />
          </div>
        )}
        
        {/* Help / Shortcuts Icon pushed to bottom */}
        <div 
          className={`sidebar-icon ${isPanelActive('help') ? 'active' : ''}`}
          onClick={() => handleIconClick('help')}
          title="Editor Shortcuts"
          style={{ marginTop: hasInstructorAccess ? undefined : 'auto', marginBottom: '10px' }}
        >
          <Keyboard size={24} />
        </div>
      </div>
      
      <div className={`sidebar-content ${!isOpen ? 'hidden' : ''}`}>
        {allowedPanels.length > 0 ? (() => {
          const panelsToRender = maximizedPanel ? [maximizedPanel] : allowedPanels;
          const savedSizes = localStorage.getItem(`sidebar_panel_sizes_${panelsToRender.join(',')}`);
          const parsedSizes = savedSizes ? JSON.parse(savedSizes) : null;
          return (
            <Allotment 
              key={panelsToRender.join(',')} 
              vertical 
              defaultSizes={parsedSizes || undefined}
              onChange={(sizes) => {
                if (panelsToRender.length > 0 && !maximizedPanel) {
                  localStorage.setItem(`sidebar_panel_sizes_${panelsToRender.join(',')}`, JSON.stringify(sizes));
                }
              }}
            >
              {panelsToRender.map((panel) => (
                <Allotment.Pane key={panel} minSize={100}>
                  <div className="sidebar-section" style={{ height: '100%' }}>
                    <div className="sidebar-header">
                      <span>{panel.toUpperCase().replace('_', ' ')}</span>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                        {panel === 'explorer' && !viewedStudentId && (
                          <>
                            <button 
                              className="icon-btn-small" 
                              onClick={handleCreateNewTab} 
                              title="New File"
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                            >
                              <Plus size={15} />
                            </button>
                            <button 
                              className={`icon-btn-small ${isHoveringTrash ? 'trash-active' : ''}`}
                              onClick={handleDeleteAllFiles}
                              onDragOver={(e) => e.preventDefault()}
                              onDragEnter={() => setIsHoveringTrash(true)}
                              onDragLeave={() => setIsHoveringTrash(false)}
                              onDrop={(e) => {
                                setIsHoveringTrash(false);
                                const id = e.dataTransfer.getData('text/plain');
                                handleDragDelete(id);
                              }}
                              style={{ 
                                border: 'none', 
                                background: 'transparent', 
                                cursor: 'pointer', 
                                display: 'flex', 
                                alignItems: 'center',
                                padding: 0,
                                color: isHoveringTrash ? '#ff6b6b' : 'var(--text-muted)',
                                transform: isHoveringTrash ? 'scale(1.25)' : 'scale(1)',
                                transition: 'all 0.15s ease'
                              }}
                              title="Drag file here to delete, or click to delete all files"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                        {maximizedPanel === panel && (
                          <button
                            className="icon-btn-small pin-panel-btn"
                            onClick={() => handlePinPanel(panel)}
                            title={`Pin ${panel}`}
                            style={{ 
                              padding: '2px',
                              color: 'var(--text-muted)',
                              marginLeft: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              transition: 'color 0.15s ease'
                            }}
                          >
                            <Pin size={14} style={{ transform: 'rotate(45deg)' }} />
                          </button>
                        )}
                        <button
                          className="icon-btn-small close-panel-btn"
                          onClick={() => handleClosePanel(panel)}
                          title={`Close ${panel}`}
                          style={{ 
                            padding: '2px',
                            color: 'var(--text-muted)',
                            marginLeft: '4px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.15s ease'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <div className="sidebar-section-content" style={{ flex: 1, overflowY: 'auto' }}>
                      {renderPanelContent(panel)}
                    </div>
                  </div>
                </Allotment.Pane>
              ))}
            </Allotment>
          );
        })() : null}
      </div>
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
};

export default Sidebar;

const InstructionsPanel = ({ hasInstructorAccess, activityInstructions, setActivityInstructions }) => {
  const [editTab, setEditTab] = useState('write'); // 'write' | 'preview'

  // Helper to parse markdown
  const parseMarkdownToHTML = (text) => {
    if (!text) return '';
    
    let escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const lines = escaped.split('\n');
    const result = [];
    let inList = false;
    let listType = null;

    const closeListIfOpen = () => {
      if (inList) {
        result.push(listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
        listType = null;
      }
    };

    for (let line of lines) {
      // 1. Headings
      const h3Match = line.match(/^###\s+(.+)$/);
      const h2Match = line.match(/^##\s+(.+)$/);
      const h1Match = line.match(/^#\s+(.+)$/);

      if (h3Match) {
        closeListIfOpen();
        result.push(`<h3 style="margin: 12px 0 6px 0; color: var(--text-primary); font-size: 0.95rem;">${h3Match[1]}</h3>`);
        continue;
      }
      if (h2Match) {
        closeListIfOpen();
        result.push(`<h2 style="margin: 14px 0 8px 0; color: var(--text-primary); font-size: 1.05rem; border-bottom: 1px solid var(--border-light); padding-bottom: 4px;">${h2Match[1]}</h2>`);
        continue;
      }
      if (h1Match) {
        closeListIfOpen();
        result.push(`<h1 style="margin: 16px 0 10px 0; color: var(--text-primary); font-size: 1.2rem; border-bottom: 1.5px solid var(--border-light); padding-bottom: 6px;">${h1Match[1]}</h1>`);
        continue;
      }

      // 2. Unordered lists
      const ulMatch = line.match(/^[-*]\s+(.+)$/);
      if (ulMatch) {
        if (!inList || listType !== 'ul') {
          closeListIfOpen();
          result.push('<ul style="margin: 6px 0; padding-left: 20px; list-style-type: disc; color: var(--text-primary);">');
          inList = true;
          listType = 'ul';
        }
        result.push(`<li style="margin: 3px 0;">${ulMatch[1]}</li>`);
        continue;
      }

      // 3. Ordered lists
      const olMatch = line.match(/^\d+\.\s+(.+)$/);
      if (olMatch) {
        if (!inList || listType !== 'ol') {
          closeListIfOpen();
          result.push('<ol style="margin: 6px 0; padding-left: 20px; list-style-type: decimal; color: var(--text-primary);">');
          inList = true;
          listType = 'ol';
        }
        result.push(`<li style="margin: 3px 0;">${olMatch[1]}</li>`);
        continue;
      }

      // 4. Blank lines
      if (line.trim() === '') {
        closeListIfOpen();
        result.push('<div style="height: 10px;"></div>');
        continue;
      }

      // 5. Paragraph
      closeListIfOpen();
      result.push(`<p style="margin: 4px 0; line-height: 1.5; color: var(--text-primary);">${line}</p>`);
    }

    closeListIfOpen();

    let html = result.join('\n');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

    return html;
  };

  const formattedHTML = parseMarkdownToHTML(activityInstructions);

  return (
    <div className="instructions-panel" style={{ padding: '12px 16px 16px 16px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
      {hasInstructorAccess ? (
        <>
          {/* Write / Preview Tab Bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', marginBottom: '12px', gap: '16px' }}>
            <button
              onClick={() => setEditTab('write')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: editTab === 'write' ? '2px solid var(--accent-blue)' : '2px solid transparent',
                color: editTab === 'write' ? 'var(--text-primary)' : 'var(--text-muted)',
                padding: '6px 4px 8px 4px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Write Instructions
            </button>
            <button
              onClick={() => setEditTab('preview')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: editTab === 'preview' ? '2px solid var(--accent-blue)' : '2px solid transparent',
                color: editTab === 'preview' ? 'var(--text-primary)' : 'var(--text-muted)',
                padding: '6px 4px 8px 4px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Live Preview
            </button>
          </div>

          {editTab === 'write' ? (
            <textarea
              value={activityInstructions}
              onChange={(e) => setActivityInstructions(e.target.value)}
              placeholder="Enter activity instructions. You can use standard Markdown:&#10;- # heading&#10;- **bold**&#10;- *italic*&#10;- - lists"
              style={{
                flex: 1,
                width: '100%',
                minHeight: '180px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-light)',
                borderRadius: '4px',
                padding: '12px',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                lineHeight: '1.45',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          ) : (
            <div
              dangerouslySetInnerHTML={{ __html: formattedHTML || `<em style="color: var(--text-muted)">Empty instructions preview.</em>` }}
              style={{
                flex: 1,
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.015)',
                border: '1px solid var(--border-light)',
                borderRadius: '4px',
                padding: '12px',
                fontSize: '0.9rem',
                overflowY: 'auto',
                userSelect: 'text',
                boxSizing: 'border-box',
                minHeight: '180px'
              }}
            />
          )}
        </>
      ) : (
        <>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '10px', fontWeight: 600 }}>
            Activity Instructions
          </p>
          <div
            dangerouslySetInnerHTML={{ __html: formattedHTML || `<em style="color: var(--text-muted)">No instructions provided yet for this activity.</em>` }}
            style={{
              flex: 1,
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.015)',
              border: '1px solid var(--border-light)',
              borderRadius: '4px',
              padding: '12px',
              fontSize: '0.9rem',
              overflowY: 'auto',
              userSelect: 'text',
              boxSizing: 'border-box',
              minHeight: '180px'
            }}
          />
        </>
      )}
    </div>
  );
};
