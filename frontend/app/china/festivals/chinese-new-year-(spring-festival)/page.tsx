"use client";

import { useState, useEffect } from "react";
import Navbar from "@/app/components/Navbar";

// ─────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────

// 22 scene images: scene_0 = empty base, scene_1–scene_21 = one per placement step
// The order of scenes matches the EXACT order zones are listed below
const SCENE_IMAGES = [
  "/countries/china/festivals/cny/scene_0.png", // empty
  "/countries/china/festivals/cny/scene_1.png", // after block1_0  (lion dance)
  "/countries/china/festivals/cny/scene_2.png", // after block2_0  (lantern 1)
  "/countries/china/festivals/cny/scene_3.png", // after block2_1  (lantern 2)
  "/countries/china/festivals/cny/scene_4.png", // after block2_2  (lantern 3)
  "/countries/china/festivals/cny/scene_5.png", // after block2_3  (lantern 4)
  "/countries/china/festivals/cny/scene_6.png", // after block3_0  (gold coin 1)
  "/countries/china/festivals/cny/scene_7.png", // after block3_1  (gold coin 2)
  "/countries/china/festivals/cny/scene_8.png", // after block4_0  (red envelope 1)
  "/countries/china/festivals/cny/scene_9.png", // after block4_1  (red envelope 2)
  "/countries/china/festivals/cny/scene_10.png", // after block5_0  (firecracker 1)
  "/countries/china/festivals/cny/scene_11.png", // after block5_1  (firecracker 2)
  "/countries/china/festivals/cny/scene_12.png", // after block6_0  (dumpling 1)
  "/countries/china/festivals/cny/scene_13.png", // after block6_1  (dumpling 2)
  "/countries/china/festivals/cny/scene_14.png", // after block7_0  (tangyuan 1)
  "/countries/china/festivals/cny/scene_15.png", // after block7_1  (tangyuan 2)
  "/countries/china/festivals/cny/scene_16.png", // after block8_0  (tangerine 1)
  "/countries/china/festivals/cny/scene_17.png", // after block8_1  (tangerine 2)
  "/countries/china/festivals/cny/scene_18.png", // after block9_0  (star 1)
  "/countries/china/festivals/cny/scene_19.png", // after block9_1  (star 2)
  "/countries/china/festivals/cny/scene_20.png", // after block10_0 (dragon 1)
  "/countries/china/festivals/cny/scene_21.png", // after block10_1 (dragon 2) — FINAL
];

const INFO_CARD_IMAGE = "/infocards/info_card_festival.png";

const FESTIVAL_DESCRIPTION =
  "Chinese New Year is the biggest celebration of the year! Families clean their homes, hang red decorations, eat special meals, and watch dragon dances to welcome a fresh start and lots of good luck.";

// ── ORDERED flat list of all zones ────────────────────────────────────────
// The index in this array = the step number (0-based).
// A zone is only droppable when its index === current step.
// Total: 1+4+2+2+2+2+2+2+2+2 = 21 zones → steps 0–20

