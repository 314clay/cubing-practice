import React, { useState } from 'react';
import './ZBLLCaseSelector.css';

// ZBLL set definitions with subcategories
const ZBLL_SETS = {
  T: {
    name: 'T',
    subcategories: ['Diagonal', 'Rows', 'Front', 'Back', 'Left', 'Right'],
    casesPerSubcat: 12,
  },
  U: {
    name: 'U',
    subcategories: ['Diagonal', 'Rows', 'Front', 'Back', 'Left', 'Right'],
    casesPerSubcat: 12,
  },
  L: {
    name: 'L',
    subcategories: ['Diagonal', 'Rows', 'Front', 'Back', 'Left', 'Right'],
    casesPerSubcat: 12,
  },
  H: {
    name: 'H',
    subcategories: ['Diagonal', 'Rows', 'Columns', 'Para'],
    casesPerSubcat: 10,
  },
  Pi: {
    name: 'Pi',
    subcategories: ['Diagonal', 'Rows', 'Front', 'Back', 'Left', 'Right'],
    casesPerSubcat: 12,
  },
  S: {
    name: 'S',
    subcategories: ['Diagonal', 'Rows', 'Front', 'Back', 'Left', 'Right'],
    casesPerSubcat: 12,
  },
  AS: {
    name: 'AS',
    subcategories: ['Diagonal', 'Rows', 'Front', 'Back', 'Left', 'Right'],
    casesPerSubcat: 12,
  },
};

