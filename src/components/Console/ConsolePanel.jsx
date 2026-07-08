import React, { useState } from 'react';
import { Terminal, Code, MessageSquare, Play } from 'lucide-react';
import useStore from '../../store/useStore';
import './ConsolePanel.css';

const ConsolePanel = ({ onRunInteractive }) => {
  const [activeTab, setActiveTab] = useState('output');
  const [replInput, setReplInput] = useState('');
  const { consoleOutput, interactiveHistory, isExecuting, isInteractiveExecuting, appendToInteractive } = useStore();

  return (
    <div className="console-panel">
      <div className="console-header">
        <div className="console-tabs">
          <button 
            className={`console-tab ${activeTab === 'output' ? 'active' : ''}`}
            onClick={() => setActiveTab('output')}
          >
            <Terminal size={14} /> Output
          </button>
          <button 
            className={`console-tab ${activeTab === 'interactive' ? 'active' : ''}`}
            onClick={() => setActiveTab('interactive')}
          >
            <Code size={14} /> Interactive
          </button>
          <button 
            className={`console-tab ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => setActiveTab('messages')}
          >
            <MessageSquare size={14} /> Messages
          </button>
        </div>
        <div className="console-actions">
          {/* Add quick actions like clear console here */}
        </div>
      </div>
      
      <div className="console-content">
        {activeTab === 'output' && (
          <div className="terminal-output">
            {consoleOutput.length === 0 && !isExecuting && (
              <div className="empty-state">Ready. Click Run to execute code.</div>
            )}
            
            {consoleOutput.map((out, idx) => (
              <div key={idx} className={`terminal-line ${out.type === 'error' ? 'error-text' : 'system'}`}>
                {out.text}
              </div>
            ))}
            
            {isExecuting && (
              <div className="terminal-line system" style={{ opacity: 0.6 }}>Running...</div>
            )}
          </div>
        )}
        {activeTab === 'interactive' && (
          <div className="terminal-output interactive-mode">
            {interactiveHistory.map((out, idx) => (
              <div key={idx} className={`terminal-line ${out.type === 'error' ? 'error-text' : (out.type === 'input' ? 'input-text' : 'system')}`}>
                {out.text}
              </div>
            ))}
            
            {isInteractiveExecuting && (
              <div className="terminal-line system" style={{ opacity: 0.6 }}>Running...</div>
            )}
            
            <div className="interactive-input-row">
              <span className="prompt">{'>>> '}</span>
              <input 
                type="text" 
                value={replInput}
                onChange={(e) => setReplInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (replInput.trim() === '') return;
                    appendToInteractive('>>> ' + replInput, 'input');
                    if (onRunInteractive) {
                      onRunInteractive(replInput);
                    }
                    setReplInput('');
                  }
                }}
                className="interactive-input"
                placeholder="Type Python code and press Enter..."
                autoFocus
                disabled={isInteractiveExecuting}
              />
            </div>
          </div>
        )}
        {activeTab === 'messages' && (
          <div className="empty-state">No new messages.</div>
        )}
      </div>
    </div>
  );
};

export default ConsolePanel;
