import React, { useState, useEffect } from 'react';
import { Copy, FileJson, Check, Terminal, AlertCircle } from 'lucide-react';
import useStore from '../../store/useStore';
import './JsonInspectorPanel.css';

// Recursive Tree Node Component
const TreeNode = ({ label, value, path, onSelectPath, selectedPath }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);
  const pathStr = path.map(p => typeof p === 'number' ? `[${p}]` : `['${p}']`).join('');
  const isSelected = selectedPath === pathStr;

  const toggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleSelect = (e) => {
    e.stopPropagation();
    onSelectPath(path, value);
  };

  // Format primitives
  const renderPrimitive = (val) => {
    if (val === null) return <span className="tree-val-null">null</span>;
    if (typeof val === 'boolean') return <span className="tree-val-bool">{val ? 'true' : 'false'}</span>;
    if (typeof val === 'number') return <span className="tree-val-num">{val}</span>;
    return <span className="tree-val-str">"{val}"</span>;
  };

  if (!isObject) {
    return (
      <div className={`tree-node primitive ${isSelected ? 'selected' : ''}`} onClick={handleSelect}>
        <span className="tree-label">{label}:</span>
        <span className="tree-value">{renderPrimitive(value)}</span>
      </div>
    );
  }

  const keys = Object.keys(value);
  const isEmpty = keys.length === 0;

  return (
    <div className={`tree-node branch ${isSelected ? 'selected' : ''}`} onClick={handleSelect}>
      <div className="tree-branch-header" onClick={toggleExpand}>
        <span className="tree-toggle-arrow">{isEmpty ? ' ' : (isExpanded ? '▼' : '▶')}</span>
        <span className="tree-label">{label}:</span>
        <span className="tree-type">{isArray ? `Array[${keys.length}]` : `Object {${keys.length}}`}</span>
      </div>
      
      {isExpanded && !isEmpty && (
        <div className="tree-children">
          {keys.map(key => {
            const currentKey = isArray ? parseInt(key, 10) : key;
            return (
              <TreeNode 
                key={key} 
                label={key} 
                value={value[key]} 
                path={[...path, currentKey]} 
                onSelectPath={onSelectPath}
                selectedPath={selectedPath}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

const JsonInspectorPanel = () => {
  const tabs = useStore(state => state.tabs);
  const activeTab = useStore(state => state.activeTab);
  
  // Find all JSON files in workspace
  const jsonFiles = tabs.filter(t => t.name && t.name.toLowerCase().endsWith('.json'));
  
  const [selectedFileId, setSelectedFileId] = useState('');
  const [rawText, setRawText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [selectedPath, setSelectedPath] = useState('');
  const [selectedValue, setSelectedValue] = useState(null);
  
  // Initialize with active JSON file if available
  useEffect(() => {
    const activeFile = tabs.find(t => t.id === activeTab);
    if (activeFile && activeFile.name && activeFile.name.toLowerCase().endsWith('.json')) {
      setSelectedFileId(activeFile.id);
      setRawText(activeFile.code);
    } else if (jsonFiles.length > 0) {
      setSelectedFileId(jsonFiles[0].id);
      setRawText(jsonFiles[0].code);
    }
  }, [activeTab, tabs]);

  // Parse text changes
  useEffect(() => {
    if (!rawText.trim()) {
      setParsedData(null);
      setErrorMsg('');
      return;
    }
    try {
      const parsed = JSON.parse(rawText);
      setParsedData(parsed);
      setErrorMsg('');
    } catch (err) {
      setParsedData(null);
      setErrorMsg(err.message);
    }
  }, [rawText]);

  // Handle dropdown file selection
  const handleFileChange = (e) => {
    const fileId = e.target.value;
    setSelectedFileId(fileId);
    const file = tabs.find(t => t.id === fileId);
    if (file) {
      setRawText(file.code);
      setSelectedPath('');
      setSelectedValue(null);
    }
  };

  const handleSelectPath = (path, val) => {
    // Generate Python-style access path
    // Path list like: ["students", 0, "name"]
    // Python path: data["students"][0]["name"]
    const pythonPath = 'data' + path.map(p => typeof p === 'number' ? `[${p}]` : `["${p}"]`).join('');
    setSelectedPath(pythonPath);
    setSelectedValue(val);
  };

  const copyToClipboard = (text, setCopiedFlag) => {
    navigator.clipboard.writeText(text);
    setCopiedFlag(true);
    setTimeout(() => setCopiedFlag(false), 1500);
  };

  // Generate python traversal snippet
  const selectedFileName = tabs.find(t => t.id === selectedFileId)?.name || 'data.json';
  
  const generatedSnippet = `import json

# Load and parse the JSON file
with open("${selectedFileName}", "r") as file:
    data = json.load(file)

# Read the value at the selected key path
value = ${selectedPath || 'data'}
print("Value retrieved:", value)
`;

  const formatJson = () => {
    if (!parsedData) return;
    try {
      const formatted = JSON.stringify(parsedData, null, 2);
      setRawText(formatted);
      // If synced to workspace tab, update it
      const currentFile = tabs.find(t => t.id === selectedFileId);
      if (currentFile) {
        useStore.getState().updateTabCode(selectedFileId, formatted);
      }
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="json-inspector">
      <div className="inspector-section">
        <label className="inspector-label">Select JSON File</label>
        <select 
          className="inspector-select" 
          value={selectedFileId} 
          onChange={handleFileChange}
        >
          {jsonFiles.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
          <option value="custom">-- Paste Custom JSON --</option>
        </select>
      </div>

      {selectedFileId === 'custom' && (
        <div className="inspector-section">
          <label className="inspector-label">Paste JSON Code</label>
          <textarea
            className="inspector-textarea"
            placeholder='{"key": "value"}'
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
        </div>
      )}

      {errorMsg ? (
        <div className="inspector-alert error">
          <AlertCircle size={16} />
          <span>Invalid JSON: {errorMsg}</span>
        </div>
      ) : parsedData ? (
        <div className="inspector-alert success">
          <span>✓ Valid JSON Structure</span>
          <button className="format-btn" onClick={formatJson}>Format/Beautify</button>
        </div>
      ) : null}

      {parsedData && (
        <div className="inspector-split">
          <div className="inspector-section tree-section">
            <label className="inspector-label">JSON Tree (Click nodes to inspect)</label>
            <div className="tree-container">
              <TreeNode 
                label="root" 
                value={parsedData} 
                path={[]} 
                onSelectPath={handleSelectPath}
                selectedPath={selectedPath}
              />
            </div>
          </div>

          <div className="inspector-section code-generator-section">
            <div className="path-display-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="card-lbl">Python Access Path</span>
                {selectedPath && (
                  <button 
                    className="copy-icon-btn" 
                    onClick={() => copyToClipboard(selectedPath, setCopiedPath)}
                  >
                    {copiedPath ? <span className="copied-txt">Copied!</span> : <Copy size={14} />}
                  </button>
                )}
              </div>
              <div className="path-code-val">
                <code>{selectedPath || 'data'}</code>
              </div>
              {selectedValue !== undefined && selectedValue !== null && (
                <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Current Value: <code className="value-preview">{JSON.stringify(selectedValue)}</code>
                </div>
              )}
            </div>

            <div className="snippet-display-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="card-lbl">Generate Python Code Snippet</span>
                <button 
                  className="copy-icon-btn" 
                  onClick={() => copyToClipboard(generatedSnippet, setCopiedSnippet)}
                >
                  {copiedSnippet ? <span className="copied-txt">Copied!</span> : <Copy size={14} />}
                </button>
              </div>
              <div className="snippet-code-val">
                <pre><code>{generatedSnippet}</code></pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JsonInspectorPanel;
