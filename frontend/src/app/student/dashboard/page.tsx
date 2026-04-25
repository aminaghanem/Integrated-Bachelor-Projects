"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"

const API = "http://localhost:4000"

interface Student { _id: string; username: string }

interface LearningHistoryItem {
  _id: string
  resource_id: string
  resource_title: string
  category: string
  completion_status: "completed" | "in_progress"
  completion_date?: string
  source: string
}

// ── Notification types ───────────────────────────────────────────
interface Notification {
  type: "blocked" | "error" | "success"
  message: string
  url?: string           // the URL that was blocked, for display
  retrigger?: boolean    // whether to offer "open anyway"
}

interface Recommendation {
  url: string
  title: string
  category: string
  cosineScore: string
  finalScore: string
}

interface RecommendationGroup {
  category: string
  label: string
  items: Recommendation[]
}
 
// ── Notification banner ──────────────────────────────────────────
function NotificationBanner({
  notification,
  onDismiss,
  onOpenAnyway,
}: {
  notification: Notification
  onDismiss: () => void
  onOpenAnyway?: (url: string) => void
}) {
  const colors = {
    blocked: { bg: "#fde8e8", border: "#3d2c1e", text: "#c0392b", icon: "🚫" },
    error:   { bg: "#fef3cc", border: "#3d2c1e", text: "#8a6a00", icon: "⚠️" },
    success: { bg: "#e6f7e6", border: "#3d2c1e", text: "#2d7a2d", icon: "✅" },
  }
  const c = colors[notification.type]
 
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", justifyContent: "space-between",
      padding: "10px 14px", marginBottom: 12, borderRadius: 10,
      background: c.bg, border: `2px solid ${c.border}`,
      boxShadow: "2px 2px 0 #3d2c1e",
      animation: "slideDown 0.2s ease"
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1 }}>
        <span style={{ fontSize: 16, marginTop: 1 }}>{c.icon}</span>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: c.text }}>
            {notification.type === "blocked" ? "Access Blocked" :
             notification.type === "error" ? "Error" : "Success"}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#374151" }}>
            {notification.message}
          </p>
          {notification.url && (
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9ca3af", wordBreak: "break-all" }}>
              {notification.url}
            </p>
          )}
          {/* {notification.retrigger && notification.url && onOpenAnyway && (
            <button
              onClick={() => onOpenAnyway(notification.url!)}
              style={{
                marginTop: 6, padding: "4px 12px", fontSize: 11, fontWeight: 600,
                border: "1px solid #fca5a5", borderRadius: 6,
                background: "#fff", color: "#dc2626", cursor: "pointer"
              }}
            >
              Open in new tab anyway →
            </button>
          )} */}
        </div>
      </div>
      <button onClick={onDismiss} style={{
        background: "none", border: "none", cursor: "pointer",
        color: "#9ca3af", fontSize: 18, lineHeight: 1, padding: "0 0 0 8px", flexShrink: 0
      }}>×</button>
    </div>
  )
}

function RecCard({ rec, onClick }: { rec: Recommendation; onClick: (url: string) => void }) {
  return (
    <div
      onClick={() => onClick(rec.url)}
      style={{
        padding: "11px 13px", borderRadius: 10, border: "2px solid #3d2c1e",
        background: "#fff8ee", cursor: "pointer", transition: "all 0.1s",
        boxShadow: "2px 2px 0 #3d2c1e"
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translate(-1px,-1px)"; e.currentTarget.style.boxShadow = "3px 3px 0 #3d2c1e" }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "2px 2px 0 #3d2c1e" }}>

      <p style={{ margin: "0 0 5px", fontSize: 12, fontWeight: 700, color: "#3d2c1e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {rec.title || rec.url}
      </p>
      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "#5ab4e8", color: "#fff", fontWeight: 700, border: "1.5px solid #3d2c1e", display: "inline-block" }}>
        {rec.category}
      </span>
    </div>
  )
}

// ── Timer component — uses DOM directly, never causes re-renders ──
function LiveTimer({ timerRef }: { timerRef: React.RefObject<HTMLSpanElement | null> }) {
  return <span ref={timerRef} style={{ fontSize: 12, color: "#6b7280", fontFamily: "monospace" }}>⏱ 0s</span>
}

// ── Shadow DOM viewer ────────────────────────────────────────────
function ShadowViewer({ html, onIntercept, onScroll, onClick }: {
  html: string
  onIntercept: (url: string) => void
  onScroll: () => void
  onClick: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || !html) return
    const shadowRoot = containerRef.current.shadowRoot ||
      containerRef.current.attachShadow({ mode: "open" })
    shadowRoot.innerHTML = html

    const handleClick = (evt: Event) => {
      const e = evt as MouseEvent
      const path = e.composedPath()
      const link = path.find(el => (el as HTMLElement).tagName === "A") as HTMLAnchorElement | undefined
      onClick()
      if (link?.href && !link.getAttribute("href")?.startsWith("#")) {
        e.preventDefault()
        onIntercept(link.href)
      }
    }
    const handleScroll = () => onScroll()

    shadowRoot.addEventListener("click", handleClick as EventListener)
    shadowRoot.addEventListener("scroll", handleScroll, true)
    return () => {
      shadowRoot.removeEventListener("click", handleClick as EventListener)
      shadowRoot.removeEventListener("scroll", handleScroll, true)
    }
  }, [html]) // intentionally only re-run when html changes

  return <div ref={containerRef} style={{ width: "100%", height: "600px", overflow: "auto", background: "#fff" }} />
}

// ── Feedback modal ───────────────────────────────────────────────
interface FeedbackData {
  interest_rating: number
  usefulness_rating: number
  perceived_difficulty: "easy" | "moderate" | "hard" | ""
}

