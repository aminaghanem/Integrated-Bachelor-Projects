"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";

export default function EuropePage() {
  const router = useRouter();

  return (
    <>
      <style>{`
        .continent-page {
          background-color: var(--blue-primary);
          min-height: 100vh;
          position: relative;
          overflow: hidden;
        }

        .continent-inner {
          position: relative;
          max-width: 1440px;
          margin: 0 auto;
          padding-bottom: 60px;
        }

        /* ── Reused from map page exactly ── */
        .map-title {
          position: absolute;
          top: -100px;
          left: 90px;
          color: white;
          z-index: 3;
          margin: 0;
        }

        .stamp-badge {
          position: absolute;
          top: -105px;
          right: 90px;
          background-color: var(--pink-primary);
          width: 216px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12px;
          z-index: 3;
        }

        .stamp-count {
          font-family: Helvetica, Arial, sans-serif;
          font-weight: 700;
          font-size: 32px;
          line-height: 100%;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          color: white;
        }

        /* ── Continent image container ── */
        .continent-container {
          position: relative;
          margin-top: 200px;
          margin-left: 90px;
          width: 1200px;
          height: 680px;
          z-index: 1;
        }

        /* ── Location pin ── */
        .pin-btn {
          position: absolute;
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          z-index: 4;
          transition: all 0.15s;
        }

        .pin-btn:hover {
          transform: translate(-2px, -2px);
        }

        .pin-label {
          align-self: center;
  display: inline-block;
  background: white;
  color: var(--black-neutral);
  border: 3px solid var(--black-neutral);
  padding: 5px 16px;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s;
        }

        .pin-emoji {
  font-size: 36px;
  line-height: 1;
}

        /* Responsive */
        @media (max-width: 1350px) {
          .continent-container {
            margin-left: 40px;
            width: calc(100vw - 80px);
            height: auto;
          }
        }

        @media (max-width: 900px) {
          .map-title { left: 24px; top: 80px; }
          .stamp-badge { right: 24px; top: 80px; width: 160px; height: 50px; }
          .stamp-count { font-size: 24px; }
          .continent-container { margin-top: 180px; margin-left: 16px; width: calc(100vw - 32px); }
        }

        @media (max-width: 480px) {
          .map-title { font-size: 28px; top: 75px; }
          .stamp-badge { width: 130px; height: 42px; }
          .stamp-count { font-size: 18px; }
        }
      `}</style>

      <div className="continent-page">
        <Navbar />

        <div className="continent-inner">
          <h1 className="header1_v2 map-title">EUROPE</h1>

          <div className="stamp-badge">
            <Image src="/map/star.png" alt="star" width={30} height={30} />
            <span className="stamp-count">0/1</span>
          </div>

          <div className="continent-container">
            <Image
              src="/map/europe.png"
              alt="Europe"
              width={1000}
              height={680}
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                scale: "0.8",
                transform: "translateY(-50px)",
              }}
              priority
            />

            {/* Germany pin — adjust top/left once you see your image */}
            <button
              className="pin-btn"
              style={{ top: "39%", left: "42%" }}
              onClick={() => router.push("/map/europe/germany")}
              aria-label="Explore Germany"
            >
              <span className="pin-emoji">📍</span>{" "}
              <span className="pin-label">GERMANY</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
