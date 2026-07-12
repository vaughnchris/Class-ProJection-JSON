import React, { useState } from 'react';
import { Upload, Play, Monitor, Trash2 } from 'lucide-react';
import useStore from '../../store/useStore';
import { db, storage } from '../../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';

const PresentationPanel = () => {
  const { user, role, sessionId, addTab, tabs, setTabs, updateSession } = useStore();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  const isInstructor = role === 'instructor' || role === 'administrator';

  // Find presentations in current tabs
  const presentationTabs = tabs.filter(t => t.isPresentation);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are supported for presentations. Please export your slides as a PDF.');
      return;
    }

    if (!sessionId || !user) {
      setError('You must be in an active session to upload a presentation.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const filename = `presentation_${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `presentations/${sessionId}/${filename}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Upload error:", error);
          setError('Failed to upload presentation.');
          setIsUploading(false);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Create a new tab for this presentation
            const newTabId = `presentation_${Date.now()}`;
            const newTab = {
              id: newTabId,
              name: file.name,
              isPresentation: true,
              presentationUrl: downloadURL,
              currentSlide: 1,
              isOpen: true,
              isCloseable: true
            };

            const newTabs = [...tabs, newTab];
            setTabs(newTabs);

            // Update session document with new tabs
            await updateDoc(doc(db, 'sessions', sessionId), {
              instructorTabs: newTabs,
              instructorActiveTab: newTabId
            });

            // Activate it locally
            useStore.getState().setActiveTab(newTabId);

            setIsUploading(false);
          } catch (innerErr) {
            console.error("Post-upload processing error:", innerErr);
            setError(`Upload finished, but processing failed: ${innerErr.message}`);
            setIsUploading(false);
          }
        }
      );
    } catch (err) {
      console.error(err);
      setError('Failed to process presentation.');
      setIsUploading(false);
    }
  };

  const handleBroadcast = async (tabId) => {
    if (!sessionId) return;
    
    // Switch to this tab locally
    useStore.getState().setActiveTab(tabId);

    // Turn on sharing and switch to broadcast mode
    await updateSession({ 
      isSharing: true,
      activeMode: 'broadcast',
      instructorActiveTab: tabId
    });
  };

  const handleDelete = async (tabId) => {
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    if (sessionId) {
      await updateDoc(doc(db, 'sessions', sessionId), {
        instructorTabs: newTabs
      });
    }
  };

  if (!isInstructor) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Students do not have access to upload presentations.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-primary)', overflowY: 'auto' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-secondary)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Monitor size={18} color="var(--accent-primary)" />
          Presentations
        </h2>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ border: '2px dashed var(--border-light)', borderRadius: '8px', padding: '24px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', transition: 'border-color 0.2s' }}>
          <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            <Upload size={24} />
            <span>{isUploading ? `Uploading... ${Math.round(uploadProgress)}%` : 'Upload PDF Presentation'}</span>
            <input type="file" accept="application/pdf" onChange={handleFileUpload} disabled={isUploading} style={{ display: 'none' }} />
          </label>
          {error && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '12px' }}>{error}</div>}
        </div>

        {presentationTabs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Available Slides</h3>
            {presentationTabs.map(tab => (
              <div key={tab.id} style={{ border: '1px solid var(--border-light)', borderRadius: '8px', padding: '12px', backgroundColor: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                    {tab.name}
                  </div>
                  <button onClick={() => handleDelete(tab.id)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Current Slide: {tab.currentSlide}
                </div>
                <button 
                  className="btn btn-primary" 
                  style={{ display: 'flex', justifyContent: 'center', gap: '8px', width: '100%' }}
                  onClick={() => handleBroadcast(tab.id)}
                >
                  <Play size={14} /> Broadcast
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PresentationPanel;
