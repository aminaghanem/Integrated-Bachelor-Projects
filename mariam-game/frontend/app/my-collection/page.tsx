"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface LayoutElement {
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  category?: string;
}

interface Postcard {
  _id: string;
  backgroundName?: string;
  jsonLayout?: LayoutElement[];
  countryName?: string;
  postcardText?: string;
}

interface ProgressEntry {
  countryId: { name: string };
  hasStamp: boolean;
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

// Grid card dimensions — all cards same size
const CARD_W = 335;
const CARD_H = 186;
const FRAME_SIZE = 16; // visible frame thickness around card
const TOTAL_SLOTS = 6;

// Same filter map as postcard studio so frames render identically
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
// HELPERS
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

// ─────────────────────────────────────────────
// POSTCARD MINI RENDERER
// Renders a saved postcard at small scale inside the grid slot
// ─────────────────────────────────────────────

// The studio uses CARD_W=981, CARD_H=572 — we scale down to grid size
const STUDIO_W = 981;
const STUDIO_H = 572;
const SCALE_X = CARD_W / STUDIO_W;
const SCALE_Y = CARD_H / STUDIO_H;

function PostcardMini({ postcard }: { postcard: Postcard }) {
  const frameColor =
    postcard.backgroundName && postcard.backgroundName !== "none"
      ? postcard.backgroundName
      : null;

  const layout: LayoutElement[] = postcard.jsonLayout ?? [];

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      {/* Frame behind card */}
      {frameColor && (
        <img
          src="/postcard/frame.png"
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            top: -FRAME_SIZE,
            left: -FRAME_SIZE,
            width: CARD_W + FRAME_SIZE * 2,
            height: CARD_H + FRAME_SIZE * 2,
            objectFit: "fill",
            zIndex: 0,
            filter: getFrameFilter(frameColor),
            pointerEvents: "none",
          }}
        />
      )}

      {/* White card */}
      <div
        style={{
          position: "relative",
          width: CARD_W,
          height: CARD_H,
          background: "#ffffff",
          overflow: "hidden",
          zIndex: 1,
        }}
      >
        {/* Scale down each placed element proportionally */}
        {layout.map((el, i) => (
          <img
            key={i}
            src={el.src}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              left: el.x * SCALE_X,
              top: el.y * SCALE_Y,
              width: el.width * SCALE_X,
              height: el.height * SCALE_Y,
              objectFit: "contain",
              pointerEvents: "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// EMPTY SLOT
// ─────────────────────────────────────────────

function EmptySlot() {
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      {/* White frame */}
      <img
        src="/postcard/frame.png"
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          top: -FRAME_SIZE,
          left: -FRAME_SIZE,
          width: CARD_W + FRAME_SIZE * 2,
          height: CARD_H + FRAME_SIZE * 2,
          objectFit: "fill",
          zIndex: 0,
          filter: getFrameFilter("#FFFFFF"), // 👈 white frame
          pointerEvents: "none",
        }}
      />

      {/* Empty card */}
      <div
        style={{
          position: "relative",
          width: CARD_W,
          height: CARD_H,
          background: "#ffffff",
          overflow: "hidden",
          zIndex: 1,
          border: "3px dashed rgba(255,255,255,0.4)",
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

export default function PostcardCollectionPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [postcards, setPostcards] = useState<Postcard[]>([]);
  const [stampedCountry, setStampedCountry] = useState<string | null>(null);
  const [hasAnyStamp, setHasAnyStamp] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setLoading(false);
          return;
        }

        const decoded = decodeJWT(token);
        const userId = decoded?.id;
        if (!userId) {
          setLoading(false);
          return;
        }

        // ── Fetch postcards ──
        const postcardsRes = await fetch(
          `http://localhost:5000/api/postcards/user/${userId}`,
        );
        const postcardsData = await postcardsRes.json();
        setPostcards(Array.isArray(postcardsData) ? postcardsData : []);

        // ── Fetch progress to find stamped countries ──
        const progressRes = await fetch(
          `http://localhost:5000/api/progress/user/${userId}`,
        );
        const progressData: ProgressEntry[] = await progressRes.json();

        if (Array.isArray(progressData)) {
          const stamped = progressData.filter((p) => p.hasStamp);
          setHasAnyStamp(stamped.length > 0);
          if (stamped.length > 0) {
            setStampedCountry(stamped[0].countryId?.name ?? null);
          }
        }
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ─────────────────────────────────────────
  // SHARED STYLES
  // ─────────────────────────────────────────
  const pageBase: React.CSSProperties = {
    background: "var(--midnight-blue)",
    width: "100%",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  };

  const centered: React.CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  };

  const btnStyle: React.CSSProperties = {
    width: 262,
    height: 48,
    background: "#ffffff",
    border: "1px solid #000000",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.1s ease, box-shadow 0.1s ease",
    marginTop: 8,
  };

  const sharedStyles = `
    .postcard-btn:hover {
      transform: translate(-2px, -2px);
      box-shadow: 4px 4px 0px var(--pink-primary);
    }
  `;

  // ─────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────
  if (loading) {
    return (
      <div style={pageBase}>
        <Navbar />
        <div style={centered}>
          <span
            style={{
              color: "#fff",
              fontFamily: "var(--font-gafiton), sans-serif",
              fontSize: 24,
            }}
          >
            Loading...
          </span>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────
  // STATE 1 — HAS POSTCARDS
  // ─────────────────────────────────────────
  if (postcards.length > 0) {
    // Build 6-slot array: fill with real postcards, rest are null (empty slots)
    const slots: (Postcard | null)[] = [
      ...postcards.slice(0, TOTAL_SLOTS),
      ...Array(Math.max(0, TOTAL_SLOTS - postcards.length)).fill(null),
    ];
    return (
      <div style={pageBase}>
        <Navbar />

        <div
          style={{
            flex: 1,
            maxWidth: 1440,
            width: "100%",
            margin: "0 auto",
            padding: "40px 56px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginTop: 60,
          }}
        >
          {/* Title */}
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
            Welcome To Your Postcard Collection
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontFamily: "var(--font-gafiton), sans-serif",
              fontWeight: 400,
              fontSize: 20,
              lineHeight: "106%",
              letterSpacing: 0,
              color: "#ffffff",
              margin: 0,
            }}
          >
            Add more POSTCARDS and show the world what you have explored
          </p>

          {/* ── Postcard grid — 3 columns × 2 rows ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, auto)",
              gap: 32,
              marginTop: 52,
            }}
          >
            {slots.map((postcard, i) => (
              <div
                key={i}
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
              >
                {/* Country label — only for filled cards */}
                <div
                  style={{
                    height: 36, // 👈 fixed height so all cards align
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: CARD_W + FRAME_SIZE * 2,
                  }}
                >
                  {postcard && (
                    <span
                      style={{
                        fontFamily: "var(--font-gafiton), sans-serif",
                        fontWeight: 400,
                        fontSize: 24,
                        letterSpacing: "0%",
                        textTransform: "uppercase",
                        color: "#ffffff",
                        textAlign: "center",
                        width: "100%",
                      }}
                    >
                      {postcard.postcardText ?? "MY POSTCARD"}
                    </span>
                  )}
                </div>

                {/* Card — not clickable */}
                <div
                  style={{
                    cursor: "default",
                    // Extra padding to accommodate frame overhang
                    padding: FRAME_SIZE,
                  }}
                >
                  {postcard ? (
                    <PostcardMini postcard={postcard} />
                  ) : (
                    <EmptySlot />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Make a Postcard button */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "auto",
              paddingTop: 48,
            }}
          >
            <button
              onClick={() => router.push("/my-collection/postcard-studio")}
              className="postcard-btn"
              style={btnStyle}
            >
              <span className="subtitle_v2" style={{ color: "#000000" }}>
                MAKE A POSTCARD
              </span>
            </button>
          </div>
        </div>

        <style>{sharedStyles}</style>
      </div>
    );
  }

  // ─────────────────────────────────────────
  // STATE 2 — NO POSTCARDS, HAS STAMPS
  // ─────────────────────────────────────────
  if (hasAnyStamp && stampedCountry) {
    return (
      <div style={pageBase}>
        <Navbar />

        <div style={centered}>
          {/* Title */}
          <h1
            style={{
              fontFamily: "var(--font-gafiton), sans-serif",
              fontWeight: 400,
              fontSize: 72,
              lineHeight: "100%",
              letterSpacing: 0,
              textAlign: "center",
              textTransform: "capitalize",
              color: "var(--pink-primary)",
              margin: 0,
              marginTop: 90,
            }}
          >
            Oops, No Postcards Yet
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontFamily: "var(--font-gafiton), sans-serif",
              fontWeight: 400,
              fontSize: 48,
              lineHeight: "100%",
              letterSpacing: 0,
              textAlign: "center",
              textTransform: "capitalize",
              color: "#ffffff",
              margin: 0,
              marginBottom: 32,
            }}
          >
            Customize Your Own Now
          </p>

          {/* Visited country hint */}
          <p
            style={{
              fontFamily: "var(--font-gafiton), sans-serif",
              fontWeight: 400,
              fontSize: 18,
              lineHeight: "106%",
              letterSpacing: 0,
              textAlign: "center",
              color: "#ffffff",
              margin: 0,
              marginTop: 16,
              marginBottom: 16,
              width: "260px",
            }}
          >
            You just visited{" "}
            <span style={{ textTransform: "uppercase" }}>{stampedCountry}</span>
            , let's start there!
          </p>

          {/* Country stamp image */}
          <img
            src={`/countries/${stampedCountry.toLowerCase()}/stamp.png`}
            alt={`${stampedCountry} stamp`}
            draggable={false}
            style={{
              width: 220,
              height: 220,
              objectFit: "contain",
              marginBottom: 8,
            }}
          />

          {/* Make a Postcard button */}
          <button
            onClick={() => router.push("/my-collection/postcard-studio")}
            className="postcard-btn"
            style={btnStyle}
          >
            <span className="subtitle_v2" style={{ color: "#000000" }}>
              MAKE A POSTCARD
            </span>
          </button>
        </div>

        <style>{sharedStyles}</style>
      </div>
    );
  }

  // ─────────────────────────────────────────
  // STATE 3 — NO POSTCARDS, NO STAMPS
  // ─────────────────────────────────────────
  return (
    <div style={pageBase}>
      <Navbar />

      <div style={centered}>
        {/* Title */}
        <h1
          style={{
            fontFamily: "var(--font-gafiton), sans-serif",
            fontWeight: 400,
            fontSize: 72,
            lineHeight: "100%",
            letterSpacing: 0,
            textAlign: "center",
            textTransform: "capitalize",
            color: "var(--pink-primary)",
            margin: 0,
            marginTop: 90,
          }}
        >
          Oops, No Postcards Yet
        </h1>

        {/* No visits message */}
        <p
          style={{
            fontFamily: "var(--font-gafiton), sans-serif",
            fontWeight: 400,
            fontSize: 18,
            lineHeight: "106%",
            letterSpacing: 0,
            textAlign: "center",
            color: "#ffffff",
            margin: 0,
            marginTop: 32,
            width: "350px",
          }}
        >
          You still haven't collected any stamps. Explore the world and collect
          stamps to create your first postcard!
        </p>

        {/* Sad globe image */}
        <img
          src="/quiz/sad-globe.png"
          alt="No countries visited yet"
          draggable={false}
          style={{ width: 247, height: 247, objectFit: "contain" }}
        />

        {/* Explore button */}
        <button
          onClick={() => router.push("/map")}
          className="postcard-btn"
          style={btnStyle}
        >
          <span className="subtitle_v2" style={{ color: "#000000" }}>
            EXPLORE
          </span>
        </button>
      </div>

      <style>{sharedStyles}</style>
    </div>
  );
}
