import React, { useState } from 'react';
import { X, Save, LogOut, AlertTriangle, Trash2 } from 'lucide-react';
import './Auth/AuthModal.css'; // Reusing base styles

const LeaveRoomModal = ({ isOpen, onClose, onLeave, onCloseRoom, role }) => {
  const [saveBackup, setSaveBackup] = useState(true);

  if (!isOpen) return null;

  const isInstructor = role === 'instructor' || role === 'admin';

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: '450px' }}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LogOut size={24} style={{ color: 'var(--accent-primary)' }} /> Leave Room
        </h2>
        
        {isInstructor ? (
          <>
            <p className="modal-subtitle">
              You are the instructor. Do you want to just leave the room open for students, or close the room entirely and delete its contents?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
              <button 
                className="btn btn-outline" 
                style={{ width: '100%', justifyContent: 'flex-start', padding: '12px', fontSize: '0.95rem' }}
                onClick={() => {
                  onLeave();
                  onClose();
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <LogOut size={18} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600 }}>Just Leave (Keep Open)</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>The room stays active for students.</div>
                  </div>
                </div>
              </button>

              <div style={{ border: '1px solid var(--border-light)', borderRadius: '8px', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#f87171', fontWeight: 600 }}>
                  <AlertTriangle size={18} /> Close and Delete Room
                </div>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', marginBottom: '16px' }}>
                  <input 
                    type="checkbox" 
                    checked={saveBackup} 
                    onChange={e => setSaveBackup(e.target.checked)} 
                    style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
                  />
                  <span>Save a JSON backup of all files before deleting</span>
                </label>
                
                <button 
                  className="btn btn-outline" 
                  style={{ width: '100%', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)', gap: '8px' }}
                  onClick={() => {
                    onCloseRoom(saveBackup);
                    onClose();
                  }}
                >
                  <Trash2 size={16} /> Close Room
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="modal-subtitle">
              Are you sure you want to leave this session? Your local code will remain in your browser until cleared.
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} 
                onClick={() => {
                  onLeave();
                  onClose();
                }}
              >
                <LogOut size={16} /> Leave Room
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LeaveRoomModal;
