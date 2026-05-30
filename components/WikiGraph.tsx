"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { WikiPage } from "@/types";

// ─── Link extraction ────────────────────────────────────────────────────────
// Connections come from [[wikilinks]] and explicit /wiki/content/<slug> links,
// matching how the markdown renderer resolves them.

function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function extractLinkSlugs(content: string): string[] {
  const out = new Set<string>();
  const wikilink = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
  const contentlink = /\/wiki\/content\/([a-zA-Z0-9-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = wikilink.exec(content))) out.add(slugify(m[1].trim()));
  while ((m = contentlink.exec(content))) out.add(m[1]);
  return [...out];
}

// ─── Force-directed layout (tiny, dependency-free) ──────────────────────────

const W = 820;
const H = 560;
const CX = W / 2;
const CY = H / 2;
const REPULSION = 9000;
const REST_LENGTH = 95;
const SPRING = 0.03;
const CENTERING = 0.013;
const DAMPING = 0.86;
const MAX_SPEED = 45;

interface Pos { x: number; y: number; vx: number; vy: number }

interface Props {
  pages: WikiPage[];
  currentSlug: string;
  onNavigate: (slug: string) => void;
}

export default function WikiGraph({ pages, currentSlug, onNavigate }: Props) {
  const { nodes, edges, adjacency, currentIndex } = useMemo(() => {
    const nodes = pages.map(p => ({ slug: p.slug, title: p.title, folder: p.folder }));
    const indexBySlug = new Map(nodes.map((n, i) => [n.slug, i]));
    const edgeSet = new Set<string>();
    const edges: [number, number][] = [];
    const adjacency: Set<number>[] = nodes.map(() => new Set<number>());

    pages.forEach((p, i) => {
      for (const slug of extractLinkSlugs(p.content)) {
        const j = indexBySlug.get(slug);
        if (j === undefined || j === i) continue;
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (edgeSet.has(key)) continue;
        edgeSet.add(key);
        edges.push([i, j]);
        adjacency[i].add(j);
        adjacency[j].add(i);
      }
    });

    return { nodes, edges, adjacency, currentIndex: indexBySlug.get(currentSlug) ?? -1 };
  }, [pages, currentSlug]);

  const posRef = useRef<Pos[]>([]);
  const alphaRef = useRef(1);
  const draggingRef = useRef<number | null>(null);
  const dragStartRef = useRef<{ cx: number; cy: number; moved: boolean }>({ cx: 0, cy: 0, moved: false });
  const reheatRef = useRef<() => void>(() => {});
  const svgRef = useRef<SVGSVGElement>(null);
  // Positions live in a ref for cheap mutation; a per-frame snapshot drives render.
  const [frame, setFrame] = useState<Pos[]>([]);
  const [hover, setHover] = useState<number | null>(null);

  // Simulation loop — re-seeds and runs whenever the graph data changes.
  useEffect(() => {
    const n = nodes.length;
    // Seed positions on a jittered circle so nothing starts perfectly overlapped.
    posRef.current = nodes.map((_, i) => {
      const angle = (i / Math.max(1, n)) * Math.PI * 2;
      const radius = 150 + ((i * 53) % 90);
      return { x: CX + Math.cos(angle) * radius, y: CY + Math.sin(angle) * radius, vx: 0, vy: 0 };
    });
    alphaRef.current = 1;
    setFrame(posRef.current.map(p => ({ ...p })));

    let raf = 0;
    let running = true;

    function step() {
      const pos = posRef.current;
      const fx = new Array(n).fill(0);
      const fy = new Array(n).fill(0);

      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          let dx = pos[i].x - pos[j].x;
          let dy = pos[i].y - pos[j].y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 0.01) { d2 = 0.01; dx = Math.random() - 0.5; dy = Math.random() - 0.5; }
          const d = Math.sqrt(d2);
          const f = REPULSION / d2;
          const ux = dx / d, uy = dy / d;
          fx[i] += ux * f; fy[i] += uy * f;
          fx[j] -= ux * f; fy[j] -= uy * f;
        }
      }

      for (const [a, b] of edges) {
        const dx = pos[b].x - pos[a].x;
        const dy = pos[b].y - pos[a].y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const f = SPRING * (d - REST_LENGTH);
        const ux = dx / d, uy = dy / d;
        fx[a] += ux * f; fy[a] += uy * f;
        fx[b] -= ux * f; fy[b] -= uy * f;
      }

      const alpha = alphaRef.current;
      for (let i = 0; i < n; i++) {
        if (i === draggingRef.current) continue;
        fx[i] += (CX - pos[i].x) * CENTERING;
        fy[i] += (CY - pos[i].y) * CENTERING;
        let vx = (pos[i].vx + fx[i] * alpha) * DAMPING;
        let vy = (pos[i].vy + fy[i] * alpha) * DAMPING;
        const speed = Math.hypot(vx, vy);
        if (speed > MAX_SPEED) { vx = (vx / speed) * MAX_SPEED; vy = (vy / speed) * MAX_SPEED; }
        pos[i].vx = vx; pos[i].vy = vy;
        pos[i].x = Math.max(24, Math.min(W - 24, pos[i].x + vx));
        pos[i].y = Math.max(24, Math.min(H - 24, pos[i].y + vy));
      }
    }

    function loop() {
      if (!running) return;
      step();
      setFrame(posRef.current.map(p => ({ ...p })));
      alphaRef.current *= 0.985;
      if (alphaRef.current < 0.01 && draggingRef.current === null) { running = false; return; }
      raf = requestAnimationFrame(loop);
    }

    reheatRef.current = () => {
      alphaRef.current = Math.max(alphaRef.current, 0.6);
      if (!running) { running = true; raf = requestAnimationFrame(loop); }
    };

    raf = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(raf); };
  }, [nodes, edges]);

  // Drag / click handling via window listeners (so dragging works off-node too).
  useEffect(() => {
    function clientToLogical(e: PointerEvent) {
      const r = svgRef.current?.getBoundingClientRect();
      if (!r) return { x: 0, y: 0 };
      return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
    }
    function onMove(e: PointerEvent) {
      const i = draggingRef.current;
      if (i === null) return;
      const node = posRef.current[i];
      if (!node) return;
      if (Math.hypot(e.clientX - dragStartRef.current.cx, e.clientY - dragStartRef.current.cy) > 4) dragStartRef.current.moved = true;
      const p = clientToLogical(e);
      node.x = p.x; node.y = p.y; node.vx = 0; node.vy = 0;
      reheatRef.current();
    }
    function onUp() {
      const i = draggingRef.current;
      if (i === null) return;
      draggingRef.current = null;
      if (!dragStartRef.current.moved && nodes[i]) onNavigate(nodes[i].slug);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [nodes, onNavigate]);

  if (nodes.length === 0) {
    return <p style={{ color: "var(--text-muted)" }}>No pages to graph yet.</p>;
  }

  const pos = frame;
  const neighbors = currentIndex >= 0 ? adjacency[currentIndex] : new Set<number>();
  const highlightIdx = hover ?? currentIndex;
  const highlightSet = highlightIdx >= 0 ? adjacency[highlightIdx] : new Set<number>();

  return (
    <div className="fade-in">
      <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
        Pages linked via <code>[[wikilinks]]</code>. The current page is gold — click any node to open it, or drag to rearrange.
      </p>
      <div style={{ background: "var(--navy)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", height: "auto", display: "block", touchAction: "none" }}
        >
          {/* Edges */}
          {pos.length === nodes.length && edges.map(([a, b], i) => {
            const active = highlightIdx >= 0 && (a === highlightIdx || b === highlightIdx);
            return (
              <line
                key={i}
                x1={pos[a].x} y1={pos[a].y} x2={pos[b].x} y2={pos[b].y}
                stroke={active ? "var(--gold)" : "rgba(255,255,255,0.13)"}
                strokeWidth={active ? 1.6 : 1}
              />
            );
          })}

          {/* Nodes */}
          {pos.length === nodes.length && nodes.map((node, i) => {
            const isCurrent = i === currentIndex;
            const isNeighbor = neighbors.has(i);
            const isHot = i === highlightIdx || highlightSet.has(i);
            const deg = adjacency[i].size;
            const r = (isCurrent ? 9 : 5 + Math.min(deg, 6)) ;
            const fill = isCurrent ? "var(--gold)" : isNeighbor ? "var(--gold-light)" : "#6f8bad";
            const dim = highlightIdx >= 0 && !isHot && !isCurrent ? 0.35 : 1;
            const showLabel = isCurrent || isNeighbor || i === hover;
            return (
              <g key={node.slug} style={{ cursor: "pointer", opacity: dim }}
                onPointerDown={e => { e.preventDefault(); draggingRef.current = i; dragStartRef.current = { cx: e.clientX, cy: e.clientY, moved: false }; reheatRef.current(); }}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(h => (h === i ? null : h))}
              >
                <circle cx={pos[i].x} cy={pos[i].y} r={r} fill={fill}
                  stroke={isCurrent ? "white" : "rgba(255,255,255,0.25)"} strokeWidth={isCurrent ? 2 : 1} />
                {showLabel && (
                  <text x={pos[i].x} y={pos[i].y - r - 5} textAnchor="middle"
                    fontSize={isCurrent ? 13 : 11}
                    fontFamily="'DM Sans', sans-serif"
                    fontWeight={isCurrent ? 700 : 500}
                    fill={isCurrent ? "var(--gold)" : "rgba(255,255,255,0.85)"}>
                    {node.title}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div style={{ display: "flex", gap: "1.25rem", marginTop: "0.85rem", fontSize: "0.72rem", color: "var(--text-muted)" }}>
        <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: "var(--gold)", marginRight: 5 }} />This page</span>
        <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: "var(--gold-light)", marginRight: 5 }} />Linked</span>
        <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: "#6f8bad", marginRight: 5 }} />Other pages</span>
      </div>
    </div>
  );
}
