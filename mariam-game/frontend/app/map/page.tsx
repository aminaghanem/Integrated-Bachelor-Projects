"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

export default function MapPage() {
  const router = useRouter();
  const [completedStamps, setCompletedStamps] = useState<number | null>(null);
  const [totalCountries, setTotalCountries] = useState<number | null>(null);

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
        .map-page {
          background-color: var(--blue-primary);
          height: 100vh;
          position: relative;
          overflow: hidden;
        }

        .map-inner {
          position: relative;
          max-width: 100vw;
          padding: 0 2px;
          marginbottom: 40px;
        }

        .map-title {
          position: absolute;
          top: -90px;
          left: 50px;
          color: white;
          z-index: 3;
          margin: 0;
        }

        .stamp-badge {
          position: absolute;
          top: -85px;
          right: 50px;
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

        /* Map sits below the title */
        .map-container {
          position: relative;
          margin-top: 170px;
          margin-left: auto;
          margin-right: auto;
          width: 62%;
          height: auto;
          z-index: 1;
        }

        .continent-btn {
          position: absolute;
          background: white;
          border: 3px solid var(--black-neutral);
          cursor: pointer;
          padding: 5px 8px;
          z-index: 4;
          transition: all 0.15s;
          margin-top:30px;
        }

        .continent-btn:hover {
            transform: translate(-2px, -2px);
             box-shadow: 3px 3px 0px var(--yellow-primary);        
          }

        .continent-btn span {
  font-family: Helvetica, Arial, sans-serif;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--black-neutral);
  text-align: center;
  display: block;
  line-height: 1.3;
}

        /* Responsive */
        @media (max-width: 1350px) {
          .map-container {
            margin-left: 40px;
            width: calc(100vw - 80px);
            height: auto;
          }
        }

        @media (max-width: 900px) {
          .map-title { left: 24px; top: 80px; }
          .stamp-badge { right: 24px; top: 80px; width: 160px; height: 50px; }
          .stamp-count { font-size: 24px; }
          .map-container { margin-top: 180px; margin-left: 16px; width: calc(100vw - 32px); }
          .continent-btn span { font-size: 11px; letter-spacing: 1px; }
        }

        @media (max-width: 480px) {
          .map-title { font-size: 28px; top: 75px; }
          .stamp-badge { width: 130px; height: 42px; }
          .stamp-count { font-size: 18px; }
          .continent-btn span { font-size: 8px; }
        }
      `}</style>

      <div className="map-page">
        <Navbar />

        <div className="map-inner">
          <h1 className="header1_v2 map-title">WHERE TO NEXT?</h1>

          <div className="stamp-badge">
            <Image src="/map/star.png" alt="star" width={30} height={30} />
            <span className="stamp-count">
              {completedStamps === null ? "..." : completedStamps}/
              {totalCountries === null ? "..." : totalCountries}
            </span>
          </div>

          <div className="map-container">
            {/* Full continents image */}
            <Image
              src="/map/continents.png"
              alt="World map"
              width={1200}
              height={712}
              style={{ width: "100%", height: "auto", display: "block" }}
              priority
            />

            {/* Asia explore button */}
            <button
              className="continent-btn"
              style={{ position: "absolute", top: "28%", left: "73%" }}
              onClick={() => router.push("/map/asia")}
            >
              <span>EXPLORE</span>
            </button>

            {/* Africa explore button */}
            <button
              className="continent-btn"
              style={{ position: "absolute", top: "52%", left: "48%" }}
              onClick={() => router.push("/map/africa")}
            >
              <span>EXPLORE</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
