"use client";

import { useState } from "react";

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("table");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      let payload;
      try {
        payload = JSON.parse(inputText);
      } catch (err) {
        const lines = inputText
          .split(/[\n,]+/)
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! Status: ${response.status}`);
      }
      setResult(data);
    } catch (err) {
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
        </div>
      </header>

      {/* Main Body */}
      <main className="app-main">
        {/* Left: Input */}
        <section className="glass-panel fade-in">
          <div>
            <h2 className="panel-title">Graph Edge Input</h2>
            <p className="panel-subtitle">Enter parent-child directed relationships</p>
          </div>

          <form onSubmit={handleSubmit} className="form-group">
            <div className="form-label">
              <span>Input Data</span>
              <span className="label-hint">JSON Array</span>
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
                onClick={() => { setInputText(""); setResult(null); setError(null); }}
                disabled={isLoading}
              >
                Clear
              </button>
            </div>
          </form>
        </section>

        {/* Right: Results */}
        <section className="dashboard-layout fade-in">
          {/* Error */}
          {error && (
            <div className="error-banner">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span><strong>Error:</strong> {error}</span>
            </div>
          )}

          {/* Empty state */}
          {!result && !error && !isLoading && (
            <div className="glass-panel" style={{ alignItems: "center", justifyContent: "center", minHeight: "300px", textAlign: "center" }}>
              <p className="panel-title" style={{ fontSize: "1rem" }}>No Data Yet</p>
              <p className="panel-subtitle">Enter edge data on the left and click Analyze Graph.</p>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="glass-panel" style={{ alignItems: "center", justifyContent: "center", minHeight: "300px" }}>
              <div className="spinner" style={{ width: "32px", height: "32px", borderWidth: "3px", marginBottom: "1rem" }}></div>
              <p className="panel-subtitle">Processing...</p>
            </div>
          )}

          {result && (
            <>
              {/* Summary Metrics */}
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
                  <span className="metric-value">{result.summary.largest_tree_root || "N/A"}</span>
                </div>
              </div>

              {/* Tabs */}
              <div className="tab-bar">
                <button
                  className={`btn ${activeTab === "table" ? "btn-primary" : "btn-secondary"}`}
                  style={{ padding: "0.45rem 1rem", fontSize: "0.82rem" }}
                  onClick={() => setActiveTab("table")}
                >
                  Table View
                </button>
                <button
                  className={`btn ${activeTab === "json" ? "btn-primary" : "btn-secondary"}`}
                  style={{ padding: "0.45rem 1rem", fontSize: "0.82rem" }}
                  onClick={() => setActiveTab("json")}
                >
                  Raw JSON
                </button>
              </div>

              {activeTab === "table" ? (
                <>
                  {/* Hierarchies Table */}
                  <div className="table-section">
                    <h3 className="section-title">Hierarchies</h3>
                    <div className="table-wrapper">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Root</th>
                            <th>Type</th>
                            <th>Depth</th>
                            <th>Children</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.hierarchies.length === 0 ? (
                            <tr><td colSpan={5} className="empty-cell">No hierarchies found.</td></tr>
                          ) : (
                            result.hierarchies.map((h, i) => (
                              <tr key={i}>
                                <td>{i + 1}</td>
                                <td><span className="root-tag">{h.root}</span></td>
                                <td>
                                  <span className={`type-badge ${h.has_cycle ? "type-cycle" : "type-tree"}`}>
                                    {h.has_cycle ? "Cycle" : "Tree"}
                                  </span>
                                </td>
                                <td>{h.has_cycle ? "—" : h.depth}</td>
                                <td className="children-cell">
                                  {h.has_cycle
                                    ? <span className="empty-state">Loop detected</span>
                                    : <span className="mono-text">{JSON.stringify(h.tree)}</span>
                                  }
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Invalid Entries + Duplicate Edges Tables */}
                  <div className="details-grid">
                    <div className="table-section">
                      <h3 className="section-title">Invalid Entries ({result.invalid_entries.length})</h3>
                      <div className="table-wrapper">
                        <table className="data-table">
                          <thead>
                            <tr><th>#</th><th>Entry</th></tr>
                          </thead>
                          <tbody>
                            {result.invalid_entries.length === 0 ? (
                              <tr><td colSpan={2} className="empty-cell">None</td></tr>
                            ) : (
                              result.invalid_entries.map((item, i) => (
                                <tr key={i}>
                                  <td>{i + 1}</td>
                                  <td><span className="badge-item invalid">{item || '""'}</span></td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="table-section">
                      <h3 className="section-title">Duplicate Edges ({result.duplicate_edges.length})</h3>
                      <div className="table-wrapper">
                        <table className="data-table">
                          <thead>
                            <tr><th>#</th><th>Edge</th></tr>
                          </thead>
                          <tbody>
                            {result.duplicate_edges.length === 0 ? (
                              <tr><td colSpan={2} className="empty-cell">None</td></tr>
                            ) : (
                              result.duplicate_edges.map((item, i) => (
                                <tr key={i}>
                                  <td>{i + 1}</td>
                                  <td><span className="badge-item duplicate">{item}</span></td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Raw JSON */
                <div className="json-panel">
                  <div className="json-header">
                    <h3 className="section-title" style={{ fontSize: "1rem" }}>API Response</h3>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}
                      onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
                    >
                      Copy
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
