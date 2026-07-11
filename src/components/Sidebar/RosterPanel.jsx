import React, { useState, useEffect, useRef } from 'react';
import { Upload, Users, Trash2, CheckCircle, AlertCircle, X, PlusCircle, GraduationCap } from 'lucide-react';
import { db } from '../../firebase';
import { collection, doc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';

const RosterPanel = () => {
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'instructors'
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message }
  const [manualEmail, setManualEmail] = useState('');
  const [manualAvatarUrl, setManualAvatarUrl] = useState('');
  const fileInputRef = useRef(null);

  const collectionName = activeTab === 'students' ? 'authorized_students' : 'authorized_instructors';

  // Load existing roster from Firestore
  const fetchRoster = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
      setUsersList(list);
    } catch (err) {
      console.error('Error fetching roster:', err);
      setStatus({ type: 'error', message: 'Could not load roster.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
    setStatus(null);
  }, [activeTab]);

  // Parse CSV/TSV lines into { email, avatarUrl } objects
  const parseUsers = (text) => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const parsedUsers = new Map(); // map email -> data

    lines.forEach(line => {
      const cells = line.split(/[,\t]/).map(c => c.trim().replace(/^"|"$/g, ''));
      let email = '';
      let avatarUrl = '';

      for (const cell of cells) {
        if (!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cell)) {
          email = cell.toLowerCase();
        } else if (!avatarUrl && cell.startsWith('http')) {
          avatarUrl = cell;
        }
      }

      if (email) {
        parsedUsers.set(email, { email, avatarUrl });
      }
    });

    return Array.from(parsedUsers.values());
  };

  const uploadUsers = async (usersToUpload) => {
    if (usersToUpload.length === 0) {
      setStatus({ type: 'error', message: 'No valid emails found.' });
      return;
    }
    setUploading(true);
    try {
      const batch = writeBatch(db);
      usersToUpload.forEach(u => {
        const ref = doc(db, collectionName, u.email);
        const data = { email: u.email, authorizedAt: new Date().toISOString() };
        if (u.avatarUrl) data.avatarUrl = u.avatarUrl;
        batch.set(ref, data, { merge: true });
      });
      await batch.commit();
      const roleName = activeTab === 'students' ? 'student' : 'instructor';
      setStatus({ type: 'success', message: `✓ Added ${usersToUpload.length} ${roleName}(s).` });
      fetchRoster();
    } catch (err) {
      console.error('Roster upload error:', err);
      setStatus({ type: 'error', message: 'Upload failed. Check Firestore permissions.' });
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStatus(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const parsed = parseUsers(evt.target.result);
      uploadUsers(parsed);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAddManual = async () => {
    const email = manualEmail.trim().toLowerCase();
    const avatar = manualAvatarUrl.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus({ type: 'error', message: 'Invalid email address.' });
      return;
    }
    setStatus(null);
    await uploadUsers([{ email, avatarUrl: avatar }]);
    setManualEmail('');
    setManualAvatarUrl('');
  };

  const handleRemove = async (id) => {
    if (!window.confirm(`Remove ${id} from the authorized list?`)) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
      setUsersList(prev => prev.filter(s => s.id !== id));
      setStatus({ type: 'success', message: `Removed ${id}.` });
    } catch (err) {
      setStatus({ type: 'error', message: 'Could not remove user.' });
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm(`Remove ALL ${usersList.length} users from this list? This cannot be undone.`)) return;
    try {
      const batch = writeBatch(db);
      usersList.forEach(s => batch.delete(doc(db, collectionName, s.id)));
      await batch.commit();
      setUsersList([]);
      setStatus({ type: 'success', message: 'Roster cleared.' });
    } catch (err) {
      setStatus({ type: 'error', message: 'Could not clear roster.' });
    }
  };

  return (
    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflowY: 'auto' }}>
      
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', marginBottom: '4px' }}>
        <button
          onClick={() => setActiveTab('students')}
          style={{
            flex: 1, background: 'none', border: 'none', padding: '8px 4px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
            borderBottom: activeTab === 'students' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'students' ? 'var(--text-primary)' : 'var(--text-muted)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Users size={16} /> Students</div>
        </button>
        <button
          onClick={() => setActiveTab('instructors')}
          style={{
            flex: 1, background: 'none', border: 'none', padding: '8px 4px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
            borderBottom: activeTab === 'instructors' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'instructors' ? 'var(--text-primary)' : 'var(--text-muted)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><GraduationCap size={16} /> Instructors</div>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
          {activeTab === 'students' ? 'Student Roster' : 'Instructor List'}
        </span>
        <span style={{
          marginLeft: 'auto', background: 'var(--bg-tertiary)', borderRadius: '999px', padding: '1px 8px', fontSize: '0.75rem', color: 'var(--text-secondary)'
        }}>{usersList.length}</span>
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
        Upload a CSV/spreadsheet with emails and avatar URLs to authorize {activeTab} for login.
      </p>

      {/* Upload CSV Button */}
      <button
        className="btn btn-primary"
        style={{ width: '100%', gap: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        <Upload size={14} />
        {uploading ? 'Uploading...' : 'Upload CSV / Spreadsheet'}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.tsv,.txt,.xlsx,.xls"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {/* Manual add */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg-tertiary)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        <input
          type="email"
          placeholder="Email address..."
          value={manualEmail}
          onChange={e => setManualEmail(e.target.value)}
          style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '6px 10px', fontSize: '0.8rem', color: 'var(--text-primary)', outline: 'none' }}
        />
        <input
          type="url"
          placeholder="Avatar URL (optional)..."
          value={manualAvatarUrl}
          onChange={e => setManualAvatarUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddManual()}
          style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '6px 10px', fontSize: '0.8rem', color: 'var(--text-primary)', outline: 'none' }}
        />
        <button
          className="btn btn-outline"
          style={{ padding: '6px 10px', display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '2px' }}
          onClick={handleAddManual}
          disabled={!manualEmail.trim()}
        >
          <PlusCircle size={14} /> Add {activeTab === 'students' ? 'Student' : 'Instructor'}
        </button>
      </div>

      {/* Status message */}
      {status && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 10px', borderRadius: '6px', background: status.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: status.type === 'success' ? '#4ade80' : '#f87171', fontSize: '0.78rem' }}>
          {status.type === 'success' ? <CheckCircle size={13} style={{ marginTop: 1, flexShrink: 0 }} /> : <AlertCircle size={13} style={{ marginTop: 1, flexShrink: 0 }} />}
          {status.message}
          <button onClick={() => setStatus(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}><X size={12} /></button>
        </div>
      )}

      {/* Roster list */}
      <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '16px' }}>Loading...</p>
        ) : usersList.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '16px' }}>
            No {activeTab} authorized yet.
          </p>
        ) : (
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {usersList.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', padding: '7px 10px', borderBottom: '1px solid var(--border-color)', gap: '10px' }}>
                <img 
                  src={u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`} 
                  alt="Avatar" 
                  style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#334155' }} 
                />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', flex: 1, wordBreak: 'break-all' }}>{u.email}</span>
                <button onClick={() => handleRemove(u.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', borderRadius: '4px', display: 'flex' }} title="Remove">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {usersList.length > 0 && (
        <button
          className="btn btn-outline"
          style={{ width: '100%', fontSize: '0.78rem', gap: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', borderColor: '#f87171' }}
          onClick={handleClearAll}
        >
          <Trash2 size={13} /> Clear All {activeTab}
        </button>
      )}

      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
        <strong>CSV format:</strong> Include emails and optionally avatar URLs in any column.
      </p>
    </div>
  );
};

export default RosterPanel;
