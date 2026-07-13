import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { X, Play, LogIn, Trash2, Clock } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, getDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import './Auth/AuthModal.css';

const SessionModal = ({ isOpen, onClose }) => {
  const { user, role, setSessionId } = useStore();
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [roomNameInput, setRoomNameInput] = useState('');
  const [error, setError] = useState('');
  const [savedSessions, setSavedSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const isInstructor = role === 'instructor';

  useEffect(() => {
    if (isOpen && isInstructor && user) {
      fetchSessions();
    }
  }, [isOpen, isInstructor, user]);

  const fetchSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const q = query(collection(db, 'sessions'), where('instructorId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const sessionsData = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.program === 'python') {
          sessionsData.push({ id: docSnap.id, ...data });
        }
      });
      // Sort client side by lastUpdatedAt desc
      sessionsData.sort((a, b) => {
        const dateA = a.lastUpdatedAt ? new Date(a.lastUpdatedAt) : new Date(0);
        const dateB = b.lastUpdatedAt ? new Date(b.lastUpdatedAt) : new Date(0);
        return dateB - dateA;
      });
      setSavedSessions(sessionsData);
    } catch (err) {
      console.error("Failed to fetch sessions", err);
    }
    setIsLoadingSessions(false);
  };

  const handleCreateSession = async () => {
    const generatedCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    
    try {
      await setDoc(doc(db, 'sessions', generatedCode), {
        instructorId: user.uid,
        name: roomNameInput.trim() || `Session ${generatedCode}`,
        createdAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        program: 'python'
      }, { merge: true });
    } catch (err) {
      console.error("Failed to create session metadata", err);
    }
    
    setSessionId(generatedCode);
    onClose();
  };

  const handleDeleteSession = async (sessionIdToDelete) => {
    if (!window.confirm("Are you sure you want to delete this session forever?")) return;
    try {
      await deleteDoc(doc(db, 'sessions', sessionIdToDelete));
      setSavedSessions(prev => prev.filter(s => s.id !== sessionIdToDelete));
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  };

  const handleJoinSession = async (e) => {
    e.preventDefault();
    const code = roomCodeInput.trim().toUpperCase();
    if (code.length < 3) {
      setError('Please enter a valid room code.');
      return;
    }
    
    setError('');
    try {
      const sessionDoc = await getDoc(doc(db, 'sessions', code));
      if (!sessionDoc.exists()) {
        setError('Room not found. Please check the code.');
        return;
      }
      const data = sessionDoc.data();
      if (data.program !== 'python') {
        setError('This room code is for another application (Web Laboratory).');
        return;
      }
      setSessionId(code);
      onClose();
    } catch (err) {
      console.error("Failed to join session", err);
      setError('Failed to verify room code. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: '500px', width: '90%' }}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        
        {isInstructor ? (
          <>
            <h2>Start a Class Session</h2>
            <p className="modal-subtitle">Generate a Room Code for your students to join.</p>
            
            <div className="modal-form" style={{ marginTop: '20px' }}>
              <div className="form-group">
                <label>Session Name (Optional)</label>
                <input 
                  type="text" 
                  value={roomNameInput} 
                  onChange={e => setRoomNameInput(e.target.value)} 
                  placeholder="e.g. Week 1 Intro"
                />
              </div>
              <button 
                className="btn btn-primary w-full" 
                onClick={handleCreateSession}
                style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px' }}
              >
                <Play size={18} /> Generate Room Code
              </button>
            </div>

            <div style={{ marginTop: '30px', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: 'var(--text-primary)' }}>My Saved Sessions</h3>
              {isLoadingSessions ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
              ) : savedSessions.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No saved sessions found.</div>
              ) : (
                <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                  {savedSessions.map(session => (
                    <div key={session.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{session.name || `Session ${session.id}`}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span><strong style={{color: 'var(--accent-primary)'}}>{session.id}</strong></span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {session.lastUpdatedAt ? new Date(session.lastUpdatedAt).toLocaleDateString() : 'Unknown'}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => {
                            setSessionId(session.id);
                            onClose();
                          }}
                        >
                          Load
                        </button>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '6px', color: '#ef4444', borderColor: '#ef4444' }}
                          onClick={() => handleDeleteSession(session.id)}
                          title="Delete Session"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
