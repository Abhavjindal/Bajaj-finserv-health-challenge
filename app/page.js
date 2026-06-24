"use client";

import { useState } from "react";

// Preset payload samples for easy testing by the evaluator
const SAMPLES = [
  {
    name: "Challenge Example",
    description: "Mixed trees, cycle, duplicates, and invalids",
    data: [
      "A->B", "A->C", "B->D", "C->E", "E->F",
      "X->Y", "Y->Z", "Z->X",
      "P->Q", "Q->R",
      "G->H", "G->H", "G->I",
      "hello", "1->2", "A->"
    ]
  },
  {
    name: "Standard Trees",
    description: "Multiple clean independent trees",
    data: [
      "M->N", "M->O", "N->P", "Q->R", "R->S", "T->U"
    ]
  },
  {
    name: "Pure Cycle",
    description: "All nodes form a single loop",
    data: [
      "A->B", "B->C", "C->D", "D->A"
    ]
  },
  {
    name: "Diamond Conflicts",
    description: "Multi-parent inputs resolving first-come-first-served",
    data: [
      "A->D", "B->D", "C->D", "A->B", "B->E"
    ]
  },
  {
    name: "Invalid Edge Formats",
    description: "Various malformed edges",
    data: [
      "hello", "1->2", "A-B", "AB->C", "A->", "->B", "", " A->A "
    ]
  }
];

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("visual"); // visual | json

  // Select a preset sample
  const handleSelectSample = (sample) => {
    setInputText(JSON.stringify({ data: sample.data }, null, 2));
  };

  // Submit request to local API
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Validate JSON format client-side
      let payload;
      try {
        payload = JSON.parse(inputText);
      } catch (err) {
        // If not valid JSON, try to parse it as comma-separated or list of lines
        const lines = inputText
          .split(/[\n,]+/)
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
        
        // Let's see if we parsed anything. If yes, wrap in data object.
        if (lines.length > 0) {
          payload = { data: lines };
        } else {
          throw new Error("Input must be a valid JSON object or a comma-separated list of edges.");
        }
      }

      if (!payload || !Array.isArray(payload.data)) {
        throw new Error("Payload must contain a 'data' array of edge strings.");
      }

      const response = await fetch("/bfhl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! Status: ${response.status}`);
      }

      setResult(data);
    } catch (err) {
      console.error("API Call failed:", err);
      setError(err.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Header */}
      <header className="app-header">
        <div className="header-container">
          <div className="brand-section">
            <div className="brand-logo">T</div>
            <h1 className="brand-name">Tree & Cycle Analyzer</h1>
          </div>
          <div className="credentials-pill">
            Roll: <span>2310993759</span> | Email: <span>abhav3759.beai23@chitkara.edu.in</span>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="app-main">
        {/* Left Column: Form & Sample Presets */}
        <section className="glass-panel fade-in">
          <div>
            <h2 className="panel-title">Graph Edge Input</h2>
            <p className="panel-subtitle">Enter parent-child directed relationships</p>
          </div>

          <form onSubmit={handleSubmit} className="form-group">
            <div className="form-label">
              <span>Input Data</span>
              <span className="label-hint">JSON Array or Comma-separated</span>
            </div>
            <textarea
              className="textarea-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`{\n  "data": ["A->B", "A->C"]\n}`}
              spellCheck="false"
            />
            <div className="input-actions">
              <button type="submit" className="btn btn-primary" disabled={isLoading}>
                {isLoading && <div className="spinner"></div>}
                {isLoading ? "Analyzing..." : "Analyze Graph"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setInputText('{\n  "data": []\n}')}
                disabled={isLoading}
              >
                Clear
              </button>
            </div>
          </form>

          <div>
            <h3 className="panel-subtitle" style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
              Sample Presets
            </h3>
            <div className="samples-list">
              {SAMPLES.map((sample, idx) => (
                <div
                  key={idx}
                  className="sample-item"
                  onClick={() => handleSelectSample(sample)}
                  title={sample.description}
                >
                  <span className="sample-name">{sample.name}</span>
                  <span className="sample-preview">
                    {JSON.stringify(sample.data).substring(0, 30)}...
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right Column: Dynamic Results Dashboard */}
        <section className="dashboard-layout fade-in" style={{ animationDelay: "0.1s" }}>
          {error && (
            <div className="error-banner">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <div>
                <strong style={{ display: "block", marginBottom: "0.25rem" }}>Analysis Failed</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {!result && !error && !isLoading && (
            <div className="glass-panel" style={{ justifyContent: "center", alignItems: "center", minHeight: "350px", textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📊</div>
              <h2 className="panel-title">Awaiting Input</h2>
              <p className="panel-subtitle" style={{ maxWidth: "340px" }}>
                Select a sample preset on the left or enter your own graph node list, then click <strong>Analyze Graph</strong> to view results.
              </p>
            </div>
          )}

          {isLoading && (
            <div className="glass-panel" style={{ justifyContent: "center", alignItems: "center", minHeight: "350px" }}>
              <div className="spinner" style={{ width: "40px", height: "40px", borderWidth: "3px", marginBottom: "1rem" }}></div>
              <p className="panel-subtitle">Processing graph relationships and detecting cycles...</p>
            </div>
          )}

          {result && (
            <>
              {/* Metrics Summary Grid */}
              <div className="metrics-grid">
                <div className="metric-card blue">
                  <span className="metric-label">Total Trees</span>
                  <span className="metric-value">{result.summary.total_trees}</span>
                </div>
                <div className="metric-card purple">
                  <span className="metric-label">Total Cycles</span>
                  <span className="metric-value">{result.summary.total_cycles}</span>
                </div>
                <div className="metric-card green">
                  <span className="metric-label">Largest Tree Root</span>
                  <span className="metric-value" style={{ fontSize: result.summary.largest_tree_root ? "2rem" : "1.5rem" }}>
                    {result.summary.largest_tree_root || "N/A"}
                  </span>
                </div>
              </div>

              {/* Tab Selector */}
              <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                <button
                  className={`btn ${activeTab === "visual" ? "btn-primary" : "btn-secondary"}`}
                  style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                  onClick={() => setActiveTab("visual")}
                >
                  Visual Hierarchies
                </button>
                <button
                  className={`btn ${activeTab === "json" ? "btn-primary" : "btn-secondary"}`}
                  style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                  onClick={() => setActiveTab("json")}
                >
                  Raw Response JSON
                </button>
              </div>

              {activeTab === "visual" ? (
                <>
                  {/* Hierarchies List */}
                  <div className="hierarchies-section">
                    <h3 className="section-title">
                      <span>🌳</span> Analyzed Components
                    </h3>
                    <div className="hierarchies-grid">
                      {result.hierarchies.length === 0 ? (
                        <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
                          <span className="empty-state">No valid graph components constructed from input.</span>
                        </div>
                      ) : (
                        result.hierarchies.map((hierarchy, idx) => (
                          <div key={idx} className="hierarchy-card">
                            <div className="hierarchy-header">
                              <span className="hierarchy-title">
                                Root Node: <strong style={{ color: "var(--accent-blue)" }}>{hierarchy.root}</strong>
                              </span>
                              <span className={`hierarchy-badge ${hierarchy.has_cycle ? "badge-cycle" : "badge-tree"}`}>
                                {hierarchy.has_cycle ? "Cycle" : `Tree (Depth: ${hierarchy.depth})`}
                              </span>
                            </div>
                            
                            {hierarchy.has_cycle ? (
                              <div className="cycle-visualizer">
                                <div className="cycle-node">{hierarchy.root}</div>
                                <div className="cycle-arrow">🔁</div>
                                <span className="empty-state" style={{ color: "#fca5a5" }}>
                                  Loop detected. A cycle prevents standard tree rendering.
                                </span>
                              </div>
                            ) : (
                              <div className="tree-visualizer">
                                <RenderTree rootLabel={hierarchy.root} treeStructure={hierarchy.tree} />
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Invalid Entries & Duplicate Edges Badges */}
                  <div className="details-grid">
                    {/* Invalid Entries */}
                    <div className="detail-panel">
                      <h3 className="section-title" style={{ fontSize: "1rem" }}>
                        ❌ Invalid Entries ({result.invalid_entries.length})
                      </h3>
                      {result.invalid_entries.length === 0 ? (
                        <span className="empty-state">None</span>
                      ) : (
                        <div className="badges-container">
                          {result.invalid_entries.map((item, idx) => (
                            <span key={idx} className="badge-item invalid">
                              {item || `""`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Duplicate Edges */}
                    <div className="detail-panel">
                      <h3 className="section-title" style={{ fontSize: "1rem" }}>
                        🔁 Duplicate Edges ({result.duplicate_edges.length})
                      </h3>
                      {result.duplicate_edges.length === 0 ? (
                        <span className="empty-state">None</span>
                      ) : (
                        <div className="badges-container">
                          {result.duplicate_edges.map((item, idx) => (
                            <span key={idx} className="badge-item duplicate">
                              {item}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* Raw JSON Pane */
                <div className="json-panel">
                  <div className="json-header">
                    <h3 className="section-title" style={{ fontSize: "1.05rem" }}>API Response Payload</h3>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}
                      onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
                    >
                      Copy JSON
                    </button>
                  </div>
                  <pre className="pre-code">
                    <code>{JSON.stringify(result, null, 2)}</code>
                  </pre>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </>
  );
}

// Tree Node component (recursive)
function RenderTreeNode({ label, subtree }) {
  const childrenKeys = Object.keys(subtree);
  return (
    <div className="tree-node-wrapper">
      <div className="tree-node">
        <span>Node {label}</span>
      </div>
      {childrenKeys.length > 0 && (
        <div className="tree-children">
          {childrenKeys.map((key) => (
            <RenderTreeNode key={key} label={key} subtree={subtree[key]} />
          ))}
        </div>
      )}
    </div>
  );
}

// Top-level tree renderer
function RenderTree({ rootLabel, treeStructure }) {
  const rootSubtree = treeStructure[rootLabel] || {};
  const childrenKeys = Object.keys(rootSubtree);
  return (
    <div className="tree-node-wrapper">
      <div className="tree-node is-root">
        <span>👑 Root {rootLabel}</span>
      </div>
      {childrenKeys.length > 0 && (
        <div className="tree-children">
          {childrenKeys.map((key) => (
            <RenderTreeNode key={key} label={key} subtree={rootSubtree[key]} />
          ))}
        </div>
      )}
    </div>
  );
}
