import React, { useState } from 'react';
import { X, ExternalLink, Download } from 'lucide-react';
import useStore from '../store/useStore';
import { db, app } from '../firebase';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import './Auth/AuthModal.css';

// Initialize a secondary Firebase app so we can create users without signing out the instructor
const secondaryApp = initializeApp(app.options, 'ProvisioningApp');
const secondaryAuth = getAuth(secondaryApp);

const SettingsModal = ({ isOpen, onClose }) => {
  const { canvasToken, setCanvasToken, canvasDomain, setCanvasDomain } = useStore();
  
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [importStats, setImportStats] = useState(null);

  if (!isOpen) return null;

  const handleFetchCourses = async () => {
    if (!canvasToken) {
      setError('Please enter a Canvas token.');
      return;
    }
    if (!canvasDomain) {
      setError('Please enter your Canvas domain.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setCourses([]);
    setSelectedCourses({});
    setImportStats(null);

    try {
      const url = `https://${canvasDomain}/api/v1/courses?per_page=50`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${canvasToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch courses. Status: ${response.status}`);
      }

      const data = await response.json();
      
      // Filter out courses that don't have a name and sort by created_at descending (newest first)
      const validCourses = data
        .filter(c => c.name)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      setCourses(validCourses);
      if (validCourses.length === 0) {
        setError('No courses found.');
      }
    } catch (err) {
      console.error(err);
      setError(`Error fetching courses: ${err.message}. Note: if CORS is blocking this request, the Canvas admin needs to whitelist this domain, or a proxy server is required.`);
    } finally {
      setLoading(false);
    }
  };

  const toggleCourseSelection = (courseId) => {
    setSelectedCourses(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
  };

  const handleImport = async () => {
    const selectedIds = Object.keys(selectedCourses).filter(id => selectedCourses[id]);
    if (selectedIds.length === 0) {
      setError('Please select at least one course to import.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setImportStats(null);

    let totalImported = 0;
    let totalFailed = 0;
    let studentsAdded = 0;
    let facultyAdded = 0;

    try {
      for (const courseId of selectedIds) {
        // Fetch users (students and teachers)
        const url = `https://${canvasDomain}/api/v1/courses/${courseId}/users?enrollment_type[]=student&enrollment_type[]=teacher&per_page=100`;
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${canvasToken}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch users for course ${courseId}`);
        }

        const users = await response.json();

        for (const user of users) {
          // Canvas users may have email or login_id. We need an email for Firebase.
          const email = (user.email || user.login_id || '').toLowerCase();
          if (!email || !email.includes('@')) continue;

          // Determine role based on Canvas enrollment or email domain fallback
          let role = 'student';
          if (email.endsWith('@yosemite.edu') && !email.endsWith('@my.yosemite.edu')) {
            role = 'instructor';
          }
          // Assuming short names are passed if available, otherwise just use Canvas name
          const nameParts = user.name ? user.name.split(' ') : ['Student'];
          const firstName = nameParts[0];
          const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
          const avatarUrl = user.avatar_url || '';

          try {
            // 1. Try to create user in Firebase Auth using the secondary app
            try {
              await createUserWithEmailAndPassword(secondaryAuth, email, 'passwd');
            } catch (authErr) {
              // If email-already-in-use, that's fine, we still want to ensure they are authorized
              if (authErr.code !== 'auth/email-already-in-use') {
                throw authErr; // throw other errors
              }
            }

            // 2. Add to authorized_students collection if student
            if (role === 'student') {
              const authRef = doc(db, 'authorized_students', email);
              await setDoc(authRef, { addedAt: new Date().toISOString(), avatarUrl }, { merge: true });
              studentsAdded++;
            } else {
              facultyAdded++;
            }

            totalImported++;
          } catch (err) {
            console.warn(`Failed to import user ${email}:`, err);
            totalFailed++;
          }
        }
      }
      
      setSuccess(`Import complete! Added ${totalImported} accounts (Students: ${studentsAdded}, Faculty: ${facultyAdded}). Failed: ${totalFailed}.`);
      setImportStats({ imported: totalImported, students: studentsAdded, faculty: facultyAdded, failed: totalFailed });

    } catch (err) {
      console.error(err);
      setError(`Error during import: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: '600px', width: '90%' }}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        
        <h2>Settings & Canvas LMS Integration</h2>
        <p className="modal-subtitle">Configure your environment and import rosters from Canvas.</p>
        
        {error && <div className="modal-error" style={{ marginBottom: '16px' }}>{error}</div>}
        {success && <div className="modal-success" style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '4px', marginBottom: '16px', fontSize: '0.9rem' }}>{success}</div>}

        <div className="modal-form">
          <div className="form-group">
            <label>Canvas Domain</label>
            <input 
              type="text" 
              value={canvasDomain} 
              onChange={e => setCanvasDomain(e.target.value)} 
              placeholder="e.g., yosemite.instructure.com"
            />
          </div>
          
          <div className="form-group">
            <label>Canvas API Token</label>
            <input 
              type="password" 
              value={canvasToken} 
              onChange={e => setCanvasToken(e.target.value)} 
              placeholder="Enter your Canvas Bearer Token"
            />
            <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
              Generate this in your Canvas Profile Settings &gt; Approved Integrations.
            </small>
          </div>

          <button 
            className="btn btn-primary" 
            onClick={handleFetchCourses} 
            disabled={loading}
            style={{ marginBottom: '16px' }}
          >
            {loading && courses.length === 0 ? 'Fetching...' : 'Fetch Canvas Courses'}
          </button>
        </div>

        {courses.length > 0 && (
          <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Available Courses</h3>
            <div style={{ maxHeight: '250px', overflowY: 'auto', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '4px', padding: '8px' }}>
              {courses.map(course => (
                <label 
                  key={course.id} 
                  style={{ display: 'flex', alignItems: 'center', padding: '8px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <input 
                    type="checkbox" 
                    checked={!!selectedCourses[course.id]}
                    onChange={() => toggleCourseSelection(course.id)}
                    style={{ marginRight: '12px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 500 }}>{course.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Created: {new Date(course.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <button 
              className="btn btn-accent w-full" 
              onClick={handleImport}
              disabled={loading || Object.values(selectedCourses).every(v => !v)}
              style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}
            >
              <Download size={18} />
              {loading && Object.values(selectedCourses).some(v => v) ? 'Importing...' : 'Import Selected Roster(s)'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsModal;
