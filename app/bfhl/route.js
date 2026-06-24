import { NextResponse } from "next/server";

// Identity credentials from environment variables or fallbacks
const USER_ID = process.env.USER_ID || "abhav_23102005";
const EMAIL_ID = process.env.EMAIL_ID || "abhav3759.beai23@chitkara.edu.in";
const COLLEGE_ROLL_NUMBER = process.env.COLLEGE_ROLL_NUMBER || "2310993759";

// Helper to set CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET() {
  return NextResponse.json(
    {
      user_id: USER_ID,
      email_id: EMAIL_ID,
      college_roll_number: COLLEGE_ROLL_NUMBER,
      operation_code: 1,
    },
    { headers: corsHeaders }
  );
}

export async function POST(req) {
  try {
    const body = await req.json();

    // Check if data field exists and is an array
    if (!body || !Array.isArray(body.data)) {
      return NextResponse.json(
        { error: "Invalid request payload. 'data' must be an array of strings." },
        { status: 400, headers: corsHeaders }
      );
    }

    const rawData = body.data;
    const invalid_entries = [];
    const duplicate_edges = [];
    const seenEdges = new Set();
    const uniqueValidEdges = [];

    // 1. Validation & Pre-deduplication
    for (const item of rawData) {
      if (typeof item !== "string") {
        invalid_entries.push(String(item));
        continue;
      }

      const trimmed = item.trim();
      const match = trimmed.match(/^([A-Z])->([A-Z])$/);

      if (!match) {
        invalid_entries.push(trimmed);
        continue;
      }

      const parent = match[1];
      const child = match[2];

      // Self-loops are treated as invalid
      if (parent === child) {
        invalid_entries.push(trimmed);
        continue;
      }

      // Check for duplicate edges
      if (seenEdges.has(trimmed)) {
        if (!duplicate_edges.includes(trimmed)) {
          duplicate_edges.push(trimmed);
        }
      } else {
        seenEdges.add(trimmed);
        uniqueValidEdges.push({ parent, child, raw: trimmed });
      }
    }

    // 2. Tree Construction & Multi-parent Resolution
    const parentMap = {}; // child -> parent
    const childrenMap = {}; // parent -> child[]
    const keptEdges = [];
    const allNodes = new Set();

    for (const edge of uniqueValidEdges) {
      const { parent, child, raw } = edge;

      // Diamond / multi-parent resolution: first parent wins, subsequent parent edges are silently discarded
      if (parentMap[child] !== undefined) {
        continue;
      }

      parentMap[child] = parent;
      if (!childrenMap[parent]) {
        childrenMap[parent] = [];
      }
      childrenMap[parent].push(child);
      keptEdges.push({ parent, child });
      allNodes.add(parent);
      allNodes.add(child);
    }

    // 3. Connected Components Grouping (Undirected Graph DFS)
    const adj = {};
    for (const node of allNodes) {
      adj[node] = [];
    }
    for (const { parent, child } of keptEdges) {
      adj[parent].push(child);
      adj[child].push(parent);
    }

    const visited = new Set();
    const components = [];

    // Traverse kept edges in order of appearance to preserve component ordering
    for (const { parent, child } of keptEdges) {
      if (!visited.has(parent)) {
        const componentNodes = [];
        dfsComponent(parent, componentNodes);
        components.push(componentNodes);
      }
    }

    function dfsComponent(node, list) {
      visited.add(node);
      list.push(node);
      for (const neighbor of adj[node] || []) {
        if (!visited.has(neighbor)) {
          dfsComponent(neighbor, list);
        }
      }
    }

    // 4. Processing each component (Detect Cycles, Build Trees, Calculate Depth)
    const hierarchies = [];
    let total_trees = 0;
    let total_cycles = 0;
    let maxDepth = -1;
    let largest_tree_root = "";

    for (const componentNodes of components) {
      // Find roots (nodes in this component with no parent in parentMap)
      const roots = componentNodes.filter((node) => parentMap[node] === undefined);

      const hasCycle = detectCycleInComponent(componentNodes);

      if (hasCycle || roots.length === 0) {
        // Cyclic group
        total_cycles++;
        // Lexicographically smallest node as root
        const sortedNodes = [...componentNodes].sort();
        const rootNode = sortedNodes[0];

        hierarchies.push({
          root: rootNode,
          tree: {},
          has_cycle: true,
        });
      } else {
        // Valid non-cyclic tree
        total_trees++;
        // Take the root (should be exactly 1, but sort lexicographically just in case of multiple)
        const sortedRoots = [...roots].sort();
        const rootNode = sortedRoots[0];

        const treeObj = {
          [rootNode]: buildNestedTree(rootNode),
        };

        const depth = calculateTreeDepth(rootNode);

        hierarchies.push({
          root: rootNode,
          tree: treeObj,
          depth: depth,
        });

        // Track largest tree
        if (depth > maxDepth) {
          maxDepth = depth;
          largest_tree_root = rootNode;
        } else if (depth === maxDepth) {
          // Tiebreaker: lexicographically smaller root
          if (rootNode < largest_tree_root) {
            largest_tree_root = rootNode;
          }
        }
      }
    }

    // Helper: 3-color DFS to detect cycles
    function detectCycleInComponent(componentNodes) {
      const state = {}; // 0: unvisited, 1: visiting, 2: visited
      for (const node of componentNodes) {
        state[node] = 0;
      }

      function dfs(node) {
        state[node] = 1;
        const children = childrenMap[node] || [];
        for (const child of children) {
          if (state[child] === 1) {
            return true; // back edge found
          }
          if (state[child] === 0) {
            if (dfs(child)) return true;
          }
        }
        state[node] = 2;
        return false;
      }

      for (const node of componentNodes) {
        if (state[node] === 0) {
          if (dfs(node)) return true;
        }
      }
      return false;
    }

    // Helper: Recursively build the tree object
    function buildNestedTree(node) {
      const children = childrenMap[node] || [];
      const sortedChildren = [...children].sort();
      const res = {};
      for (const child of sortedChildren) {
        res[child] = buildNestedTree(child);
      }
      return res;
    }

    // Helper: Recursively calculate depth
    function calculateTreeDepth(node) {
      const children = childrenMap[node] || [];
      if (children.length === 0) {
        return 1;
      }
      const depths = children.map((child) => calculateTreeDepth(child));
      return 1 + Math.max(...depths);
    }

    // 5. Construct Response
    const response = {
      user_id: USER_ID,
      email_id: EMAIL_ID,
      college_roll_number: COLLEGE_ROLL_NUMBER,
      hierarchies: hierarchies,
      invalid_entries: invalid_entries,
      duplicate_edges: duplicate_edges,
      summary: {
        total_trees: total_trees,
        total_cycles: total_cycles,
        largest_tree_root: total_trees > 0 ? largest_tree_root : "",
      },
    };

    return NextResponse.json(response, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred." },
      { status: 500, headers: corsHeaders }
    );
  }
}
