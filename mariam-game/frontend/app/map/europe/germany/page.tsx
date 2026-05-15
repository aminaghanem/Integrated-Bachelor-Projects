"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Navbar from "../../../components/Navbar";

export default function GermanyPage() {
  const router = useRouter();

  return (
    <>
      <style>{`
        .country-page {
          background-color: var(--blue-primary);
          min-height: 100vh;
          position: relative;
          overflow: hidden;
        }

        .country-inner {
          position: relative;
          max-width: 1440px;
          margin: 0 auto;
          padding-bottom: 60px;
        }

        .country-header {
          position: absolute;
          top: -100px;
          left: 90px;
          display: flex;
          align-items: center;
          gap: 16px;
          z-index: 3;
        }

        .country-name {
          font-family: var(--font-gafiton), sans-serif;
          font-weight: 400;
          font-size: 56px;
          line-height: 100%;
          color: white;
          text-transform: capitalize;
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

        .country-map-container {
          position: relative;
          margin-top: 200px;
          margin-left: 90px;
          width: 1200px;
          z-index: 1;
        }

        .country-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 4;
          gap: 32px;
        }

        .country-tagline {
          font-family: var(--font-gafiton), sans-serif;
          font-weight: 400;
          font-size: 96px;
          line-height: 100%;
          letter-spacing: 0%;
          text-align: center;
          text-transform: capitalize;
          color: white;
          text-shadow: 2px 4px 0px rgba(0,0,0,0.2);
          margin: 0;
          padding: 0 40px;
        }

        .start-btn {
          display: inline-block;
          background: white;
          color: var(--black-neutral);
          border: 3px solid var(--black-neutral);
          padding: 12px 52px;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.15s;
          font-family: Helvetica, Arial, sans-serif;
          font-weight: 700;
          font-size: 20px;
          letter-spacing: 5%;
          text-transform: uppercase;
        }

        .start-btn:hover {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0px var(--yellow-primary);
        }

        .start-btn:active {
          transform: translate(4px, 4px);
          box-shadow: none;
        }

        @media (max-width: 1350px) {
          .country-map-container {
            margin-left: 40px;
            width: calc(100vw - 80px);
          }
          .country-tagline { font-size: 64px; }
        }

        @media (max-width: 900px) {
          .country-header { left: 24px; top: 80px; }
          .country-name { font-size: 36px; }
          .stamp-badge { right: 24px; top: 80px; width: 160px; height: 50px; }
          .stamp-count { font-size: 24px; }
          .country-map-container { margin-top: 180px; margin-left: 16px; width: calc(100vw - 32px); }
          .country-tagline { font-size: 40px; }
          .start-btn { font-size: 16px; padding: 10px 36px; }
        }

        @media (max-width: 480px) {
          .country-name { font-size: 28px; }
          .stamp-badge { width: 130px; height: 42px; }
          .stamp-count { font-size: 18px; }
          .country-tagline { font-size: 28px; }
        }
      `}</style>

      <div className="country-page">
        <Navbar />

        <div className="country-inner">
          {/* Flag + name */}
          <div className="country-header">
            <Image
              src="/map/germany-flag.png"
              alt="Germany flag"
              width={72}
              height={48}
            />
            <h1 className="country-name">Germany</h1>
          </div>

          {/* Stamp badge */}
          <div className="stamp-badge">
            <Image src="/map/star.png" alt="star" width={30} height={30} />
            <span className="stamp-count">0/1</span>
          </div>

          {/* Country map image + overlay */}
          <div className="country-map-container">
            <Image
              src="/map/country.png"
              alt="Germany map"
              width={1200}
              height={712}
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                transform: "translateY(-70px)",
              }}
              priority
            />

            <div className="country-overlay">
              <p className="country-tagline">
                Let&apos;s Enter Germany
                <br />
                And Explore It!
              </p>
              <button
                className="subtitle_v2 start-btn"
                onClick={() => router.push("/map/europe/germany/explore")}
              >
                START
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
