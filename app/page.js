"use client";

import { useState, useCallback } from "react";

// Attempt to parse whatever the user typed into a valid { data: [...] } payload
function parseInput(raw) {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Input is empty.");

  // Try JSON first
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && Array.isArray(parsed.data)) return parsed;
    throw new Error("JSON must have a 'data' array field.");
  } catch (_) {
    // Fall back: treat as newline / comma separated edge strings
    const items = trimmed
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);
    if (items.length === 0) throw new Error("No edges found in input.");
    return { data: items };
  }
}

export default function Home() {
  const [inputText,  setInputText]  = useState("");
  const [loading,    setLoading]    = useState(false);
  const [apiError,   setApiError]   = useState(null);
  const [response,   setResponse]   = useState(null);
  const [activeView, setActiveView] = useState("table"); // "table" | "json"

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    setApiError(null);
    setResponse(null);

    try {
      const payload = parseInput(inputText);

      const res  = await fetch("/bfhl", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      setResponse(json);
    } catch (err) {
      setApiError(err.message || "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [inputText]);

  const handleClear = () => {
    setInputText("");
    setResponse(null);
    setApiError(null);
  };

  return (
    <>
      <header className="app-header">
        <div className="header-container">
          <div className="brand-section">
            <div className="brand-logo">T</div>
            <h1 className="brand-name">Tree &amp; Cycle Analyzer</h1>
          </div>
        </div>
      </header>

      <main className="app-main">
        {/* ── Left: Input Panel ── */}
        <section className="glass-panel fade-in">
          <div>
            <h2 className="panel-title">Graph Edge Input</h2>
            <p className="panel-subtitle">Enter directed edges in the format A-&gt;B</p>
          </div>

          <form onSubmit={handleSubmit} className="form-group">
            <div className="form-label">
              <span>Input Data</span>
              <span className="label-hint">JSON or comma-separated</span>
            </div>
            <textarea
              id="edge-input"
              className="textarea-input"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={'{\n  "data": ["A->B", "B->C"]\n}'}
              spellCheck="false"
              autoComplete="off"
            />
            <div className="input-actions">
              <button
                id="submit-btn"
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading && <div className="spinner" />}
                {loading ? "Analyzing…" : "Analyze Graph"}
              </button>
              <button
                id="clear-btn"
                type="button"
                className="btn btn-secondary"
                onClick={handleClear}
                disabled={loading}
              >
                Clear
              </button>
            </div>
          </form>
        </section>

        {/* ── Right: Results Panel ── */}
        <section className="dashboard-layout fade-in">

          {/* Error */}
          {apiError && (
            <div className="error-banner" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8"  x2="12"   y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span><strong>Error: </strong>{apiError}</span>
            </div>
          )}

          {/* Empty / idle state */}
          {!response && !apiError && !loading && (
            <div className="glass-panel"
              style={{ alignItems:"center", justifyContent:"center",
                       minHeight:"300px", textAlign:"center" }}>
              <p className="panel-title"  style={{ fontSize:"1rem" }}>No Results Yet</p>
              <p className="panel-subtitle">
                Paste your edge list on the left and click <strong>Analyze Graph</strong>.
              </p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="glass-panel"
              style={{ alignItems:"center", justifyContent:"center", minHeight:"300px" }}>
              <div className="spinner"
                style={{ width:32, height:32, borderWidth:3, marginBottom:"1rem" }} />
              <p className="panel-subtitle">Processing graph…</p>
            </div>
          )}

          {/* Results */}
          {response && (
            <>
              {/* Summary row */}
              <div className="metrics-grid">
                <div className="metric-card blue">
                  <span className="metric-label">Total Trees</span>
                  <span className="metric-value">{response.summary.total_trees}</span>
                </div>
                <div className="metric-card purple">
                  <span className="metric-label">Total Cycles</span>
                  <span className="metric-value">{response.summary.total_cycles}</span>
                </div>
                <div className="metric-card green">
                  <span className="metric-label">Largest Tree Root</span>
                  <span className="metric-value">
                    {response.summary.largest_tree_root || "—"}
                  </span>
                </div>
              </div>

              {/* View toggle */}
              <div className="tab-bar">
                {["table", "json"].map(tab => (
                  <button
                    key={tab}
                    className={`btn ${activeView === tab ? "btn-primary" : "btn-secondary"}`}
                    style={{ padding:"0.45rem 1rem", fontSize:"0.82rem" }}
                    onClick={() => setActiveView(tab)}
                  >
                    {tab === "table" ? "Table View" : "Raw JSON"}
                  </button>
                ))}
              </div>

              {activeView === "table" ? (
                <>
                  {/* Hierarchies */}
                  <HierarchiesTable rows={response.hierarchies} />

                  {/* Invalid + Duplicates side by side */}
                  <div className="details-grid">
                    <SimpleTable
                      title={`Invalid Entries (${response.invalid_entries.length})`}
                      header="Entry"
                      items={response.invalid_entries}
                      badgeClass="invalid"
                      emptyLabel="None"
                    />
                    <SimpleTable
                      title={`Duplicate Edges (${response.duplicate_edges.length})`}
                      header="Edge"
                      items={response.duplicate_edges}
                      badgeClass="duplicate"
                      emptyLabel="None"
                    />
                  </div>
                </>
              ) : (
                <JsonViewer data={response} />
              )}
            </>
          )}
        </section>
      </main>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function HierarchiesTable({ rows }) {
  return (
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
              <th>Structure</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="empty-cell">No components found.</td></tr>
            ) : rows.map((h, i) => (
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
                    ? <em className="empty-state">Loop detected</em>
                    : <span className="mono-text">{JSON.stringify(h.tree)}</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SimpleTable({ title, header, items, badgeClass, emptyLabel }) {
  return (
    <div className="table-section">
      <h3 className="section-title">{title}</h3>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr><th>#</th><th>{header}</th></tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={2} className="empty-cell">{emptyLabel}</td></tr>
            ) : items.map((item, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>
                  <span className={`badge-item ${badgeClass}`}>{item || '""'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JsonViewer({ data }) {
  const text = JSON.stringify(data, null, 2);
  return (
    <div className="json-panel">
      <div className="json-header">
        <h3 className="section-title" style={{ fontSize:"1rem" }}>API Response</h3>
        <button
          className="btn btn-secondary"
          style={{ padding:"0.25rem 0.75rem", fontSize:"0.75rem" }}
          onClick={() => navigator.clipboard.writeText(text)}
        >
          Copy
        </button>
      </div>
      <pre className="pre-code"><code>{text}</code></pre>
    </div>
  );
}
