"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import { wrap } from "module";
import { useEffect } from "react";
import Image from "next/image";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface PlacedItem {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  category: string;
}

type Category = "frame" | "landmark" | "festivals" | "food" | "stamp" | null;

// ─────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────

const FRAME_COLORS = [
  "#FBEE7B",
  "#FF6DB7",
  "#4AA7FF",
  "#26B56D",
  "#F93C35",
  "#011899",
  "#FD6E75",
  "#FB6501",
  "#FFFFFF",
  "#000000",
];

const LANDMARK_IMAGES = [
  "/postcard/icons/icon_landmark.png",
  "/postcard/landmarks/landmark_2.png",
  "/countries/china/landmarks/templeofheaven/congrats_landmark.png",
  "/postcard/landmarks/landmark_4.png",
  "/postcard/landmarks/landmark_5.png",
  "/postcard/landmarks/landmark_6.png",
];

// Festivals index 0–3 → map to a different placed image; index 4–5 → placed directly
const FESTIVAL_IMAGES = [
  "/countries/china/festivals/cny/block_2.png",
  "/postcard/festivals/festival_2.png",
  "/countries/china/festivals/cny/congrats_firework_right.png",
  "/countries/china/landmarks/templeofheaven/congrats_lantern.png",
  "/postcard/festivals/festival_5.png",
  "/countries/china/festivals/cny/block_1.png",
];
// const FESTIVAL_PLACED_IMAGES: Record<number, string> = {
//   0: "/postcard/festivals/festival_1_placed.png",
//   1: "/postcard/festivals/festival_2_placed.png",
//   2: "/postcard/festivals/festival_3_placed.png",
//   3: "/postcard/festivals/festival_4_placed.png",
// };

const FOOD_IMAGES = [
  "/postcard/food/food_1.png",
  "/countries/china/food/friedrice/ing_soysauce.png",
  "/countries/china/festivals/cny/block_6.png",
  "/postcard/food/food_4.png",
  "/postcard/food/food_5.png",
  "/countries/china/food/friedrice/ing_shrimp.png",
];

const STAMP_IMAGES = [
  "/postcard/stamps/stamp_1.png",
  "/postcard/stamps/stamp_2.png",
  "/postcard/stamps/stamp_3.png",
  "/countries/china/stamp.png",
  "/postcard/stamps/stamp_5.png",
  "/postcard/stamps/stamp_6.png",
];

const INFO_CARD_IMAGE = "/postcard/info_card.png";

const CARD_W = 981;
const CARD_H = 572;
const FRAME_THICKNESS = 55;

const CATEGORIES: { key: Category; label: string; image: string }[] = [
  { key: "frame", label: "FRAME", image: "/postcard/icons/icon_frame.png" },
  {
    key: "landmark",
    label: "LANDMARK",
    image: "/postcard/icons/icon_landmark.png",
  },
  {
    key: "festivals",
    label: "FESTIVALS",
    image: "/postcard/icons/icon_festivals.png",
  },
  { key: "food", label: "FOOD", image: "/postcard/icons/icon_food.png" },
  { key: "stamp", label: "STAMP", image: "/postcard/icons/icon_stamp.png" },
];

// ─────────────────────────────────────────────

function decodeJWT(token: string): { id?: string } | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}
function getFrameFilter(hex: string): string {
  const filters: Record<string, string> = {
    "#FF6DB7": "saturate(1) brightness(0.8) hue-rotate(280deg)",
    "#4AA7FF": "saturate(1) brightness(0.8) hue-rotate(150deg)",
    "#26B56D": "saturate(1.2) brightness(0.8) hue-rotate(80deg)",
    "#F93C35": "saturate(3.5) brightness(0.6) hue-rotate(300deg)",
    "#011899": "saturate(1.7) brightness(0.3) hue-rotate(180deg)",
    "#FD6E75": "saturate(1.3) brightness(0.8) hue-rotate(300deg)",
    "#FB6501": "saturate(2) brightness(0.75) hue-rotate(340deg)",
    "#FFFFFF": "brightness(1.6) saturate(0.1) contrast(1.2)",
    "#000000": "brightness(0.05) saturate(0)",
  };
  return filters[hex] ?? "none";
}

