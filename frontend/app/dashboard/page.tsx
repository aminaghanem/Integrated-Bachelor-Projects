"use client";
import Image from "next/image";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [firstName, setFirstName] = useState("");
  const [recommendation, setRecommendation] = useState<string>("");

  useEffect(() => {
    const name = localStorage.getItem("firstName");
    if (name) setFirstName(name);
  }, []);

  useEffect(() => {
    const fetchRecommendation = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(
          decodeURIComponent(
            atob(base64)
              .split("")
              .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join(""),
          ),
        );
        const userId = payload?.id;
        if (!userId) return;

        const res = await fetch("http://localhost:5000/api/ai/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        const data = await res.json();
        if (data?.reason) setRecommendation(data.reason);
      } catch {
        // silent fail — recommendation is non-critical
      }
    };
    fetchRecommendation();
  }, []);
  return (
    <>
      <style>{`

        /* ══ SECTION 1 — BLUE GLOBE ══ */
        .dash-globe-section {
          background-color: var(--midnight-blue);
          position: relative;
          width: 100%;
          height: 1024px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding-top: 100px;
          padding-bottom: 60px;
        }

        .globe-img {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: 1440px;
          height: auto;
          z-index: 1;
          pointer-events: none;
        }

        .clouds-img {
          position: absolute;
          top: 128px;
          left: 50%;
          transform: translateX(-50%);
          width: 98%;
          max-width: 1418px;
          height: 809px;
          z-index: 3;
          pointer-events: none;
        }

        .globe-content {
        position: relative;
        z-index: 4;
        width: 100%;
        padding: 0 24px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        max-width: 1200px;
        margin: 0 auto;
        min-height: 500px;
        justify-content: space-between;
}
        .globe-greeting {
          color: var(--yellow-primary);
          text-align: left;
          margin-bottom: 10px;
          margin-top: -50px; 
        }

        .globe-tagline {
          color: var(--yellow-primary);
          text-align: right;
          align-self: flex-end;
          margin-top: 250px;
          z-index: 4;
        }

        @media (max-width: 1024px) {
  .globe-content {
    align-items: center;
    text-align: center;
    min-height: 400px;
  }
  .globe-greeting {
    text-align: center;
    font-size: 40px;
  }
  .globe-tagline {
    text-align: center;
    align-self: center;
    margin-top: 20px;
    font-size: 36px;
  }
}

@media (max-width: 480px) {
  .globe-greeting { font-size: 28px; }
  .globe-tagline  { font-size: 24px; }
  .dash-globe-section { min-height: 400px; padding-top: 80px; }
}

        .explore-btn {
          align-self: center;
          margin-top: 160px;
          display: inline-block;
          background: white;
          color: var(--black-neutral);
          border: 3px solid var(--black-neutral);
          padding: 10px 40px;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.15s;
        }

        .explore-btn:hover {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0px var(--yellow-primary);
        }

        /* ══ FLAGS VIDEO STRIP ══ */
        .flags-strip {
          width: 100%;
          overflow: hidden;
          line-height: 0;
          background: white;
        }

        .flags-strip video {
          width: 100%;
          height: 80px;
          object-fit: cover;
          display: block;
        }

        /* ══ SECTION 2 — NEXT STOP (BLUE) ══ */
        .next-stop-section {
          background-color: var(--midnight-blue);
          padding: 60px 24px 80px;
          position: relative;
          overflow: hidden;
        }

        .next-stop-inner {
          max-width: 1200px;
          margin: 0 auto;
        }

        .next-stop-title {
          color: var(--yellow-primary);
          text-align: left;
          margin-bottom: 60px;
        }

        .flight-track {
          position: relative;
          width: 100%;
          height: 120px;
          display: flex;
          align-items: center;
        }

        /* Dashed line */
        .dashed-line {
          position: absolute;
          left: 3%;
          right: 3%;
          top: 50%;
          transform: translateY(-50%);
          border: none;
          border-top: 3px dashed rgba(255, 255, 255, 0.5);
          border-color: var(--yellow-primary);
          background: none;
          height: 0;
          /* use svg for precise dash pattern */
        }

        .flight-svg {
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 100%;
          height: 4px;
        }

        .pin-egypt {
          position: absolute;
          left: 3%;
          top: 70%;
          transform: translateY(-100%);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .pin-china {
          position: absolute;
          right: 3%;
          top: 70%;
          transform: translateY(-100%);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .pin-label {
          color: white;
          font-family: Helvetica, sans-serif;
          font-size: 13px;
          font-weight: 400;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-top: 4px;
        }

        .plane-flight {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 220px;
          height: auto;
        }

        @media (max-width: 768px) {
  .next-stop-title { font-size: 36px; }
  .plane-flight { width: 140px; }
  .pin-label { font-size: 10px; letter-spacing: 1px; }
}

@media (max-width: 480px) {
  .next-stop-title { font-size: 26px; }
  .flight-track { height: 90px; }
  .plane-flight { width: 100px; }
}

        /* ══ SECTION 3 — POSTCARDS (WHITE) ══ */
        .postcards-section {
          background: white;
          padding: 80px 24px 60px;
          position: relative;
          overflow: visible;
        }

        .postcards-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr;
          gap: 200px;
          align-items: center;
          justify-items: center;
          text-align: center;
        }

        .postcards-text {
          padding-top: 20px;
        }

        .postcards-title {
          color: var(--pink-primary);
          margin-bottom: 12px;
          text-align: left;
        }

        .postcards-subtitle {
          color: var(--black-neutral);
          margin-bottom: 12px;
          text-align: left;
          width: 796px;
        }

        .postcards-desc {
          color: var(--black-neutral);
          text-align: left !important;
          margin-bottom: 32px;
          max-width: 684px;
        }

        .see-btn {
          display: inline-block;
          background: white;
          color: var(--black-neutral);
          border: 3px solid var(--black-neutral);
          padding: 10px 36px;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.15s;
        }

        .see-btn:hover {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0px var(--yellow-primary);
        }

        /* Postcard pile — overlapping */
        .postcards-pile {
          position: relative;
          height: 420px;
          width: 100%;
           display: flex;
  justify-content: center;
        }

        .postcard-img {
          position: absolute;
        }

        .pc-china {
          width: 38%;
          top: -600px;
          right:-90px;
          z-index: 3;
        }

        .pc-kenya {
          width: 44%;
          bottom: 20px;
          right: 45px;
          z-index: 4;
          scale: 0.9;
        }

        .pc-india {
          width: 42%;
          bottom: 10px;
          left: 20%;
          z-index: 1;
        }

        .pc-mexico {
          width: 48%;
          bottom: -40px;
          left: -70px;
          z-index: 2;
          scale: 0.7;
        }

        @media (max-width: 1024px) {
  .postcards-inner {
    grid-template-columns: 1fr;
  }
  .postcards-text {
    text-align: center;
  }
  .postcards-title,
  .postcards-subtitle,
  .postcards-desc {
    text-align: center !important;
    max-width: 100%;
  }
  .postcards-pile {
    height: 260px;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: flex-end;
    gap: 8px;
    overflow: visible;
  }
  .postcard-img {
    position: relative !important;
    top: auto !important;
    bottom: auto !important;
    left: auto !important;
    right: auto !important;
    transform: none !important;
    width: 25% !important;
    height: auto;
  }
  /* hide china on tablet since it overlaps badly */
  .pc-china { display: flex; }
}

@media (max-width: 480px) {
  .postcards-pile { height: 160px }
  .postcard-img { width: 23% !important; }
}

        /* ══ SECTION 4 — SPOTLIGHT (WHITE) ══ */
        .spotlight-section {
          background: white;
          padding: 0px 24px 100px;
        }

        .spotlight-inner {
          max-width: 1200px;
          margin: 0 auto;
        }

        .spotlight-title {
          color: var(--yellow-primary);
          margin-bottom: 40px;
          text-align: left;
        }

        .spotlight-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          align-items: center;
        }

        .spotlight-left {
          position: relative;
          height: 420px;
        }

        .spotlight-main-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 4px;
        }

        .spotlight-right {
          position: relative;
          height: 480px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding-bottom: 20px;
        }

        .spotlight-icons {
          position: absolute;
          top: 0;
          right: 0;
          width: 100%;
          height: 300px;
        }

        .icon-temple {
          position: absolute;
          top: 0px;
          left: 0px;
          width: 55%;
          height: auto;
        }

        .icon-lantern {
          position: absolute;
          top: 40px;
          right: 5%;
          width: 34%;
          height: auto;
        }

        .icon-sushi {
          position: absolute;
          top: -20px;
          right: -10%;
          width: 16%;
          height: auto;
        }

        .spotlight-text {
          padding-top: 320px;
        }

        .spotlight-country {
          color: var(--yellow-primary);
          margin-bottom: 8px;
          text-align: left;
        }

        .spotlight-label {
          color: var(--black-neutral);
          margin-bottom: 12px;
          text-align: left;
        }

        .spotlight-desc {
          color: var(--black-neutral);
          text-align: left !important;
          max-width: 400px;
        }

        @media (max-width: 1024px) {
  .spotlight-grid {
    grid-template-columns: 1fr;
  }
  .spotlight-left {
    height: 320px;
  }
  .spotlight-right {
    height: auto;
    padding-bottom: 0;
  }
  .spotlight-icons {
    position: relative;
    height: 180px;
    display: flex;
    align-items: flex-end;
    gap: 16px;
  }
  .icon-temple,
  .icon-lantern,
  .icon-sushi {
    position: relative;
    top: auto;
    left: auto;
    right: auto;
    width: 30%;
    transform: none;
  }
  .spotlight-text {
    margin-top: 24px;
  }
  .spotlight-country,
  .spotlight-label,
  .spotlight-desc {
    text-align: center !important;
    max-width: 100%;
  }
}
  /* ══ AI RECOMMENDATION ══ */
.ai-recommendation {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 1px;
  margin-top: -50px;
  align-self: flex-start;
  z-index: 4;
  left:-170px
}

.ai-character {
  width: 150px;
  height: auto;
  flex-shrink: 0;
}

.speech-bubble {
  position: relative;
  background: var(--yellow-primary);
  border: 2px solid var(--black-neutral);
  padding: 12px 16px;
  max-width: 320px;
  border-radius: 4px;
}

/* Triangle pointing left toward the character */
.speech-bubble::before {
  content: "";
  position: absolute;
  left: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-top: 10px solid transparent;
  border-bottom: 10px solid transparent;
  border-right: 12px solid var(--black-neutral);
}

.speech-bubble::after {
  content: "";
  position: absolute;
  left: -9px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-right: 10px solid var(--yellow-primary);
}

.speech-bubble-text {
  font-family: var(--font-gafiton), sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--black-neutral);
  margin: 0;
}
        
      `}</style>

      <Navbar />

      {/* ══════════════════════════════════════
          SECTION 1 — BLUE GLOBE
      ══════════════════════════════════════ */}
      <section className="dash-globe-section">
        {/* Globe background image */}
        <Image
          src="/dashboard/globe.png"
          alt="Globe"
          width={1440}
          height={1024}
          className="globe-img"
          priority
        />
        {/* Clouds overlay */}
        <Image
          src="/dashboard/clouds.png"
          alt=""
          width={1418}
          height={809}
          className="clouds-img"
        />

        <div className="globe-content">
          {/* AI Character + Recommendation */}
          {recommendation && (
            <div className="ai-recommendation">
              <Image
                src="/ai-character.png"
                alt="AI Guide"
                width={90}
                height={120}
                className="ai-character"
              />
              <div className="speech-bubble">
                <p className="body speech-bubble-text">{recommendation}</p>
              </div>
            </div>
          )}
          <h1 className="header1_v2 globe-greeting">
            Hey {firstName || "Explorer"},
          </h1>
          <h1 className="header1_v2 globe-tagline">
            Ready To Make The
            <br />
            Globe Move Again?
          </h1>
          <Link href="/map" className="subtitle_v2 explore-btn">
            EXPLORE MORE
          </Link>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FLAGS VIDEO STRIP
      ══════════════════════════════════════ */}
      <div className="flags-strip">
        {/* <video autoPlay loop muted playsInline> */}
        <video muted>
          <source src="/dashboard/flags.mp4" type="video/mp4" />
        </video>
      </div>

      {/* ══════════════════════════════════════
          SECTION 2 — YOUR NEXT STOP
      ══════════════════════════════════════ */}
      <section className="next-stop-section">
        <div className="next-stop-inner">
          <h2 className="header1_v2 next-stop-title">
            Your Next Stop
            <br />
            Is One Click Away
          </h2>

          <div className="flight-track">
            {/* Dashed line via SVG for exact dash pattern */}
            <svg
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: "50%",
                transform: "translateY(-50%)",
                width: "100%",
                height: "4px",
                overflow: "visible",
              }}
              preserveAspectRatio="none"
            >
              <line
                x1="4%"
                y1="2"
                x2="96%"
                y2="2"
                stroke="var(--yellow-primary)"
                strokeWidth="3"
                strokeDasharray="8 8"
              />
            </svg>

            {/* Egypt pin */}
            <div className="pin-egypt">
              <Image
                src="/dashboard/egypt-pin.png"
                alt="Egypt"
                width={42}
                height={62}
              />
              <span className="pin-label">Egypt</span>
            </div>

            {/* Plane */}
            <Image
              src="/homepage/plane.png"
              alt="Plane"
              width={260}
              height={130}
              className="plane-flight"
            />

            {/* China pin */}
            <div className="pin-china">
              <Image
                src="/dashboard/china-pin.png"
                alt="China"
                width={42}
                height={62}
              />
              <span className="pin-label">China</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SECTION 3 — POSTCARDS
      ══════════════════════════════════════ */}
      <section className="postcards-section">
        <div className="postcards-inner">
          {/* Left — text */}
          <div className="postcards-text">
            <h2 className="header1_v2 postcards-title">
              Can You Collect
              <br />
              Them All?
            </h2>
            <h3 className="header3_v3 postcards-subtitle">
              Your Postcards Are Waiting, Explorer
            </h3>
            <p className="body postcards-desc">
              Collect them all, unlock surprises, and watch your postcards turn
              into a story of everywhere you&apos;ve been.
            </p>
            <Link href="/my-collection" className="subtitle_v2 see-btn">
              SEE MY POSTCARDS
            </Link>
          </div>

          {/* Right — postcard pile */}
          <div className="postcards-pile">
            <Image
              src="/dashboard/postcard-china.png"
              alt="China postcard"
              width={467}
              height={618}
              className="postcard-img pc-china"
            />
            <Image
              src="/dashboard/postcard-kenya.png"
              alt="Kenya postcard"
              width={520}
              height={585}
              className="postcard-img pc-kenya"
            />
            <Image
              src="/dashboard/postcard-india.png"
              alt="India postcard"
              width={504}
              height={667}
              className="postcard-img pc-india"
            />
            <Image
              src="/dashboard/postcard-mexico.png"
              alt="Mexico postcard"
              width={562}
              height={662}
              className="postcard-img pc-mexico"
            />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SECTION 4 — SPOTLIGHT OF THE WEEK
      ══════════════════════════════════════ */}
      <section className="spotlight-section">
        <div className="spotlight-inner">
          <h2 className="header1_v2 spotlight-title">Spotlight Of The Week</h2>

          <div className="spotlight-grid">
            {/* Left — main Japan image */}
            <div className="spotlight-left">
              <Image
                src="/dashboard/japan-main.png"
                alt="Japan"
                width={611}
                height={595}
                className="spotlight-main-img"
              />
            </div>

            {/* Right — icons + text */}
            <div className="spotlight-right">
              <div className="spotlight-icons">
                <Image
                  src="/dashboard/japan-temple.png"
                  alt=""
                  width={330}
                  height={279}
                  className="icon-temple"
                />
                <Image
                  src="/dashboard/japan-lantern.png"
                  alt=""
                  width={214}
                  height={284}
                  className="icon-lantern"
                />
                <Image
                  src="/dashboard/japan-sushi.png"
                  alt=""
                  width={98}
                  height={89}
                  className="icon-sushi"
                />
              </div>
              <div className="spotlight-text">
                <h3 className="header2_v2 spotlight-country">Japan</h3>
                <h4 className="header3_v3 spotlight-label">
                  Explore This Week&apos;s Country
                </h4>
                <p className="body_v2 spotlight-desc">
                  Try Sushi-Making, Spot Mount Fuji, And Join The Lantern
                  Festival! Unlock Your Sakura Explorer.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
