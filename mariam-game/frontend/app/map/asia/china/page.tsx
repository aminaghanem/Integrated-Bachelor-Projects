"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "../../../components/Navbar";

export default function ChinaPage() {
  const router = useRouter();
  const [showText, setShowText] = useState(false);
  const [completedStamps, setCompletedStamps] = useState<number | null>(null);
  const [totalCountries, setTotalCountries] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowText(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const getUserIdFromToken = () => {
      const token = localStorage.getItem("token");
      if (!token) return null;
      try {
        const base64Url = token.split(".")[1] || "";
        const base64 = base64Url
          .replace(/-/g, "+")
          .replace(/_/g, "/")
          .padEnd(base64Url.length + ((4 - (base64Url.length % 4)) % 4), "=");
        return JSON.parse(atob(base64))?.id;
      } catch {
        return null;
      }
    };

    const fetchCounts = async () => {
      try {
        const countryRes = await fetch("http://localhost:5000/api/countries");
        if (countryRes.ok) {
          const countries = await countryRes.json();
          setTotalCountries(Array.isArray(countries) ? countries.length : 0);
        }

        const userId = getUserIdFromToken();
        if (!userId) return;

        const stampRes = await fetch(
          `http://localhost:5000/api/progress/user/${userId}/stamps`,
        );
        if (stampRes.ok) {
          const data = await stampRes.json();
          setCompletedStamps(data.stampCount || 0);
        }
      } catch (error) {
        console.error("Failed to load stamp counts", error);
      }
    };

    fetchCounts();
  }, []);

  return (
    <>
      <style>{`
        .country-page {
          background-color: var(--blue-primary);
          max-height: 100vh;
          position: relative;
          overflow: hidden;
        }

        .country-inner {
          position: relative;
          max-width: 1440px;
          margin: 0 1px;
          padding-bottom: 60px;
        }

        /* Flag + country name — top left */
        .country-header {
          position: absolute;
          top: -40px;
          left: 50px;
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

        /* Stamp badge — top right */
        .stamp-badge {
          position: absolute;
          top: -45px;
          right: -30px;
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

        /* Country map image container */
        .country-map-container {
          position: relative;
          margin-top: 130px;
          margin-left: auto;
          margin-right: auto;
          width: 60%;
          height:auto;
          z-index: 1;
        }

        /* Centered overlay text + button */
        .country-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 4;
          gap: 32px;
          pointer-events: none;
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
          pointer-events: auto;
          cursor: pointer;
          opacity: 0;
          transform: translateY(-20px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }

        .country-tagline.visible {
          opacity: 1;
          transform: translateY(-40px);
        }
          .country-tagline:hover {
          transform: translateY(-40px) scale(1.04);
          filter: drop-shadow(0 0 12px rgba(255, 216, 77, 0.7));

      }

        .country-map-image {
          transform: translateY(-70px);
          transition: transform 0.2s ease;
        }

        /* Responsive */
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
              src="/map/china-flag.png"
              alt="China flag"
              width={72}
              height={48}
            />
            <h1 className="country-name">China</h1>
          </div>

          {/* Stamp badge */}
          <div className="stamp-badge">
            <Image src="/map/star.png" alt="star" width={30} height={30} />
            <span className="stamp-count">
              {completedStamps === null ? "..." : completedStamps}/
              {totalCountries === null ? "..." : totalCountries}
            </span>
          </div>

          {/* Country map image + overlay */}
          <div className="country-map-container">
            <Image
              src="/map/china.png"
              alt="China map"
              width={1200}
              height={712}
              className="country-map-image"
              style={{
                width: "100%",
                height: "auto",
                display: "block",
              }}
              priority
            />

            <div className="country-overlay">
              <p
                className={`country-tagline ${showText ? "visible" : ""}`}
                onClick={() => router.push("/china")}
              >
                Let&apos;s Enter China
                <br />
                And Explore It!
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
