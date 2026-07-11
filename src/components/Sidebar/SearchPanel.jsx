import React, { useState, useMemo } from 'react';
import { Search, BookOpen } from 'lucide-react';
import { pythonReference } from '../../data/pythonReference';
import './SearchPanel.css';

const SearchPanel = () => {
  const [query, setQuery] = useState('');

  const filteredResults = useMemo(() => {
    if (!query.trim()) {
      return pythonReference;
    }
    
    const lowerQuery = query.toLowerCase();
    return pythonReference.filter(item => 
      item.title.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery) ||
      item.category.toLowerCase().includes(lowerQuery) ||
      item.codeExample.toLowerCase().includes(lowerQuery)
    );
  }, [query]);

  return (
    <div className="search-panel">
      <div className="search-header">
        <div className="search-input-container">
          <Search size={16} />
          <input 
            type="text" 
            className="search-input"
            placeholder="Search Python Reference..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div className="search-results">
        {filteredResults.length > 0 ? (
          filteredResults.map((item, index) => (
            <div key={index} className="reference-card">
              <div className="reference-card-header">
                <span className="reference-category">{item.category}</span>
                <span className="reference-title">{item.title}</span>
              </div>
              <div className="reference-description">
                {item.description}
              </div>
              <div className="reference-code-block">
                <pre>
                  <code>{item.codeExample}</code>
                </pre>
              </div>
            </div>
          ))
        ) : (
          <div className="search-empty">
            No reference materials found for "{query}".
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPanel;
