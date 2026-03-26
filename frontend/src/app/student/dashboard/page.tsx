"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"

interface Student {
  _id: string
  username: string
}

export default function Dashboard() {
  const [student, setStudent] = useState<Student | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState("")
  const [activeUrl, setActiveUrl] = useState<string | null>(null)
  const [iframeError, setIframeError] = useState(false)
  const [loading, setLoading] = useState(false)

  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const visitStart = useRef<number | null>(null)
  const router = useRouter()

  const loadingRef = useRef(false)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) { router.push("/login"); return }

    fetch("http://localhost:4000/api/students/profile", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json() })
      .then(data => setStudent(data))
      .catch(err => setError(err.message))
  }, [])

  useEffect(() => {
    const handleBeforeUnload = () => { if (activeUrl) handleClose() }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [activeUrl])

  useEffect(() => {
    if (!activeUrl) return

    const timeout = setTimeout(() => {
      if (loadingRef.current) {
        console.log("Iframe failed → fallback")

        const originalUrl = new URL(activeUrl).searchParams.get("url")

        if (originalUrl) {
          window.open(originalUrl, "_blank")
        }

        setLoading(false)
        loadingRef.current = false
      }
    }, 4000)

    return () => clearTimeout(timeout)
  }, [activeUrl])

  const logActivity = async (url: string, interactionType: string, duration: number = 0) => {
    const token = localStorage.getItem("token")
    if (!token || !student) return
    try {
      await fetch("http://localhost:4000/api/activity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          student_id: student._id,
          url: url,
          interaction_type: interactionType,
          visit_duration: duration,
        })
      })
    } catch (e) {
      console.error("Activity log failed:", e)
    }
  }

  const isValidUrl = (input: string) => {
    return /^(https?:\/\/)/i.test(input)
  }

  const isProbablyUrl = (input: string) => {
    return /^(https?:\/\/)/i.test(input) || /^[^\s]+\.[^\s]+$/.test(input)
  }

  const handleVisit = async () => {
    if (!urlInput.trim()) return

    let input = urlInput.trim()

    setSearchResults([])
    setIframeError(false)
    setActiveUrl(null)

    if (isProbablyUrl(input)) {
      let url = urlInput.trim()
      if (!/^https?:\/\//i.test(url)) url = "https://" + url

      if (activeUrl) handleClose()

      setIframeError(false)
      setLoading(true)
      loadingRef.current = true
      setActiveUrl(null)

      // Log the "view" interaction
      await logActivity(url, "view")
      visitStart.current = Date.now()

      // Use backend proxy to avoid X-Frame-Options blocks
      setActiveUrl(`http://localhost:4000/api/proxy?url=${encodeURIComponent(url)}`)
      //setLoading(false)
    }

    else {
      setIsSearching(true)
      setActiveUrl(null)

      try {
        const res = await fetch(
          `http://localhost:4000/api/search?q=${encodeURIComponent(input)}`
        )

        const data = await res.json()
        console.log("SEARCH DATA:", data)
        setSearchResults(data.results || [])
      } catch (err) {
        console.error("Search failed:", err)
      }

      setIsSearching(false)
    } 
    
  }

  const handleIframeLoad = () => {
    console.log("IFRAME LOADED ✅")
    setLoading(false)
    loadingRef.current = false
  }

  const handleIframeError = () => {
    setIframeError(true)
    setLoading(false)
  }

  // Log visit duration when user navigates away or closes viewer
  const handleClose = async () => {
    if (activeUrl && visitStart.current) {
      const duration = Math.round((Date.now() - visitStart.current) / 1000)
      const originalUrl = new URL(activeUrl).searchParams.get("url") || activeUrl
      await logActivity(originalUrl, "view", duration)
    }
    setActiveUrl(null)
    visitStart.current = null
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    router.push("/")
  }

  const handleResultClick = async (url: string) => {
    if (activeUrl) handleClose()

    setSearchResults([])
    setIframeError(false)
    setLoading(true)
    loadingRef.current = true

    await logActivity(url, "click")

    visitStart.current = Date.now()

    // try iframe first
    setActiveUrl(`http://localhost:4000/api/proxy?url=${encodeURIComponent(url)}`)

    // ⛔ fallback after 2 sec if broken
    setTimeout(() => {
      if (loadingRef.current) {
        window.open(url, "_blank")
        setLoading(false)
        loadingRef.current = false
      }
    }, 2000)
  }

  if (error) return <p style={{ color: "red" }}>Error: {error}</p>
  if (!student) return <p>Loading...</p>

  return (
    <div style={{ maxWidth: 960, margin: "2rem auto", padding: "0 1rem", fontFamily: "sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: 0 }}>Welcome, {student.username}</h1>
          {/* <p style={{ margin: "4px 0 0", color: "#666" }}>
            Grade: {student.grade_level} · Language: {student.preferred_language}
          </p> */}
        </div>
        <button onClick={handleLogout} style={{ padding: "8px 18px", cursor: "pointer" }}>
          Logout
        </button>
      </div>

      {/* Search bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: "1rem" }}>
        <input
          type="text"
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleVisit()}
          placeholder="Enter a URL, e.g. https://wikipedia.org"
          style={{
            flex: 1, padding: "10px 14px", fontSize: 15,
            border: "1px solid #ccc", borderRadius: 8, outline: "none"
          }}
        />
        <button
          onClick={handleVisit}
          style={{
            padding: "10px 22px", fontSize: 15, cursor: "pointer",
            background: "#2563eb", color: "#fff", border: "none", borderRadius: 8
          }}
        >
          Visit
        </button>
      </div>

      {isSearching && <p>Searching...</p>}
      {searchResults.length > 0 && !activeUrl && (
        <>
          <p style={{ marginBottom: 8, color: "#666" }}>
            Search results:
          </p>

          <div style={{ marginBottom: "1rem" }}>
            {searchResults.map((result, i) => (
              <div
                key={i}
                onClick={() => handleResultClick(result.link)}
                style={{
                  padding: "12px",
                  borderBottom: "1px solid #eee",
                  cursor: "pointer"
                }}
              >
                <h3 style={{ margin: 0, color: "#2563eb" }}>
                  {result.title}
                </h3>
                <p style={{ margin: "4px 0", color: "#555" }}>
                  {result.snippet}
                </p>
                <small style={{ color: "#888" }}>{result.link}</small>
              </div>
            ))}
          </div>
        </>
      )}

      {!isSearching && searchResults.length === 0 && urlInput && !isProbablyUrl(urlInput) && (
        <p style={{ color: "#888" }}>No results found</p>
      )}

      {/* Inline browser frame */}
      {(activeUrl || loading) && (
        <div style={{ border: "1px solid #ddd", borderRadius: 10, overflow: "hidden" }}>
          
          {/* Browser chrome bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#f3f4f6", padding: "8px 14px",
            borderBottom: "1px solid #ddd"
          }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            <span style={{
              flex: 1, fontSize: 13, color: "#555", background: "#fff",
              border: "1px solid #ddd", borderRadius: 6, padding: "3px 10px",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
            }}>
              {urlInput}
            </span>
            <button
              onClick={handleClose}
              style={{ fontSize: 18, background: "none", border: "none", cursor: "pointer", color: "#888", lineHeight: 1 }}
              title="Close viewer"
            >
              ×
            </button>
          </div>

          {/* Content area */}
          {loading && (
            <div style={{ height: 500, display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
              Loading...
            </div>
          )}

          {iframeError && (
            <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
              <p style={{ color: "#ef4444", fontWeight: 500 }}>This page could not be loaded inside the viewer.</p>
              <a href={urlInput} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
                Open in new tab instead →
              </a>
            </div>
          )}

          {activeUrl && !iframeError && (
            <div style={{ position: "relative", height: 600 }}>
            {loading && (
              <div style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#fff",
                zIndex: 10
              }}>
                Loading...
              </div>
            )}

            <iframe
              src={activeUrl}
              title="Web Viewer"
              width="100%"
              height="600"
              style={{ border: "none" }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              onLoad={handleIframeLoad}
            />
          </div>
                    )}

        </div>
      )}

    </div>
  )
}