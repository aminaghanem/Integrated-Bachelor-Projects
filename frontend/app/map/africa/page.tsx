"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";

export default function AfricaPage() {
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
        .continent-page {
          background-color: var(--blue-primary);
          max-height: 100vh;
          position: relative;
          overflow: hidden;
        }

        .continent-inner {
          position: relative;
          max-width: 1440px;
          margin: 0 auto;
          padding-bottom: 60px;
        }

        .map-title {
          position: absolute;
          top: -20px;
          left: 50px;
          color: white;
          z-index: 3;
          margin: 0;
        }

        .stamp-badge {
          position: absolute;
          top: -25px;
          right: 10px;
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

        .continent-container {
          position: relative;
          margin-top: 100px;
          margin-left: auto;
          margin-right: auto;
          width: 85%;
          height: auto;
          z-index: 1;
        }

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

        .pin-emoji {
            font-size: 36px;
            line-height: 1;
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
          <h1 className="header1_v2 map-title">AFRICA</h1>

          <div className="stamp-badge">
            <Image src="/map/star.png" alt="star" width={30} height={30} />
            <span className="stamp-count">
              {completedStamps === null ? "..." : completedStamps}/
              {totalCountries === null ? "..." : totalCountries}
            </span>
          </div>

          <div className="continent-container">
            <Image
              src="/map/Africa.png"
              alt="Africa"
              width={1000}
              height={680}
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                scale: "1",
                transform: "translateY(-50px)",
              }}
              priority
            />

            {/* Egypt pin — adjust top/left once you see your image */}
            <button
              className="pin-btn"
              style={{ top: "8%", left: "52%" }}
              onClick={() => router.push("/map/africa/egypt")}
              aria-label="Explore Egypt"
            >
              <img
                className="pin-emoji"
                src="/dashboard/egypt-pin.png"
                alt="Pin"
              />
              <span className="pin-label">EGYPT</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