// ─────────────────────────────────────────────

export default function PostcardStudioPage() {
  const router = useRouter();

  const [activeCategory, setActiveCategory] = useState<Category>(null);
  const [frameColor, setFrameColor] = useState<string | null>(null);
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [currentKeywordIndex, setCurrentKeywordIndex] = useState(0);
  const [showTitlePopup, setShowTitlePopup] = useState(false);
  const [postcardTitle, setPostcardTitle] = useState("");
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [generatingShare, setGeneratingShare] = useState(false);

  const dragging = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchKeywords = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/ai/keywords", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ countryName: "China" }), // swap with dynamic country later
        });
        const data = await res.json();
        if (Array.isArray(data)) setKeywords(data);
      } catch {
        // silent fail
      }
    };
    fetchKeywords();
  }, []);

  // Cycle through keywords every 3 seconds so the bubble feels alive
  useEffect(() => {
    if (keywords.length === 0) return;
    const interval = setInterval(() => {
      setCurrentKeywordIndex((prev) => (prev + 1) % keywords.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [keywords]);

  // ── Toggle category ───────────────────────
  const toggleCategory = (cat: Category) => {
    setActiveCategory((prev) => (prev === cat ? null : cat));
  };

  // ── Add item to card ──────────────────────
  const addItem = useCallback(
    (src: string, category: string, overrides?: Partial<PlacedItem>) => {
      const id = `${category}_${Date.now()}_${Math.random()}`;
      const defaults: Record<
        string,
        { x: number; y: number; width: number; height: number }
      > = {
        landmark: { x: 10, y: CARD_H / 2 - 170, width: 500, height: 460 },
        festivals: {
          x: CARD_W / 2 - 80,
          y: CARD_H / 2 - 80,
          width: 200,
          height: 160,
        },
        food: {
          x: CARD_W / 2 - 60,
          y: CARD_H / 2 - 60,
          width: 200,
          height: 180,
        },
        stamp: { x: CARD_W - 140, y: CARD_H - 140, width: 120, height: 120 },
      };
      const def = defaults[category] ?? {
        x: 20,
        y: 20,
        width: 100,
        height: 100,
      };
      setPlacedItems((prev) => [
        ...prev,
        { id, src, category, ...def, ...overrides },
      ]);
    },
    [],
  );

  // ── Drag placed items on card ─────────────
  const handleItemMouseDown = (e: React.MouseEvent, item: PlacedItem) => {
    e.preventDefault();
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    dragging.current = {
      id: item.id,
      offsetX: e.clientX - rect.left - item.x,
      offsetY: e.clientY - rect.top - item.y,
    };

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current || !cardRef.current) return;
      const r = cardRef.current.getBoundingClientRect();
      const newX = Math.max(
        0,
        Math.min(
          ev.clientX - r.left - dragging.current.offsetX,
          CARD_W - item.width,
        ),
      );
      const newY = Math.max(
        0,
        Math.min(
          ev.clientY - r.top - dragging.current.offsetY,
          CARD_H - item.height,
        ),
      );
      setPlacedItems((prev) =>
        prev.map((it) =>
          it.id === dragging.current!.id ? { ...it, x: newX, y: newY } : it,
        ),
      );
    };
    const onUp = () => {
      dragging.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ── Handle item click from sidebar ───────
  const handleSidebarClick = (src: string, index: number) => {
    if (!activeCategory) return;
    if (activeCategory === "landmark") {
      addItem(src, "landmark");
    } else if (activeCategory === "festivals") {
      // const placedSrc =
      //   index <= 3 ? (FESTIVAL_PLACED_IMAGES[index] ?? src) : src;
      addItem(src, "festivals");
    } else if (activeCategory === "food") {
      addItem(src, "food");
    } else if (activeCategory === "stamp") {
      addItem(src, "stamp");
    }
  };

  // ── Save to backend ───────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please log in first.");
        setSaving(false);
        return;
      }
      const decoded = decodeJWT(token);
      const userId = decoded?.id;
      if (!userId) {
        setSaving(false);
        return;
      }

      // 1. Detect emotion first so it can be saved with the postcard
      let emotionAnalysis = { emotion: "", message: "" };
      // Emotion detection — developer log only, never shown to child
      if (postcardTitle.trim().length > 0) {
        try {
          const emotionRes = await fetch(
            "http://localhost:5000/api/ai/emotion",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: postcardTitle }),
            },
          );
          const emotionData = await emotionRes.json();
          console.log("🧠 Emotion Detection:", emotionData);
          emotionAnalysis = {
            emotion: emotionData.emotion ?? "",
            message: emotionData.message ?? "",
          };
          if (
            emotionData.emotion === "distressed" ||
            emotionData.emotion === "sad"
          ) {
            console.warn(
              "⚠️ ALERT — Child may be in distress:",
              emotionData.message,
            );
          }
        } catch {
          // silent
        }
      }

      const layout = placedItems.map(
        ({ src, category, x, y, width, height }) => ({
          src,
          category,
          x,
          y,
          width,
          height,
        }),
      );

      const body = {
        userId,
        backgroundName: frameColor ?? "none",
        jsonLayout: layout,
        elements: layout,
        postcardText: postcardTitle,
        emotionAnalysis: emotionAnalysis || { emotion: "", message: "" },
      };

      const res = await fetch("http://localhost:5000/api/postcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setPostcardTitle("");
        setShowTitlePopup(false);
        router.push("/my-collection");
      } else alert("Something went wrong. Please try again.");
    } catch {
      alert("Could not save postcard.");
    } finally {
      setSaving(false);
    }
  };
  const handleShare = async () => {
    setShowSharePopup(true);
    if (shareUrl) return; // already generated

    setGeneratingShare(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      if (!cardRef.current) return;

      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        backgroundColor: "#ffffff",
        scale: 2, // higher resolution
      });

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        setShareUrl(url);
        setGeneratingShare(false);
      }, "image/png");
    } catch {
      setGeneratingShare(false);
    }
  };

  const placedSrcs = new Set(placedItems.map((item) => item.src));
  // const placedFestivalIndexes = new Set(
  //   placedItems
  //     .filter((item) => item.category === "festivals")
  //     .map(
  //       (item) =>
  //         Object.entries(FESTIVAL_PLACED_IMAGES).find(
  //           ([, v]) => v === item.src,
  //         )?.[0],
  //     )
  //     .filter(Boolean),
  // );

  // ── Sidebar grid images list ──────────────
  const getSidebarImages = (): string[] => {
    if (!activeCategory || activeCategory === "frame") return [];
    // if (activeCategory === "festivals") {
    //   return FESTIVAL_IMAGES.filter((src, i) => {
    //     if (i <= 3) return !placedFestivalIndexes.has(String(i));
    //     return !placedSrcs.has(src);
    //   });
    // }

    const map: Record<string, string[]> = {
      landmark: LANDMARK_IMAGES,
      festivals: FESTIVAL_IMAGES,
      food: FOOD_IMAGES,
      stamp: STAMP_IMAGES,
    };
    return (map[activeCategory] ?? []).filter((src) => !placedSrcs.has(src));
  };

  // ── Visible sidebar buttons ───────────────
  // When a category is active, only show that one button at the top
  const visibleCategories = activeCategory
    ? CATEGORIES.filter((c) => c.key === activeCategory)
    : CATEGORIES;

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────
  return (
    <div
      style={{
        background: "var(--midnight-blue)",
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Navbar />

      {/* Info popup — hover triggered */}
      {showInfo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.45)",
            pointerEvents: "none",
          }}
        >
          <img
            src={INFO_CARD_IMAGE}
            alt="Info"
            style={{ maxWidth: 420, width: "90%", borderRadius: 12 }}
          />
        </div>
      )}

      <div
        style={{
          flex: 1,
          maxWidth: "90%",
          width: "100%",
          margin: "0 auto",
          padding: "24px 0px 40px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 30,
          marginLeft: 120,
          marginTop: "40px",
        }}
      >
        {/* ── Title + info button ── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-gafiton), sans-serif",
              fontWeight: 400,
              fontSize: 48,
              lineHeight: "100%",
              letterSpacing: 0,
              textTransform: "capitalize",
              color: "var(--pink-primary)",
              margin: 0,
            }}
          >
            You've Seen The World
            <br />
            Now Show It Off!
          </h1>

          <button
            onMouseEnter={() => setShowInfo(true)}
            onMouseLeave={() => setShowInfo(false)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 22,
              color: "var(--pink-primary)",
              fontWeight: "bold",
              fontFamily: "Helvetica, sans-serif",
              flexShrink: 0,
              marginTop: 4,
            }}
            aria-label="Info"
          >
            ⓘ
          </button>
        </div>

        {/* ── Card + sidebar ── */}
        <div
          style={{
            display: "flex",
            gap: 75,
            alignItems: "flex-start",
            marginLeft: "20px",
            marginBottom: "20px",
          }}
        >
          {/* Postcard container including optional frame */}
          <div
            ref={cardRef}
            style={{
              position: "relative",
              width: CARD_W + FRAME_THICKNESS,
              height: CARD_H + FRAME_THICKNESS,
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            {frameColor && (
              <img
                src="/postcard/frame.png"
                alt="Postcard frame"
                draggable={false}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: CARD_W + FRAME_THICKNESS,
                  height: CARD_H + FRAME_THICKNESS,
                  zIndex: 0,
                  pointerEvents: "none",
                  filter: getFrameFilter(frameColor),
                  objectFit: "fill",
                }}
              />
            )}

            {/* The actual white postcard */}
            <div
              style={{
                position: "absolute",
                top: FRAME_THICKNESS / 2,
                left: FRAME_THICKNESS / 2,
                width: CARD_W,
                height: CARD_H,
                background: "#ffffff",
                zIndex: 1,
                overflow: "hidden",
              }}
            >
              {placedItems.map((item) => (
                <img
                  key={item.id}
                  src={item.src}
                  alt=""
                  draggable={false}
                  onMouseDown={(e) => handleItemMouseDown(e, item)}
                  style={{
                    position: "absolute",
                    left: item.x,
                    top: item.y,
                    width: item.width,
                    height: item.height,
                    objectFit: "contain",
                    cursor: "grab",
                    userSelect: "none",
                    zIndex: 2,
                  }}
                />
              ))}
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 28,
              flexShrink: 0,
            }}
          >
            {visibleCategories.map((cat) => (
              <div key={cat.key}>
                {/* Category button */}
                <button
                  onClick={() => toggleCategory(cat.key)}
                  className="sidebar-btn"
                  style={{
                    width: 210,
                    height: 86,
                    background: "#2E43BB",
                    border: "1px solid #000",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "0 12px",
                    transition: "transform 0.1s ease, box-shadow 0.1s ease",
                  }}
                >
                  <img
                    src={cat.image}
                    alt=""
                    style={{ width: 60, height: 60, objectFit: "contain" }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-gafiton), sans-serif",
                      fontWeight: 400,
                      fontSize: 20,
                      lineHeight: "106%",
                      letterSpacing: 0,
                      color: "#ffffff",
                      overflowWrap: "break-word",
                      wordBreak: "break-word",
                    }}
                  >
                    {cat.label}
                  </span>
                </button>

                {/* Expanded section directly below active button */}
                {activeCategory === cat.key && (
                  <div
                    style={{
                      width: 195,
                      height: 440,
                      background: "#2E43BB",
                      border: "1px solid #000",
                      padding: "12px 10px",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      marginTop: "20px",
                    }}
                  >
                    {cat.key === "frame"
                      ? FRAME_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() =>
                              setFrameColor(color === frameColor ? null : color)
                            }
                            style={{
                              width: "90%",
                              height: "80%",
                              background: color,
                              border:
                                frameColor == color
                                  ? "3px solid #000"
                                  : "2px solid #000",
                              cursor: "pointer",
                              borderRadius: 2,
                              transition: "transform 0.1s",
                              transform:
                                frameColor == color ? "scale(1.1)" : "scale(1)",
                            }}
                          />
                        ))
                      : getSidebarImages().map((src, i) => (
                          <button
                            key={i}
                            onClick={() => handleSidebarClick(src, i)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 4,
                              borderRadius: 4,
                            }}
                          >
                            <img
                              src={src}
                              alt=""
                              style={{
                                width: "100%",
                                height: "80%",
                                aspectRatio: "1",
                                objectFit: "contain",
                              }}
                            />
                          </button>
                        ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom action buttons ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            maxWidth: CARD_W + 24 + 176,
            marginTop: 4,
          }}
        >
          <button
            onClick={() => setShowTitlePopup(true)}
            disabled={saving}
            className="action-btn"
            style={{
              height: 44,
              padding: "0 24px",
              background: "#ffffff",
              border: "1px solid #000",
              cursor: saving ? "default" : "pointer",
              fontFamily: "var(--font-gafiton), sans-serif",
              fontWeight: 400,
              fontSize: 16,
              letterSpacing: 0,
              textTransform: "uppercase",
              color: "#000000",
              opacity: saving ? 0.6 : 1,
              transition: "transform 0.1s ease, box-shadow 0.1s ease",
            }}
          >
            {saving ? "SAVING..." : "ADD TO MY COLLECTION"}
          </button>

          <button
            onClick={handleShare}
            className="action-btn"
            style={{
              height: 44,
              padding: "0 24px",
              background: "#ffffff",
              border: "1px solid #000",
              cursor: "pointer",
              fontFamily: "var(--font-gafiton), sans-serif",
              fontWeight: 400,
              fontSize: 16,
              letterSpacing: 0,
              textTransform: "uppercase",
              color: "#000000",
              transition: "transform 0.1s ease, box-shadow 0.1s ease",
            }}
          >
            Share it with a friend
          </button>
        </div>
        {showTitlePopup && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 200,
            }}
          >
            <div
              style={{
                width: 400,
                background: "#ffffff",
                boxShadow: "-6px 6px 0px var(--pink-primary)",
                border: "1px solid #000",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* HEADER */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  padding: "8px 12px",
                  borderBottom: "1px solid #000",
                }}
              >
                <button
                  onClick={() => setShowTitlePopup(false)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 18,
                    cursor: "pointer",
                    color: "#000000",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* CONTENT */}
              <div
                style={{
                  padding: "20px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                {/* AI character + keyword suggestion */}
                {keywords.length > 0 && (
                  <div className="ai-recommendation">
                    <Image
                      src="/ai-character.png"
                      alt="AI Guide"
                      width={90}
                      height={120}
                      className="ai-character"
                    />
                    <div className="speech-bubble">
                      <p className="speech-bubble-text">
                        💡 Try: &ldquo;{keywords[currentKeywordIndex]}&rdquo;
                      </p>
                    </div>
                  </div>
                )}
                <span
                  style={{
                    fontFamily: "var(--font-gafiton), sans-serif",
                    fontSize: 20,
                    color: "#000",
                  }}
                >
                  Add a title to your postcard
                </span>

                <input
                  type="text"
                  value={postcardTitle}
                  onChange={(e) => setPostcardTitle(e.target.value)}
                  placeholder="My amazing trip..."
                  style={{
                    height: 40,
                    border: "1px solid #000",
                    padding: "0 10px",
                    fontSize: 16,
                    fontFamily: "var(--font-gafiton), sans-serif",
                    color: "#000000",
                  }}
                />

                {/* SAVE BUTTON */}
                <button
                  onClick={handleSave}
                  className="action-btn"
                  style={{
                    height: 44,
                    background: "#ffffff",
                    border: "1px solid #000",
                    cursor: "pointer",
                    fontFamily: "var(--font-gafiton), sans-serif",
                    fontSize: 16,
                    textTransform: "uppercase",
                    color: "#000000",
                  }}
                >
                  SAVE
                </button>
              </div>
            </div>
          </div>
        )}
        {showSharePopup && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 200,
            }}
          >
            <div
              style={{
                width: 400,
                background: "#ffffff",
                boxShadow: "-6px 6px 0px var(--pink-primary)",
                border: "1px solid #000",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* HEADER */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  padding: "8px 12px",
                  borderBottom: "1px solid #000",
                }}
              >
                <button
                  onClick={() => setShowSharePopup(false)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 18,
                    cursor: "pointer",
                    color: "#000000",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* CONTENT */}
              <div
                style={{
                  padding: "20px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-gafiton), sans-serif",
                    fontSize: 20,
                    color: "#000",
                  }}
                >
                  Download your postcard
                </span>

                <p
                  style={{
                    fontFamily: "var(--font-gafiton), sans-serif",
                    fontSize: 14,
                    color: "#333",
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
                  {generatingShare
                    ? "Generating your postcard image..."
                    : shareUrl
                      ? "Your postcard image is ready. Click the button below to download it."
                      : "Click Download Postcard to generate the image."}
                </p>

                {shareUrl && (
                  <a
                    href={shareUrl}
                    className="action-btn"
                    download="my-postcard.png"
                    style={{
                      display: "inline-flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: 44,
                      padding: "0 24px",
                      background: "#ffffff",
                      border: "1px solid #000",
                      cursor: "pointer",
                      fontFamily: "var(--font-gafiton), sans-serif",
                      fontSize: 16,
                      textTransform: "uppercase",
                      color: "#000000",
                      textDecoration: "none",
                    }}
                  >
                    Download postcard
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        /* Shadow on LEFT and BOTTOM sides */
        .sidebar-btn:hover {
          transform: translate(2px, -2px);
          box-shadow: -4px 4px 0px var(--pink-primary);
        }
        .action-btn:hover {
          transform: translate(-2px, -2px);
          box-shadow: 4px 4px 0px var(--pink-primary);
        }
          .ai-recommendation {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 1px;
  align-self: flex-start;
  z-index: 4;
}
.ai-character {
  width: 150px;
  height: auto;
  flex-shrink: 0;
}
.speech-bubble {
  position: relative;
  background: var(--yellow-primary);
  border: 2px solid var(--black-neutral, #000);
  padding: 12px 16px;
  max-width: 260px;
  border-radius: 4px;
  margin-top: 20px;
}
.speech-bubble::before {
  content: "";
  position: absolute;
  left: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 0; height: 0;
  border-top: 10px solid transparent;
  border-bottom: 10px solid transparent;
  border-right: 12px solid #000;
}
.speech-bubble::after {
  content: "";
  position: absolute;
  left: -9px;
  top: 50%;
  transform: translateY(-50%);
  width: 0; height: 0;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-right: 10px solid var(--yellow-primary);
}
.speech-bubble-text {
  font-family: var(--font-gafiton), sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: #000;
  margin: 0;
}
      `}</style>
    </div>
  );
}
