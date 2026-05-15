"use client";

import { useState, useEffect } from "react";
import Navbar from "@/app/components/Navbar";

// ─────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────

const BG_IMAGE = "/countries/egypt/landmarks/cairotower/background.jpeg";
const INFO_CARD_IMAGE = "/infocards/info_card_landmark.png";

// No separate placedImage — same image is used for both carousel and overlay
const BLOCKS = [
  {
    id: "block1",
    label: "BLOCK 1",
    image: "/countries/egypt/landmarks/cairotower/block_1.png",
    dropZone: {
      top: "64%",
      left: "45.3%",
      width: "9.5%",
      height: "18%",
      zIndex: 4,
    },
  },
  {
    id: "block2",
    label: "BLOCK 2",
    image: "/countries/egypt/landmarks/cairotower/block_2.png",
    dropZone: {
      top: "63.9%",
      left: "45%",
      width: "10%",
      height: "18%",
      zIndex: 3,
    },
  },
  {
    id: "block3",
    label: "BLOCK 3",
    image: "/countries/egypt/landmarks/cairotower/block_3.png",
    dropZone: {
      top: "18%",
      left: "45%",
      width: "9.2%",
      height: "49%",
      zIndex: 5,
    },
  },
  {
    id: "block4",
    label: "BLOCK 4",
    image: "/countries/egypt/landmarks/cairotower/block_4.png",
    dropZone: {
      top: "18%",
      left: "47.4%",
      width: "5.3%",
      height: "5%",
      zIndex: 3,
    },
  },
  {
    id: "block5",
    label: "BLOCK 5",
    image: "/countries/egypt/landmarks/cairotower/block_5.png",
    dropZone: {
      top: "13%",
      left: "46.4%",
      width: "7.3%",
      height: "7%",
      zIndex: 5,
    },
  },
  {
    id: "block6",
    label: "BLOCK 6",
    image: "/countries/egypt/landmarks/cairotower/block_6.png",
    dropZone: {
      top: "-3%",
      left: "47.4%",
      width: "5.2%",
      height: "17.4%",
      zIndex: 5,
    },
  },
];

const VISIBLE_COUNT = 3;

// ─────────────────────────────────────────────

