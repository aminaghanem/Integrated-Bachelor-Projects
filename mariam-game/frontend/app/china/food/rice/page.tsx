"use client";

import { useState, useRef, useEffect } from "react";
import Navbar from "@/app/components/Navbar";
import Image from "next/image";

// ─────────────────────────────────────────────
// CONFIGURATION — swap image paths to your assets
// ─────────────────────────────────────────────

// Bowl states: index 0 = empty bowl, index 1 = after 1st ingredient, … index N = final
const BOWL_STATES = [
  "/countries/china/food/friedrice/bowl_0_empty.png",
  "/countries/china/food/friedrice/bowl_1_soysauce.png",
  "/countries/china/food/friedrice/bowl_2_rice.png",
  "/countries/china/food/friedrice/bowl_3_shrimp.png",
  "/countries/china/food/friedrice/bowl_4_carrots.png",
  "/countries/china/food/friedrice/bowl_5_egg.png",
  "/countries/china/food/friedrice/bowl_6_greenonions.png",
  "/countries/china/food/friedrice/bowl_7_corn.png",
  "/countries/china/food/friedrice/bowl_8_parsley.png", //final bowl
];

// Info popup card image
const INFO_CARD_IMAGE = "/infocards/info_card_food.png";

// Background image
const BG_IMAGE = "/foodgame_background.png";

// Ingredients in the REQUIRED ORDER (this is the recipe order)
const INGREDIENTS = [
  {
    id: "soysauce",
    label: "SOY SAUCE",
    image: "/countries/china/food/friedrice/ing_soysauce.png",
  },
  {
    id: "rice",
    label: "RICE",
    image: "/countries/china/food/friedrice/ing_rice.png",
  },
  {
    id: "shrimp",
    label: "SHRIMPS",
    image: "/countries/china/food/friedrice/ing_shrimp.png",
  },
  {
    id: "carrots",
    label: "CARROTS",
    image: "/countries/china/food/friedrice/ing_carrots.png",
  },
  {
    id: "boiledegg",
    label: "BOILED EGGS",
    image: "/countries/china/food/friedrice/ing_boiledegg.png",
  },

  {
    id: "greenonion",
    label: "GREEN ONIONS",
    image: "/countries/china/food/friedrice/ing_greenonion.png",
  },

  {
    id: "corn",
    label: "CORN",
    image: "/countries/china/food/friedrice/ing_corn.png",
  },
  {
    id: "parsley",
    label: "PARSLEY",
    image: "/countries/china/food/friedrice/ing_parsley.png",
  },
];

// Layout positions for the 9 ingredients around the bowl
// Matches the Figma: 3 on the left column, 3 on the right column (top + bottom rows)
// Positions are absolute within the game area (1120×630 reference frame)
// Left side: SOY SAUCE, BOILED EGGS, CORN, PARSLEY (bottom-left area)
// Right side: SHRIMP, GREEN ONIONS, CARROTS (right side)
// Adjust these pixel values to fine-tune placement
const INGREDIENT_LAYOUT: Record<
  string,
  { top: number; left?: number; right?: number }
> = {
  rice: { top: 540, right: 110 },
  boiledegg: { top: 320, left: 30 },
  soysauce: { top: 240, left: -170 },
  shrimp: { top: 350, right: 60 },
  greenonion: { top: 330, right: -190 },
  carrots: { top: 500, right: -150 },
  corn: { top: 470, left: -160 },
  parsley: { top: 490, left: 60 },
};

// ─────────────────────────────────────────────

