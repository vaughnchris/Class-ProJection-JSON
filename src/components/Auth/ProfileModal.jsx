import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import useStore from '../../store/useStore';
import { X, Check } from 'lucide-react';
import './AuthModal.css'; // Reusing modal base styles
import './ProfileModal.css';

const AVATAR_SEEDS = [
  'Felix', 'Aneka', 'Peanut', 'Lucky', 'Mittens', 
  'Bella', 'Max', 'Luna', 'Charlie', 'Lucy',
  'Milo', 'Daisy', 'Leo', 'Chloe', 'Oliver'
];

const ProfileModal = ({ isOpen, onClose }) => {
  const { user, setUser } = useStore();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sync state when modal opens
  useEffect(() => {
    if (user && isOpen) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      
      // Extract seed from current avatarUrl if possible
      try {
        const url = new URL(user.avatarUrl);
        const seed = url.searchParams.get('seed');
        if (seed) setAvatarSeed(seed);
      } catch(e) {
        setAvatarSeed('Felix');
      }
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const newAvatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;

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
            <label>Select Avatar</label>
            <div className="avatar-grid">
              {AVATAR_SEEDS.map(seed => (
                <div 
                  key={seed} 
                  className={`avatar-option ${avatarSeed === seed ? 'selected' : ''}`}
                  onClick={() => setAvatarSeed(seed)}
                >
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} alt={seed} />
                  {avatarSeed === seed && <div className="avatar-check"><Check size={12} /></div>}
                </div>
              ))}
            </div>
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
