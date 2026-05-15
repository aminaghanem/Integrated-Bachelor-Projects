"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Navbar from "./Navbar";

interface CategoriesPageProps {
  countryName: string;
  foodImg: string;
  festivalsImg: string;
  landmarksImg: string;
}

export default function CategoriesPage({
  countryName,
  foodImg,
  festivalsImg,
  landmarksImg,
}: CategoriesPageProps) {
  const router = useRouter();
  const slug = countryName.toLowerCase();

  return (
    <>
      <style>{`
        .cat-page {
          background-color: var(--midnight-blue);
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .cat-inner {
          position: relative;
          flex: 1;
          max-width: 1440px;
          width: 100%;
          margin: 0 auto;
          padding-top:70px;
        }

        /* ── Header text ── */
        .cat-title {
          font-family: var(--font-gafiton), sans-serif;
          font-weight: 400;
          font-size: clamp(28px, 3.3vw, 48px);
          line-height: 100%;
          letter-spacing: 0.03em;
          text-transform: capitalize;
          color: var(--yellow-primary);
          margin: 0 0 10px 0;
          padding-top: 16px;
        }

        .cat-subtitle {
          font-family: var(--font-gafiton), sans-serif;
          font-weight: 400;
          font-size: clamp(12px, 1.4vw, 20px);
          line-height: 100%;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          color: white;
          margin: 0;
        }

        /* ── Category label ── */
        .cat-label {
          font-family: var(--font-gafiton), sans-serif;
          font-weight: 400;
          font-size: clamp(22px, 2.8vw, 40px);
          line-height: 100%;
          letter-spacing: 0.02em;
          text-align: center;
          text-transform: uppercase;
          color: var(--yellow-primary);
          margin: 0 0 4px 0;
        }

        .cat-tag {
          font-family: var(--font-gafiton), sans-serif;
          font-weight: 400;
          font-size: clamp(11px, 1.4vw, 20px);
          line-height: 100%;
          letter-spacing: 0.02em;
          text-align: center;
          text-transform: uppercase;
          color: white;
          margin: 0;
        }

        /* ── Layout: three zones across the viewport ── */
        .cat-grid {
          position: absolute;
          top: 90px;
          left: 26px;
          right: 26px;
          bottom: 70px;
        }

        /* FESTIVALS — bottom left */
        .zone-festivals {
          position: absolute;
          left: 50px;
          bottom: -20px;
          width: 38%;
          display: flex;
          flex-direction: column;
          gap: 70px;
        }

        .zone-festivals .cat-text {
          padding-right: 250px;
          margin-bottom: 8px;
        }

        .zone-festivals img {
          width: 100%;
          max-width: 506px;
          height: auto;
          object-fit: contain;
          object-position: bottom left;
        }

        /* FOOD — top center */
        .zone-food {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          top: 150px;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 34%;
          gap: 70px;
        }

        .zone-food img {
          width: 100%;
          max-width: 419px;
          height: auto;
          object-fit: contain;
        }

        .zone-food .cat-text {
          margin-top: 8px;
          text-align: center;
        }

        /* LANDMARKS — bottom right */
        .zone-landmarks {
          position: absolute;
          right: 0;
          bottom: 0;
          width: 44%;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 100px;
        }

        .zone-landmarks .cat-text {
          text-align: center;
          width: 100%;
          padding-left: 200px;
          margin-bottom: 8px;
        }

        .zone-landmarks img {
          width: 100%;
          max-width: 644px;
          height: auto;
          object-fit: contain;
          object-position: bottom right;
        }

        /* ── Clickable / disabled states ── */
        .cat-btn {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          transition: transform 0.15s, filter 0.15s;
          display: block;
        }

        .cat-btn:hover {
          transform: scale(1.04);
          filter: drop-shadow(0 0 12px rgba(255, 216, 77, 0.5));
        }

        .cat-btn.disabled {
          cursor: not-allowed;
        }

        .cat-btn.disabled:hover {
          transform: none;
          filter: none;
        }

        .disabled-wrap {
          position: relative;
          display: inline-block;
        }

        @media (max-width: 900px) {
          .cat-grid { top: 70px; }
          .zone-festivals { width: 36%; }
          .zone-landmarks { width: 42%; }
          .zone-food { width: 36%; }
        }
      `}</style>

      <div className="cat-page">
        <Navbar />

        <div className="cat-inner">
          {/* Header */}
          <h1 className="cat-title">
            What Would You Like To
            <br />
            Explore Today?
          </h1>
          <p className="cat-subtitle">Choose The Game You Want To Play</p>

          {/* Three category zones */}
          <div className="cat-grid">
            {/* ── FESTIVALS (clickable) ── */}
            <div className="zone-festivals">
              <div className="cat-text">
                <p className="cat-label">Festivals</p>
                <p className="cat-tag">Celebrate Traditions</p>
              </div>
              <div className="">
                <button
                  className="cat-btn"
                  onClick={() => router.push(`/${slug}/festivals`)}
                  aria-label={`Explore ${countryName} festivals`}
                >
                  <Image
                    src={festivalsImg}
                    alt="Festivals"
                    width={506}
                    height={627}
                    style={{
                      width: "100%",
                      height: "auto",
                      objectFit: "contain",
                      transform: "scale(1.4)",
                    }}
                  />
                </button>
              </div>
            </div>

            {/* ── FOOD (clickable) ── */}
            <div className="zone-food">
              <button
                className="cat-btn"
                onClick={() => router.push(`/${slug}/food`)}
                aria-label={`Explore ${countryName} food`}
              >
                <Image
                  src={foodImg}
                  alt="Food"
                  width={419}
                  height={336}
                  style={{
                    width: "100%",
                    height: "auto",
                    objectFit: "contain",
                    transform: "scale(1.4)",
                  }}
                  priority
                />
              </button>
              <div className="cat-text">
                <p className="cat-label">Food</p>
                <p className="cat-tag">Make Tasty Dishes</p>
              </div>
            </div>

            {/* ── LANDMARKS (clickable) ── */}
            <div className="zone-landmarks">
              <div className="cat-text">
                <p className="cat-label">Landmarks</p>
                <p className="cat-tag">Build The Famous Building</p>
              </div>
              <button
                className="cat-btn"
                onClick={() => router.push(`/${slug}/landmarks`)}
                aria-label={`Explore ${countryName} landmarks`}
              >
                <Image
                  src={landmarksImg}
                  alt="Landmarks"
                  width={644}
                  height={437}
                  style={{
                    width: "100%",
                    height: "auto",
                    objectFit: "contain",
                    transform: "scale(1.4)",
                  }}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
