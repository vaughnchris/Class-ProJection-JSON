import React, { useState } from 'react';
import { signInWithEmailAndPassword, updatePassword, signOut } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { doc, getDoc, setDoc, collection } from 'firebase/firestore';
import useStore from '../../store/useStore';
import { X } from 'lucide-react';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose }) => {
  const [view, setView] = useState('login'); // 'login' | 'change_password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { setUser } = useStore();

  if (!isOpen) return null;
  
  const initializeOrGetUser = async (firebaseUser, rosterData = null) => {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);
    
    const emailStr = firebaseUser.email || '';
    const domain = emailStr.split('@')[1];
    
    let assignedRole = 'student'; // Default fallback
    if (domain === 'yosemite.edu') {
      assignedRole = 'instructor';
    } else if (domain === 'my.yosemite.edu') {
      assignedRole = 'student';
    }
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      // Self-heal: If the document exists but is missing the role, write it immediately
      if (!data.role) {
        const healedData = { ...data, role: assignedRole, email: emailStr };
        await setDoc(userDocRef, healedData, { merge: true });
        return healedData;
      }
      return data;
    }
    
    // Extract a possible first name from the email and strip out any numbers (student ID)
    let namePart = emailStr.split('@')[0];
    namePart = namePart.replace(/[0-9]/g, ''); // Remove all numerals
    const firstName = namePart.length > 0 
      ? namePart.charAt(0).toUpperCase() + namePart.slice(1) 
      : 'Student';
    
    const newUserData = {
      email: emailStr,
      firstName: firstName,
      lastName: '',
      avatarUrl: (rosterData && rosterData.avatarUrl) ? rosterData.avatarUrl : `https://api.dicebear.com/7.x/avataaars/svg?seed=${emailStr}`,
      role: assignedRole
    };
    
    await setDoc(userDocRef, newUserData);
    return newUserData;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userEmail = (userCredential.user.email || '').toLowerCase();
      const domain = userEmail.split('@')[1];
      const isInstructor = domain === 'yosemite.edu';
      const isStudent = domain === 'my.yosemite.edu' || !isInstructor;

      // For students: verify they are on the authorized roster
      let rosterData = null;
      if (isStudent) {
        try {
          const rosterDoc = await getDoc(doc(db, 'authorized_students', userEmail));
          if (!rosterDoc.exists()) {
            await signOut(auth);
            setError('Your email is not on the authorized student list. Please contact your instructor.');
            setLoading(false);
            return;
          }
          rosterData = rosterDoc.data();
        } catch (rosterErr) {
          console.warn('Could not verify roster, allowing login:', rosterErr);
          // If Firestore is unavailable, allow login to avoid lockout
        }
      } else {
        // For instructors: optionally fetch roster data to get their avatar URL
        try {
          const rosterDoc = await getDoc(doc(db, 'authorized_instructors', userEmail));
          if (rosterDoc.exists()) {
            rosterData = rosterDoc.data();
          }
        } catch (err) {
          // Ignore, we don't block instructor logins if not on the list
        }
      }
      
      // Check if they used the default password
      if (password === 'passwd') {
        setView('change_password');
        setLoading(false);
        return;
      }
      
      // Fetch or create user role/profile from Firestore
      try {
        const userData = await initializeOrGetUser(userCredential.user, rosterData);
        setUser({ ...userData, uid: userCredential.user.uid });
      } catch (err) {
         console.warn("Firestore error, falling back to mock user:", err);
         setUser({
            email: userCredential.user.email,
            firstName: 'Demo',
            lastName: 'User',
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userCredential.user.email}`,
            role: 'instructor' 
          });
      }

      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match");
    }

    if (newPassword === 'passwd') {
      return setError("New password cannot be 'passwd'");
    }

    setLoading(true);
    try {
      await updatePassword(auth.currentUser, newPassword);
      
      // Fetch or create user profile after password update
      try {
        const userData = await initializeOrGetUser(auth.currentUser);
        setUser({ ...userData, uid: auth.currentUser.uid });
      } catch (dbErr) {
        console.warn("Firestore error, falling back to mock user:", dbErr);
        setUser({
          email: auth.currentUser.email,
          firstName: 'Demo',
          lastName: 'User',
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.currentUser.email}`,
          role: 'instructor'
        });
      }
      
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel">
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        
        {view === 'login' ? (
          <>
            <h2>Sign In</h2>
            <p className="modal-subtitle">Use your college email address.</p>
            {error && <div className="modal-error">{error}</div>}
            
            <form onSubmit={handleLogin} className="modal-form">
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  placeholder="name@college.edu"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2>Change Password</h2>
            <p className="modal-subtitle">Please change your default password.</p>
            {error && <div className="modal-error">{error}</div>}
            
            <form onSubmit={handleChangePassword} className="modal-form">
              <div className="form-group">
                <label>New Password</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  required 
                />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
