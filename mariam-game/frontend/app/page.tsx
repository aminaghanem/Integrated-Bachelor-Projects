import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen text-slate-900">
      <style>{`
        .start-btn:hover {
        transform: translate(-2px, -2px);
          box-shadow: 4px 4px 0px var(--yellow-primary);
        }
      `}</style>
      <Navbar />
      <main>
        {/* ══ HERO ══ */}
        <section
          style={{
            backgroundColor: "var(--pink-primary)",
            width: "100%",
            position: "relative",
            overflow: "visible",
            paddingTop: "54px",
            paddingBottom: "0",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              maxWidth: "900px",
              margin: "0 auto",
              padding: "0 24px",
              textAlign: "center",
              position: "relative",
              zIndex: 1,
            }}
          >
            <h1
              className="header1_v2"
              style={{
                color: "var(--yellow-primary)",
                marginBottom: "32px",
                WebkitTextStroke: "2px rgba(0,0,0,0.12)",
                textShadow: "4px 4px 0px rgba(0,0,0,0.15)",
              }}
            >
              Travel The World
              <br />
              No Passport Needed.
            </h1>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "36px",
              }}
            >
              <Image
                src="/homepage/windows.png"
                alt="Travel landmarks"
                width={620}
                height={280}
                priority
                style={{ maxWidth: "620px", width: "100%", height: "auto" }}
              />
            </div>

            <Link
              href="/login"
              className="subtitle_v2 start-btn"
              style={{
                display: "inline-block",
                background: "white",
                color: "var(--black-neutral)",
                border: "3px solid var(--black-neutral)",
                padding: "12px 52px",
                textDecoration: "none",
                marginBottom: "56px",
                cursor: "pointer",
              }}
            >
              START
            </Link>
          </div>

          {/* Tagline + clouds + plane */}
          <div
            style={{
              backgroundColor: "var(--pink-primary)",
              position: "relative",
              overflow: "visible",
              zIndex: 1,
              padding: "28px 24px 80px",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "280px",
                overflow: "visible",
              }}
            >
              <Image
                src="/homepage/cloud.png"
                alt=""
                width={214}
                height={98}
                style={{
                  position: "absolute",
                  zIndex: 4,
                  width: "15%",
                  minWidth: "80px",
                  top: "0px",
                  left: "2%",
                }}
              />
              <Image
                src="/homepage/cloud.png"
                alt=""
                width={328}
                height={118}
                style={{
                  position: "absolute",
                  zIndex: 4,
                  width: "22%",
                  minWidth: "100px",
                  top: "-30px",
                  right: "0%",
                }}
              />
              <h2
                className="header1_v2 tagline-title"
                style={{
                  color: "var(--yellow-primary)",
                  marginBottom: "10px",
                  textAlign: "center",
                }}
              >
                TAP ZOOM TRAVEL
              </h2>
              <p
                className="subtitle_v2"
                style={{
                  color: "white",
                  maxWidth: "677px",
                  margin: "0 auto",
                  paddingBottom: "50px",
                  textAlign: "center",
                }}
              >
                Not your average geography lesson.
                <br />
                Collect your stamps along the globe as every journey counts.
              </p>
              <Image
                src="/homepage/plane.png"
                alt="plane"
                width={420}
                height={210}
                style={{
                  position: "absolute",
                  bottom: "-190px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "420px",
                  height: "auto",
                  zIndex: 5,
                }}
              />
              <Image
                src="/homepage/cloud.png"
                alt=""
                width={448}
                height={159}
                style={{
                  position: "absolute",
                  zIndex: 4,
                  width: "30%",
                  minWidth: "120px",
                  bottom: "-50px",
                  left: "7%",
                }}
              />
              <Image
                src="/homepage/cloud.png"
                alt=""
                width={96}
                height={47}
                style={{
                  position: "absolute",
                  zIndex: 4,
                  width: "7%",
                  minWidth: "40px",
                  top: "60%",
                  right: "4%",
                }}
              />
              <Image
                src="/homepage/cloud.png"
                alt=""
                width={212}
                height={107}
                style={{
                  position: "absolute",
                  zIndex: 4,
                  width: "15%",
                  minWidth: "80px",
                  bottom: "-20px",
                  right: "23%",
                }}
              />
            </div>
          </div>
        </section>

        {/* ══ HOW IT WORKS ══ */}
        <section
          style={{
            background: "white",
            padding: "80px 24px 100px",
            position: "relative",
            paddingTop: "100px",
          }}
        >
          <div style={{ maxWidth: "860px", margin: "0 auto" }}>
            <h2
              className="header1_v2"
              style={{
                color: "var(--pink-primary)",
                marginBottom: "8px",
                textAlign: "left",
              }}
            >
              HOW IT WORKS?
            </h2>
            <p
              className="unnamed"
              style={{
                color: "var(--black-neutral)",
                marginBottom: "64px",
                textAlign: "left",
              }}
            >
              Discover The Planet
              <br />
              One Country At A Time
            </p>

            {/* Step 1 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "40px",
                marginBottom: "80px",
              }}
            >
              <div style={{ flex: 1 }}>
                <h3
                  className="header2_v2"
                  style={{
                    color: "var(--yellow-primary)",
                    marginBottom: "14px",
                  }}
                >
                  LEARN &<br />
                  EXPLORE
                </h3>
                <p
                  className="body"
                  style={{
                    color: "var(--black-neutral)",
                    maxWidth: "360px",
                    textAlign: "left",
                  }}
                >
                  Spin the globe and dive into colorful worlds! Discover food,
                  animals, landmarks, and traditions through fun animations,
                  games, and sound. Learning geography has never felt this
                  playful.
                </p>
              </div>
              <div
                style={{
                  flex: "0 0 280px",
                  height: "280px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image
                  src="/homepage/learn-explore.png"
                  alt="Learn and Explore"
                  width={280}
                  height={280}
                  style={{
                    objectFit: "contain",
                    width: "100%",
                    height: "100%",
                  }}
                />
              </div>
            </div>

            {/* Step 2 */}
            <div
              style={{
                display: "flex",
                flexDirection: "row-reverse",
                alignItems: "center",
                gap: "200px",
                marginBottom: "80px",
              }}
            >
              <div style={{ flex: 1 }}>
                <h3
                  className="header2_v2"
                  style={{
                    color: "var(--yellow-primary)",
                    marginBottom: "14px",
                  }}
                >
                  COLLECT
                  <br />& EARN
                </h3>
                <p
                  className="body"
                  style={{
                    color: "var(--black-neutral)",
                    maxWidth: "360px",
                    textAlign: "left",
                  }}
                >
                  Complete each country to earn a passport stamp and unlock fun
                  facts. Fill your passport as you explore the globe and
                  celebrate every new discovery.
                </p>
              </div>
              <div
                style={{
                  flex: "0 0 280px",
                  height: "280px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image
                  src="/homepage/collect-earn.png"
                  alt="Collect and Earn"
                  width={280}
                  height={280}
                  style={{
                    objectFit: "contain",
                    width: "100%",
                    height: "100%",
                  }}
                />
              </div>
            </div>

            {/* Step 3 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "40px",
                marginBottom: "80px",
              }}
            >
              <div style={{ flex: 1 }}>
                <h3
                  className="header2_v2"
                  style={{
                    color: "var(--yellow-primary)",
                    marginBottom: "14px",
                  }}
                >
                  CREATE
                  <br />& SHARE!
                </h3>
                <p
                  className="body"
                  style={{
                    color: "var(--black-neutral)",
                    maxWidth: "360px",
                    textAlign: "left",
                  }}
                >
                  Collect world elements from your adventures and design your
                  own postcards! Mix landmarks, foods, and animals from
                  different countries to share your creative journey.
                </p>
              </div>
              <div
                style={{
                  flex: "0 0 280px",
                  height: "280px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image
                  src="/homepage/create-share.png"
                  alt="Create and Share"
                  width={280}
                  height={280}
                  style={{
                    objectFit: "contain",
                    width: "100%",
                    height: "100%",
                  }}
                />
              </div>
            </div>

            {/* About Us */}
            <div
              style={{
                display: "flex",
                flexDirection: "row-reverse",
                alignItems: "center",
                gap: "200px",
                marginBottom: "80px",
              }}
            >
              <div style={{ flex: 1 }}>
                <h3
                  className="header2_v2"
                  style={{
                    color: "var(--yellow-primary)",
                    marginBottom: "14px",
                    textAlign: "left",
                  }}
                >
                  ABOUT US
                </h3>
                <p
                  className="body"
                  style={{
                    color: "var(--black-neutral)",
                    maxWidth: "400px",
                    textAlign: "left",
                  }}
                >
                  Our mission is to spark curiosity and creativity by helping
                  kids explore countries & cultures. Through games, visuals, and
                  creativity, we help young explorers see the beauty and
                  diversity of our planet one country at a time. Every spin of
                  the globe is a new discovery waiting to happen!
                </p>
              </div>
              <div
                style={{
                  flex: "0 0 240px",
                  height: "280px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image
                  src="/homepage/about-us.png"
                  alt="About us"
                  width={240}
                  height={280}
                  style={{
                    objectFit: "contain",
                    width: "100%",
                    height: "100%",
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ══ TESTIMONIALS ══ */}
        <section
          id="testimonials"
          className="text-white py-20"
          style={{ backgroundColor: "#011899" }}
        >
          <div className="mx-auto max-w-6xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2
                style={{
                  fontFamily: "var(--font-gafiton)",
                  fontWeight: 400,
                  fontSize: "76px",
                  lineHeight: "100%",
                  textAlign: "center",
                  textTransform: "capitalize",
                  color: "#FF6CB7",
                }}
              >
                Testimonials
              </h2>
              <p
                className="mt-4"
                style={{
                  fontFamily: "var(--font-gafiton)",
                  fontWeight: 400,
                  fontSize: "36px",
                  lineHeight: "100%",
                  textAlign: "center",
                  textTransform: "capitalize",
                }}
              >
                See What Our Little Explorers And Their Parents Have To Say!
              </p>
            </div>
            <div className="relative mt-20 flex items-center justify-center">
              <img
                src="/homepage/testimonials/testimonial-left.png"
                alt="testimonial"
                className="absolute left-0 w-72 -rotate-6"
              />
              <img
                src="/homepage/testimonials/testimonial-center.png"
                alt="testimonial"
                className="relative z-10 w-96"
              />
              <img
                src="/homepage/testimonials/testimonial-right.png"
                alt="testimonial"
                className="absolute right-0 w-72 rotate-6"
              />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
