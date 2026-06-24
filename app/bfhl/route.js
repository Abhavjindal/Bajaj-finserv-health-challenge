import { NextResponse } from "next/server";

// --- Student Identity ---
const STUDENT_ID   = process.env.USER_ID             || "abhav_23102005";
const STUDENT_EMAIL = process.env.EMAIL_ID            || "abhav3759.beai23@chitkara.edu.in";
const ROLL_NO       = process.env.COLLEGE_ROLL_NUMBER || "2310993759";

const ALLOW_ALL_ORIGINS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Preflight handler for CORS
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: ALLOW_ALL_ORIGINS });
}

// GET — operation code handshake
export async function GET() {
  return NextResponse.json(
    { user_id: STUDENT_ID, email_id: STUDENT_EMAIL, college_roll_number: ROLL_NO, operation_code: 1 },
    { headers: ALLOW_ALL_ORIGINS }
  );
}

// POST — main graph processing endpoint
export async function POST(request) {
  try {
    const body = await request.json();

    if (!body || !Array.isArray(body.data)) {
      return NextResponse.json(
        { error: "'data' field is required and must be an array." },
        { status: 400, headers: ALLOW_ALL_ORIGINS }
      );
    }

    // ── Step 1: Validate & Deduplicate ──────────────────────────────────────
    // Valid format: single uppercase letter -> single uppercase letter, no self-loops
    const EDGE_PATTERN = /^([A-Z])->([A-Z])$/;
    const badEntries   = [];      // invalid_entries
    const repeatedEdges = [];     // duplicate_edges (stored once per unique dup)
    const seenOnce     = new Set();
    const alreadyFlaggedDup = new Set();
    const goodEdges    = [];      // edges that passed all checks

    for (const raw of body.data) {
      if (typeof raw !== "string") { badEntries.push(String(raw)); continue; }

      const trimmed = raw.trim();
      const hit     = trimmed.match(EDGE_PATTERN);

      // Reject if not matching, or self-loop
      if (!hit || hit[1] === hit[2]) { badEntries.push(trimmed); continue; }

      if (seenOnce.has(trimmed)) {
        // Only add to duplicates list once per unique repeated edge
        if (!alreadyFlaggedDup.has(trimmed)) {
          repeatedEdges.push(trimmed);
          alreadyFlaggedDup.add(trimmed);
        }
      } else {
        seenOnce.add(trimmed);
        goodEdges.push({ from: hit[1], to: hit[2] });
      }
    }

    // ── Step 2: Build directed graph (first-parent-wins) ───────────────────
    // childParent: tracks which parent a node belongs to (only one allowed)
    // adjList: parent → children[]
    const childParent = new Map(); // node → its parent
    const adjList     = new Map(); // node → children array
    const allNodes    = new Set();
    const acceptedEdges = [];

    for (const { from, to } of goodEdges) {
      // Diamond / multi-parent: skip if child already assigned
      if (childParent.has(to)) continue;

      childParent.set(to, from);
      if (!adjList.has(from)) adjList.set(from, []);
      adjList.get(from).push(to);
      allNodes.add(from);
      allNodes.add(to);
      acceptedEdges.push({ from, to });
    }

    // ── Step 3: Find connected components via undirected BFS ───────────────
    // Build undirected neighbour map
    const undirected = new Map();
    for (const node of allNodes) undirected.set(node, []);
    for (const { from, to } of acceptedEdges) {
      undirected.get(from).push(to);
      undirected.get(to).push(from);
    }

    const globalSeen  = new Set();
    const components  = []; // each is an array of node labels

    // Walk through accepted edges in order to preserve component appearance order
    for (const { from } of acceptedEdges) {
      if (globalSeen.has(from)) continue;
      const group = [];
      const queue = [from];
      while (queue.length) {
        const cur = queue.shift();
        if (globalSeen.has(cur)) continue;
        globalSeen.add(cur);
        group.push(cur);
        for (const nb of (undirected.get(cur) || [])) {
          if (!globalSeen.has(nb)) queue.push(nb);
        }
      }
      components.push(group);
    }

    // ── Step 4: Classify, analyse and build output per component ───────────
    const hierarchies = [];
    let treeCount     = 0;
    let cycleCount    = 0;
    let deepestRoot   = "";
    let maxDepth      = -1;

    for (const group of components) {
      const isCyclic = hasCycle(group, adjList);

      // A component with no root (no node without a parent) is always cyclic
      const roots = group.filter(n => !childParent.has(n));

      if (isCyclic || roots.length === 0) {
        cycleCount++;
        const lexRoot = [...group].sort()[0];
        hierarchies.push({ root: lexRoot, tree: {}, has_cycle: true });
        continue;
      }

      treeCount++;
      const treeRoot = [...roots].sort()[0]; // lexicographically first root
      const treeObj  = { [treeRoot]: buildTree(treeRoot, adjList) };
      const depth    = measureDepth(treeRoot, adjList);

      hierarchies.push({ root: treeRoot, tree: treeObj, depth });

      // Track largest tree (tiebreak: lex smaller root wins)
      if (depth > maxDepth || (depth === maxDepth && treeRoot < deepestRoot)) {
        maxDepth    = depth;
        deepestRoot = treeRoot;
      }
    }

    // ── Step 5: Compose final response ─────────────────────────────────────
    return NextResponse.json(
      {
        user_id:             STUDENT_ID,
        email_id:            STUDENT_EMAIL,
        college_roll_number: ROLL_NO,
        hierarchies,
        invalid_entries:  badEntries,
        duplicate_edges:  repeatedEdges,
        summary: {
          total_trees:       treeCount,
          total_cycles:      cycleCount,
          largest_tree_root: treeCount > 0 ? deepestRoot : "",
        },
      },
      { status: 200, headers: ALLOW_ALL_ORIGINS }
    );

  } catch (err) {
    console.error("[/bfhl POST] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500, headers: ALLOW_ALL_ORIGINS }
    );
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Iterative DFS cycle check using 3-colour marking.
 * White (0) = unvisited, Grey (1) = in stack, Black (2) = done
 */
function hasCycle(nodes, adjList) {
  const colour = new Map(nodes.map(n => [n, 0]));

  function dfs(node) {
    colour.set(node, 1); // grey — currently in recursion stack
    for (const child of (adjList.get(node) || [])) {
      if (colour.get(child) === 1) return true;   // back-edge = cycle
      if (colour.get(child) === 0 && dfs(child)) return true;
    }
    colour.set(node, 2); // black — fully explored
    return false;
  }

  for (const node of nodes) {
    if (colour.get(node) === 0 && dfs(node)) return true;
  }
  return false;
}

/**
 * Recursively build the nested tree object for a given root.
 * Children are sorted lexicographically for deterministic output.
 */
function buildTree(node, adjList) {
  const children = [...(adjList.get(node) || [])].sort();
  const obj = {};
  for (const child of children) obj[child] = buildTree(child, adjList);
  return obj;
}

/**
 * Returns the depth of the tree rooted at `node`.
 * Depth = number of nodes on the longest root-to-leaf path.
 */
function measureDepth(node, adjList) {
  const children = adjList.get(node) || [];
  if (children.length === 0) return 1;
  return 1 + Math.max(...children.map(c => measureDepth(c, adjList)));
}
