import React from 'react';

const HelpPanel = () => {
  return (
    <div className="help-panel" style={{ padding: '16px', color: 'var(--text-primary)', fontFamily: 'var(--font-primary)' }}>
      <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.1rem', color: 'var(--accent-primary)' }}>Editor Shortcuts</h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
        The code editor supports standard Monaco IDE keystrokes. Here are some of the most useful ones:
      </p>
      
      <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-light)' }}>Action</th>
              <th style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-light)' }}>Windows / Linux</th>
              <th style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-light)' }}>Mac</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-light)' }}>Find</td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-light)' }}><kbd style={kbdStyle}>Ctrl</kbd> + <kbd style={kbdStyle}>F</kbd></td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-light)' }}><kbd style={kbdStyle}>Cmd</kbd> + <kbd style={kbdStyle}>F</kbd></td>
            </tr>
            <tr>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-light)' }}>Replace</td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-light)' }}><kbd style={kbdStyle}>Ctrl</kbd> + <kbd style={kbdStyle}>H</kbd></td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-light)' }}><kbd style={kbdStyle}>Cmd</kbd> + <kbd style={kbdStyle}>Option</kbd> + <kbd style={kbdStyle}>F</kbd></td>
            </tr>
            <tr>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-light)' }}>Go to line</td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-light)' }}><kbd style={kbdStyle}>Ctrl</kbd> + <kbd style={kbdStyle}>G</kbd></td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-light)' }}><kbd style={kbdStyle}>Ctrl</kbd> + <kbd style={kbdStyle}>G</kbd></td>
            </tr>
            <tr>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-light)' }}>Matching bracket</td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-light)' }}><kbd style={kbdStyle}>Ctrl</kbd> + <kbd style={kbdStyle}>Shift</kbd> + <kbd style={kbdStyle}>\</kbd></td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-light)' }}><kbd style={kbdStyle}>Cmd</kbd> + <kbd style={kbdStyle}>Shift</kbd> + <kbd style={kbdStyle}>\</kbd></td>
            </tr>
            <tr>
              <td style={{ padding: '10px 12px' }}>Command Palette</td>
              <td style={{ padding: '10px 12px' }}><kbd style={kbdStyle}>F1</kbd></td>
              <td style={{ padding: '10px 12px' }}><kbd style={kbdStyle}>F1</kbd></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const kbdStyle = {
  backgroundColor: 'var(--bg-tertiary)',
  border: '1px solid var(--border-light)',
  borderRadius: '3px',
  padding: '2px 5px',
  fontSize: '0.8rem',
  fontFamily: 'monospace',
  boxShadow: '0 1px 1px rgba(0,0,0,0.2)'
};

export default HelpPanel;
