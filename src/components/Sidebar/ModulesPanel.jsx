import React, { useState } from 'react';
import { Search, Copy, Check, ExternalLink, X, Library } from 'lucide-react';
import './ModulesPanel.css';

const PYODIDE_MODULES = [
  {
    name: 'numpy',
    importStmt: 'import numpy as np',
    description: 'Fundamental package for scientific computing with N-dimensional arrays, matrix operations, and linear algebra.',
    category: 'Data Science & ML',
    docs: 'https://numpy.org/doc/stable/',
    type: 'Pyodide Pre-compiled',
    commonFunctions: ['np.array()', 'np.arange()', 'np.linspace()', 'np.zeros()', 'np.ones()', 'np.mean()', 'np.std()', 'np.dot()']
  },
  {
    name: 'pandas',
    importStmt: 'import pandas as pd',
    description: 'High-performance data analysis and manipulation library providing flexible DataFrame and Series structures.',
    category: 'Data Science & ML',
    docs: 'https://pandas.pydata.org/docs/',
    type: 'Pyodide Pre-compiled',
    commonFunctions: ['pd.DataFrame()', 'pd.Series()', 'pd.read_csv()', 'df.head()', 'df.info()', 'df.describe()', 'df.groupby()', 'df.merge()']
  },
  {
    name: 'matplotlib',
    importStmt: 'import matplotlib.pyplot as plt',
    description: 'Comprehensive plotting library for creating static, animated, and interactive visualizations in Python.',
    category: 'Visualization',
    docs: 'https://matplotlib.org/stable/contents.html',
    type: 'Pyodide Pre-compiled',
    commonFunctions: ['plt.plot()', 'plt.show()', 'plt.scatter()', 'plt.bar()', 'plt.xlabel()', 'plt.ylabel()', 'plt.title()', 'plt.legend()']
  },
  {
    name: 'scipy',
    importStmt: 'import scipy',
    description: 'Library for scientific computing containing modules for optimization, integration, interpolation, and signal processing.',
    category: 'Math & Science',
    docs: 'https://docs.scipy.org/doc/scipy/',
    type: 'Pyodide Pre-compiled',
    commonFunctions: ['scipy.integrate', 'scipy.optimize.minimize()', 'scipy.stats', 'scipy.linalg', 'scipy.interpolate']
  },
  {
    name: 'scikit-learn',
    importStmt: 'import sklearn',
    description: 'Machine learning library featuring classification, regression, clustering, and data preprocessing algorithms.',
    category: 'Data Science & ML',
    docs: 'https://scikit-learn.org/stable/',
    type: 'Pyodide Pre-compiled',
    commonFunctions: ['sklearn.model_selection.train_test_split()', 'sklearn.linear_model.LinearRegression()', 'model.fit()', 'model.predict()', 'model.score()']
  },
  {
    name: 'sympy',
    importStmt: 'import sympy as sp',
    description: 'Computer algebra system (CAS) for symbolic mathematics, equation solving, calculus, and algebra.',
    category: 'Math & Science',
    docs: 'https://docs.sympy.org/latest/index.html',
    type: 'Pyodide Pre-compiled',
    commonFunctions: ['sp.Symbol()', 'sp.symbols()', 'sp.solve()', 'sp.diff()', 'sp.integrate()', 'sp.limit()', 'sp.Matrix()']
  },
  {
    name: 'networkx',
    importStmt: 'import networkx as nx',
    description: 'Library for creating, manipulating, and studying the structure, dynamics, and functions of complex networks.',
    category: 'Math & Science',
    docs: 'https://networkx.org/documentation/stable/',
    type: 'Pyodide Pre-compiled',
    commonFunctions: ['nx.Graph()', 'nx.DiGraph()', 'G.add_node()', 'G.add_edge()', 'nx.draw()', 'nx.shortest_path()']
  },
  {
    name: 'beautifulsoup4',
    importStmt: 'from bs4 import BeautifulSoup',
    description: 'Python library for pulling data out of HTML and XML files, facilitating web scraping and DOM inspection.',
    category: 'Web & Scraping',
    docs: 'https://www.crummy.com/software/BeautifulSoup/bs4/doc/',
    type: 'Pyodide Pre-compiled',
    commonFunctions: ['BeautifulSoup(html_content, "html.parser")', 'soup.find()', 'soup.find_all()', 'soup.select()', 'tag.get_text()', 'tag.get()']
  },
  {
    name: 'requests',
    importStmt: 'import requests',
    description: 'Elegant and simple HTTP library, patched inside Pyodide to run network requests using browser fetch.',
    category: 'Web & Scraping',
    docs: 'https://requests.readthedocs.io/',
    type: 'Pyodide Pre-compiled',
    commonFunctions: ['requests.get()', 'requests.post()', 'response.status_code', 'response.json()', 'response.text', 'response.headers']
  },
  {
    name: 'urllib3',
    importStmt: 'import urllib3',
    description: 'Sanitized and thread-safe HTTP client with request retries, connection pooling, and redirect helpers.',
    category: 'Web & Scraping',
    docs: 'https://urllib3.readthedocs.io/',
    type: 'Pyodide Pre-compiled',
    commonFunctions: ['urllib3.PoolManager()', 'http.request()', 'response.data', 'response.status']
  },
  {
    name: 'pillow',
    importStmt: 'from PIL import Image',
    description: 'Python Imaging Library adding extensive image file format support and image processing filters.',
    category: 'Utilities',
    docs: 'https://pillow.readthedocs.io/',
    type: 'Pyodide Pre-compiled',
    commonFunctions: ['Image.open()', 'img.save()', 'img.resize()', 'img.crop()', 'img.rotate()']
  },
  {
    name: 'sqlite3',
    importStmt: 'import sqlite3',
    description: 'Built-in database module providing a lightweight, serverless relational database engine.',
    category: 'Database',
    docs: 'https://docs.python.org/3/library/sqlite3.html',
    type: 'Standard Library',
    commonFunctions: ['sqlite3.connect()', 'conn.cursor()', 'cursor.execute()', 'cursor.fetchall()', 'conn.commit()', 'conn.close()']
  },
  {
    name: 'micropip',
    importStmt: 'import micropip',
    description: 'Pyodide Package Installer used to install pure Python wheels from PyPI at runtime.',
    category: 'Core',
    docs: 'https://pyodide.org/en/stable/usage/loading-packages.html#micropip',
    type: 'Core Module',
    commonFunctions: ['await micropip.install()', 'micropip.list()']
  },
  {
    name: 'plotly',
    importStmt: 'import plotly.express as px',
    description: 'Interactive graphing library creating publication-quality charts like line, scatter, and bar plots.',
    category: 'Visualization',
    docs: 'https://plotly.com/python/',
    type: 'Pyodide Pre-compiled',
    commonFunctions: ['px.line()', 'px.scatter()', 'px.bar()', 'px.histogram()', 'px.box()', 'fig.show()']
  },
  {
    name: 'sqlalchemy',
    importStmt: 'import sqlalchemy',
    description: 'SQL Database toolkit and Object Relational Mapper (ORM) for object-oriented database interactions.',
    category: 'Database',
    docs: 'https://www.sqlalchemy.org/',
    type: 'Pyodide Pre-compiled',
    commonFunctions: ['create_engine()', 'declarative_base()', 'Column()', 'Integer()', 'String()', 'sessionmaker()']
  },
  {
    name: 'statsmodels',
    importStmt: 'import statsmodels.api as sm',
    description: 'Package for estimating statistical models, conducting statistical tests, and data exploration.',
    category: 'Data Science & ML',
    docs: 'https://www.statsmodels.org/stable/',
    type: 'Pyodide Pre-compiled',
    commonFunctions: ['sm.OLS()', 'results.fit()', 'results.summary()']
  },
  {
    name: 'biopython',
    importStmt: 'import Bio',
    description: 'Library containing computational biology, genomics, and bioinformatics tools for molecular data analysis.',
    category: 'Math & Science',
    docs: 'https://biopython.org/wiki/Documentation',
    type: 'Pyodide Pre-compiled',
    commonFunctions: ['Seq()', 'SeqIO.parse()', 'AlignIO.read()', 'pairwise2.align']
  },
  {
    name: 'scikit-image',
    importStmt: 'import skimage',
    description: 'Collection of image processing algorithms including segmentation, feature detection, and color space conversion.',
    category: 'Utilities',
    docs: 'https://scikit-image.org/docs/stable/',
    type: 'Pyodide Pre-compiled',
    commonFunctions: ['io.imread()', 'filters.gaussian()', 'color.rgb2gray()', 'transform.resize()']
  },
  {
    name: 'nltk',
    importStmt: 'import nltk',
    description: 'Natural Language Toolkit featuring tokenizers, taggers, classifiers, and NLP datasets.',
    category: 'Data Science & ML',
    docs: 'https://www.nltk.org/',
    type: 'Pyodide Pre-compiled',
    commonFunctions: ['nltk.word_tokenize()', 'nltk.pos_tag()', 'nltk.download()']
  },
  {
    name: 'math',
    importStmt: 'import math',
    description: 'Built-in library providing mathematical functions (trigonometric, exponential, logarithmic) and constants.',
    category: 'Core',
    docs: 'https://docs.python.org/3/library/math.html',
    type: 'Standard Library',
    commonFunctions: ['math.sqrt()', 'math.sin()', 'math.cos()', 'math.pi', 'math.e', 'math.log()', 'math.ceil()', 'math.floor()']
  },
  {
    name: 'json',
    importStmt: 'import json',
    description: 'Standard library module for encoding, decoding, and manipulating JSON file structures.',
    category: 'Core',
    docs: 'https://docs.python.org/3/library/json.html',
    type: 'Standard Library',
    commonFunctions: ['json.dumps()', 'json.loads()', 'json.dump()', 'json.load()']
  },
  {
    name: 'datetime',
    importStmt: 'import datetime',
    description: 'Standard library classes for working with times, dates, intervals, and timezone offsets.',
    category: 'Core',
    docs: 'https://docs.python.org/3/library/datetime.html',
    type: 'Standard Library',
    commonFunctions: ['datetime.datetime.now()', 'datetime.date.today()', 'dt.strftime()', 'datetime.timedelta()']
  },
  {
    name: 'random',
    importStmt: 'import random',
    description: 'Standard library utility for pseudo-random number generation, shuffling, and item selections.',
    category: 'Core',
    docs: 'https://docs.python.org/3/library/random.html',
    type: 'Standard Library',
    commonFunctions: ['random.random()', 'random.randint()', 'random.choice()', 'random.shuffle()', 'random.sample()']
  },
  {
    name: 're',
    importStmt: 'import re',
    description: 'Regular expression module in the standard library for powerful pattern parsing and string replacement.',
    category: 'Core',
    docs: 'https://docs.python.org/3/library/re.html',
    type: 'Standard Library',
    commonFunctions: ['re.search()', 're.match()', 're.findall()', 're.sub()', 're.compile()', 're.split()']
  },
  {
    name: 'collections',
    importStmt: 'import collections',
    description: 'Specialized container data types extending standard dict, list, set, and tuple (e.g. Counter, OrderedDict, deque).',
    category: 'Core',
    docs: 'https://docs.python.org/3/library/collections.html',
    type: 'Standard Library',
    commonFunctions: ['collections.Counter()', 'collections.defaultdict()', 'collections.deque()', 'collections.OrderedDict()']
  },
  {
    name: 'itertools',
    importStmt: 'import itertools',
    description: 'Built-in module creating memory-efficient iterators for fast looping, combinations, and permutations.',
    category: 'Core',
    docs: 'https://docs.python.org/3/library/itertools.html',
    type: 'Standard Library',
    commonFunctions: ['itertools.count()', 'itertools.cycle()', 'itertools.repeat()', 'itertools.chain()', 'itertools.permutations()', 'itertools.combinations()']
  }
];