const ORDERED_ZONES = [
  // block1 — 1 zone
  {
    zoneId: "block1_0",
    blockId: "block1",
    top: "8%",
    left: "40%",
    width: "21%",
    height: "32%",
  },

  // block2 — 4 zones
  {
    zoneId: "block2_0",
    blockId: "block2",
    top: "4%",
    left: "28.5%",
    width: "6%",
    height: "20%",
  },
  {
    zoneId: "block2_1",
    blockId: "block2",
    top: "6%",
    left: "41%",
    width: "3%",
    height: "10%",
  },
  {
    zoneId: "block2_2",
    blockId: "block2",
    top: "4%",
    left: "56%",
    width: "6%",
    height: "20%",
  },
  {
    zoneId: "block2_3",
    blockId: "block2",
    top: "5%",
    left: "69.5%",
    width: "3%",
    height: "10%",
  },

  // block3 — 2 zones
  {
    zoneId: "block3_0",
    blockId: "block3",
    top: "77%",
    left: "24%",
    width: "9%",
    height: "16%",
  },
  {
    zoneId: "block3_1",
    blockId: "block3",
    top: "77%",
    left: "67%",
    width: "8%",
    height: "16%",
  },

  // block4 — 2 zones
  {
    zoneId: "block4_0",
    blockId: "block4",
    top: "70%",
    left: "39.5%",
    width: "8%",
    height: "14%",
  },
  {
    zoneId: "block4_1",
    blockId: "block4",
    top: "70%",
    left: "55%",
    width: "8%",
    height: "14%",
  },

  // block5 — 2 zones
  {
    zoneId: "block5_0",
    blockId: "block5",
    top: "20%",
    left: "58%",
    width: "22%",
    height: "30%",
  },
  {
    zoneId: "block5_1",
    blockId: "block5",
    top: "20%",
    left: "20%",
    width: "22%",
    height: "30%",
  },

  // block6 — 2 zones
  {
    zoneId: "block6_0",
    blockId: "block6",
    top: "63%",
    left: "61%",
    width: "6%",
    height: "16%",
  },
  {
    zoneId: "block6_1",
    blockId: "block6",
    top: "60%",
    left: "37%",
    width: "6%",
    height: "16%",
  },

  // block7 — 2 zones
  {
    zoneId: "block7_0",
    blockId: "block7",
    top: "55%",
    left: "54%",
    width: "6%",
    height: "16%",
  },
  {
    zoneId: "block7_1",
    blockId: "block7",
    top: "69%",
    left: "34.5%",
    width: "6%",
    height: "16%",
  },

  // block8 — 2 zones
  {
    zoneId: "block8_0",
    blockId: "block8",
    top: "60%",
    left: "42%",
    width: "6%",
    height: "13%",
  },
  {
    zoneId: "block8_1",
    blockId: "block8",
    top: "72%",
    left: "45.5%",
    width: "6%",
    height: "13%",
  },

  // block9 — 2 zones
  {
    zoneId: "block9_0",
    blockId: "block9",
    top: "60%",
    left: "48%",
    width: "6%",
    height: "12%",
  },
  {
    zoneId: "block9_1",
    blockId: "block9",
    top: "72%",
    left: "50.5%",
    width: "6%",
    height: "12%",
  },

  // block10 — 2 zones
  {
    zoneId: "block10_0",
    blockId: "block10",
    top: "3%",
    left: "23%",
    width: "6%",
    height: "8%",
  },
  {
    zoneId: "block10_1",
    blockId: "block10",
    top: "12%",
    left: "72%",
    width: "7%",
    height: "17%",
  },
];

const TOTAL_ZONES = ORDERED_ZONES.length; // 21

// Carousel block definitions (just for display)
const BLOCKS = [
  {
    id: "block1",
    image: "/countries/china/festivals/cny/block_1.png",
  },
  {
    id: "block2",
    image: "/countries/china/festivals/cny/block_2.png",
  },
  {
    id: "block3",
    image: "/countries/china/festivals/cny/block_3.png",
  },
  {
    id: "block4",
    image: "/countries/china/festivals/cny/block_4.png",
  },
  {
    id: "block5",
    image: "/countries/china/festivals/cny/block_5.png",
  },
  {
    id: "block6",
    image: "/countries/china/festivals/cny/block_6.png",
  },
  {
    id: "block7",
    image: "/countries/china/festivals/cny/block_7.png",
  },
  {
    id: "block8",
    image: "/countries/china/festivals/cny/block_8.png",
  },
  {
    id: "block9",
    image: "/countries/china/festivals/cny/block_9.png",
  },
  {
    id: "block10",
    image: "/countries/china/festivals/cny/block_10.png",
  },
];

const VISIBLE_COUNT = 6;

// ─────────────────────────────────────────────

