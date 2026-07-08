import React, { useState, useEffect } from 'react';
import { FileCode, Folder, FolderOpen, Search, Copy, CheckSquare, MessageCircle, Plus, GraduationCap, Trash2, FileText, Table, File, Users } from 'lucide-react';
import useStore from '../../store/useStore';
import ChatPanel from './ChatPanel';
import RosterPanel from './RosterPanel';
import './Sidebar.css';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const [activePanels, setActivePanels] = useState(() => {
    const saved = localStorage.getItem('ide_active_panels');
    return saved ? JSON.parse(saved) : ['explorer'];
  });
  const [isHoveringTrash, setIsHoveringTrash] = useState(false);
  
  const { 
    user, 
    activeMode, 
    isSharing, 
    allowEdit, 
    isSessionSyncing, 
    updateSession,
    tabs,
    activeTab,
    addTab,
    closeTab,
    openTab,
    deleteTab,
    renameTab,
    setActiveTab
  } = useStore();
  
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

  const handleRenameTab = (tabId, currentName) => {
    if (tabId === 'about') return;
    const newName = prompt("Rename File:", currentName);
    if (newName && newName.trim() !== '') {
      const trimmed = newName.trim();
      const hasExtension = trimmed.includes('.');
      const finalName = hasExtension ? trimmed : trimmed + '.py';
      renameTab(tabId, finalName);
    }
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
      // If closed, open it and ensure the clicked panel is active
      if (!activePanels.includes(panel)) {
        setActivePanels([...activePanels, panel]);
      } else if (activePanels.length === 0) {
        setActivePanels([panel]);
      }
      setIsOpen(true);
    } else {
      // If open, toggle the panel
      let newPanels;
      if (activePanels.includes(panel)) {
        newPanels = activePanels.filter(p => p !== panel);
      } else {
        newPanels = [...activePanels, panel];
      }
      setActivePanels(newPanels);
      
      // If no panels left, close the sidebar
      if (newPanels.length === 0) {
        setIsOpen(false);
      }
    }
  };

  // If sidebar is opened externally (e.g. hamburger) and no panels are active, default to explorer
  useEffect(() => {
    if (isOpen && activePanels.length === 0) {
      setActivePanels(['explorer']);
    }
  }, [isOpen, activePanels]);

  const renderPanelContent = (panel) => {
    switch(panel) {
      case 'explorer':
        return (
          <div className="file-tree">
            {tabs.map((tab) => (
              <div 
                key={tab.id}
                className={`tree-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => openTab(tab.id)}
                onDoubleClick={() => handleRenameTab(tab.id, tab.name)}
                draggable={tab.id !== 'about'}
                onDragStart={(e) => handleDragStart(e, tab)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '6px 12px', userSelect: 'none' }}
                title={tab.id === 'about' ? "IDE Welcome Info Panel" : "Drag to trash to delete, click to open, double-click to rename"}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {getFileIcon(tab.name)}
                  <span>{tab.name}</span>
                </div>
              </div>
            ))}
          </div>
        );
      case 'instructor':
        if (!hasInstructorAccess) return null;
        return (
          <div className="instructor-panel" style={{ padding: '16px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Instructor Controls
            </p>
            {activeMode === 'broadcast' ? (
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginBottom: '12px' }}
                onClick={() => updateSession({ activeMode: 'execute' })}
                disabled={isSessionSyncing}
              >
                Release to Students
              </button>
            ) : (
              <button 
                className="btn btn-accent" 
                style={{ width: '100%', marginBottom: '12px' }}
                onClick={() => updateSession({ activeMode: 'broadcast' })}
                disabled={isSessionSyncing}
              >
                Resume Broadcast Lock
              </button>
            )}

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
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
            
            <button className="btn btn-outline" style={{ width: '100%' }}>
              Push Snippet
            </button>
          </div>
        );
      case 'roster':
        if (!hasInstructorAccess) return null;
        return <RosterPanel />;
      case 'chat':
        return <ChatPanel />;
      default:
        return (
          <div className="empty-panel">
            {panel} functionality coming soon.
          </div>
        );
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-icons">
        <div 
          className={`sidebar-icon ${activePanels.includes('explorer') && isOpen ? 'active' : ''}`}
          onClick={() => handleIconClick('explorer')}
        >
          <FileCode size={24} />
        </div>
        <div 
          className={`sidebar-icon ${activePanels.includes('search') && isOpen ? 'active' : ''}`}
          onClick={() => handleIconClick('search')}
        >
          <Search size={24} />
        </div>
        <div 
          className={`sidebar-icon ${activePanels.includes('source_control') && isOpen ? 'active' : ''}`}
          onClick={() => handleIconClick('source_control')}
        >
          <Copy size={24} />
        </div>
        <div 
          className={`sidebar-icon ${activePanels.includes('testing') && isOpen ? 'active' : ''}`}
          onClick={() => handleIconClick('testing')}
        >
          <CheckSquare size={24} />
        </div>
        <div 
          className={`sidebar-icon ${activePanels.includes('chat') && isOpen ? 'active' : ''}`}
          onClick={() => handleIconClick('chat')}
        >
          <MessageCircle size={24} />
        </div>
        
        {hasInstructorAccess && (
          <div 
            className={`sidebar-icon ${activePanels.includes('instructor') && isOpen ? 'active' : ''}`}
            onClick={() => handleIconClick('instructor')}
            title="Instructor Controls"
          >
            <GraduationCap size={24} />
          </div>
        )}
        {hasInstructorAccess && (
          <div 
            className={`sidebar-icon ${activePanels.includes('roster') && isOpen ? 'active' : ''}`}
            onClick={() => handleIconClick('roster')}
            title="Student Roster"
          >
            <Users size={24} />
          </div>
        )}
      </div>
      
      <div className={`sidebar-content ${!isOpen ? 'hidden' : ''}`}>
        {activePanels.map((panel) => (
          <div key={panel} className="sidebar-section">
            <div className="sidebar-header">
              <span>{panel.toUpperCase().replace('_', ' ')}</span>
              {panel === 'explorer' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button 
                    className="icon-btn-small" 
                    onClick={handleCreateNewTab} 
                    title="New File"
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <Plus size={16} />
                  </button>
                  <button 
                    className={`icon-btn-small ${isHoveringTrash ? 'trash-active' : ''}`}
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
                      color: isHoveringTrash ? '#ff6b6b' : 'var(--text-muted)',
                      transform: isHoveringTrash ? 'scale(1.25)' : 'scale(1)',
                      transition: 'all 0.15s ease'
                    }}
                    title="Drag file here to delete permanently"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <button className="icon-btn-small"><Plus size={16} /></button>
              )}
            </div>
            <div className="sidebar-section-content">
              {renderPanelContent(panel)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
