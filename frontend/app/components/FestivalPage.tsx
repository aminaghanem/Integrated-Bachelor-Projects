"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "./Navbar";

interface FestivalItem {
  name: string;
  imageUrl: string;
}

interface FestivalPageProps {
  countryName: string;
  festivalImages: [string, string, string];
}

export default function FestivalPage({
  countryName,
  festivalImages,
}: FestivalPageProps) {
  const router = useRouter();
  const slug = countryName.toLowerCase();

  const [festivals, setFestivals] = useState<FestivalItem[]>([]);

  useEffect(() => {
    const fetchFestivals = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/categories/country/${countryName}/type/festival`,
        );
        const data = await res.json();
        setFestivals(data.slice(0, 3));
      } catch {
        setFestivals(
          festivalImages.map((src) => ({ name: "", imageUrl: src })),
        );
      }
    };
    fetchFestivals();
  }, [countryName, festivalImages]);

  const items: FestivalItem[] =
    festivals.length === 3
      ? festivals
      : [
          { name: "", imageUrl: festivalImages[0] },
          { name: "", imageUrl: festivalImages[1] },
          { name: "", imageUrl: festivalImages[2] },
        ];

  return (
    <>
      <style>{`
        .festival-page {
          background-color: var(--midnight-blue);
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .festival-inner {
          position: relative;
          flex: 1;
          max-width: 1440px;
          width: 100%;
          margin: 0 auto;
          padding: 0 20px;
          padding-top: 70px;
          display: flex;
          flex-direction: column;
        }

        .festival-title {
          font-family: var(--font-gafiton), sans-serif;
          font-weight: 400;
          font-size: clamp(28px, 3.3vw, 48px);
          line-height: 100%;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: var(--yellow-primary);
          margin: 0 0 10px 0;
          padding-top: 16px;
        }

        .festival-subtitle {
          font-family: var(--font-gafiton), sans-serif;
          font-weight: 400;
          font-size: clamp(12px, 1.4vw, 20px);
          line-height: 100%;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          color: white;
          margin: 0 0 2px 0;
        }

        .festival-grid {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
          align-items: start;
       padding: 40px 0 0px;
        }

        .festival-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          transition: transform 0.15s;
        }

        .festival-card-middle:hover {
          transform: scale(1.02);
        }

        .festival-img-wrap {
          height: 365px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .festival-img-wrap:nth-child(1) {
          width: 380px;
        }

        .festival-img-wrap:nth-child(2) {
          width: 410px;
        }

        .festival-img-wrap:nth-child(3) {
          width: 410px;
        }

        .festival-img-wrap img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .festival-name {
          font-family: var(--font-gafiton), sans-serif;
          font-weight: 400;
          font-size: clamp(16px, 2.2vw, 32px);
          line-height: 100%;
          letter-spacing: 0.02em;
          text-align: center;
          text-transform: uppercase;
          color: white;
          margin: 0;
          width: 320px;
        }

        @media (max-width: 900px) {
          .festival-grid { gap: 16px; padding: 20px 0 16px; }
          .festival-inner { padding: 0 24px; padding-top: 70px; }
        }

        @media (max-width: 600px) {
          .festival-grid {
            grid-template-columns: 1fr;
            overflow-y: auto;
          }
          .festival-page { height: auto; overflow: auto; }
        }
      `}</style>

      <div className="festival-page">
        <Navbar />

        <div className="festival-inner">
          <h1 className="festival-title">
            What Do You Want To
            <br />
            Celebrate Today?
          </h1>
          <p className="festival-subtitle">
            Choose A Festival &amp; Lets Discover It Together
          </p>

          <div className="festival-grid">
            {items.map((item, i) => {
              const isFirst = i === 0;
              return (
                <button
                  key={i}
                  className={
                    "festival-card" + (isFirst ? " festival-card-middle" : "")
                  }
                  onClick={() => {
                    if (!isFirst) return;
                    const festivalSlug = item.name
                      .toLowerCase()
                      .replace(/\s+/g, "-");
                    router.push(
                      `/${slug}/festivals/${encodeURIComponent(festivalSlug)}`,
                    );
                  }}
                  style={{ cursor: isFirst ? "pointer" : "not-allowed" }}
                >
                  <div className="festival-img-wrap">
                    <Image
                      src={festivalImages[i]}
                      alt={item.name || `Festival ${i + 1}`}
                      width={375}
                      height={375}
                      style={{ objectFit: "contain" }}
                      //   priority={i === 0}
                    />
                  </div>
                  <p className="festival-name">{item.name || "..."}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
