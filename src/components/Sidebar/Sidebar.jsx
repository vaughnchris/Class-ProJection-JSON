import React, { useState, useEffect } from 'react';
import { FileCode, Folder, FolderOpen, Search, Copy, CheckSquare, MessageCircle, Plus, GraduationCap } from 'lucide-react';
import useStore from '../../store/useStore';
import ChatPanel from './ChatPanel';
import './Sidebar.css';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const [activePanels, setActivePanels] = useState(['explorer']);
  const { user, activeMode, setActiveMode } = useStore();
  
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
            <div className="tree-item active">
              <FileCode size={14} className="file-icon-color" /> welcome.py
            </div>
            
            <div className="tree-folder">
              <div className="tree-item">
                <FolderOpen size={14} className="folder-icon-color" /> utils
              </div>
              <div className="tree-children">
                <div className="tree-item">
                  <FileCode size={14} className="file-icon-color" /> calculator.py
                </div>
              </div>
            </div>
            
            <div className="tree-item">
              <FileCode size={14} className="md-icon-color" /> README.md
            </div>
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
                onClick={() => setActiveMode('execute')}
              >
                Release to Students
              </button>
            ) : (
              <button 
                className="btn btn-accent" 
                style={{ width: '100%', marginBottom: '12px' }}
                onClick={() => setActiveMode('broadcast')}
              >
                Resume Broadcast Lock
              </button>
            )}
            
            <button className="btn btn-outline" style={{ width: '100%' }}>
              Push Snippet
            </button>
          </div>
        );
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
          >
            <GraduationCap size={24} />
          </div>
        )}
      </div>
      
      <div className={`sidebar-content ${!isOpen ? 'hidden' : ''}`}>
        {activePanels.map((panel) => (
          <div key={panel} className="sidebar-section">
            <div className="sidebar-header">
              <span>{panel.toUpperCase().replace('_', ' ')}</span>
              <button className="icon-btn-small"><Plus size={16} /></button>
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
