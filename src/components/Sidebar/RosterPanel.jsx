import React, { useState, useEffect, useRef } from 'react';
import { Upload, Users, Trash2, CheckCircle, AlertCircle, X, PlusCircle } from 'lucide-react';
import { db } from '../../firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';

const ROSTER_COLLECTION = 'authorized_students';

const RosterPanel = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message }
  const [manualEmail, setManualEmail] = useState('');
  const fileInputRef = useRef(null);

  // Load existing roster from Firestore
  const fetchRoster = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, ROSTER_COLLECTION));
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
      setStudents(list);
    } catch (err) {
      console.error('Error fetching roster:', err);
      setStatus({ type: 'error', message: 'Could not load roster.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, []);

  // Parse CSV/TSV lines into email strings
  const parseEmails = (text) => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const emails = new Set();

    lines.forEach(line => {
      // Handle comma or tab-separated rows, take first column or scan for email
      const cells = line.split(/[,\t]/);
      for (const cell of cells) {
        const trimmed = cell.trim().toLowerCase().replace(/^"|"$/g, '');
        // Basic email check
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
          emails.add(trimmed);
          break;
        }
      }
    });

    return [...emails];
  };

  const uploadEmails = async (emails) => {
    if (emails.length === 0) {
      setStatus({ type: 'error', message: 'No valid emails found in the file.' });
      return;
    }
    setUploading(true);
    try {
      const batch = writeBatch(db);
      emails.forEach(email => {
        const ref = doc(db, ROSTER_COLLECTION, email);
        batch.set(ref, { email, authorizedAt: new Date().toISOString() }, { merge: true });
      });
      await batch.commit();
      setStatus({ type: 'success', message: `✓ Added ${emails.length} student${emails.length !== 1 ? 's' : ''} to the authorized list.` });
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
      const emails = parseEmails(evt.target.result);
      uploadEmails(emails);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAddManual = async () => {
    const email = manualEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus({ type: 'error', message: 'Invalid email address.' });
      return;
    }
    setStatus(null);
    await uploadEmails([email]);
    setManualEmail('');
  };

  const handleRemove = async (id) => {
    if (!window.confirm(`Remove ${id} from the authorized list?`)) return;
    try {
      await deleteDoc(doc(db, ROSTER_COLLECTION, id));
      setStudents(prev => prev.filter(s => s.id !== id));
      setStatus({ type: 'success', message: `Removed ${id}.` });
    } catch (err) {
      setStatus({ type: 'error', message: 'Could not remove student.' });
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm(`Remove ALL ${students.length} students from the authorized list? This cannot be undone.`)) return;
    try {
      const batch = writeBatch(db);
      students.forEach(s => batch.delete(doc(db, ROSTER_COLLECTION, s.id)));
      await batch.commit();
      setStudents([]);
      setStatus({ type: 'success', message: 'Roster cleared.' });
    } catch (err) {
      setStatus({ type: 'error', message: 'Could not clear roster.' });
    }
  };

  return (
    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <Users size={16} style={{ color: 'var(--accent-primary)' }} />
        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>Student Roster</span>
        <span style={{
          marginLeft: 'auto',
          background: 'var(--bg-tertiary)',
          borderRadius: '999px',
          padding: '1px 8px',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)'
        }}>{students.length}</span>
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
        Upload a CSV/spreadsheet with student emails to authorize them for login. Only emails on this list can sign in as students.
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
      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          type="email"
          placeholder="Add email manually..."
          value={manualEmail}
          onChange={e => setManualEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddManual()}
          style={{
            flex: 1,
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '0.8rem',
            color: 'var(--text-primary)',
            outline: 'none'
          }}
        />
        <button
          className="btn btn-outline"
          style={{ padding: '6px 10px' }}
          onClick={handleAddManual}
          disabled={!manualEmail.trim()}
        >
          <PlusCircle size={14} />
        </button>
      </div>

      {/* Status message */}
      {status && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          padding: '8px 10px',
          borderRadius: '6px',
          background: status.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          color: status.type === 'success' ? '#4ade80' : '#f87171',
          fontSize: '0.78rem'
        }}>
          {status.type === 'success' ? <CheckCircle size={13} style={{ marginTop: 1, flexShrink: 0 }} /> : <AlertCircle size={13} style={{ marginTop: 1, flexShrink: 0 }} />}
          {status.message}
          <button onClick={() => setStatus(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>
            <X size={12} />
          </button>
        </div>
      )}

      {/* Roster list */}
      <div style={{
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        overflow: 'hidden',
        flexShrink: 0
      }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '16px' }}>Loading...</p>
        ) : students.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '16px' }}>
            No students authorized yet.
          </p>
        ) : (
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {students.map(s => (
              <div key={s.id} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '7px 10px',
                borderBottom: '1px solid var(--border-color)',
                gap: '8px'
              }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', flex: 1, wordBreak: 'break-all' }}>{s.email}</span>
                <button
                  onClick={() => handleRemove(s.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', borderRadius: '4px', display: 'flex' }}
                  title="Remove"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {students.length > 0 && (
        <button
          className="btn btn-outline"
          style={{ width: '100%', fontSize: '0.78rem', gap: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', borderColor: '#f87171' }}
          onClick={handleClearAll}
        >
          <Trash2 size={13} /> Clear All Students
        </button>
      )}

      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
        <strong>CSV format:</strong> one email per row, or a spreadsheet where the first column contains emails.
        Emails matching <code>@yosemite.edu</code> are always instructors regardless of this list.
      </p>
    </div>
  );
};

export default RosterPanel;
