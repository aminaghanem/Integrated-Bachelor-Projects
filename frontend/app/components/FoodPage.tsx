"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "./Navbar";

interface FoodItem {
  name: string;
  imageUrl: string;
}

interface FoodPageProps {
  countryName: string;
  foodImages: [string, string, string]; // 3 local image paths as fallback
}

export default function FoodPage({ countryName, foodImages }: FoodPageProps) {
  const router = useRouter();
  const slug = countryName.toLowerCase();

  const [foods, setFoods] = useState<FoodItem[]>([]);

  useEffect(() => {
    const fetchFoods = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/categories/country/${countryName}/type/food`,
        );
        const data = await res.json();
        setFoods(data.slice(0, 3)); // only take 3
      } catch {
        // fallback: use prop image paths with empty names
        setFoods(foodImages.map((src) => ({ name: "", imageUrl: src })));
      }
    };
    fetchFoods();
  }, [countryName, foodImages]);

  // While loading, show 3 placeholder slots
  const items: FoodItem[] =
    foods.length === 3
      ? foods
      : [
          { name: "", imageUrl: foodImages[0] },
          { name: "", imageUrl: foodImages[1] },
          { name: "", imageUrl: foodImages[2] },
        ];

  return (
    <>
      <style>{`
        .food-page {
          background-color: var(--midnight-blue);
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .food-inner {
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

        .food-title {
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

        .food-subtitle {
          font-family: var(--font-gafiton), sans-serif;
          font-weight: 400;
          font-size: clamp(12px, 1.4vw, 20px);
          line-height: 100%;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          color: white;
          margin: 0 0 10px 0;
        }

        /* ── Three card grid ── */
        .food-grid {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
          align-items: center;
          padding: 32px 0 28px;
        }

        .food-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          transition: transform 0.15s, filter 0.15s;
        }

        .food-card:hover {
          transform: none;
        }

        .food-card.food-card-middle:hover {
          transform: scale(1.02);
        }

        /* Tiled background card */
        .food-img-wrap {
          width: 375px;
          height: 375px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .food-img-wrap img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .food-name {
          font-family: var(--font-gafiton), sans-serif;
          font-weight: 400;
          font-size: clamp(16px, 2.2vw, 32px);
          line-height: 100%;
          letter-spacing: 0.02em;
          text-align: center;
          text-transform: uppercase;
          color: white;
          margin: 0;
          width:233px;
        }

        @media (max-width: 900px) {
          .food-grid { gap: 16px; padding: 20px 0 16px; }
          .food-inner { padding: 0 24px; padding-top: 70px; }
        }

        @media (max-width: 600px) {
          .food-grid {
            grid-template-columns: 1fr;
            overflow-y: auto;
          }
          .food-page { height: auto; overflow: auto; }
        }
      `}</style>

      <div className="food-page">
        <Navbar />

        <div className="food-inner">
          <h1 className="food-title">
            What Do You Want To
            <br />
            Cook Today?
          </h1>
          <p className="food-subtitle">Choose A Plate &amp; Start Cooking</p>

          <div className="food-grid">
            {items.map((item, i) => {
              const isMiddle = i === 1;
              return (
                <button
                  key={i}
                  className={
                    "food-card" + (isMiddle ? " food-card-middle" : "")
                  }
                  onClick={() => {
                    if (!isMiddle) return;
                    const foodSlug =
                      item.name === "Fried Rice (Chǎofàn)"
                        ? "rice"
                        : item.name.toLowerCase().replace(/\s+/g, "-");
                    router.push(
                      `/${slug}/food/${encodeURIComponent(foodSlug)}`,
                    );
                  }}
                  style={{ cursor: isMiddle ? "pointer" : "not-allowed" }}
                >
                  <div className="food-img-wrap">
                    <Image
                      src={foodImages[i]}
                      alt={item.name || `Food ${i + 1}`}
                      width={375}
                      height={375}
                      style={{ objectFit: "contain" }}
                      priority={i === 0}
                    />
                  </div>
                  <p className="food-name">{item.name || "..."}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
