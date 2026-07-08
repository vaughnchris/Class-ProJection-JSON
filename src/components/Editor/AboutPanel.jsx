import React from 'react';
import { 
  Sparkles, 
  Terminal, 
  Files, 
  Trash2, 
  RefreshCw, 
  GraduationCap, 
  Keyboard 
} from 'lucide-react';

const AboutPanel = () => {
  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      backgroundColor: '#1e1e24',
      color: '#f8fafc',
      padding: '40px',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      gap: '32px',
      boxSizing: 'border-box'
    }}>
      {/* Header section */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: '24px',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: '-20px',
          left: '-20px',
          width: '150px',
          height: '150px',
          background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none'
        }}></div>
        
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 800,
          margin: 0,
          background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Sparkles size={36} style={{ color: '#3b82f6' }} /> Class Projection IDE
        </h1>
        <p style={{
          fontSize: '1.1rem',
          color: '#94a3b8',
          marginTop: '8px',
          marginBottom: 0,
          fontWeight: 400
        }}>
          A premium multi-user workspace for real-time code presentations, execution, and collaborative classroom exercises.
        </p>
      </div>

      {/* Feature Grid */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '20px', color: '#cbd5e1' }}>
          Platform Highlights
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px'
        }}>
          {/* Card 1: Multi-file FS */}
          <div style={cardStyle}>
            <div style={iconWrapperStyle('#3b82f6')}>
              <Files size={20} />
            </div>
            <h3 style={cardTitleStyle}>Workspace Filesystem</h3>
            <p style={cardDescStyle}>
              Create, rename, and organize <strong>.py</strong>, <strong>.txt</strong>, <strong>.csv</strong>, and <strong>.tsv</strong> files in the sidebar explorer.
            </p>
          </div>

          {/* Card 2: Pyodide imports */}
          <div style={cardStyle}>
            <div style={iconWrapperStyle('#10b981')}>
              <Terminal size={20} />
            </div>
            <h3 style={cardTitleStyle}>Memory Modules & Data</h3>
            <p style={cardDescStyle}>
              Standard Python <code>import</code> statements and file reads (like <code>open()</code>) work seamlessly with all workspace files.
            </p>
          </div>

          {/* Card 3: Realtime sync */}
          <div style={cardStyle}>
            <div style={iconWrapperStyle('#8b5cf6')}>
              <RefreshCw size={20} />
            </div>
            <h3 style={cardTitleStyle}>Real-time Presentation Sync</h3>
            <p style={cardDescStyle}>
              Synchronize lecture codes in broadcast mode, release workspaces to independent execution, or hand over copies for student edits.
            </p>
          </div>

          {/* Card 4: Drag delete */}
          <div style={cardStyle}>
            <div style={iconWrapperStyle('#ef4444')}>
              <Trash2 size={20} />
            </div>
            <h3 style={cardTitleStyle}>Drag-and-Drop Trash</h3>
            <p style={cardDescStyle}>
              Permanently trash custom files in the File Explorer by dragging and dropping them into the header recycle bin.
            </p>
          </div>
        </div>
      </div>

      {/* Role Instructions section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
        marginTop: '8px'
      }}>
        <div style={infoBoxStyle}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px 0', fontSize: '1.1rem', color: '#60a5fa' }}>
            <GraduationCap size={18} /> Presentation Guide
          </h3>
          <ul style={listStyle}>
            <li>Use the chevron buttons in the tab bar to adjust font size dynamically.</li>
            <li>Press <strong>Run</strong> in the console to run the active tab script in the virtual environment.</li>
            <li>Toggle <strong>Allow Edit</strong> to give copies of the active lecture scripts to students instantly.</li>
          </ul>
        </div>

        <div style={infoBoxStyle}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px 0', fontSize: '1.1rem', color: '#10b981' }}>
            <Keyboard size={18} /> Quick Shortcuts
          </h3>
          <ul style={listStyle}>
            <li>Double-click any file in the Explorer list or Tab bar to rename it.</li>
            <li>Click the <code>✕</code> on a tab to hide/close the tab. Reopen it anytime from the Explorer.</li>
            <li>Click the **Upload** icon next to the <code>+</code> button to import files directly from your computer.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Component inline styles
const cardStyle = {
  backgroundColor: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '12px',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  transition: 'transform 0.2s, border-color 0.2s'
};

const iconWrapperStyle = (color) => ({
  width: '40px',
  height: '40px',
  borderRadius: '8px',
  backgroundColor: `${color}15`,
  color: color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
});

const cardTitleStyle = {
  fontSize: '1.1rem',
  fontWeight: 600,
  margin: 0,
  color: '#f1f5f9'
};

const cardDescStyle = {
  fontSize: '0.9rem',
  color: '#94a3b8',
  margin: 0,
  lineHeight: '1.5'
};

const infoBoxStyle = {
  backgroundColor: 'rgba(255,255,255,0.02)',
  borderLeft: '4px solid rgba(255,255,255,0.1)',
  padding: '20px',
  borderRadius: '0 12px 12px 0'
};

const listStyle = {
  margin: 0,
  paddingLeft: '20px',
  fontSize: '0.88rem',
  color: '#cbd5e1',
  lineHeight: '1.6',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
};

export default AboutPanel;
