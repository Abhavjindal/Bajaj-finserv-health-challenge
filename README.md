# Bajaj Finserv Health — Full Stack Engineering Challenge
**Student:** Abhav Jindal
**Roll Number:** 2310993759
**Email:** abhav3759.beai23@chitkara.edu.in

---

## What This Project Does

This project implements a REST API (`POST /bfhl`) that accepts an array of directed node strings like `"A->B"`, processes them as a directed graph, and returns structured insights — identifying trees, detecting cycles, flagging invalid inputs, and computing hierarchy depths.

---

## My Approach

### Backend (`app/bfhl/route.js`)

I broke the problem into five clearly defined steps:

**Step 1 — Validation & Deduplication**
Each input string is trimmed and matched against the regex `^([A-Z])->([A-Z])$`. Self-loops (e.g. `A->A`) are rejected. If a valid edge has been seen before, it goes into `duplicate_edges` (exactly once per unique duplicate, not per occurrence).

**Step 2 — Graph Construction with First-Parent Rule**
I use a `Map` called `childParent` to track which parent each node has been assigned. When an edge arrives and the child already has a parent (diamond/multi-parent case), the new edge is silently discarded — first encountered wins.

**Step 3 — Connected Component Discovery via BFS**
I build an undirected adjacency map from accepted edges and run a BFS to find connected components, preserving the order components appear in the input.

**Step 4 — Cycle Detection & Tree Analysis**
For each component I run a 3-colour DFS (white → grey → black). If any grey node is visited again, there's a cycle. Cyclic components use the lexicographically smallest node as root. Valid trees compute depth recursively and track the deepest root (with lexicographic tiebreaking).

**Step 5 — Response Assembly**
All fields (`user_id`, `email_id`, `college_roll_number`, `hierarchies`, `invalid_entries`, `duplicate_edges`, `summary`) are assembled and returned as JSON with CORS headers.

### Frontend (`app/page.js`)

Built as a Next.js App Router client component using React hooks (`useState`, `useCallback`). The input area accepts either raw JSON (`{ "data": [...] }`) or plain comma/newline separated edges. Results are displayed in a clean table layout with:
- Summary metrics (total trees, total cycles, largest tree root)
- Hierarchies table (root, type, depth, structure)
- Invalid entries table
- Duplicate edges table
- Raw JSON viewer toggle

---

## Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Language:** JavaScript
- **Styling:** Vanilla CSS (custom properties, no Tailwind)
- **Deployment:** Vercel

---

## Running Locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000)

To test the API directly:
```bash
curl -X POST http://localhost:3000/bfhl \
  -H "Content-Type: application/json" \
  -d '{"data": ["A->B", "A->C", "B->D", "X->Y", "Y->X", "hello"]}'
```
