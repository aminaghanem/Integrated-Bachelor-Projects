"use client"

import { useEffect, useState, useRef, useCallback } from "react"
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
    blocked: { bg: "#fef2f2", border: "#fecaca", text: "#dc2626", icon: "🚫" },
    error:   { bg: "#fffbeb", border: "#fde68a", text: "#d97706", icon: "⚠️" },
    success: { bg: "#f0fdf4", border: "#bbf7d0", text: "#16a34a", icon: "✅" },
  }
  const c = colors[notification.type]
 
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", justifyContent: "space-between",
      padding: "12px 16px", marginBottom: 12, borderRadius: 10,
      background: c.bg, border: `1px solid ${c.border}`,
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
              background: form[field] >= n ? "#fbbf24" : "#f3f4f6",
              color: form[field] >= n ? "#fff" : "#9ca3af"
            }}>★</button>
        ))}
      </div>
    </div>
  )

  const canSubmit = form.interest_rating > 0 && form.usefulness_rating > 0 && form.perceived_difficulty !== ""

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "2rem", width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
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
                  borderColor: form.perceived_difficulty === d ? "#2563eb" : "#e5e7eb",
                  background: form.perceived_difficulty === d ? "#dbeafe" : "#fff",
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
    <div style={{ border: "1px solid #ddd", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column", height: 600 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Learning History ({items.length})</p>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18 }}>×</button>
      </div>

      {items.length === 0 ? (
        <p style={{ padding: "2rem", textAlign: "center", color: "#9ca3af", margin: 0, flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>No history yet. Start browsing!</p>
      ) : (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {[...items].reverse().map(item => (
            <div key={item._id} onClick={() => onItemClick(item.resource_id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", transition: "background 0.2s", backgroundColor: "transparent" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
              <span style={{ fontSize: 18 }}>{item.completion_status === "completed" ? "✅" : "📖"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#2563eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.resource_title || item.resource_id}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 3, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>{item.category}</span>
                  {item.completion_date && (
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>· {formatDate(item.completion_date)}</span>
                  )}
                </div>
              </div>
              <span style={{
                padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: item.completion_status === "completed" ? "#dcfce7" : "#fef9c3",
                color: item.completion_status === "completed" ? "#166534" : "#854d0e"
              }}>
                {item.completion_status === "completed" ? "Completed" : "In Progress"}
              </span>
            </div>
          ))}
        </div>
      )}
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

  const [searchResults, setSearchResults] = useState<{ title: string; snippet: string; link: string }[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const [showRedirectConfirm, setShowRedirectConfirm] = useState(false)
  const [pendingUrl, setPendingUrl] = useState("")
  const [navHistory, setNavHistory] = useState<string[]>([])

  const [notification, setNotification] = useState<Notification | null>(null)

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
    window.open(url, "_blank")
    setNotification(null)
  }, [])

  // Session tracking — all refs, zero React state, zero re-renders
  const rootUrl = useRef<string | null>(null)              // the ORIGINAL url opened
  const rootCategory = useRef<string>("General")           // AI-classified category from backend response
  const sessionStart = useRef<number | null>(null)
  const interactionType = useRef<"view" | "scroll" | "click">("view")
  const timerRef = useRef<HTMLSpanElement>(null)
  const timerInterval = useRef<NodeJS.Timeout | null>(null)
  const interactionBadgeRef = useRef<HTMLSpanElement>(null)

  // Feedback & history
  const [showFeedback, setShowFeedback] = useState(false)
  const [pendingFeedback, setPendingFeedback] = useState<{ url: string; category: string } | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [learningHistory, setLearningHistory] = useState<LearningHistoryItem[]>([])

  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) { router.push("/"); return }
    fetch(`${API}/api/students/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(setStudent)
      .catch(() => setPageError("Failed to load profile"))
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
    url: string, interaction: "view" | "scroll" | "click", duration: number
  ) => {
    const token = localStorage.getItem("token")
    if (!token || !student) return
    await fetch(`${API}/api/activity/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ student_id: student._id, url, interaction_type: interaction, visit_duration: duration })
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
    stopTimer()

    await logActivity(url, interaction, duration)
    await saveLearningHistory(url, category, status)

    return { url, category }
  }, [logActivity, saveLearningHistory])

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

  // ── Close viewer ──────────────────────────────────────────────
  const handleClose = useCallback(async () => {
    if (rootUrl.current) await endSession("in_progress")
    setActiveUrl(null)
    setHtmlContent("")
    setNavHistory([])
    setIframeError(false)
  }, [endSession])

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

  if (pageError) return <p style={{ color: "red", padding: "2rem" }}>Error: {pageError}</p>
  if (!student) return <p style={{ padding: "2rem" }}>Loading...</p>

  return (
    <div style={{ maxWidth: 960, margin: "2rem auto", padding: "0 1rem", fontFamily: "sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0 }}>Welcome, {student.username}</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={loadHistory}
            style={{ padding: "8px 16px", cursor: "pointer", borderRadius: 8, border: "1px solid #2563eb", color: "#2563eb", background: "#fff", fontSize: 13 }}>
            📚 Learning History
          </button>
          <button onClick={handleLogout}
            style={{ padding: "8px 18px", cursor: "pointer", borderRadius: 8, border: "1px solid #ccc", background: "#fff" }}>
            Logout
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: "1rem" }}>
        <input type="text" value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleVisit()}
          placeholder="Search or enter a URL..."
          style={{ flex: 1, padding: "10px 14px", fontSize: 15, border: "1px solid #ccc", borderRadius: 8, outline: "none" }}
        />
        <button onClick={handleVisit}
          style={{ padding: "10px 22px", fontSize: 15, cursor: "pointer", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8 }}>
          Go
        </button>
      </div>

      {/* Notification banner — shown below search bar */}
      {notification && (
        <NotificationBanner
          notification={notification}
          onDismiss={dismissNotification}
          onOpenAnyway={handleOpenAnyway}
        />
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
                <span style={{ flex: 1, fontSize: 13, color: "#555", background: "#fff", border: "1px solid #ddd", borderRadius: 6, padding: "3px 10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {activeUrl}
                </span>
                <button onClick={handleClose} style={{ fontSize: 18, background: "none", border: "none", cursor: "pointer", color: "#888", lineHeight: 1 }}>×</button>
              </div>

              {/* Session status bar — rendered once, updated via DOM refs */}
              {activeUrl && !loading && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", background: "#fff", borderBottom: "1px solid #f0f0f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span ref={interactionBadgeRef}
                      style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#6b728022", color: "#6b7280", border: "1px solid #6b728044", transition: "all 0.3s" }}>
                      Viewing
                    </span>
                    <LiveTimer timerRef={timerRef} />
                  </div>
                  <button onClick={handleMarkDone}
                    style={{ padding: "6px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", background: "#10b981", color: "#fff", border: "none", borderRadius: 20 }}>
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
                <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
                  <p style={{ color: "#ef4444", fontWeight: 500 }}>This page could not be loaded in the viewer.</p>
                  <a href={urlInput} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>Open in new tab →</a>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", padding: "2rem", borderRadius: 12, maxWidth: 400, textAlign: "center" }}>
            <h3 style={{ margin: "0 0 8px" }}>External Site Required</h3>
            <p style={{ color: "#555", margin: "0 0 20px" }}>This page cannot be displayed in the safe viewer. Open it in a full window?</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => { window.open(pendingUrl, "_self"); setShowRedirectConfirm(false) }}
                style={{ padding: "10px 20px", background: "#22c55e", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
                Yes, Proceed
              </button>
              <button onClick={() => setShowRedirectConfirm(false)}
                style={{ padding: "10px 20px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}