import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import './Auth/AuthModal.css';

const PromptModal = ({ isOpen, onClose, onConfirm, title, subtitle, defaultValue = '', placeholder = '' }) => {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      // Auto-focus and select text after rendering
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(value);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        
        <h2>{title}</h2>
        {subtitle && <p className="modal-subtitle" style={{ marginBottom: '16px' }}>{subtitle}</p>}
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              required
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Confirm</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PromptModal;