const CATEGORIES = ['All', 'Core', 'Data Science & ML', 'Math & Science', 'Visualization', 'Web & Scraping', 'Database', 'Utilities'];

const ModulesPanel = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [copiedPkg, setCopiedPkg] = useState(null);

  const handleCopy = (pkgName, importStmt) => {
    navigator.clipboard.writeText(importStmt);
    setCopiedPkg(pkgName);
    setTimeout(() => {
      setCopiedPkg(null);
    }, 1500);
  };

  const filteredModules = PYODIDE_MODULES.filter((mod) => {
    const matchesCategory = activeCategory === 'All' || mod.category === activeCategory;
    const matchesSearch = mod.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          mod.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          mod.importStmt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryColorClass = (cat) => {
    switch (cat) {
      case 'Core':
        return 'badge-core';
      case 'Data Science & ML':
        return 'badge-ds';
      case 'Math & Science':
        return 'badge-math';
      case 'Visualization':
        return 'badge-visual';
      case 'Web & Scraping':
        return 'badge-web';
      case 'Database':
        return 'badge-db';
      default:
        return 'badge-utility';
    }
  };

  const highlightText = (text, highlight) => {
    if (!highlight.trim()) {
      return <span>{text}</span>;
    }
    const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <mark key={i} className="search-highlight">{part}</mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className="modules-panel-container">
      {/* Search Header */}
      <div className="modules-search-box">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Search modules (e.g. numpy, data)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="modules-search-input"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="search-clear-btn" title="Clear search">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category Filter Chips */}
      <div className="category-scroll-container">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`category-chip ${activeCategory === cat ? 'active' : ''}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Package List Content */}
      <div className="modules-list">
        {filteredModules.length > 0 ? (
          filteredModules.map((mod) => (
            <div 
              key={mod.name} 
              className="module-card"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({
                  name: mod.name,
                  importStmt: mod.importStmt,
                  commonFunctions: mod.commonFunctions || []
                }));
                e.dataTransfer.effectAllowed = 'copy';
              }}
            >
              <div className="module-card-header">
                <span className="module-title">
                  {highlightText(mod.name, searchQuery)}
                </span>
                <span className={`module-category-badge ${getCategoryColorClass(mod.category)}`}>
                  {mod.category}
                </span>
              </div>

              <div className="module-type-tag">
                {mod.type}
              </div>

              <p className="module-description">
                {highlightText(mod.description, searchQuery)}
              </p>

              <div className="module-import-container">
                <code>{highlightText(mod.importStmt, searchQuery)}</code>
                <button
                  className={`copy-stmt-btn ${copiedPkg === mod.name ? 'copied' : ''}`}
                  onClick={() => handleCopy(mod.name, mod.importStmt)}
                  title="Copy import statement"
                >
                  {copiedPkg === mod.name ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>

              <div className="module-actions">
                <a
                  href={mod.docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="module-doc-link"
                >
                  Reference Docs <ExternalLink size={12} style={{ marginLeft: '4px' }} />
                </a>
              </div>
            </div>
          ))
        ) : (
          <div className="modules-empty-state">
            <Library size={28} className="empty-icon" />
            <p>No modules found matching your query.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModulesPanel;