export default function ChineseNewYearPage() {
  // step = how many zones have been correctly filled (0–21)
  const [step, setStep] = useState(0);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [funFactBlockId, setFunFactBlockId] = useState<string | null>(null); // block id of last completed block
  const [shaking, setShaking] = useState<string | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [done, setDone] = useState(false);

  const [allCategoriesCompleted, setAllCategoriesCompleted] = useState(false);
  const [progressLoading, setProgressLoading] = useState(false);
  const [funFacts, setFunFacts] = useState<Record<string, string>>({});

  // The next zone that must be filled
  const nextZone = ORDERED_ZONES[step] ?? null;

  useEffect(() => {
    const fetchFunFacts = async () => {
      try {
        const res = await fetch(
          "http://localhost:5000/api/categories/country/China/type/festival",
        );
        const data = await res.json();
        const cny = data.find((item: { name: string; funFacts?: string[] }) =>
          item.name?.toLowerCase().includes("chinese new year"),
        );
        if (cny?.funFacts?.length) {
          const map: Record<string, string> = {};
          BLOCKS.forEach((block, index) => {
            if (cny.funFacts[index]) {
              map[block.id] = cny.funFacts[index];
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

  // Which blockIds have ALL their zones completed
  const isBlockFullyPlaced = (blockId: string) => {
    const blockZones = ORDERED_ZONES.filter((z) => z.blockId === blockId);
    const firstIndex = ORDERED_ZONES.findIndex((z) => z.blockId === blockId);
    const count = blockZones.length;
    // All zones of this block are before current step
    return firstIndex + count <= step;
  };

  // Which blockId is currently the expected one (next zone's blockId)
  const expectedBlockId = nextZone?.blockId ?? null;

  // ── Progress update ───────────────────────
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
          "http://localhost:5000/api/countries/china",
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
            body: JSON.stringify({ category: "festival" }),
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
        // silent
      } finally {
        setProgressLoading(false);
      }
    };
    updateProgress();
  }, [done]);

  // ── Drag handlers ─────────────────────────
  const handleDragStart = (e: React.DragEvent, blockId: string) => {
    e.dataTransfer.setData("blockId", blockId);
    setDraggingId(blockId);
  };

  const handleDragEnd = () => setDraggingId(null);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent, zoneIndex: number) => {
    e.preventDefault();
    const droppedBlockId = e.dataTransfer.getData("blockId");

    if (zoneIndex !== step) return; // not the active zone
    if (droppedBlockId !== ORDERED_ZONES[zoneIndex].blockId) {
      // Wrong block — shake it in the carousel
      setShaking(droppedBlockId);
      setTimeout(() => setShaking(null), 500);
      return;
    }

    const blockId = ORDERED_ZONES[zoneIndex].blockId;
    const blockZoneIndices = ORDERED_ZONES.reduce<number[]>(
      (acc, zone, index) => {
        if (zone.blockId === blockId) acc.push(index);
        return acc;
      },
      [],
    );
    const isLastZoneOfBlock =
      blockZoneIndices[blockZoneIndices.length - 1] === zoneIndex;

    const newStep = step + 1;
    setStep(newStep);
    setFunFactBlockId(isLastZoneOfBlock ? blockId : null);

    if (newStep >= TOTAL_ZONES) {
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
        {/* Corner GIFs */}
        <img
          src="/gifs/firework.gif"
          alt=""
          style={{
            position: "absolute",
            top: 10,
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
            top: 10,
            right: 10,
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

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            zIndex: 5,
            padding: "52px 0 0",
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
              color: "#FFD84D",
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
                ? "var(--yellow-primary"
                : "#ffffff",
              padding: "0 0 40px",
            }}
          >
            {progressLoading ? (
              "..."
            ) : allCategoriesCompleted ? (
              <>
                READY TO TAKE
                <br />A QUIZ ABOUT CHINA?
              </>
            ) : (
              <>
                ARE YOU READY FOR YOUR
                <br />
                NEXT ADVENTURE?
              </>
            )}
          </span>

          {/* Dragon faces + fireworks */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              marginTop: 8,
              marginBottom: 12,
            }}
          >
            <img
              src="/countries/china/festivals/cny/congrats_firework_left.png"
              alt=""
              draggable={false}
              style={{
                width: 120,
                position: "absolute",
                left: 120,
                top: -40,
                pointerEvents: "none",
              }}
            />
            <img
              src="/countries/china/festivals/cny/congrats_dragon_left.png"
              alt=""
              draggable={false}
              style={{
                width: 260,
                pointerEvents: "none",
                transform: "translateX(35px) translateY(30px)",
              }}
            />
            <img
              src="/countries/china/festivals/cny/congrats_dragon_center.png"
              alt=""
              draggable={false}
              style={{
                width: 310,
                marginLeft: -24,
                marginRight: -24,
                pointerEvents: "none",
                zIndex: 4,
              }}
            />
            <img
              src="/countries/china/festivals/cny/congrats_dragon_right.png"
              alt=""
              draggable={false}
              style={{
                width: 260,
                pointerEvents: "none",
                transform: "translateX(-35px) translateY(30px)",
              }}
            />
            <img
              src="/countries/china/festivals/cny/congrats_firework_right.png"
              alt=""
              draggable={false}
              style={{
                width: 120,
                position: "absolute",
                right: 120,
                top: -40,
                pointerEvents: "none",
              }}
            />
          </div>

          <button
            onClick={() => {
              window.location.href = allCategoriesCompleted
                ? "/quiz/china"
                : "/china";
            }}
            className="continue-btn"
            style={{
              background: "#ffffff",
              color: "#1B1F3B",
              border: "3px solid #1B1F3B",
              marginTop: 8,
              padding: "12px 52px",
              fontFamily: "Helvetica, Arial, sans-serif",
              fontWeight: 400,
              fontSize: 20,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "transform 0.1s ease, box-shadow 0.1s ease",
            }}
          >
            {allCategoriesCompleted ? "READY!" : "CONTINUE"}
          </button>
        </div>

        <style>{`
          .continue-btn:hover {
            transform: translate(-2px, -2px);
            box-shadow: 6px 6px 0px #FFD84D;
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
        minHeight: "100vh",
        background: "var(--midnight-blue)",
      }}
    >
      <Navbar />

      {/* ── Header row ── */}
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "85px 12px 0",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <div
          className="header3_v3"
          style={{
            color: "#FFD84D",
          }}
        >
          Chinese New Year
          <br />
          (Spring Festival)
        </div>

        <p
          className="body_v2"
          style={{
            color: "#FFD84D",
            maxWidth: 557,
          }}
        >
          {FESTIVAL_DESCRIPTION}
        </p>

        <button
          onMouseEnter={() => setShowInfo(true)}
          onMouseLeave={() => setShowInfo(false)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            flexShrink: 0,
            fontSize: 22,
            color: "#FFD84D",
            fontWeight: "bold",
            fontFamily: "Helvetica, sans-serif",
          }}
          aria-label="Info"
        >
          ⓘ
        </button>
      </div>

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
      {funFactBlockId !== null && (
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
              borderLeft: "6px solid #FFD84D",
              borderBottom: "6px solid #FFD84D",
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
                  color: "#1B1F3B",
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
                  color: "#FFD84D",
                  margin: 0,
                  whiteSpace: "pre-line",
                }}
              >
                {`FUN FACT\nABOUT THE\nFESTIVAL`}
              </p>
              <p
                style={{
                  fontFamily: "Helvetica, Arial, sans-serif",
                  fontSize: 14,
                  lineHeight: "1.5",
                  color: "#000000",
                  margin: 0,
                  textAlign: "center",
                }}
              >
                {funFacts[funFactBlockId] ?? "Loading fun fact..."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Scene image + drop zones ── */}
      <div
        style={{
          width: "100%",
          height: 500,
          position: "relative",
          overflow: "hidden",
          marginTop: 8,
          transform: "translateY(30px)",
        }}
      >
        {/* Current scene — advances with every correct drop */}
        <img
          src={SCENE_IMAGES[step]}
          alt="Festival scene"
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            display: "block",
          }}
        />

        {/* Only render the ONE active drop zone */}
        {nextZone && (
          <div
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, step)}
            style={{
              position: "absolute",
              top: nextZone.top,
              left: nextZone.left,
              width: nextZone.width,
              height: nextZone.height,
              zIndex: 5,
              background: "rgba(0,0,0,0.2)", // uncomment to debug
            }}
          />
        )}
      </div>

      {/* ── Carousel ── */}
      <div
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: "32px 52px 18px",
        }}
      >
        <button
          onClick={() =>
            canPrev && setCarouselIndex(carouselIndex - VISIBLE_COUNT)
          }
          style={{
            background: "none",
            border: "none",
            cursor: canPrev ? "pointer" : "default",
            color: canPrev ? "var(--yellow-primary)" : "rgba(255,255,255,0.2)",
            fontSize: 44,
            lineHeight: 1,
            padding: "0 4px",
            flexShrink: 0,
          }}
        >
          ‹
        </button>

        <div
          style={{
            display: "flex",
            gap: 45,
            alignItems: "center",
            flex: 1,
            justifyContent: "center",
          }}
        >
          {visibleBlocks.map((block) => {
            const fullyPlaced = isBlockFullyPlaced(block.id);
            const isNext = block.id === expectedBlockId;
            return (
              <div
                key={block.id}
                draggable={isNext}
                onDragStart={(e) => isNext && handleDragStart(e, block.id)}
                onDragEnd={handleDragEnd}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  cursor: isNext ? "grab" : "default",
                  opacity: draggingId === block.id ? 0.4 : 1,
                  transition: "opacity 0.2s, filter 0.3s",
                  userSelect: "none",
                  animation: shaking === block.id ? "shake 0.5s ease" : "none",
                }}
              >
                <img
                  src={block.image}
                  alt={block.id}
                  draggable={false}
                  style={{
                    // width: "9vw",
                    maxWidth: 150,
                    minWidth: 55,
                    height: block.id === "block2" ? 130 : "auto", // lion dance block is taller
                    objectFit: "contain",
                    // fully placed = black, not yet its turn = dimmed, current = full color
                    filter: fullyPlaced
                      ? "brightness(0)"
                      : !isNext
                        ? "brightness(0.4)"
                        : "none",
                  }}
                />
              </div>
            );
          })}
        </div>

        <button
          onClick={() =>
            canNext && setCarouselIndex(carouselIndex + VISIBLE_COUNT)
          }
          style={{
            background: "none",
            border: "none",
            cursor: canNext ? "pointer" : "default",
            color: canNext ? "var(--yellow-primary)" : "rgba(255,255,255,0.2)",
            fontSize: 44,
            lineHeight: 1,
            padding: "0 4px",
            flexShrink: 0,
          }}
        >
          ›
        </button>
      </div>

      <style>{`
        @keyframes shake {
          0%   { transform: translateX(0); }
          20%  { transform: translateX(-8px); }
          40%  { transform: translateX(8px); }
          60%  { transform: translateX(-6px); }
          80%  { transform: translateX(6px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
