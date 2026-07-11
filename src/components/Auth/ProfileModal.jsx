import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import useStore from '../../store/useStore';
import { X, Check } from 'lucide-react';
import './AuthModal.css'; // Reusing modal base styles
import './ProfileModal.css';

// Removed AVATAR_SEEDS as we now use custom URLs

const ProfileModal = ({ isOpen, onClose }) => {
  const { user, setUser } = useStore();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sync state when modal opens
  useEffect(() => {
    if (user && isOpen) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setAvatarUrl(user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email || 'Felix'}`);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const newAvatarUrl = avatarUrl;

    try {
      const uid = auth.currentUser?.uid || user.uid;
      if (!uid) throw new Error('Cannot determine user ID. Please sign out and back in.');
      const userRef = doc(db, 'users', uid);
      
      const updatedData = {
        firstName,
        lastName,
        avatarUrl: newAvatarUrl
      };

      // Use setDoc with merge: true so it creates the doc if it doesn't exist yet
      await setDoc(userRef, updatedData, { merge: true });
      
      // Update local state
      setUser({
        ...user,
        ...updatedData
      });

      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to update profile. " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel profile-modal">
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        
        <h2>Edit Profile</h2>
        <p className="modal-subtitle">Update your personal information and avatar.</p>
        
        {error && <div className="modal-error">{error}</div>}
        
        <form onSubmit={handleSave} className="modal-form">
          <div className="form-group-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>First Name</label>
              <input 
                type="text" 
                value={firstName} 
                onChange={e => setFirstName(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Last Name</label>
              <input 
                type="text" 
                value={lastName} 
                onChange={e => setLastName(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div className="form-group">
            <label>Avatar URL</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <img 
                src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=Felix`} 
                alt="Avatar Preview" 
                style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#334155', objectFit: 'cover' }} 
                onError={(e) => { e.target.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'; }}
              />
              <input 
                type="text" 
                value={avatarUrl} 
                onChange={e => setAvatarUrl(e.target.value)} 
                placeholder="https://..." 
                style={{ flex: 1 }}
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
              Enter a custom URL for your avatar image.
            </p>
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ marginTop: '16px' }}>
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