export default function FriedRice() {
  const [step, setStep] = useState(0); // how many ingredients correctly added
  const [shaking, setShaking] = useState<string | null>(null); // id of ingredient shaking
  const [showInfo, setShowInfo] = useState(false);
  const [done, setDone] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const bowlRef = useRef<HTMLDivElement>(null);

  const totalIngredients = INGREDIENTS.length;
  const isCompleted = step >= totalIngredients;

  // ── Drag & Drop handlers ──────────────────

  const handleDragStart = (e: React.DragEvent, id: string) => {
    // Only allow dragging ingredients not yet added
    const ingredientIndex = INGREDIENTS.findIndex((i) => i.id === id);
    if (ingredientIndex < step) return; // already added
    e.dataTransfer.setData("ingredientId", id);
    setDraggingId(id);
  };

  const handleDragEnd = () => setDraggingId(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // allow drop
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("ingredientId");
    if (!id) return;

    const expectedId = INGREDIENTS[step]?.id;

    if (id === expectedId) {
      // ✅ Correct ingredient
      const newStep = step + 1;
      setStep(newStep);
      if (newStep >= totalIngredients) {
        setTimeout(() => setDone(true), 600);
      }
    } else {
      // ❌ Wrong ingredient — shake it
      setShaking(id);
      setTimeout(() => setShaking(null), 600);
    }
    setDraggingId(null);
  };

  // ── Render ────────────────────────────────

  if (done) {
    return <CongratulationsScreen bowlImage={BOWL_STATES[totalIngredients]} />;
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        // height: "100vh",
        // overflow: "hidden",
        minHeight: "100vh",
        overflow: "auto",
      }}
    >
      <Navbar />
      {/* Background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${BG_IMAGE})`,
          // backgroundSize: "auto 100%",
          backgroundSize: "cover",
          backgroundPosition: " center",
        }}
      />

      {/* Game area — relative container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* ── Info button ─────────────── */}
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
            zIndex: 10,
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            color: "var(--blue-primary)",
            fontWeight: "bold",
            fontFamily: "Helvetica, sans-serif",
          }}
          aria-label="Info"
        >
          ⓘ
        </button>

        {/* ── Info popup overlay ───────── */}
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

        {/* ── Ingredients + Bowl Layout ── */}
        <div
          style={{
            position: "relative",
            width: "min(90vw, 900px)",
            height: "min(80vh, 540px)",
          }}
        >
          {/* Ingredients */}
          {INGREDIENTS.map((ing, idx) => {
            const alreadyAdded = idx < step;
            const pos = INGREDIENT_LAYOUT[ing.id];
            const isShaking = shaking === ing.id;
            const isDragging = draggingId === ing.id;

            return (
              <div
                key={ing.id}
                draggable={!alreadyAdded}
                onDragStart={(e) => handleDragStart(e, ing.id)}
                onDragEnd={handleDragEnd}
                style={{
                  position: "absolute",
                  top: pos.top,
                  ...(pos.left !== undefined ? { left: pos.left } : {}),
                  ...(pos.right !== undefined ? { right: pos.right } : {}),
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap:
                    ing.id === "soysauce"
                      ? 80
                      : ing.id === "boiledegg" || ing.id === "shrimp"
                        ? 40
                        : 12,
                  opacity: alreadyAdded ? 0 : 1,
                  transition: "opacity 0.3s",
                  cursor: alreadyAdded ? "default" : "grab",
                  userSelect: "none",
                  animation: isShaking ? "shake 0.5s ease" : "none",
                  zIndex: 5,
                }}
              >
                <img
                  src={ing.image}
                  alt={ing.label}
                  draggable={false}
                  style={{
                    width: 72,
                    height: 72,
                    objectFit: "contain",
                    transform:
                      ing.id === "soysauce"
                        ? `scale(3.0) rotate(${draggingId === "soysauce" ? 90 : 0}deg)`
                        : ing.id === "boiledegg"
                          ? "scale(1.8)"
                          : "scale(2.0)",
                  }}
                />
                <span
                  style={{
                    fontFamily: "'Fredoka', sans-serif", // replace with Gafiton when available
                    fontWeight: 400,
                    fontSize: 20,
                    lineHeight: "100%",
                    letterSpacing: "0.02em",
                    textAlign: "center",
                    textTransform: "uppercase",
                    color: "#ffffff",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ing.label}
                </span>
              </div>
            );
          })}

          {/* Bowl drop zone — centered */}
          <div
            ref={bowlRef}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{
              position: "absolute",
              top: "85%",
              left: "50%",
              transform: "translate(-50%, -50%) scale(1.5)",
              width: 260,
              height: 220,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 4,
            }}
          >
            <img
              src={BOWL_STATES[step]}
              alt="Bowl"
              draggable={false}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                transition: "opacity 0.3s",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>
        {/* AI character hint — shows next ingredient */}
        {!done && step < totalIngredients && (
          <div className="ai-hint">
            <Image
              src="/ai-character.png"
              alt="AI Guide"
              width={100}
              height={130}
              className="ai-hint-character"
            />
            <div className="ai-hint-bubble">
              <p className="ai-hint-text">
                Next up: <strong>{INGREDIENTS[step].label}</strong> 🍳
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Shake keyframes + continue button hover */}
      <style>{`
        @keyframes shake {
          0%   { transform: translateX(0); }
          20%  { transform: translateX(-8px); }
          40%  { transform: translateX(8px); }
          60%  { transform: translateX(-6px); }
          80%  { transform: translateX(6px); }
          100% { transform: translateX(0); }
        }
          .ai-hint {
  position: absolute;
  top: 70px;
  left: 24px;
  display: flex;
  align-items: flex-start;
  gap: 1px;
  z-index: 10;
  pointer-events: none;
}

.ai-hint-character {
  width: 100px;
  height: auto;
  flex-shrink: 0;
}

.ai-hint-bubble {
  position: relative;
  background: var(--yellow-primary);
  border: 2px solid #000;
  padding: 10px 14px;
  max-width: 220px;
  border-radius: 4px;
  margin-top: 20px;
}

.ai-hint-bubble::before {
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

.ai-hint-bubble::after {
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

.ai-hint-text {
  font-family: var(--font-gafiton), sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: #000;
  margin: 0;
  text-align: center;
}
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────
// Congratulations Screen
// ─────────────────────────────────────────────

function CongratulationsScreen({ bowlImage }: { bowlImage: string }) {
  const [allCategoriesCompleted, setAllCategoriesCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Simple JWT decode function
  const decodeJWT = (token: string) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join(""),
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("Error decoding JWT:", error);
      return null;
    }
  };

  useEffect(() => {
    const updateProgress = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("No token found");
          setLoading(false);
          return;
        }

        const decoded = decodeJWT(token);
        if (!decoded || !decoded.id) {
          console.error("Invalid token");
          setLoading(false);
          return;
        }

        const userId = decoded.id;

        // Get China country ID
        const countryRes = await fetch(
          "http://localhost:5000/api/countries/china",
        );
        const countryData = await countryRes.json();
        const countryId = countryData._id;

        // Initialize progress if it doesn't exist
        await fetch("http://localhost:5000/api/progress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId, countryId }),
        });

        // Complete the food category
        await fetch(
          `http://localhost:5000/api/progress/user/${userId}/country/${countryId}/category`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ category: "food" }),
          },
        );

        // Get current progress to check completion
        const progressRes = await fetch(
          `http://localhost:5000/api/progress/user/${userId}/country/${countryId}`,
        );
        const progressData = await progressRes.json();

        // Check if all categories are completed
        const requiredCategories = ["food", "festival", "landmark"];
        const completedCategories = progressData.completedCategories || [];
        const allCompleted = requiredCategories.every((cat) =>
          completedCategories.includes(cat),
        );

        setAllCategoriesCompleted(allCompleted);
      } catch (error) {
        console.error("Error updating progress:", error);
      } finally {
        setLoading(false);
      }
    };

    updateProgress();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100vh",
          overflow: "hidden",
          backgroundImage: `url(/foodgame_background.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Navbar />

        <span
          style={{
            fontFamily: "'Fredoka', sans-serif",
            fontWeight: 400,
            fontSize: 24,
            color: "var(--yellow-primary)",
          }}
        >
          Loading...
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        backgroundImage: `url(/foodgame_background.png)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 15,
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
      <style>{`
        .continue-button:hover {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0px var(--yellow-primary);
        }
      `}</style>
      {/* Congratulations */}
      <span
        style={{
          fontFamily: "'Fredoka', sans-serif", // replace with Gafiton
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

      {/* Subtitle */}
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
            : "var(--white-neutral)",
        }}
      >
        {allCategoriesCompleted ? (
          <>
            ARE YOU READY TO TAKE A
            <br />
            QUIZ ABOUT CHINA?
          </>
        ) : (
          <>
            ARE YOU READY FOR YOUR
            <br />
            NEXT ADVENTURE?
          </>
        )}
      </span>

      {/* Final bowl */}
      <img
        src={bowlImage}
        alt="Completed dish"
        style={{ width: 470, height: 280, objectFit: "contain", marginTop: 8 }}
      />

      {/* Continue button */}
      <button
        onClick={() => {
          if (allCategoriesCompleted) {
            window.location.href = "/quiz/china";
          } else {
            window.location.href = "/china";
          }
        }}
        className="continue-button"
        style={{
          background: "#ffffff",
          color: "var(--black-neutral)",
          border: "3px solid var(--black-neutral)",
          marginTop: 16,
          padding: "12px 52px",
          fontFamily: "Helvetica,Arial,sans-serif",
          fontWeight: 400,
          fontSize: 20,
          letterSpacing: "5%",
          textTransform: "uppercase",
          cursor: "pointer",
          transition: "transform 0.1s ease, box-shadow 0.1s ease",
        }}
      >
        {allCategoriesCompleted ? "READY!" : "CONTINUE"}
      </button>
    </div>
  );
}
