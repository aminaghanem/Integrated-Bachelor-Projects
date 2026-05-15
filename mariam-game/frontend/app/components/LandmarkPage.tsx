"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "./Navbar";

interface LandmarkItem {
  name: string;
  imageUrl: string;
}

interface LandmarkPageProps {
  countryName: string;
  landmarkImages: [string, string, string];
}

export default function LandmarkPage({
  countryName,
  landmarkImages,
}: LandmarkPageProps) {
  const router = useRouter();
  const slug = countryName.toLowerCase();

  const [landmarks, setLandmarks] = useState<LandmarkItem[]>([]);

  useEffect(() => {
    const fetchLandmarks = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/categories/country/${countryName}/type/landmark`,
        );
        const data = await res.json();
        setLandmarks(data.slice(0, 3));
      } catch {
        setLandmarks(
          landmarkImages.map((src) => ({ name: "", imageUrl: src })),
        );
      }
    };
    fetchLandmarks();
  }, [countryName, landmarkImages]);

  const items: LandmarkItem[] =
    landmarks.length === 3
      ? landmarks
      : [
          { name: "", imageUrl: landmarkImages[0] },
          { name: "", imageUrl: landmarkImages[1] },
          { name: "", imageUrl: landmarkImages[2] },
        ];

  return (
    <>
      <style>{`
        .landmark-page {
          background-color: var(--blue-primary);
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .landmark-inner {
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

        .landmark-title {
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

        .landmark-subtitle {
          font-family: var(--font-gafiton), sans-serif;
          font-weight: 400;
          font-size: clamp(12px, 1.4vw, 20px);
          line-height: 100%;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          color: white;
          margin: 0 0 2px 0;
        }

        .landmark-grid {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
          align-items: center;
        //   padding: 32px 0 28px;
        }

        .landmark-card {
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

        .landmark-card-middle:hover {
          transform: scale(1.02);
        }

        .landmark-img-wrap {
          height: 365px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .landmark-img-wrap:nth-child(1) {
          width: 380px;
        }

        .landmark-img-wrap:nth-child(2) {
          width: 410px;
        }

        .landmark-img-wrap:nth-child(3) {
          width: 410px;
        }

        .landmark-img-wrap img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .landmark-name {
          font-family: var(--font-gafiton), sans-serif;
          font-weight: 400;
          font-size: clamp(16px, 2.2vw, 32px);
          line-height: 100%;
          letter-spacing: 0.02em;
          text-align: center;
          text-transform: uppercase;
          color: white;
          margin: 0;
          width: 260px;
        }

        @media (max-width: 900px) {
          .landmark-grid { gap: 16px; padding: 20px 0 16px; }
          .landmark-inner { padding: 0 24px; padding-top: 70px; }
        }

        @media (max-width: 600px) {
          .landmark-grid {
            grid-template-columns: 1fr;
            overflow-y: auto;
          }
          .landmark-page { height: auto; overflow: auto; }
        }
      `}</style>

      <div className="landmark-page">
        <Navbar />

        <div className="landmark-inner">
          <h1 className="landmark-title">
            What Do You Want To
            <br />
            Build Today?
          </h1>
          <p className="landmark-subtitle">
            Choose A Landmark &amp; Lets Build It Together
          </p>

          <div className="landmark-grid">
            {items.map((item, i) => {
              const isFirst = i === 0;
              return (
                <button
                  key={i}
                  className={
                    "landmark-card" + (isFirst ? " landmark-card-middle" : "")
                  }
                  onClick={() => {
                    if (!isFirst) return;
                    const landmarkSlug = item.name
                      .toLowerCase()
                      .replace(/\s+/g, "-");
                    router.push(
                      `/${slug}/landmarks/${encodeURIComponent(landmarkSlug)}`,
                    );
                  }}
                  style={{ cursor: isFirst ? "pointer" : "not-allowed" }}
                >
                  <div className="landmark-img-wrap">
                    <Image
                      src={landmarkImages[i]}
                      alt={item.name || `Landmark ${i + 1}`}
                      width={375}
                      height={375}
                      style={{ objectFit: "contain" }}
                      //   priority={i === 0}
                    />
                  </div>
                  <p className="landmark-name">{item.name || "..."}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