// Generate case IDs for each set/subcategory
const generateCases = (setKey, subcatIndex, count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${setKey}-${subcatIndex}-${i}`,
    label: `${i + 1}`,
  }));
};

function ZBLLCaseSelector() {
  const [selectedCases, setSelectedCases] = useState(new Set());
  const [expandedSets, setExpandedSets] = useState(new Set(['T']));

  const toggleCase = (caseId) => {
    setSelectedCases((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(caseId)) {
        newSet.delete(caseId);
      } else {
        newSet.add(caseId);
      }
      return newSet;
    });
  };

  const toggleSet = (setKey) => {
    setExpandedSets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(setKey)) {
        newSet.delete(setKey);
      } else {
        newSet.add(setKey);
      }
      return newSet;
    });
  };

  const selectAllInSubcat = (setKey, subcatIndex, count) => {
    const cases = generateCases(setKey, subcatIndex, count);
    setSelectedCases((prev) => {
      const newSet = new Set(prev);
      cases.forEach((c) => newSet.add(c.id));
      return newSet;
    });
  };

  const deselectAllInSubcat = (setKey, subcatIndex, count) => {
    const cases = generateCases(setKey, subcatIndex, count);
    setSelectedCases((prev) => {
      const newSet = new Set(prev);
      cases.forEach((c) => newSet.delete(c.id));
      return newSet;
    });
  };

  const selectAllInSet = (setKey) => {
    const set = ZBLL_SETS[setKey];
    set.subcategories.forEach((_, subcatIndex) => {
      selectAllInSubcat(setKey, subcatIndex, set.casesPerSubcat);
    });
  };

  const deselectAllInSet = (setKey) => {
    const set = ZBLL_SETS[setKey];
    set.subcategories.forEach((_, subcatIndex) => {
      deselectAllInSubcat(setKey, subcatIndex, set.casesPerSubcat);
    });
  };

  const getSetSelectionState = (setKey) => {
    const set = ZBLL_SETS[setKey];
    let selectedCount = 0;
    let totalCount = 0;

    set.subcategories.forEach((_, subcatIndex) => {
      const cases = generateCases(setKey, subcatIndex, set.casesPerSubcat);
      cases.forEach((c) => {
        totalCount++;
        if (selectedCases.has(c.id)) selectedCount++;
      });
    });

    if (selectedCount === 0) return 'none';
    if (selectedCount === totalCount) return 'all';
    return 'partial';
  };

  const getSubcatSelectionState = (setKey, subcatIndex, count) => {
    const cases = generateCases(setKey, subcatIndex, count);
    const selectedCount = cases.filter((c) => selectedCases.has(c.id)).length;

    if (selectedCount === 0) return 'none';
    if (selectedCount === count) return 'all';
    return 'partial';
  };

  const handleDone = () => {
    alert(`Selected ${selectedCases.size} cases for practice!`);
  };

  const handleRecap = () => {
    alert(`Recap mode: ${selectedCases.size} cases`);
  };

  return (
    <div className="zbll-selector">
      <div className="zbll-header">
        <h1>ZBLL Case Selection</h1>
        <p className="zbll-instructions">
          Select cases to practice. <span className="green-text">Green</span> = all selected,{' '}
          <span className="yellow-text">Yellow</span> = some selected,{' '}
          <span className="white-text">White</span> = none selected.
        </p>
      </div>

      <div className="zbll-content">
        <div className="zbll-sets">
          {Object.entries(ZBLL_SETS).map(([setKey, set]) => {
            const selectionState = getSetSelectionState(setKey);
            const isExpanded = expandedSets.has(setKey);

            return (
              <div key={setKey} className="zbll-set">
                <div
                  className={`zbll-set-header ${selectionState}`}
                  onClick={() => toggleSet(setKey)}
                >
                  <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                  <span className="set-name">{set.name}</span>
                  <span className="set-count">
                    {set.subcategories.length * set.casesPerSubcat} cases
                  </span>
                  <div className="set-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="small-btn"
                      onClick={() => selectAllInSet(setKey)}
                      title="Select all"
                    >
                      ⊕
                    </button>
                    <button
                      className="small-btn"
                      onClick={() => deselectAllInSet(setKey)}
                      title="Deselect all"
                    >
                      ⊖
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="zbll-subcategories">
                    {set.subcategories.map((subcatName, subcatIndex) => {
                      const subcatState = getSubcatSelectionState(
                        setKey,
                        subcatIndex,
                        set.casesPerSubcat
                      );
                      const cases = generateCases(setKey, subcatIndex, set.casesPerSubcat);

                      return (
                        <div key={subcatIndex} className="zbll-subcategory">
                          <div className={`subcat-header ${subcatState}`}>
                            <span className="subcat-name">{subcatName}</span>
                            <div className="subcat-actions">
                              <button
                                className="small-btn"
                                onClick={() =>
                                  selectAllInSubcat(setKey, subcatIndex, set.casesPerSubcat)
                                }
                                title="Select all"
                              >
                                ⊕
                              </button>
                              <button
                                className="small-btn"
                                onClick={() =>
                                  deselectAllInSubcat(setKey, subcatIndex, set.casesPerSubcat)
                                }
                                title="Deselect all"
                              >
                                ⊖
                              </button>
                            </div>
                          </div>
                          <div className="case-grid">
                            {cases.map((caseItem) => (
                              <button
                                key={caseItem.id}
                                className={`case-btn ${selectedCases.has(caseItem.id) ? 'selected' : ''}`}
                                onClick={() => toggleCase(caseItem.id)}
                              >
                                {caseItem.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="zbll-panel">
          <div className="panel-section">
            <h3>Selection Info</h3>
            <p>
              <strong>{selectedCases.size}</strong> cases selected
            </p>
          </div>

          <div className="panel-section">
            <h3>Actions</h3>
            <button className="action-btn primary" onClick={handleDone}>
              Done - Practice Selected
            </button>
            <button className="action-btn" onClick={handleRecap}>
              Recap - Practice Each Once
            </button>
          </div>

          <div className="panel-section">
            <h3>Hotkeys</h3>
            <ul className="hotkey-list">
              <li>
                <kbd>H</kbd> <kbd>L</kbd> <kbd>P</kbd> <kbd>S</kbd> <kbd>T</kbd> <kbd>U</kbd>{' '}
                <kbd>A</kbd> - Select set
              </li>
              <li>
                <kbd>0-5</kbd> - Select subcategory
              </li>
              <li>
                <kbd>Space</kbd> - Start timer
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ZBLLCaseSelector;
