import React, { useState } from 'react';
import useStore from '../store/useStore';
import { X, Play, LogIn } from 'lucide-react';
import './Auth/AuthModal.css';

const SessionModal = ({ isOpen, onClose }) => {
  const { role, setSessionId } = useStore();
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isInstructor = role === 'instructor';

  const handleCreateSession = () => {
    // Generate a random 5-character alphanumeric room code
    const generatedCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    setSessionId(generatedCode);
    onClose();
  };

  const handleJoinSession = (e) => {
    e.preventDefault();
    const code = roomCodeInput.trim().toUpperCase();
    if (code.length < 3) {
      setError('Please enter a valid room code.');
      return;
    }
    setSessionId(code);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: '400px' }}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        
        {isInstructor ? (
          <>
            <h2>Start a Class Session</h2>
            <p className="modal-subtitle">Generate a Room Code for your students to join.</p>
            
            <div className="modal-form" style={{ marginTop: '20px' }}>
              <button 
                className="btn btn-primary w-full" 
                onClick={handleCreateSession}
                style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px' }}
              >
                <Play size={18} /> Generate Room Code
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>Join a Class Session</h2>
            <p className="modal-subtitle">Enter the Room Code provided by your instructor.</p>
            {error && <div className="modal-error">{error}</div>}
            
            <form onSubmit={handleJoinSession} className="modal-form">
              <div className="form-group">
                <label>Room Code</label>
                <input 
                  type="text" 
                  value={roomCodeInput} 
                  onChange={e => setRoomCodeInput(e.target.value)} 
                  required 
                  placeholder="e.g. MATH1"
                  style={{ textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center', fontSize: '1.2rem' }}
                  maxLength={10}
                />
              </div>
              <button type="submit" className="btn btn-primary w-full" style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                <LogIn size={18} /> Join Session
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default SessionModal;
