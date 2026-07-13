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
          <Sparkles size={36} style={{ color: '#3b82f6' }} /> Python JSON Explorer
        </h1>
        <p style={{
          fontSize: '1.1rem',
          color: '#94a3b8',
          marginTop: '8px',
          marginBottom: 0,
          fontWeight: 400
        }}>
          A premium multi-user workspace optimized for teaching students how to read, write, parse, and structure JSON files using Python.
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
            <h3 style={cardTitleStyle}>Edit JSON & Python Files</h3>
            <p style={cardDescStyle}>
              Create, rename, and edit <strong>.py</strong> and <strong>.json</strong> files in the Monaco Editor with full schema assistance and syntax highlighting.
            </p>
          </div>

          {/* Card 2: Pyodide imports */}
          <div style={cardStyle}>
            <div style={iconWrapperStyle('#10b981')}>
              <Terminal size={20} />
            </div>
            <h3 style={cardTitleStyle}>Parse & Run Locally</h3>
            <p style={cardDescStyle}>
              Use Python's built-in <code>json</code> module to load files, inspect properties, or write modified dictionaries back to the filesystem.
            </p>
          </div>

          {/* Card 3: JSON Inspector */}
          <div style={cardStyle}>
            <div style={iconWrapperStyle('#8b5cf6')}>
              <RefreshCw size={20} />
            </div>
            <h3 style={cardTitleStyle}>Visual JSON Inspector</h3>
            <p style={cardDescStyle}>
              Open the JSON inspector (the Braces tab in the sidebar) to parse JSON files, view interactive tree hierarchies, and generate Python access queries.
            </p>
          </div>

          {/* Card 4: Filesystem Sync */}
          <div style={cardStyle}>
            <div style={iconWrapperStyle('#ef4444')}>
              <Trash2 size={20} />
            </div>
            <h3 style={cardTitleStyle}>Automatic Filesystem Sync</h3>
            <p style={cardDescStyle}>
              Any new files created or modified by Python during execution (e.g. <code>updated_data.json</code>) automatically sync back to your IDE tabs.
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
            <GraduationCap size={18} /> JSON Parsing Guide
          </h3>
          <ul style={listStyle}>
            <li>Use <code>json.load(file)</code> for reading JSON files into Python dicts/lists.</li>
            <li>Use <code>json.dump(data, file, indent=4)</code> to format and save JSON databases.</li>
            <li>Use the **Run** button to execute scripts and see how console output and file writes synchronize in real time.</li>
          </ul>
        </div>

        <div style={infoBoxStyle}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px 0', fontSize: '1.1rem', color: '#10b981' }}>
            <Keyboard size={18} /> Quick Shortcuts
          </h3>
          <ul style={listStyle}>
            <li>Double-click any file in the Explorer list or Tab bar to rename it. Include <code>.json</code> to enable JSON mode.</li>
            <li>Click the JSON Inspector tab (brackets icon) in the sidebar to visualize keys and auto-build Python retrieval snippets.</li>
            <li>Use the file upload icon next to the <code>+</code> button to import external JSON logs or data.</li>
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