export default function TheCairoTowerPage() {
  // ── Game state ────────────────────────────
  const [placedBlocks, setPlacedBlocks] = useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [funFactBlockId, setFunFactBlockId] = useState<string | null>(null);
  const [funFacts, setFunFacts] = useState<Record<string, string>>({});
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [done, setDone] = useState(false);

  // ── Congratulations state ─────────────────
  const [allCategoriesCompleted, setAllCategoriesCompleted] = useState(false);
  const [progressLoading, setProgressLoading] = useState(false);

  // ── Fetch fun facts ───────────────────────
  useEffect(() => {
    const fetchFunFacts = async () => {
      try {
        const res = await fetch(
          "http://localhost:5000/api/categories/country/Egypt/type/landmark",
        );
        const data = await res.json();
        const tower = data.find((item: { name: string; funFacts?: string[] }) =>
          item.name?.toLowerCase().includes("cairo tower"),
        );
        if (tower?.funFacts?.length) {
          const map: Record<string, string> = {};
          BLOCKS.forEach((b, i) => {
            if (tower.funFacts[i]) {
              map[b.id] = tower.funFacts[i];
            }
          });
          setFunFacts(map);
        }
      } catch {
        setFunFacts({});
      }
    };
    fetchFunFacts();
  }, []);

  // ── Update progress when done ─────────────
  useEffect(() => {
    if (!done) return;
    const updateProgress = async () => {
      setProgressLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join(""),
        );
        const decoded = JSON.parse(jsonPayload);
        const userId = decoded?.id;
        if (!userId) return;

        const countryRes = await fetch(
          "http://localhost:5000/api/countries/egypt",
        );
        const countryData = await countryRes.json();
        const countryId = countryData._id;

        await fetch("http://localhost:5000/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, countryId }),
        });

        await fetch(
          `http://localhost:5000/api/progress/user/${userId}/country/${countryId}/category`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category: "landmark" }),
          },
        );

        const progressRes = await fetch(
          `http://localhost:5000/api/progress/user/${userId}/country/${countryId}`,
        );
        const progressData = await progressRes.json();
        const allCompleted = ["food", "festival", "landmark"].every((cat) =>
          progressData.completedCategories?.includes(cat),
        );
        setAllCategoriesCompleted(allCompleted);
      } catch {
        // silent fail
      } finally {
        setProgressLoading(false);
      }
    };
    updateProgress();
  }, [done]);

  // ── Drag handlers ─────────────────────────
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("blockId", id);
    setDraggingId(id);
  };

  const handleDragEnd = () => setDraggingId(null);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const droppedId = e.dataTransfer.getData("blockId");
    if (droppedId !== targetId) return; // wrong block for this zone — no shake needed

    const newPlaced = new Set(placedBlocks);
    newPlaced.add(droppedId);
    setPlacedBlocks(newPlaced);
    setFunFactBlockId(funFacts[droppedId] ? droppedId : null);

    if (newPlaced.size === BLOCKS.length) {
      setTimeout(() => {
        setFunFactBlockId(null);
        setDone(true);
      }, 2500);
    }
  };

  // ── Carousel ──────────────────────────────
  const canPrev = carouselIndex > 0;
  const canNext = carouselIndex + VISIBLE_COUNT < BLOCKS.length;
  const visibleBlocks = BLOCKS.slice(
    carouselIndex,
    carouselIndex + VISIBLE_COUNT,
  );

  // ─────────────────────────────────────────
  // CONGRATULATIONS SCREEN
  // ─────────────────────────────────────────
  if (done) {
    return (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100vh",
          background: "var(--midnight-blue)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Navbar />
        <img
          src="/gifs/firework.gif"
          alt=""
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            width: 400,
            pointerEvents: "none",
            zIndex: 1,
            opacity: 0.8,
          }}
        />

        <img
          src="/gifs/firework.gif"
          alt=""
          style={{
            position: "absolute",
            bottom: 10,
            right: 10,
            width: 400,
            pointerEvents: "none",
            zIndex: 1,
            opacity: 0.8,
          }}
        />
        {/* Yellow strings */}
        <img
          src="/congrats_strings.png"
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            top: 5,
            left: 0,
            width: "100%",
            pointerEvents: "none",
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            zIndex: 5,
            marginTop: 80,
          }}
        >
          <span
            style={{
              fontFamily: "'Fredoka', sans-serif",
              fontWeight: 400,
              fontSize: 40,
              lineHeight: "100%",
              letterSpacing: "0.02em",
              textAlign: "center",
              textTransform: "uppercase",
              color: "var(--yellow-primary)",
            }}
          >
            CONGRATULATIONS
          </span>

          <span
            style={{
              fontFamily: "'Fredoka', sans-serif",
              fontWeight: 400,
              fontSize: 20,
              lineHeight: "100%",
              letterSpacing: "0.02em",
              textAlign: "center",
              textTransform: "uppercase",
              color: allCategoriesCompleted
                ? "var(--yellow-primary)"
                : "#ffffff",
            }}
          >
            {progressLoading ? (
              "..."
            ) : allCategoriesCompleted ? (
              <>
                ARE YOU READY TO TAKE A<br />
                QUIZ ABOUT EGYPT?
              </>
            ) : (
              <>
                ARE YOU READY FOR YOUR
                <br />
                NEXT ADVENTURE?
              </>
            )}
          </span>

          {/* Landmark + flowers */}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              marginTop: -24,
            }}
          >
            <img
              src="/countries/egypt/landmarks/cairotower/congrats_landmark.png"
              alt="Cairo Tower"
              draggable={false}
              style={{
                width: 520,
                objectFit: "contain",
                paddingTop: 0,
                pointerEvents: "none",
              }}
            />
          </div>

          <button
            onClick={() => {
              window.location.href = allCategoriesCompleted
                ? "/quiz/egypt"
                : "/egypt";
            }}
            className="continue-btn"
            style={{
              background: "#ffffff",
              color: "#000000",
              border: "3px solid #000000",
              marginTop: -70,
              padding: "12px 52px",
              fontFamily: "Helvetica, Arial, sans-serif",
              fontWeight: 400,
              fontSize: 20,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "transform 0.1s ease, box-shadow 0.1s ease",
              zIndex: 10,
            }}
          >
            {allCategoriesCompleted ? "READY!" : "CONTINUE"}
          </button>
        </div>

        <style>{`
          .continue-btn:hover {
            transform: translate(-2px, -2px);
            box-shadow: 6px 6px 0px var(--yellow-primary);
          }
        `}</style>
      </div>
    );
  }

  // ─────────────────────────────────────────
  // GAME SCREEN
  // ─────────────────────────────────────────
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        // height: "100vh",
        // overflow: "hidden",
        height: "800px",
        backgroundImage: "url(" + BG_IMAGE + ")",
        backgroundSize: "cover",
        backgroundPosition: "center 20%",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Navbar />

      {/* Info button */}
      <button
        onMouseEnter={() => setShowInfo(true)}
        onMouseLeave={() => setShowInfo(false)}
        style={{
          position: "absolute",
          top: 70,
          right: 25,
          background: "none",
          border: "none",
          cursor: "pointer",
          zIndex: 20,
          width: 32,
          height: 32,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          color: "var(--pink-primary)",
          fontWeight: "bold",
          fontFamily: "Helvetica, sans-serif",
        }}
        aria-label="Info"
      >
        ⓘ
      </button>

      {/* Info popup */}
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

      {/* Fun fact card */}
      {funFactBlockId && funFacts[funFactBlockId] && (
        <div
          onClick={() => setFunFactBlockId(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 90,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.25)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 336,
              minHeight: 282,
              background: "#ffffff",
              borderLeft: "6px solid var(--pink-primary)",
              borderBottom: "6px solid var(--pink-primary)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "flex-start",
                padding: "10px 12px 8px",
              }}
            >
              <button
                onClick={() => setFunFactBlockId(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 18,
                  color: "#000000",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ height: 1, background: "#000", marginBottom: 16 }} />
            <div
              style={{
                padding: "0 20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <p
                style={{
                  fontFamily: "'Fredoka', sans-serif",
                  fontWeight: 400,
                  fontSize: 32,
                  lineHeight: "100%",
                  letterSpacing: 0,
                  textAlign: "center",
                  textTransform: "uppercase",
                  color: "var(--pink-primary)",
                  margin: 0,
                  whiteSpace: "pre-line",
                }}
              >
                {`FUN FACT\nABOUT THE\nLANDMARK`}
              </p>
              <p
                style={{
                  fontFamily: "Helvetica, Arial, sans-serif",
                  fontSize: 14,
                  lineHeight: "1.5",
                  color: "var(--midnight-blue)",
                  margin: 0,
                  textAlign: "center",
                }}
              >
                {funFacts[funFactBlockId]}
              </p>
            </div>
          </div>
        </div>
      )}

      {/*
        ── Full-screen game area below navbar.
           The background image fills 100% and its own white strip
           at the bottom is where the carousel lives.
      ──*/}
      <div
        style={{
          position: "absolute",
          top: 56, // navbar height
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        {/* Placed block overlays — % relative to this container */}
        {BLOCKS.map((block) =>
          placedBlocks.has(block.id) ? (
            <img
              key={block.id}
              src={block.image}
              alt={block.label}
              draggable={false}
              style={{
                position: "absolute",
                top: block.dropZone.top,
                left: block.dropZone.left,
                width: block.dropZone.width,
                height: block.dropZone.height,
                objectFit: "fill",
                pointerEvents: "none",
                zIndex: block.dropZone.zIndex,
              }}
            />
          ) : null,
        )}

        {/* Drop zones */}
        {BLOCKS.map((block) =>
          !placedBlocks.has(block.id) ? (
            <div
              key={block.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, block.id)}
              style={{
                position: "absolute",
                top: block.dropZone.top,
                left: block.dropZone.left,
                width: block.dropZone.width,
                height: block.dropZone.height,
                zIndex: block.dropZone.zIndex,
                // background: "rgba(255,0,0,0.2)", // uncomment to debug
              }}
            />
          ) : null,
        )}

        {/*
          ── Carousel sits inside the white strip at the bottom of the bg image.
             "bottom: 2%" places it just above the very bottom edge — adjust
             this value once you see where the white strip sits on your image.
        ──*/}
        <div
          style={{
            position: "absolute",
            top: "80%",
            left: "2%",
            right: "2%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            zIndex: 10,
            padding: "0 32px",
          }}
        >
          {/* Prev arrow */}
          <button
            onClick={() =>
              canPrev && setCarouselIndex(carouselIndex - VISIBLE_COUNT)
            }
            style={{
              background: "none",
              border: "none",
              cursor: canPrev ? "pointer" : "default",
              color: canPrev ? "#000000" : "rgba(27,31,59,0.2)",
              fontSize: 44,
              lineHeight: 1,
              padding: "0 4px",
              flexShrink: 0,
            }}
          >
            ‹
          </button>

          {/* 3 visible blocks */}
          <div
            style={{
              display: "flex",
              gap: 28,
              alignItems: "center",
              flex: 1,
              justifyContent: "center",
            }}
          >
            {visibleBlocks.map((block) => {
              const isPlaced = placedBlocks.has(block.id);
              return (
                <div
                  key={block.id}
                  draggable={!isPlaced}
                  onDragStart={(e) => !isPlaced && handleDragStart(e, block.id)}
                  onDragEnd={handleDragEnd}
                  className={draggingId === block.id ? "dragging" : ""}
                  style={{
                    cursor: isPlaced ? "default" : "grab",
                    transition: "filter 0.3s",
                    userSelect: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={block.image}
                    alt={block.label}
                    draggable={false}
                    style={{
                      maxWidth:
                        block.id === "block4" || block.id === "block5"
                          ? 250
                          : block.id === "block2"
                            ? 550
                            : 350,
                      height:
                        block.id === "block4" || block.id === "block5"
                          ? "100px"
                          : "150px",
                      objectFit: "contain",
                      // Turn black (silhouette) when placed
                      filter: isPlaced ? "brightness(0)" : "none",
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Next arrow */}
          <button
            onClick={() =>
              canNext && setCarouselIndex(carouselIndex + VISIBLE_COUNT)
            }
            style={{
              background: "none",
              border: "none",
              cursor: canNext ? "pointer" : "default",
              color: canNext ? "#000000" : "rgba(27,31,59,0.2)",
              fontSize: 44,
              lineHeight: 1,
              padding: "0 4px",
              flexShrink: 0,
            }}
          >
            ›
          </button>
        </div>
        <style>{`.dragging { opacity: 1 !important; }`}</style>
      </div>
    </div>
  );
}
