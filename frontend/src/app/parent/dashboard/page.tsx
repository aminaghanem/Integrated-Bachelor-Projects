"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const API = "http://localhost:4000"

interface SchoolClass {
  class_name: string
  school_name: string
  grade_level: number
}

interface Proficiency {
  category: string
  level: string
}

interface InterestScore {
  category: string
  score: number
}

interface Accessibility {
  has_accessibility_needs: boolean
  sensory_limitations: string[]
  neurodiversity_flags: string[]
}

interface Child {
  _id: string
  username: string
  full_name: string
  grade_level: number
  date_of_birth: string
  preferred_language: string
  class_id: SchoolClass | null
  proficiency_levels: Proficiency[]
  accessibility: Accessibility
  interests: { interest_scores: InterestScore[] }
}

interface Parent {
  _id: string
  username: string
  email: string
  relationship_type: string
  children_ids: Child[]
}

interface Activity {
  _id: string
  url: string
  category: string
  interaction_type: string
  visit_duration: number
  timestamp: string
}

const calcAge = (dob: string): number => {
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

const formatDuration = (secs: number): string => {
  if (!secs) return "—"
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

const formatTime = (ts: string): string => {
  const d = new Date(ts)
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const categoryColor: Record<string, { bg: string; text: string }> = {
  Math:           { bg: "#dbeafe", text: "#1e40af" },
  Algebra:        { bg: "#dbeafe", text: "#1e40af" },
  Geometry:       { bg: "#dbeafe", text: "#1e40af" },
  Science:        { bg: "#dcfce7", text: "#166534" },
  Biology:        { bg: "#dcfce7", text: "#166534" },
  Chemistry:      { bg: "#dcfce7", text: "#166534" },
  Physics:        { bg: "#dcfce7", text: "#166534" },
  Entertainment:  { bg: "#fef9c3", text: "#854d0e" },
  Games:          { bg: "#fee2e2", text: "#991b1b" },
  Social:         { bg: "#fae8ff", text: "#6b21a8" },
  Sports:         { bg: "#ffedd5", text: "#9a3412" },
  General:        { bg: "#f3f4f6", text: "#374151" },
}

const getCatColor = (cat: string) =>
  categoryColor[cat] ?? { bg: "#f3f4f6", text: "#374151" }

const interactionIcon: Record<string, string> = {
  view: "👁",
  scroll: "↕",
  click: "🖱",
}

export default function ParentDashboard() {
  const [parent, setParent] = useState<Parent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [activity, setActivity] = useState<Activity[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"activity" | "profile">("activity")
  const [filterCat, setFilterCat] = useState("All")
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    fetch(`${API}/api/parents/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => setParent(data))
      .catch((err) => setError(err.message))
  }, [])

  const handleSelectChild = async (child: Child) => {
    setSelectedChild(child)
    setActiveTab("activity")
    setFilterCat("All")
    setActivityLoading(true)

    const token = localStorage.getItem("token")
    try {
      const res = await fetch(
        `${API}/api/parents/children/${child._id}/activity`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      setActivity(Array.isArray(data) ? data : [])
    } catch {
      setActivity([])
    }
    setActivityLoading(false)
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    router.push("/")
  }

  if (error) return <p style={{ color: "red", padding: "2rem" }}>Error: {error}</p>
  if (!parent) return <p style={{ padding: "2rem" }}>Loading...</p>

  const children = parent.children_ids ?? []
  const totalTime = activity.reduce((sum, a) => sum + (a.visit_duration ?? 0), 0)
  const categories = [...new Set(activity.map((a) => a.category))]
  const filteredActivity =
    filterCat === "All" ? activity : activity.filter((a) => a.category === filterCat)

  const catCounts = activity.reduce<Record<string, number>>((acc, a) => {
    acc[a.category] = (acc[a.category] ?? 0) + 1
    return acc
  }, {})
  const topCats = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "sans-serif", fontSize: 14 }}>

      {/* Sidebar */}
      <aside
        style={{
          width: 260,
          minHeight: "100vh",
          borderRight: "1px solid #e5e7eb",
          background: "#f9fafb",
          padding: "1.5rem 1rem",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ marginBottom: "1.25rem" }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>{parent.username}</p>
          <p style={{ margin: "2px 0 0", color: "#6b7280", fontSize: 12, textTransform: "capitalize" }}>
            {parent.relationship_type} · {parent.email}
          </p>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "0 0 1rem" }} />

        <p
          style={{
            margin: "0 0 8px",
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#9ca3af",
          }}
        >
          My Children
        </p>

        {children.length === 0 && (
          <p style={{ color: "#9ca3af", fontSize: 13 }}>No children linked yet.</p>
        )}

        {children.map((child) => {
          const isActive = selectedChild?._id === child._id
          const initials = (child.full_name || child.username).charAt(0).toUpperCase()
          return (
            <button
              key={child._id}
              onClick={() => handleSelectChild(child)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                textAlign: "left",
                padding: "10px",
                marginBottom: 4,
                cursor: "pointer",
                borderRadius: 8,
                border: "none",
                background: isActive ? "#dbeafe" : "transparent",
                color: isActive ? "#1e40af" : "#111827",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: isActive ? "#bfdbfe" : "#e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 600,
                  fontSize: 14,
                  color: isActive ? "#1d4ed8" : "#6b7280",
                }}
              >
                {initials}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: isActive ? 600 : 400, fontSize: 13 }}>
                  {child.full_name || child.username}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: isActive ? "#3b82f6" : "#9ca3af" }}>
                  {child.class_id
                    ? `${child.class_id.class_name} · ${child.class_id.school_name}`
                    : `Grade ${child.grade_level ?? "—"}`}
                </p>
              </div>
            </button>
          )
        })}

        <div style={{ flex: 1 }} />
        <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "1rem 0" }} />
        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: 8,
            cursor: "pointer",
            background: "none",
            border: "1px solid #e5e7eb",
            color: "#6b7280",
          }}
        >
          Logout
        </button>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        {!selectedChild ? (
          <div style={{ textAlign: "center", marginTop: "5rem", color: "#9ca3af" }}>
            <p style={{ fontSize: 18 }}>Select a child from the sidebar to view their activity</p>
          </div>
        ) : (
          <div>
            {/* Child header */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "1.5rem" }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "#dbeafe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 20,
                  color: "#1d4ed8",
                }}
              >
                {(selectedChild.full_name || selectedChild.username).charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
                  {selectedChild.full_name || selectedChild.username}
                </h1>
                <p style={{ margin: "3px 0 0", color: "#6b7280", fontSize: 13 }}>
                  Age {calcAge(selectedChild.date_of_birth)}
                  {selectedChild.class_id &&
                    ` · ${selectedChild.class_id.class_name}, ${selectedChild.class_id.school_name}`}
                  {selectedChild.preferred_language && ` · ${selectedChild.preferred_language}`}
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div
              style={{
                display: "flex",
                gap: 4,
                marginBottom: "1.5rem",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              {(["activity", "profile"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "8px 20px",
                    cursor: "pointer",
                    border: "none",
                    background: "none",
                    fontWeight: activeTab === tab ? 600 : 400,
                    color: activeTab === tab ? "#2563eb" : "#6b7280",
                    borderBottom:
                      activeTab === tab ? "2px solid #2563eb" : "2px solid transparent",
                    fontSize: 14,
                    textTransform: "capitalize",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Activity Tab */}
            {activeTab === "activity" && (
              <div>
                {/* Stats */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 12,
                    marginBottom: "1.5rem",
                  }}
                >
                  {[
                    { label: "Total Visits", value: activity.length },
                    { label: "Total Time", value: formatDuration(totalTime) },
                    { label: "Categories", value: categories.length },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      style={{
                        background: "#f9fafb",
                        borderRadius: 10,
                        padding: "14px 16px",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>{stat.label}</p>
                      <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 600 }}>
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Top categories */}
                {topCats.length > 0 && (
                  <div style={{ marginBottom: "1.5rem" }}>
                    <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: 13, color: "#374151" }}>
                      Top Categories
                    </p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {topCats.map(([cat, count]) => (
                        <span
                          key={cat}
                          style={{
                            padding: "4px 14px",
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 500,
                            background: getCatColor(cat).bg,
                            color: getCatColor(cat).text,
                          }}
                        >
                          {cat} ({count})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category filter */}
                <div
                  style={{ display: "flex", gap: 6, marginBottom: "1rem", flexWrap: "wrap" }}
                >
                  {["All", ...categories].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilterCat(cat)}
                      style={{
                        padding: "4px 14px",
                        borderRadius: 20,
                        fontSize: 12,
                        cursor: "pointer",
                        border: "1px solid #e5e7eb",
                        background: filterCat === cat ? "#2563eb" : "transparent",
                        color: filterCat === cat ? "#fff" : "#6b7280",
                        fontWeight: filterCat === cat ? 600 : 400,
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Activity table */}
                {activityLoading ? (
                  <p style={{ color: "#9ca3af" }}>Loading activity...</p>
                ) : filteredActivity.length === 0 ? (
                  <p style={{ color: "#9ca3af" }}>No activity recorded yet.</p>
                ) : (
                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      overflow: "hidden",
                    }}
                  >
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                          {["URL", "Category", "Type", "Duration", "Time"].map((h) => (
                            <th
                              key={h}
                              style={{
                                padding: "10px 14px",
                                textAlign: "left",
                                fontWeight: 600,
                                color: "#374151",
                                fontSize: 12,
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredActivity.map((item, i) => (
                          <tr
                            key={item._id}
                            style={{
                              borderBottom:
                                i < filteredActivity.length - 1
                                  ? "1px solid #f3f4f6"
                                  : "none",
                            }}
                          >
                            <td style={{ padding: "10px 14px", maxWidth: 280 }}>
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  color: "#2563eb",
                                  fontSize: 12,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  display: "block",
                                  maxWidth: 260,
                                }}
                              >
                                {item.url}
                              </a>
                            </td>
                            <td style={{ padding: "10px 14px" }}>
                              <span
                                style={{
                                  padding: "3px 10px",
                                  borderRadius: 20,
                                  fontSize: 11,
                                  fontWeight: 500,
                                  background: getCatColor(item.category).bg,
                                  color: getCatColor(item.category).text,
                                }}
                              >
                                {item.category}
                              </span>
                            </td>
                            <td style={{ padding: "10px 14px", color: "#6b7280", fontSize: 13 }}>
                              {interactionIcon[item.interaction_type] ?? ""}{" "}
                              {item.interaction_type}
                            </td>
                            <td style={{ padding: "10px 14px", color: "#374151" }}>
                              {formatDuration(item.visit_duration)}
                            </td>
                            <td style={{ padding: "10px 14px", color: "#9ca3af", fontSize: 12 }}>
                              {formatTime(item.timestamp)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

                {/* Basic info */}
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: "1rem 1.25rem",
                  }}
                >
                  <p style={{ margin: "0 0 12px", fontWeight: 600, fontSize: 13 }}>Basic Info</p>
                  {(
                    [
                      ["Full Name", selectedChild.full_name || "—"],
                      ["Username", selectedChild.username],
                      ["Age", String(calcAge(selectedChild.date_of_birth))],
                      ["Grade Level", String(selectedChild.grade_level ?? "—")],
                      ["Language", selectedChild.preferred_language || "—"],
                      ["School", selectedChild.class_id?.school_name ?? "—"],
                      ["Class", selectedChild.class_id?.class_name ?? "—"],
                    ] as [string, string][]
                  ).map(([label, val]) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "6px 0",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <span style={{ color: "#6b7280", fontSize: 13 }}>{label}</span>
                      <span style={{ fontWeight: 500, fontSize: 13 }}>{val}</span>
                    </div>
                  ))}
                </div>

                {/* Proficiency */}
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: "1rem 1.25rem",
                  }}
                >
                  <p style={{ margin: "0 0 12px", fontWeight: 600, fontSize: 13 }}>
                    Subject Proficiency
                  </p>
                  {selectedChild.proficiency_levels?.length > 0 ? (
                    selectedChild.proficiency_levels.map((p) => (
                      <div
                        key={p.category}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "6px 0",
                          borderBottom: "1px solid #f3f4f6",
                        }}
                      >
                        <span style={{ color: "#374151", fontSize: 13 }}>{p.category}</span>
                        <span
                          style={{
                            padding: "2px 10px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 500,
                            background:
                              p.level === "expert"
                                ? "#dcfce7"
                                : p.level === "advanced"
                                ? "#fef9c3"
                                : "#dbeafe",
                            color:
                              p.level === "expert"
                                ? "#166534"
                                : p.level === "advanced"
                                ? "#854d0e"
                                : "#1e40af",
                          }}
                        >
                          {p.level}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: "#9ca3af", fontSize: 13 }}>No proficiency data yet.</p>
                  )}
                </div>

                {/* Interests */}
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: "1rem 1.25rem",
                  }}
                >
                  <p style={{ margin: "0 0 12px", fontWeight: 600, fontSize: 13 }}>
                    Interest Scores
                  </p>
                  {selectedChild.interests?.interest_scores?.length > 0 ? (
                    [...selectedChild.interests.interest_scores]
                      .sort((a, b) => b.score - a.score)
                      .map((item) => (
                        <div key={item.category} style={{ marginBottom: 8 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 2,
                            }}
                          >
                            <span style={{ fontSize: 12, color: "#374151" }}>{item.category}</span>
                            <span style={{ fontSize: 12, color: "#6b7280" }}>{item.score}</span>
                          </div>
                          <div
                            style={{ height: 6, background: "#f3f4f6", borderRadius: 4 }}
                          >
                            <div
                              style={{
                                height: 6,
                                borderRadius: 4,
                                background: "#2563eb",
                                width: `${Math.min(item.score, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))
                  ) : (
                    <p style={{ color: "#9ca3af", fontSize: 13 }}>No interest data yet.</p>
                  )}
                </div>

                {/* Accessibility */}
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: "1rem 1.25rem",
                  }}
                >
                  <p style={{ margin: "0 0 12px", fontWeight: 600, fontSize: 13 }}>
                    Accessibility
                  </p>
                  {selectedChild.accessibility?.has_accessibility_needs ? (
                    <div>
                      {selectedChild.accessibility.sensory_limitations?.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <p style={{ margin: "0 0 4px", fontSize: 12, color: "#6b7280" }}>
                            Sensory
                          </p>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {selectedChild.accessibility.sensory_limitations.map((s) => (
                              <span
                                key={s}
                                style={{
                                  padding: "2px 10px",
                                  borderRadius: 20,
                                  background: "#fef9c3",
                                  color: "#854d0e",
                                  fontSize: 11,
                                }}
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedChild.accessibility.neurodiversity_flags?.length > 0 && (
                        <div>
                          <p style={{ margin: "0 0 4px", fontSize: 12, color: "#6b7280" }}>
                            Neurodiversity
                          </p>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {selectedChild.accessibility.neurodiversity_flags.map((n) => (
                              <span
                                key={n}
                                style={{
                                  padding: "2px 10px",
                                  borderRadius: 20,
                                  background: "#fae8ff",
                                  color: "#6b21a8",
                                  fontSize: 11,
                                }}
                              >
                                {n}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p style={{ color: "#9ca3af", fontSize: 13 }}>
                      No accessibility needs recorded.
                    </p>
                  )}
                </div>

              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}