function FeedbackModal({ url, category, onSubmit, onSkip }: {
  url: string
  category: string
  onSubmit: (data: FeedbackData) => void
  onSkip: () => void
}) {
  const [form, setForm] = useState<FeedbackData>({
    interest_rating: 0,
    usefulness_rating: 0,
    perceived_difficulty: ""
  })

  const StarRow = ({ label, field }: { label: string; field: "interest_rating" | "usefulness_rating" }) => (
    <div style={{ marginBottom: 16 }}>
      <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 500, color: "#374151" }}>{label}</p>
      <div style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => setForm(f => ({ ...f, [field]: n }))}
            style={{
              width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer", fontSize: 18,
              background: form[field] >= n ? "#f5c842" : "#f3f4f6",
              color: form[field] >= n ? "#fff" : "#9ca3af"
            }}>★</button>
        ))}
      </div>
    </div>
  )

  const canSubmit = form.interest_rating > 0 && form.usefulness_rating > 0 && form.perceived_difficulty !== ""

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
      <div style={{ background: "#fff8ee", borderRadius: 16, padding: "2rem", width: "100%", maxWidth: 440, boxShadow: "4px 4px 0 #3d2c1e", border: "2px solid #3d2c1e" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>How was this resource?</h2>
        <p style={{ margin: "0 0 20px", fontSize: 12, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</p>

        <StarRow label="How interesting was it?" field="interest_rating" />
        <StarRow label="How useful was it for your studies?" field="usefulness_rating" />

        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 500, color: "#374151" }}>How difficult was it?</p>
          <div style={{ display: "flex", gap: 8 }}>
            {(["easy", "moderate", "hard"] as const).map(d => (
              <button key={d} onClick={() => setForm(f => ({ ...f, perceived_difficulty: d }))}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid",
                  cursor: "pointer", fontSize: 12, fontWeight: 600, textTransform: "capitalize",
                  borderColor: form.perceived_difficulty === d ? "#3d2c1e" : "#e5e7eb",
                  background: form.perceived_difficulty === d ? "#c3e0f5" : "#fff",
                  color: form.perceived_difficulty === d ? "#1d4ed8" : "#6b7280"
                }}>{d}</button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onSubmit(form)} disabled={!canSubmit}
            style={{
              flex: 1, padding: "10px", borderRadius: 8, border: "none", cursor: canSubmit ? "pointer" : "not-allowed",
              background: canSubmit ? "#2563eb" : "#e5e7eb", color: canSubmit ? "#fff" : "#9ca3af",
              fontWeight: 600, fontSize: 14
            }}>Submit Feedback</button>
          <button onClick={onSkip}
            style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", cursor: "pointer", fontSize: 14 }}>
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Learning history panel ───────────────────────────────────────
function HistoryPanel({ items, onClose, onItemClick }: { items: LearningHistoryItem[]; onClose: () => void; onItemClick: (url: string) => void }) {
  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"

  return (
    <div style={{ border: "2px solid #3d2c1e", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", height: 600, boxShadow: "3px 3px 0 #3d2c1e" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", width: "200%",
          padding: "8px 16px", background: "#f5c842", borderBottom: "2px solid #3d2c1e"
        }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#fff", fontFamily: "'Silkscreen', monospace" }}>
            Your Learning History ({items.length})
          </p>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#3d2c1e", fontSize: 18, fontWeight: 700
          }}>×</button>
        </div>
        {/* <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18 }}>×</button> */}
      </div>

      {items.length === 0 ? (
        <p style={{ padding: "2rem", textAlign: "center", color: "#9ca3af", margin: 0, flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>No history yet. Start browsing!</p>
      ) : (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {[...items].reverse().map(item => (
            <div key={item._id} onClick={() => onItemClick(item.resource_id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", transition: "background 0.2s", backgroundColor: "fff8ee" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#fde8c8"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#fff8ee"}>
              <span style={{ fontSize: 18 }}>{item.completion_status === "completed" ? "✅" : "📖"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#2563eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.resource_title || item.resource_id}
                </div>
                <div style={{ padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 700, border: "1.5px solid #3d2c1e", background: "#d4f5d4", color: "#2d7a2d" }}>
                  {/* <span style={{ fontSize: 11, color: "#9ca3af" }}>{item.category}</span> */}
                  {item.completion_date && (
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>· {formatDate(item.completion_date)}</span>
                  )}
                </div>
              </div>
              <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 700, border: "1.5px solid #3d2c1e", background: "#fde8a0", color: "#8a6a00" }}>
                {item.completion_status === "completed" ? "Completed" : "In Progress"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Avatar data ───────────────────────────────────────────────────
const AVATARS = [
  { id: "ghost",    emoji: "👻", color: "#5ab4e8" },
  { id: "mushroom", emoji: "🍄", color: "#f47b7b" },
  { id: "star",     emoji: "⭐", color: "#f5c842" },
  { id: "frog",     emoji: "🐸", color: "#7bc67e" },
  { id: "robot",    emoji: "🤖", color: "#c47be8" },
  { id: "duck",     emoji: "🐤", color: "#f5c842" },
]

// ── Maze cell types ───────────────────────────────────────────────
type CellType = "wall" | "path" | "zone" | "rec"

interface MazeCell {
  type: CellType
  label?: string       // zone label shown on cell
  zoneColor?: string
  rec?: Recommendation // recommendation at end of path
}

// ── Build maze from recommendation groups ────────────────────────
function buildMaze(
  recGroups: RecommendationGroup[],
  exploreRecs: Recommendation[]
): { grid: MazeCell[][]; startPos: [number, number]; zonePositions: { label: string; color: string; pos: [number, number] }[] } {
 
  // ── Collect all branches ────────────────────────────────────────────────
  const BRANCH_COLORS = [
    "#5ab4e8", "#f47b7b", "#c47be8", "#f5a623",
    "#7bc67e", "#e8845a", "#f5c842", "#a78bfa",
  ]
 
  const allBranches = [
    ...recGroups.map((g, i) => ({
      label: g.label,
      color: BRANCH_COLORS[i % BRANCH_COLORS.length],
      recs: g.items || [],
    })),
    ...(exploreRecs.length > 0
      ? [{ label: "Explore New Concepts", color: "#7bc67e", recs: exploreRecs }]
      : []),
  ]
 
  // ── Arm geometry constants ──────────────────────────────────────────────
  // Each cardinal direction can host 1 straight branch or 2 forked sub-branches.
  //
  //          [UP straight] or [UP-LEFT fork] + [UP-RIGHT fork]
  //
  // Straight: hub → (HUB_LEN cells) → zone → recs hang perpendicular
  // Forked:   hub → (HUB_LEN cells) → fork junction
  //                                  → (FORK_LEN cells perpendicular) → zone → recs hang further out
 
  const HUB_LEN    = 5   // cells from hub centre to zone (straight) or fork junction (forked)
  const FORK_LEN   = 5   // cells from fork junction to zone (forked only)
  const REC_REACH  = 4   // perpendicular cells from zone centre to rec cell
  const REC_GAP    = 3   // forward spacing between consecutive rec pairs along the arm
 
  // Cardinal directions and their two possible fork sub-directions (perpendicular)
  type Dir = { dy: number; dx: number }
  const CARDINALS: Dir[] = [
    { dy: -1, dx:  0 },  // 0 UP
    { dy:  0, dx:  1 },  // 1 RIGHT
    { dy:  1, dx:  0 },  // 2 DOWN
    { dy:  0, dx: -1 },  // 3 LEFT
  ]
  // For cardinal i, the two fork sub-directions (left-turn, right-turn of that cardinal)
  const FORK_SUBS: [Dir, Dir][] = [
    [{ dy:  0, dx: -1 }, { dy:  0, dx:  1 }],  // UP   → fork LEFT / RIGHT
    [{ dy: -1, dx:  0 }, { dy:  1, dx:  0 }],  // RIGHT→ fork UP   / DOWN
    [{ dy:  0, dx:  1 }, { dy:  0, dx: -1 }],  // DOWN → fork RIGHT/ LEFT
    [{ dy:  1, dx:  0 }, { dy: -1, dx:  0 }],  // LEFT → fork DOWN / UP
  ]
 
  // Assign branches to (cardinalIdx, subIdx) slots
  interface Slot { cardinalIdx: number; subIdx: 0 | 1; forked: boolean; branch: typeof allBranches[number] }
  const slots: Slot[] = allBranches.map((branch, i) => ({
    cardinalIdx: i % 4,
    subIdx: (Math.floor(i / 4) % 2) as 0 | 1,
    forked: i >= 4,
    branch,
  }))
 
  // ── Grid sizing ──────────────────────────────────────────────────────────
  const maxRecsPerBranch = Math.max(...allBranches.map(b => b.recs.length), 0)
  // Furthest cell we'll ever place = HUB_LEN + FORK_LEN + REC_GAP * ceil(recs/2) + REC_REACH + 3
  const maxReach = HUB_LEN + FORK_LEN + Math.ceil(maxRecsPerBranch / 2) * REC_GAP + REC_REACH + 8
  const HALF = maxReach + FORK_LEN + 8
  const SIZE = HALF * 2 + 1
  const cx = HALF
  const cy = HALF
 
  // ── Grid & ownership ────────────────────────────────────────────────────
  const grid: MazeCell[][] = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => ({ type: "wall" as CellType }))
  )
  // Track which branch index owns each cell (-1 = none / shared path)
  const owner: Int16Array = new Int16Array(SIZE * SIZE).fill(-1)
 
  const idx = (r: number, c: number) => r * SIZE + c
 
  const open = (
    r: number, c: number,
    type: CellType = "path",
    extra?: Partial<MazeCell>,
    branchIdx = -1,
  ) => {
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return
    const existing = grid[r][c]
    // Never overwrite a zone or rec cell with anything lesser
    if (existing.type === "zone" || existing.type === "rec") return
    // Don't overwrite a cell owned by a different branch with a path (could corrupt corridors)
    const ownedBy = owner[idx(r, c)]
    if (type === "path" && ownedBy !== -1 && ownedBy !== branchIdx) return
    grid[r][c] = { type, ...extra }
    if (branchIdx >= 0) owner[idx(r, c)] = branchIdx
  }
 
  // ── Hub (central 3×3) ───────────────────────────────────────────────────
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++)
      open(cy + dr, cx + dc)
 
  // ── Build each branch ────────────────────────────────────────────────────
  // First pass: draw primary corridors (before forks so the junction cell is neutral)
  const primaryDrawn = new Set<number>()
 
  slots.forEach(({ cardinalIdx, subIdx, forked, branch }, bi) => {
    const card = CARDINALS[cardinalIdx]
 
    // Draw primary corridor hub → HUB_LEN if not already done for this cardinal
    if (!primaryDrawn.has(cardinalIdx)) {
      primaryDrawn.add(cardinalIdx)
      for (let s = 2; s <= HUB_LEN; s++)
        open(cy + card.dy * s, cx + card.dx * s)
    }
 
    let zr: number, zc: number
    // The "approach direction" INTO the zone (used to determine rec arm orientations)
    let approachDy: number, approachDx: number
 
    if (!forked) {
      // Straight: zone sits right at HUB_LEN
      zr = cy + card.dy * HUB_LEN
      zc = cx + card.dx * HUB_LEN
      approachDy = card.dy
      approachDx = card.dx
    } else {
      // Forked: zone sits FORK_LEN along a sub-direction from the fork junction
      const forkR = cy + card.dy * HUB_LEN
      const forkC = cx + card.dx * HUB_LEN
      open(forkR, forkC) // fork junction is neutral path (not owned)
 
      const sub = FORK_SUBS[cardinalIdx][subIdx]
      for (let s = 1; s <= FORK_LEN; s++)
        open(forkR + sub.dy * s, forkC + sub.dx * s, "path", undefined, bi)
 
      zr = forkR + sub.dy * FORK_LEN
      zc = forkC + sub.dx * FORK_LEN
      approachDy = sub.dy
      approachDx = sub.dx
    }
 
    // Place zone cell
    open(zr, zc, "zone", { label: branch.label, zoneColor: branch.color }, bi)
 
    // ── Rec arms ──────────────────────────────────────────────────────────
    // Rec arms go PERPENDICULAR to the approach direction.
    // To avoid pointing back toward the hub, we bias the perpendicular
    // directions to point OUTWARD (away from hub centre).
    //
    // The two candidate perpendiculars:
    const isVertApproach = approachDx === 0
    const perpA: Dir = isVertApproach ? { dy: 0, dx:  1 } : { dy:  1, dx: 0 }
    const perpB: Dir = isVertApproach ? { dy: 0, dx: -1 } : { dy: -1, dx: 0 }
 
    // For each rec, alternating sides (perpA / perpB), stepping forward along
    // the approach direction every 2 recs.
    branch.recs.forEach((rec, i) => {
      // For forked branches, both sub-arms share the same approach direction.
      // To avoid crossing, sub 0 only spreads to perpA, sub 1 only spreads to perpB.
      // For straight (non-forked) branches, alternate normally.
      let side: Dir
      if (forked) {
        // subIdx 0 → always perpA, subIdx 1 → always perpB
        // Within that side, step further forward for each successive rec
        side = subIdx === 0 ? perpA : perpB
      } else {
        side = i % 2 === 0 ? perpA : perpB
      }

      const fwdSteps = i * REC_GAP  // every rec gets its own forward slot (no sharing)

      // Forward corridor from zone
      let blocked = false
      for (let f = 1; f <= fwdSteps; f++) {
        const fr = zr + approachDy * f
        const fc = zc + approachDx * f
        if (!grid[fr]?.[fc]) { blocked = true; break }
        const existingOwner = owner[idx(fr, fc)]
        if (existingOwner !== -1 && existingOwner !== bi) { blocked = true; break }
        open(fr, fc, "path", undefined, bi)
      }
      if (blocked) return

      const baseR = zr + approachDy * fwdSteps
      const baseC = zc + approachDx * fwdSteps

      // Perpendicular arm — try increasing reach until a free cell is found
      let placed = false
      for (let reach = REC_REACH; reach <= REC_REACH + 8 && !placed; reach++) {
        const er = baseR + side.dy * reach
        const ec = baseC + side.dx * reach
        if (!grid[er]?.[ec]) continue
        if (grid[er][ec].type === "zone" || grid[er][ec].type === "rec") continue
        if (owner[idx(er, ec)] !== -1 && owner[idx(er, ec)] !== bi) continue

        // Check the whole corridor is clear
        let corridorClear = true
        for (let s = 1; s < reach; s++) {
          const pr = baseR + side.dy * s
          const pc = baseC + side.dx * s
          if (!grid[pr]?.[pc]) { corridorClear = false; break }
          const o = owner[idx(pr, pc)]
          if (o !== -1 && o !== bi) { corridorClear = false; break }
          if (grid[pr][pc].type === "zone" || grid[pr][pc].type === "rec") { corridorClear = false; break }
        }
        if (!corridorClear) continue

        // Draw corridor and place rec
        for (let s = 1; s < reach; s++)
          open(baseR + side.dy * s, baseC + side.dx * s, "path", undefined, bi)
        open(er, ec, "rec", { rec, zoneColor: branch.color }, bi)
        placed = true
      }
    })
  })
 
  // Collect zone positions for navigation
  const zonePositions: { label: string; color: string; pos: [number, number] }[] = []
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (grid[r][c].type === "zone" && grid[r][c].label)
        zonePositions.push({ label: grid[r][c].label!, color: grid[r][c].zoneColor || "#5ab4e8", pos: [r, c] })

  return { grid, startPos: [cy, cx], zonePositions }
}

// ── MazeGame component ────────────────────────────────────────────
function MazeGame({
  recGroups,
  exploreRecs,
  onRecClick,
}: {
  recGroups: RecommendationGroup[]
  exploreRecs: Recommendation[]
  onRecClick: (url: string) => void
}) {
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)
  const [hoveredRec, setHoveredRec] = useState<Recommendation | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const { grid, startPos, zonePositions } = useMemo(
    () => buildMaze(recGroups, exploreRecs),
    [recGroups, exploreRecs]
  )
  const [playerPos, setPlayerPos] = useState<[number, number]>(startPos)
  useEffect(() => { setPlayerPos(startPos) }, [startPos[0], startPos[1]])
 
  // ── Cell sizes ────────────────────────────────────────────────────────────
  // Regular path cells stay at CELL_SMALL; zone + rec cells are larger
  const CELL_SMALL = 45   // wall / path cells (px)
  const CELL_LARGE = 90   // zone / rec cells (px)
 
  // Determine cell size for a given grid cell
  const cellSize = (cell: MazeCell): number =>
    cell.type === "zone" || cell.type === "rec" ? CELL_LARGE : CELL_SMALL
 
  // Because cells have mixed sizes, we use absolute positioning on a canvas
  // and pre-compute each cell's (x, y) offset.
  // Row height = max cell height in that row; col width = max cell width in that col.
  const rowH = useMemo(() =>
    grid.map(row => Math.max(...row.map(c => cellSize(c)))),
    [grid]
  )
  const colW = useMemo(() =>
    grid[0]?.map((_, ci) => Math.max(...grid.map(row => cellSize(row[ci])))) ?? [],
    [grid]
  )
 
  // Cumulative offsets
  const rowY = useMemo(() => {
    const acc: number[] = []
    let y = 0
    for (const h of rowH) { acc.push(y); y += h }
    return acc
  }, [rowH])
  const colX = useMemo(() => {
    const acc: number[] = []
    let x = 0
    for (const w of colW) { acc.push(x); x += w }
    return acc
  }, [colW])
 
  const totalW = colX[colX.length - 1] + colW[colW.length - 1]
  const totalH = rowY[rowY.length - 1] + rowH[rowH.length - 1]
 
  const move = useCallback((dr: number, dc: number) => {
    if (!selectedAvatar) { setMessage("Pick an avatar first! 👆"); return }
    setPlayerPos(([r, c]) => {
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nr >= grid.length || nc < 0 || nc >= grid[0].length) return [r, c]
      const cell = grid[nr][nc]
      if (cell.type === "wall") return [r, c]
      if (cell.type === "zone") setMessage(`📍 ${cell.label}`)
      if (cell.type !== "zone" && cell.type !== "rec") setMessage(null)
      if (cell.type === "rec" && cell.rec) setHoveredRec(cell.rec)
      else setHoveredRec(null)
      return [nr, nc]
    })
  }, [selectedAvatar, grid])
 
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
        e.preventDefault()
        if (e.key === "ArrowUp")    move(-1, 0)
        if (e.key === "ArrowDown")  move(1, 0)
        if (e.key === "ArrowLeft")  move(0, -1)
        if (e.key === "ArrowRight") move(0, 1)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [move])
 
  useEffect(() => {
    const style = document.createElement("style")
    style.textContent = `
      @keyframes playerBounce { 0% { transform: scale(0.8); } 60% { transform: scale(1.15); } 100% { transform: scale(1); } }
      @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
    `
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [])
 
  const avatar = AVATARS.find(a => a.id === selectedAvatar)
 
  return (
    <div style={{
      border: "2px solid #3d2c1e", borderRadius: 12,
      boxShadow: "3px 3px 0 #3d2c1e", overflow: "hidden",
      marginBottom: 20, background: "#fff8ee"
    }}>
      {/* Title bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "8px 14px", background: "#cb6ce6",
        borderBottom: "2px solid #3d2c1e"
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginLeft: 4, fontFamily: "'Silkscreen', monospace" }}>
          the learning maze — explore your recommendations
        </span>
      </div>
 
      {/* 3-column layout: avatar | maze | found panel */}
      <div style={{ display: "flex", height: "calc(100vh - 280px)", minHeight: 480 }}>
 
        {/* ── Avatar sidebar ── */}
        <div style={{
          width: 80, flexShrink: 0,
          borderRight: "2px solid #3d2c1e",
          background: "#f5c842", padding: "10px 6px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          overflowY: "auto"
        }}>
          <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.07em", textAlign: "center", fontFamily: "'VT323', monospace" }}>Avatar</p>
          {AVATARS.map(av => (
            <button
              key={av.id}
              onClick={() => { setSelectedAvatar(av.id); setMessage(null) }}
              style={{
                width: 52, height: 52, borderRadius: 8, fontSize: 26,
                border: selectedAvatar === av.id ? "2.5px solid #3d2c1e" : "1.5px solid #c9b49a",
                background: selectedAvatar === av.id ? av.color : "#fff8ee",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: selectedAvatar === av.id ? "2px 2px 0 #3d2c1e" : "none",
                transform: selectedAvatar === av.id ? "translate(-1px,-1px)" : "none",
                transition: "all 0.1s", flexShrink: 0
              }}
            >{av.emoji}</button>
          ))}
          
        </div>
 
        {/* ── Maze viewport ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", background: "#fef3e2", overflow: "hidden" }}>
 
          {/* Zone message */}
          <div style={{ height: 36, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", flexShrink: 0 }}>
            {message && (
              <div style={{
                padding: "4px 16px", borderRadius: 20,
                border: "1.5px solid #3d2c1e", background: "#f5c842",
                fontSize: 12, fontWeight: 700, color: "#3d2c1e",
                boxShadow: "2px 2px 0 #3d2c1e"
              }}>{message}</div>
            )}
          </div>
 
          {/* Scrollable maze canvas */}
          <div style={{ flex: 1, overflow: "hidden", position: "relative", width: "100%" }}>
            <div style={{
              position: "absolute", inset: 0, overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {/* The whole maze is an absolutely-positioned grid, shifted so
                  the player's cell is always centred in the viewport. */}
              <div style={{
                position: "relative",
                width: totalW,
                height: totalH,
                // Translate so player cell centre sits at viewport centre
                transform: `translate(
                  calc(50% - ${colX[playerPos[1]] + colW[playerPos[1]] / 2}px),
                  calc(50% - ${rowY[playerPos[0]] + rowH[playerPos[0]] / 2}px)
                )`,
                transition: "transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                flexShrink: 0,
              }}>
                {grid.map((row, r) =>
                  row.map((cell, c) => {
                    const isPlayer = playerPos[0] === r && playerPos[1] === c
                    const w = colW[c]
                    const h = rowH[r]
                    const x = colX[c]
                    const y = rowY[r]
 
                    let bg = "#7c3aed44"
                    if (cell.type === "path") bg = "#fef3e2"
                    if (cell.type === "zone") bg = cell.zoneColor || "#5ab4e8"
                    if (cell.type === "rec")  bg = cell.zoneColor ? cell.zoneColor + "44" : "#fff8ee"
                    if (isPlayer) bg = avatar?.color || "#f5c842"
 
                    // Avatar emoji scales to fill the current cell
                    const avatarFontSize = Math.min(w, h) * 0.65
 
                    return (
                      <div
                        key={`${r}-${c}`}
                        title={cell.type === "rec" && cell.rec ? (cell.rec.title || cell.rec.url) : cell.label}
                        onClick={() => cell.type === "rec" && cell.rec && onRecClick(cell.rec.url)}
                        style={{
                          position: "absolute",
                          left: x, top: y, width: w, height: h,
                          background: bg,
                          border: cell.type !== "wall"
                            ? "0.5px solid #3d2c1e18"
                            : "0.5px solid #7c3aed44",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: cell.type === "zone" || cell.type === "rec" ? 5 : 2,
                          cursor: cell.type === "rec" ? "pointer" : "default",
                          overflow: "hidden",
                          boxSizing: "border-box",
                          outline: isPlayer ? "2.5px solid #3d2c1e" : "none",
                          boxShadow: cell.type === "zone"
                            ? "inset 0 0 0 3px rgba(255,255,255,0.35)"
                            : cell.type === "rec"
                            ? "inset 0 0 0 2px #3d2c1e55"
                            : "none",
                          borderRadius: cell.type === "zone" ? 6
                            : cell.type === "rec" ? 4 : 0,
                        }}
                      >
                        {isPlayer ? (
                          <span
                            key={`${playerPos[0]}-${playerPos[1]}`}
                            style={{
                              fontSize: avatarFontSize,
                              lineHeight: 1,
                              display: "inline-block",
                              animation: "playerBounce 0.2s ease",
                            }}
                          >
                            {avatar?.emoji || "😊"}
                          </span>
                        ) : cell.type === "zone" ? (
                          <span style={{
                            fontSize: 11, textAlign: "center", lineHeight: 1.3,
                            color: "#fff", fontWeight: 800,
                            textShadow: "0 1px 3px #0006",
                            wordBreak: "break-word",
                            padding: "0 3px",
                            display: "-webkit-box",
                            WebkitLineClamp: 4,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}>
                            {(cell.label || "")
                              .replace("Since you're interested in ", "")
                              .replace("Since you like ", "")
                              .replace("Because you study ", "")}
                          </span>
                        ) : cell.type === "rec" && cell.rec ? (
                          <>
                            <span style={{ fontSize: 18, lineHeight: 1, marginBottom: 3 }}>🌐</span>
                            <span style={{
                              fontSize: 10, fontWeight: 700, color: "#3d2c1e",
                              textAlign: "center", lineHeight: 1.25,
                              wordBreak: "break-word",
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              width: "100%",
                              padding: "0 3px",
                              boxSizing: "border-box",
                            }}>
                              {cell.rec.title || cell.rec.url}
                            </span>
                            <span style={{
                              marginTop: 4, fontSize: 8, padding: "2px 6px",
                              borderRadius: 8, background: cell.zoneColor || "#5ab4e8",
                              color: "#fff", fontWeight: 700,
                              border: "1px solid #3d2c1e33",
                              maxWidth: "90%", overflow: "hidden",
                              textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {cell.rec.category}
                            </span>
                          </>
                        ) : null}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
 
        {/* ── Found / rec preview panel ── */}
        <div style={{
          width: 200, flexShrink: 0,
          borderLeft: "2px solid #3d2c1e",
          background: "#f5c842", padding: "12px 10px",
          display: "flex", flexDirection: "column", gap: 8,
          overflowY: "auto"
        }}>
          {hoveredRec ? (
            <>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#b89b82", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                🌐 Found
              </p>
              <div
                onClick={() => onRecClick(hoveredRec.url)}
                style={{
                  padding: "10px", borderRadius: 8,
                  border: "2px solid #3d2c1e", background: "#fff8ee",
                  cursor: "pointer", boxShadow: "2px 2px 0 #3d2c1e"
                }}
              >
                <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#3d2c1e", lineHeight: 1.3 }}>
                  {hoveredRec.title || hoveredRec.url}
                </p>
                <span style={{
                  fontSize: 9, padding: "2px 7px", borderRadius: 20,
                  background: "#5ab4e8", color: "#fff",
                  fontWeight: 700, border: "1px solid #3d2c1e",
                  display: "inline-block", marginBottom: 8
                }}>{hoveredRec.category}</span>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#5ab4e8" }}>
                  Open →
                </p>
              </div>
            </>
          ) : (
            <>
              <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.07em", textAlign: "center", fontFamily: "'VT323', monospace" }}>
                🗺 Sections
              </p>
              <p style={{ margin: "0 0 8px", fontSize: 14, color: "#fff", lineHeight: 1.4, textAlign: "center", fontFamily: "'VT323', monospace" }}>
                Click a section to teleport there!
              </p>
              {zonePositions.map((zone, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (!selectedAvatar) { setMessage("Pick an avatar first! 👆"); return }
                    setPlayerPos(zone.pos)
                    setMessage(`📍 ${zone.label}`)
                  }}
                  style={{
                    width: "100%", padding: "8px 10px",
                    borderRadius: 8, border: "2px solid #3d2c1e",
                    background: zone.color, color: "#fff",
                    cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "'Press Start 2P', cursive",
                    textAlign: "left", boxShadow: "2px 2px 0 #3d2c1e",
                    transition: "all 0.1s", lineHeight: 1.3,
                    display: "flex", alignItems: "center", gap: 6
                  }}
                  onMouseDown={e => { e.currentTarget.style.transform = "translate(2px,2px)"; e.currentTarget.style.boxShadow = "none" }}
                  onMouseUp={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "2px 2px 0 #3d2c1e" }}
                >
                  <span style={{ fontSize: 14, flexShrink: 0 }}></span>
                  <span style={{ textShadow: "0 1px 2px #0004" }}>
                    {zone.label
                      .replace("Since you're interested in ", "")
                      .replace("Since you like ", "")
                      .replace("Because you study ", "")}
                  </span>
                </button>
              ))}
            </>
          )}

          {/* Legend */}
          {/* <div style={{ marginTop: "auto", borderTop: "1.5px dashed #e8d9c5", paddingTop: 10 }}>
            <p style={{ margin: "0 0 6px", fontSize: 9, fontWeight: 700, color: "#b89b82", textTransform: "uppercase" }}>Legend</p>
            {[
              { color: "#5ab4e8", label: "Zone", border: false },
              { color: "#fef3e2", label: "Path", border: true },
              { color: "#7c3aed44", label: "Wall", border: false },
            ].map(({ color, label, border }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                <span style={{ width: 14, height: 14, borderRadius: 3, background: color, border: border ? "1px solid #3d2c1e55" : "1px solid #3d2c1e22", flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: "#6b7280" }}>{label}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14 }}>🌐</span>
              <span style={{ fontSize: 10, color: "#6b7280" }}>Rec card</span>
            </div>
          </div> */}
        </div>
 
      </div>
    </div>
  )
}

// ── Main dashboard ───────────────────────────────────────────────
export default function Dashboard() {
  const [student, setStudent] = useState<Student | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState("")
  const [activeUrl, setActiveUrl] = useState<string | null>(null)
  const [iframeError, setIframeError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [htmlContent, setHtmlContent] = useState("")
  const [sessionActive, setSessionActive] = useState(false)

  const [searchResults, setSearchResults] = useState<{ title: string; snippet: string; link: string }[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const [showRedirectConfirm, setShowRedirectConfirm] = useState(false)
  const [pendingUrl, setPendingUrl] = useState("")
  const [navHistory, setNavHistory] = useState<string[]>([])

  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false)

  const [notification, setNotification] = useState<Notification | null>(null)

  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loadingRecs, setLoadingRecs] = useState(false)
  const [recGroups, setRecGroups] = useState<RecommendationGroup[]>([])
  const [exploreRecs, setExploreRecs] = useState<Recommendation[]>([])

  // Auto-dismiss non-blocked notifications after 5s
  useEffect(() => {
    if (notification && notification.type !== "blocked") {
      const t = setTimeout(() => setNotification(null), 5000)
      return () => clearTimeout(t)
    }
  }, [notification])
 
  const showNotification = useCallback((n: Notification) => {
    setNotification(n)
  }, [])
 
  const dismissNotification = useCallback(() => setNotification(null), [])
 
  const handleOpenAnyway = useCallback((url: string) => {
    window.location.href = url
    setNotification(null)
  }, [])

  const clearRedirectStorage = useCallback(() => {
    sessionStorage.removeItem("dashboardRedirectedAway")
    sessionStorage.removeItem("dashboardRedirectedAwayUrl")
    sessionStorage.removeItem("dashboardRedirectedAwayCategory")
  }, [])

  const getRedirectedAwayData = useCallback(() => {
    const url = sessionStorage.getItem("dashboardRedirectedAwayUrl")
    if (!url) return null
    return {
      url,
      category: sessionStorage.getItem("dashboardRedirectedAwayCategory") || "General"
    }
  }, [])

  const handleRedirectAnyway = useCallback(() => {
    const url = pendingUrl || activeUrl
    if (url) {
      redirectedAway.current = true
      sessionStorage.setItem("dashboardRedirectedAway", "1")
      sessionStorage.setItem("dashboardRedirectedAwayUrl", url)
      sessionStorage.setItem("dashboardRedirectedAwayCategory", rootCategory.current)
      window.location.href = url
    }
  }, [pendingUrl, activeUrl])

  // Session tracking — all refs, zero React state, zero re-renders
  const rootUrl = useRef<string | null>(null)              // the ORIGINAL url opened
  const rootCategory = useRef<string>("General")           // AI-classified category from backend response
  const sessionStart = useRef<number | null>(null)
  const interactionType = useRef<"view" | "scroll" | "click">("view")
  const timerRef = useRef<HTMLSpanElement>(null)
  const timerInterval = useRef<NodeJS.Timeout | null>(null)
  const interactionBadgeRef = useRef<HTMLSpanElement>(null)
  const redirectedAway = useRef(false)

  // Feedback & history
  const [showFeedback, setShowFeedback] = useState(false)
  const [pendingFeedback, setPendingFeedback] = useState<{ url: string; category: string } | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [learningHistory, setLearningHistory] = useState<LearningHistoryItem[]>([])

  const router = useRouter()

  const loadRecommendations = useCallback(async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    setLoadingRecs(true)
    try {
      const res = await fetch(`${API}/api/recommendations`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setRecGroups(data.grouped || [])
        setExploreRecs(data.explore || [])
      }
    } catch (e) {
      console.error("Failed to load recommendations:", e)
    }
    setLoadingRecs(false)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) { router.push("/"); return }
    fetch(`${API}/api/students/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => {
        setStudent(data)
        loadRecommendations()
      })
      .catch(() => setPageError("Failed to load profile"))

    const redirectedUrl = sessionStorage.getItem("dashboardRedirectedAwayUrl")
    if (redirectedUrl) {
      setShowCompletionPrompt(true)
    }
  }, [])

  // ── Timer — updates DOM directly, never React state ──────────
  const startTimer = () => {
    if (timerInterval.current) clearInterval(timerInterval.current)
    sessionStart.current = Date.now()
    timerInterval.current = setInterval(() => {
      if (!sessionStart.current || !timerRef.current) return
      const secs = Math.round((Date.now() - sessionStart.current) / 1000)
      timerRef.current.textContent = secs < 60 ? `⏱ ${secs}s` : `⏱ ${Math.floor(secs / 60)}m ${secs % 60}s`
    }, 1000)
  }

  const stopTimer = () => {
    if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null }
    if (timerRef.current) timerRef.current.textContent = "⏱ 0s"
  }

  // ── Upgrade interaction type via DOM update ───────────────────
  const upgradeInteraction = useCallback((type: "scroll" | "click") => {
    const current = interactionType.current
    if (type === "click" && current !== "click") {
      interactionType.current = "click"
      if (interactionBadgeRef.current) {
        interactionBadgeRef.current.textContent = "Clicked"
        interactionBadgeRef.current.style.background = "#10b98122"
        interactionBadgeRef.current.style.color = "#10b981"
      }
    } else if (type === "scroll" && current === "view") {
      interactionType.current = "scroll"
      if (interactionBadgeRef.current) {
        interactionBadgeRef.current.textContent = "Scrolled"
        interactionBadgeRef.current.style.background = "#f59e0b22"
        interactionBadgeRef.current.style.color = "#f59e0b"
      }
    }
  }, [])

  const handleShadowScroll = useCallback(() => upgradeInteraction("scroll"), [upgradeInteraction])
  const handleShadowClick  = useCallback(() => upgradeInteraction("click"),  [upgradeInteraction])

  // ── Log browser activity ──────────────────────────────────────
  const logActivity = useCallback(async (
    url: string, interaction: "view" | "scroll" | "click", duration: number, category: string
  ) => {
    const token = localStorage.getItem("token")
    if (!token || !student) return
    await fetch(`${API}/api/activity/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ student_id: student._id, url, interaction_type: interaction, visit_duration: duration, category: category })
    }).catch(() => {})
  }, [student])

  // ── Save to learning history ──────────────────────────────────
  const saveLearningHistory = useCallback(async (
    url: string, category: string, status: "completed" | "in_progress"
  ) => {
    const token = localStorage.getItem("token")
    if (!token) {
      console.error("No token available for learning history")
      return
    }
    try {
      const res = await fetch(`${API}/api/learning-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          url, resource_title: url, category, completion_status: status
        })
      })
      if (res.ok) {
        const data = await res.json()
        setLearningHistory(data.learning_history ?? [])
        console.log("Learning history saved successfully")
      } else {
        const error = await res.text()
        console.error("Learning history save failed:", res.status, error)
      }
    } catch (e) {
      console.error("Learning history error:", e)
    }
  }, [])

  // ── Submit feedback ───────────────────────────────────────────
  const submitFeedback = useCallback(async (data: FeedbackData) => {
    const token = localStorage.getItem("token")
    if (!token || !pendingFeedback) return
    try {
      const res = await fetch(`${API}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          url: pendingFeedback.url,
          resource_category: pendingFeedback.category,
          ...data
        })
      })
      if (res.ok) {
        console.log("Feedback submitted successfully")
      } else {
        console.error("Feedback submission failed:", res.status)
      }
    } catch (e) {
      console.error("Feedback error:", e)
    }
    setShowFeedback(false)
    setPendingFeedback(null)
  }, [pendingFeedback])

  // ── End session — save activity + learning history ────────────
  const endSession = useCallback(async (status: "completed" | "in_progress") => {
    if (!rootUrl.current || !sessionStart.current) return
    const duration = Math.round((Date.now() - sessionStart.current) / 1000)
    const url = rootUrl.current
    const interaction = interactionType.current
    const category = rootCategory.current

    // Reset refs immediately
    rootUrl.current = null
    sessionStart.current = null
    interactionType.current = "view"
    setSessionActive(false)
    stopTimer()

    await logActivity(url, interaction, duration, category)
    await saveLearningHistory(url, category, status)

    return { url, category }
  }, [logActivity, saveLearningHistory])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        // Student left your tab — pause the timer display but keep sessionStart running
        if (timerInterval.current) {
          clearInterval(timerInterval.current)
          timerInterval.current = null
        }
      } else {
        // Student came back — resume the timer if a session is active
        if (rootUrl.current && sessionStart.current) {
          timerInterval.current = setInterval(() => {
            if (!sessionStart.current || !timerRef.current) return
            const secs = Math.round((Date.now() - sessionStart.current) / 1000)
            timerRef.current.textContent = secs < 60 ? `⏱ ${secs}s` : `⏱ ${Math.floor(secs / 60)}m ${secs % 60}s`
          }, 1000)
        }

        // Check if user came back from external navigation
        if (rootUrl.current && sessionActive && (iframeError || (!htmlContent && !loading) || redirectedAway.current)) {
          setShowCompletionPrompt(true)
        }
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [])

  // Save on tab close — mark as in_progress
  useEffect(() => {
    const handler = () => { endSession("in_progress") }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [endSession])

    // ── Security check ────────────────────────────────────────────
  const checkUrl = useCallback(async (url: string): Promise<{ allowed: boolean; normalizedUrl: string; category: string }> => {
    const token = localStorage.getItem("token")
    try {
      const res = await fetch(`${API}/api/activity/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({ url })
      })
      const data = await res.json()
 
      // HTTP 400 — payload/profile problem (age, grade, etc.)
      if (res.status === 400) {
        showNotification({
          type: "error",
          message: data.error || "There was a problem with your profile. Please contact your school administrator.",
        })
        return { allowed: false, normalizedUrl: url, category: "General" }
      }
 
      // HTTP 403 — orchestrator blocked the URL
      if (res.status === 403 || data.decision === "Blocked") {
        showNotification({
          type: "blocked",
          message: data.message || "Access to this site is restricted.",
          url,
          retrigger: data.retrigger_browser === true,
        })
        return { allowed: false, normalizedUrl: url, category: "General" }
      }
 
      // HTTP 502 — orchestrator unreachable
      if (res.status === 502) {
        showNotification({
          type: "error",
          message: data.message || "The safety service is temporarily unavailable.",
        })
        return { allowed: false, normalizedUrl: url, category: "General" }
      }
 
      // Allowed
      return {
        allowed: true,
        normalizedUrl: data.normalized_url || url,
        category: data.policy?.category || "General",
      }
    } catch {
      showNotification({
        type: "error",
        message: "Could not reach the safety service. Please check your connection.",
      })
      return { allowed: false, normalizedUrl: url, category: "General" }
    }
  }, [showNotification])

  // ── Load a page via proxy ─────────────────────────────────────
  const loadPage = useCallback(async (url: string, isRoot = false) => {
    setLoading(true)
    setIframeError(false)
    setHtmlContent("")
    setShowCompletionPrompt(false)
    redirectedAway.current = false
    if (isRoot) {
      clearRedirectStorage()
    }

    try {
      const res = await fetch(`${API}/api/proxy?url=${encodeURIComponent(url)}`)
      if (!res.ok) throw new Error("Proxy failed")
      const html = await res.text()
      setHtmlContent(html)
      setActiveUrl(url)
      setUrlInput(url)

      // Only start a new root session if this is a fresh visit, not internal navigation
      if (isRoot) {
        // Get category from the last activity response if available
        // (category is set server-side; we'll read it from the activity log response)
        setSessionActive(true)
        rootUrl.current = url
        rootCategory.current = "General"  // will be updated after activity is logged
        interactionType.current = "view"
        startTimer()
        // Update badge
        if (interactionBadgeRef.current) {
          interactionBadgeRef.current.textContent = "Viewing"
          interactionBadgeRef.current.style.background = "#6b728022"
          interactionBadgeRef.current.style.color = "#6b7280"
        }
      }
    } catch {
      setIframeError(true)
      setPendingUrl(url)
      setShowRedirectConfirm(true)

      if (isRoot) {
        setSessionActive(true)
        rootUrl.current = url
        rootCategory.current = "General"
        interactionType.current = "view"
        startTimer()
        if (interactionBadgeRef.current) {
          interactionBadgeRef.current.textContent = "Viewing"
          interactionBadgeRef.current.style.background = "#6b728022"
          interactionBadgeRef.current.style.color = "#6b7280"
        }
      }

    } finally {
      setLoading(false)
    }
  }, [])

  // ── Internal link navigation (does NOT start a new session) ──
  const handleInternalNav = useCallback((newUrl: string) => {
    setNavHistory(prev => activeUrl ? [...prev, activeUrl] : prev)
    loadPage(newUrl, false)   // isRoot = false → session continues
  }, [activeUrl, loadPage])

  // ── Visit handler ─────────────────────────────────────────────
  const isProbablyUrl = (input: string) =>
    /^(https?:\/\/)/i.test(input) || /^[^\s]+\.[^\s]+$/.test(input)

  const handleVisit = async () => {
    if (!urlInput.trim()) return
    const input = urlInput.trim()
    setSearchResults([])

    if (isProbablyUrl(input)) {
      const url = /^https?:\/\//i.test(input) ? input : "https://" + input

      // --- NEW CHECK LOGIC ---
      const token = localStorage.getItem("token");
      try {
        setLoading(true);
        const checkRes = await fetch(`${API}/api/activity/check`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ url })
        });

        const checkData = await checkRes.json();

        if (checkRes.status === 400) {
          showNotification({
            type: "error",
            message: checkData.error || "There was a problem with your profile. Please contact your school administrator.",
          });
          setLoading(false);
          return;
        }

        if (checkData.decision === "Blocked") {
          showNotification({
            type: "blocked",
            message: checkData.message || "Access to this site is restricted.",
            url,
            retrigger: checkData.retrigger_browser === true,
          });
          setLoading(false);
          return; // STOP HERE
        }

        if (checkRes.status === 502) {
          showNotification({
            type: "error",
            message: checkData.message || "The safety service is temporarily unavailable.",
          });
          setLoading(false);
          return;
        }

        // End any existing session as in_progress before starting new one
        if (rootUrl.current) await endSession("in_progress")
        setNavHistory([])
        await loadPage(url, true)   // isRoot = true → new session

      } catch (err) {
        console.error("Security check failed", err);
        showNotification({
          type: "error",
          message: "Could not reach the safety service. Please check your connection.",
        });
        setLoading(false);
      }
   }
    else {
      setIsSearching(true)
      setShowCompletionPrompt(false)
      if (rootUrl.current) await endSession("in_progress")
      setActiveUrl(null)
      try {
        const res = await fetch(`${API}/api/search?q=${encodeURIComponent(input)}`)
        const data = await res.json()
        setSearchResults(data.results || [])
      } catch {}
      setIsSearching(false)
    }
  }

  const handleResultClick = async (url: string) => {
    setSearchResults([]);
    setLoading(true);

    const token = localStorage.getItem("token");
    try {
      const checkRes = await fetch(`${API}/api/activity/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url })
      });

      const checkData = await checkRes.json();

      if (checkRes.status === 400) {
        showNotification({
          type: "error",
          message: checkData.error || "There was a problem with your profile. Please contact your school administrator.",
        });
        setLoading(false);
        return;
      }

      if (checkData.decision === "Blocked") {
        showNotification({
          type: "blocked",
          message: checkData.message || "This search result is restricted.",
          url,
          retrigger: checkData.retrigger_browser === true,
        });
        setLoading(false);
        return;
      }

      if (checkRes.status === 502) {
        showNotification({
          type: "error",
          message: checkData.message || "The safety service is temporarily unavailable.",
        });
        setLoading(false);
        return;
      }

      if (rootUrl.current) await endSession("in_progress");
      setNavHistory([]);
      rootCategory.current = checkData.category || "General";
      await loadPage(checkData.normalized_url || url, true);
    } catch (err) {
      console.error("Security check or page load failed", err);
      showNotification({
        type: "error",
        message: "Could not load this page. Please check your connection.",
      });
      setLoading(false);
    }
  };

  const handleRecommendationClick = useCallback(async (url: string) => {
    const fullUrl = url.startsWith("http") ? url : `https://${url}`
    const token = localStorage.getItem("token")
    setLoading(true)
    setSearchResults([])

    try {
      const checkRes = await fetch(`${API}/api/activity/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: fullUrl })
      })
      const checkData = await checkRes.json()

      if (checkData.decision === "Blocked") {
        showNotification({ type: "blocked", message: checkData.message || "Access restricted.", url: fullUrl })
        setLoading(false)
        return
      }

      if (rootUrl.current) await endSession("in_progress")
      setNavHistory([])
      rootCategory.current = checkData.category || "General"
      await loadPage(fullUrl, true)
    } catch {
      showNotification({ type: "error", message: "Could not load this recommendation." })
      setLoading(false)
    }
  }, [endSession, loadPage, showNotification])

  // ── Close viewer ──────────────────────────────────────────────
  const handleClose = useCallback(async () => {
    if (rootUrl.current) await endSession("in_progress")
    setActiveUrl(null)
    setHtmlContent("")
    setNavHistory([])
    setIframeError(false)
    setShowCompletionPrompt(false)
    redirectedAway.current = false
    clearRedirectStorage()
  }, [endSession, clearRedirectStorage])

  // ── Mark as completed ─────────────────────────────────────────
  const handleMarkDone = useCallback(async () => {
    const result = await endSession("completed")
    setActiveUrl(null)
    setHtmlContent("")
    setNavHistory([])

    // Show feedback modal
    if (result) {
      setPendingFeedback({ url: result.url, category: result.category })
      setShowFeedback(true)
    }
  }, [endSession])

  // ── Handle completion prompt ─────────────────────────────────
  const handleCompleteAndFeedback = useCallback(async () => {
    let result = await endSession("completed")
    const stored = getRedirectedAwayData()
    if (!result && stored) {
      await saveLearningHistory(stored.url, stored.category, "completed")
      result = { url: stored.url, category: stored.category }
    }

    setShowCompletionPrompt(false)
    setActiveUrl(null)
    setHtmlContent("")
    setNavHistory([])
    setIframeError(false)
    redirectedAway.current = false
    clearRedirectStorage()

    if (result) {
      setPendingFeedback({ url: result.url, category: result.category })
      setShowFeedback(true)
    }
  }, [endSession, getRedirectedAwayData, saveLearningHistory, clearRedirectStorage])

  const handleSkipCompletion = useCallback(async () => {
    if (rootUrl.current) {
      await endSession("in_progress")
    } else {
      const stored = getRedirectedAwayData()
      if (stored) await saveLearningHistory(stored.url, stored.category, "in_progress")
    }
    setShowCompletionPrompt(false)
    setActiveUrl(null)
    setHtmlContent("")
    setNavHistory([])
    setIframeError(false)
    redirectedAway.current = false
    clearRedirectStorage()
  }, [endSession, getRedirectedAwayData, saveLearningHistory, clearRedirectStorage])

  // ── Back navigation ───────────────────────────────────────────
  const handleBack = useCallback(() => {
    const prev = navHistory[navHistory.length - 1]
    if (!prev) return
    setNavHistory(h => h.slice(0, -1))
    loadPage(prev, false)
  }, [navHistory, loadPage])

  // ── Load learning history ─────────────────────────────────────
  const loadHistory = async () => {
    const token = localStorage.getItem("token")
    if (!token) {
      console.error("No token available for loading history")
      return
    }
    try {
      const res = await fetch(`${API}/api/learning-history`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setLearningHistory(data)
        console.log("Learning history loaded successfully")
      } else {
        console.error("Failed to load learning history:", res.status)
      }
    } catch (e) {
      console.error("Load history error:", e)
    }
    setShowHistory(true)
  }

  // ── Handle history item click ─────────────────────────────────
  const handleHistoryItemClick = useCallback(async (url: string) => {
    setShowHistory(false)
    setNavHistory([])
    if (rootUrl.current) await endSession("in_progress")
    await loadPage(url, true)   // isRoot = true → new session
  }, [endSession, loadPage])

  const handleLogout = async () => {
    if (rootUrl.current) await endSession("in_progress")
    localStorage.removeItem("token")
    router.push("/")
  }

  // All header buttons — replace their style with this retro button style:
  const retroBtn: React.CSSProperties = {
    padding: "7px 15px", cursor: "pointer", borderRadius: 8,
    border: "2px solid #3d2c1e", background: "#fff8ee",
    fontSize: 13, fontWeight: 600, color: "#3d2c1e",
    boxShadow: "2px 2px 0 #3d2c1e"
  }

  const retroBtnPrimary: React.CSSProperties = {
    ...retroBtn, background: "#5ab4e8", color: "#fff"
  }

  const retroBtnSuccess: React.CSSProperties = {
    ...retroBtn, background: "#7bc67e", color: "#fff"
  }

  if (pageError) return <p style={{ color: "red", padding: "2rem" }}>Error: {pageError}</p>
  if (!student) return <p style={{ padding: "2rem" }}>Loading...</p>

  return (
    <div style={{ maxWidth: "100vw", margin: 0, padding: "1.5rem 2rem", fontFamily: "sans-serif", background: "#fde8c8", minHeight: "100vh", boxSizing: "border-box" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Pixel home icon */}
          <img
              src="/sg-lock.png"
              alt=""
              style={{
                position: "relative", inset: 0,
                width: "5%", height: "5%",
                objectFit: "contain", zIndex: 0, top: -2,
              }}
            />
          
          <h1 style={{ margin: 0, fontSize: 22, color: "#3d2c1e", fontWeight: 700, fontFamily: 'monospace' }}>
            <span style={{ color: "#7c4eb2", fontFamily: "'Silkscreen', monospace" }}>Hello, {student.username}!</span>
            
          </h1>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {/* Home button - sg-home.png */}
          <button
            onClick={() => { handleClose(); setShowHistory(false); }}
            title="Home"
            style={{
              ...retroBtn,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "8px 14px", gap: 10
            }}
          >
            <img 
              src="/sg-home.png"
              alt="Home"
              style={{
                width: 44,
                height: 44,
                objectFit: "contain",
                border: "none",
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.03em" }}>HOME</span>
          </button>

          {/* Learning History button - sg-clock.png */}
          <button
            onClick={loadHistory}
            title="Learning History"
            style={{
              ...retroBtn,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "8px 14px", gap: 10
            }}
          >
            <img
              src="/sg-clock.png"
              alt="History"
              style={{
                width: 44,
                height: 44,
                objectFit: "contain",
                border: "none",
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.03em" }}>HISTORY</span>
          </button>

          {/* Logout button - sg-door.png */}
          <button
            onClick={handleLogout}
            title="Logout"
            style={{
              ...retroBtn,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "8px 14px", gap: 10
            }}
          >
            <img
              src="/sg-door.png"
              alt="Logout"
              style={{
                width: 44,
                height: 44,
                objectFit: "contain",
                border: "none",
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.03em" }}>LOGOUT</span>
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ marginBottom: "1.2rem" }}>
        <div style={{
          background: "#cb6ce6",
          border: "2.5px solid #3d2c1e",
          borderRadius: 12,
          boxShadow: "4px 4px 0 #3d2c1e",
          overflow: "hidden",
          marginBottom: 8,
        }}>
          {/* Window title bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "6px 12px", background: "#cb6ce6",
            borderBottom: "2px solid #3d2c1e"
          }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {/* <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f47b7b", border: "1.5px solid #3d2c1e", display: "inline-block" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f5c842", border: "1.5px solid #3d2c1e", display: "inline-block" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#7bc67e", border: "1.5px solid #3d2c1e", display: "inline-block" }} /> */}
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: "0.05em", fontFamily: "'Silkscreen', monospace" }}>SmartGuard Search Engine</span>
            <span style={{ width: 54 }} /> {/* spacer */}
          </div>
          {/* Globe icon + input area */}
          <div style={{ background: "#f5c842", padding: "18px 20px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "'Press Start 2P', cursive", fontSize: 18, color: "#fff" }}>What Will We Explore Today?</span>
            <div style={{
              display: "flex", width: "100%", maxWidth: 600,
              border: "2px solid #3d2c1e", borderRadius: 30,
              overflow: "hidden", background: "#fff",
              boxShadow: "2px 2px 0 #3d2c1e"
            }}>
              <input
                type="text" value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleVisit()}
                placeholder="Search or enter web address..."
                style={{
                  flex: 1, padding: "10px 18px", fontSize: 14,
                  border: "none", background: "transparent",
                  color: "#3d2c1e", outline: "none",
                  fontFamily: "sans-serif", fontWeight: 500
                }}
              />
              <button
                onClick={handleVisit}
                style={{
                  padding: "0 30px", fontSize: 13, fontWeight: 800,
                  border: "none", borderLeft: "2px solid #3d2c1e",
                  background: "#cb6ce6", color: "#3d2c1e",
                  cursor: "pointer", letterSpacing: "0.05em",
                  fontFamily: "sans-serif", flexShrink: 0,
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#e6b800"}
                onMouseLeave={e => e.currentTarget.style.background = "#f5c842"}
              >
                GO 
              </button>
            </div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'Silkscreen', monospace" }}>
              or browse the learning maze below
            </p>
          </div>
        </div>
      </div>

      {/* Notification banner — shown below search bar */}
      {notification && (
        <NotificationBanner
          notification={notification}
          onDismiss={dismissNotification}
          onOpenAnyway={handleOpenAnyway}
        />
      )}

      {/* Maze game — shown when not browsing */}
      {!activeUrl && !loading && !isSearching && !showHistory && searchResults.length === 0 && (
        <MazeGame
          recGroups={recGroups}
          exploreRecs={exploreRecs}
          onRecClick={handleRecommendationClick}
        />
      )}

      {/* Recommendations — shown only when no page is open and not searching/viewing history */}
      {!activeUrl && !loading && !isSearching && !showHistory && searchResults.length === 0 && (recGroups.length > 0 || exploreRecs.length > 0) && (
        <div style={{ marginBottom: "1.5rem" }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#111827" }}>✨ Suggested For You</p>
            <button onClick={loadRecommendations} disabled={loadingRecs}
              style={{ fontSize: 12, color: "#2563eb", background: "none", border: "none", cursor: "pointer" }}>
              {loadingRecs ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {/* Personalized groups — one section per category */}
          {recGroups.map((group) => (
            <div key={group.category} style={{ marginBottom: 20 }}>
              <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {group.label}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
                {group.items.map((rec, i) => (
                  <RecCard key={i} rec={rec} onClick={handleRecommendationClick} />
                ))}
              </div>
            </div>
          ))}

          {/* Explore section */}
          {exploreRecs.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Explore Other Content
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
                {exploreRecs.map((rec, i) => (
                  <RecCard key={i} rec={rec} onClick={handleRecommendationClick} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search results */}
      {isSearching && <p style={{ color: "#888" }}>Searching...</p>}
      {searchResults.length > 0 && !activeUrl && (
        <div style={{ marginBottom: "1rem" }}>
          <p style={{ marginBottom: 8, color: "#666" }}>Search results:</p>
          {searchResults.map((result, i) => (
            <div key={i} onClick={() => handleResultClick(result.link)}
              style={{ padding: "12px", borderBottom: "1px solid #eee", cursor: "pointer" }}>
              <h3 style={{ margin: 0, color: "#2563eb" }}>{result.title}</h3>
              <p style={{ margin: "4px 0", color: "#555" }}>{result.snippet}</p>
              <small style={{ color: "#888" }}>{result.link}</small>
            </div>
          ))}
        </div>
      )}

      {/* Browser frame or Learning History - Replace each other */}
      {(activeUrl || loading || showHistory) && (
        <>
          {/* Show History Panel in place of browser frame */}
          {showHistory ? (
            <HistoryPanel
              items={learningHistory}
              onClose={() => setShowHistory(false)}
              onItemClick={handleHistoryItemClick}
            />
          ) : (
            // Show Browser Frame when not showing history
            <div style={{ border: "1px solid #ddd", borderRadius: 10, overflow: "hidden" }}>

              {/* Chrome bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f3f4f6", padding: "8px 14px", borderBottom: "1px solid #ddd" }}>
                <button onClick={handleBack} disabled={navHistory.length === 0}
                  style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #ccc", background: navHistory.length > 0 ? "#fff" : "#f3f4f6", cursor: navHistory.length > 0 ? "pointer" : "default", fontSize: 13, color: navHistory.length > 0 ? "#111" : "#aaa" }}>
                  ←
                </button>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                <input 
                  type="text"
                  value={activeUrl || ""}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleVisit()}
                  style={{ flex: 1, fontSize: 13, color: "#555", background: "#fff", border: "1px solid #ddd", borderRadius: 6, padding: "3px 10px", outline: "none" }}
                />
                <button onClick={handleClose} style={{ fontSize: 18, background: "none", border: "none", cursor: "pointer", color: "#888", lineHeight: 1 }}>×</button>
              </div>

              {/* Session status bar — shown for normal view AND external redirect */}
              {(activeUrl || iframeError) && !loading && sessionActive && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 14px", background: "#fff8ee", borderBottom: "2px solid #3d2c1e" }}>
                  <div style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: "#e8e8e8", color: "#3d2c1e",
                    border: "1.5px solid #3d2c1e", transition: "all 0.3s" }}>
                    <span ref={interactionBadgeRef}
                      style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#6b728022", color: "#6b7280", border: "1px solid #6b728044", transition: "all 0.3s" }}>
                      Viewing
                    </span>
                    {/* <LiveTimer timerRef={timerRef} /> */}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button 
                      onClick={handleRedirectAnyway}
                      style={retroBtn}
                    >
                      Redirect To Site
                    </button>
                  </div>
                  <button onClick={handleMarkDone}
                    style={retroBtn}>
                    ✓ Mark as Done
                  </button>
                </div>
              )}

              {loading && (
                <div style={{ height: 500, display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
                  Loading...
                </div>
              )}

              {iframeError && !loading && (
                <div style={{ 
                  height: 400, display: "flex", alignItems: "center", justifyContent: "center", 
                  flexDirection: "column", gap: 16, background: "#fafafa", borderRadius: 8,
                  border: "2px dashed #e5e7eb", margin: 16
                }}>
                  <span style={{ fontSize: 48 }}>🔒</span>
                  <p style={{ fontWeight: 600, fontSize: 16, margin: 0, color: "#374151" }}>
                    This site can't be displayed in the safe viewer
                  </p>
                  <p style={{ fontSize: 13, color: "#9ca3af", margin: 0, textAlign: "center", maxWidth: 340 }}>
                    Some websites block embedded viewing for security reasons. 
                    You can still open it in a new tab.
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={handleRedirectAnyway} style={{...retroBtnPrimary, padding: "10px 20px"}}>
                      Redirect Anyway
                    </button>
                    <button onClick={handleClose} style={{...retroBtn, padding: "10px 20px"}}>
                      Go Back
                    </button>
                  </div>
                </div>
              )}

              {activeUrl && !iframeError && !loading && (
                <div style={{ position: "relative", height: 600 }}>
                  <ShadowViewer
                    html={htmlContent}
                    onIntercept={handleInternalNav}
                    onScroll={handleShadowScroll}
                    onClick={handleShadowClick}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Feedback modal */}
      {showFeedback && pendingFeedback && (
        <FeedbackModal
          url={pendingFeedback.url}
          category={pendingFeedback.category}
          onSubmit={submitFeedback}
          onSkip={() => { setShowFeedback(false); setPendingFeedback(null) }}
        />
      )}

      {/* Redirect confirm */}
      {showRedirectConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ background: "#fff8ee", borderRadius: 14, padding: "2rem", width: "100%", maxWidth: 440, boxShadow: "4px 4px 0 #3d2c1e", border: "2.5px solid #3d2c1e" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>External navigation required</h2>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#6b7280" }}>
              This page cannot be displayed in the safe viewer. Redirect to the URL anyway?
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={handleRedirectAnyway}
                style={{...retroBtnPrimary, flex: 1, padding: "12px", justifyContent: "center"}}>
                Redirect Anyway
              </button>
              <button onClick={() => setShowRedirectConfirm(false)}
                style={{...retroBtn, flex: 1, padding: "12px"}}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion prompt */}
      {showCompletionPrompt && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ background: "#fff8ee", borderRadius: 14, padding: "2rem", width: "100%", maxWidth: 440, boxShadow: "4px 4px 0 #3d2c1e", border: "2.5px solid #3d2c1e" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>Did you finish learning?</h2>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#6b7280" }}>
              It looks like you navigated away from the learning page. Would you like to mark this URL as completed?
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={handleCompleteAndFeedback}
                style={{...retroBtnSuccess, flex: 1, padding: "12px"}}>
                ✓ Mark as Completed
              </button>
              <button onClick={handleSkipCompletion}
                style={{...retroBtn, flex: 1, padding: "12px"}}>
                Not Yet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}