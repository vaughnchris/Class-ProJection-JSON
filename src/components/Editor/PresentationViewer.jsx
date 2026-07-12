import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import useStore from '../../store/useStore';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the worker for pdf.js
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const PresentationViewer = ({ activeTab }) => {
  const { 
    user, 
    role, 
    sessionId, 
    tabs,
    instructorTabs
  } = useStore();

  const isInstructor = role === 'instructor' || role === 'administrator';

  // Find the presentation data in the tabs
  // It could be in storeTabs (if instructor) or instructorTabs (if broadcasted to student)
  const tabData = tabs.find(t => t.id === activeTab) || instructorTabs?.find(t => t.id === activeTab);
  
  const [numPages, setNumPages] = useState(null);
  const [zoom, setZoom] = useState(1);

  if (!tabData || !tabData.presentationUrl) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
        No presentation loaded.
      </div>
    );
  }

  const { presentationUrl, currentSlide = 1 } = tabData;

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const changeSlide = async (newSlide) => {
    if (!isInstructor || !sessionId) return;
    if (newSlide < 1 || newSlide > numPages) return;

    // Update local state by syncing through Firestore
    try {
      // Find the tab in instructor tabs and update it
      const currentTabs = useStore.getState().tabs;
      const updatedTabs = currentTabs.map(t => 
        t.id === activeTab ? { ...t, currentSlide: newSlide } : t
      );
      
      // Update store locally so it feels fast
      useStore.getState().setTabs(updatedTabs);
      
      // Persist to session
      await updateDoc(doc(db, `sessions/${sessionId}`), {
        instructorTabs: updatedTabs
      });
    } catch (err) {
      console.error("Error changing slide:", err);
    }
  };

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, flexDirection: 'column', height: '100%', width: '100%', backgroundColor: '#0f172a', overflow: 'hidden' }}>
      
      {/* Controls Bar (Instructor Only) */}
      {isInstructor && (
        <div style={{ display: 'flex', flexShrink: 0, justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '8px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)', zIndex: 10 }}>
          <button 
            className="btn btn-outline" 
            onClick={() => changeSlide(currentSlide - 1)}
            disabled={currentSlide <= 1}
            style={{ padding: '4px 8px' }}
          >
            <ChevronLeft size={20} /> Prev
          </button>
          
          <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
            Slide {currentSlide} of {numPages || '--'}
          </span>
          
          <button 
            className="btn btn-outline" 
            onClick={() => changeSlide(currentSlide + 1)}
            disabled={numPages && currentSlide >= numPages}
            style={{ padding: '4px 8px' }}
          >
            Next <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* PDF Viewer */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '4px' }}>
        <Document
          file={presentationUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div style={{ color: 'var(--text-secondary)' }}>Loading Presentation...</div>}
          error={<div style={{ color: '#ef4444' }}>Failed to load PDF. Please make sure it's a valid PDF file.</div>}
        >
          <Page 
            pageNumber={currentSlide} 
            renderTextLayer={true}
            renderAnnotationLayer={true}
            width={Math.max(window.innerWidth - 450, 600) * zoom} // Responsive width accounting for sidebar
            className="pdf-page-shadow"
          />
        </Document>
      </div>

      {/* Zoom Controls */}
      <div style={{ display: 'flex', flexShrink: 0, justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '8px', backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-light)', zIndex: 10 }}>
        <button 
          className="btn btn-outline" 
          onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
          style={{ padding: '4px 8px' }}
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', minWidth: '40px', textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button 
          className="btn btn-outline" 
          onClick={() => setZoom(Math.min(3, zoom + 0.1))}
          style={{ padding: '4px 8px' }}
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
      </div>

      <style>{`
        .pdf-page-shadow {
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          border-radius: 4px;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default PresentationViewer;
