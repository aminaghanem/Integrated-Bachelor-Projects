"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";

export default function QuizPassed({ countryName }: { countryName: string }) {
  const router = useRouter();

  const handleCollectStamp = () => {
    // TODO: call API to award stamp, then navigate to map
    router.push("/passport");
  };

  return (
    <>
      <style>{`
        .passed-page {
          background-color: var(--midnight-blue);
          max-height: 100vh;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-bottom: 80px;
        }

        .passed-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 80px;
          width: 100%;
          max-width: 1440px;
          margin: 0 auto;
          position: relative;
        }

        .congrats-title {
          font-family: var(--font-gafiton), sans-serif;
          font-weight: 400;
          font-size: 40px;
          line-height: 100%;
          letter-spacing: 0.02em;
          text-align: center;
          text-transform: uppercase;
          color: var(--yellow-primary);
          margin: 0 0 10px 0;
        }

        .congrats-sub {
          font-family: var(--font-gafiton), sans-serif;
          font-weight: 400;
          font-size: 20px;
          line-height: 100%;
          letter-spacing: 0.02em;
          text-align: center;
          text-transform: uppercase;
          color: white;
          margin: 0 0 8px 0;
        }

        .passport-img-wrap {
          width: 700px;
          // max-width: 90vw;
          margin-bottom: 5px;
          margin-right: 110px;
        }

        .collect-btn {
          width: 262px;
          height: 48px;
          background: white;
          color: var(--black-neutral);
          border: 1px solid var(--black-neutral);
          padding: 0 47px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-family: Helvetica, Arial, sans-serif;
          font-weight: 700;
          font-style: oblique;
          font-size: 20px;
          line-height: 105%;
          letter-spacing: 0.05em;
          text-align: center;
          text-transform: uppercase;
          transition: all 0.15s;
          white-space: nowrap;
          margin-left: 50px;
        }

        .collect-btn:hover {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0px var(--yellow-primary);
        }

        @media (max-width: 768px) {
          .congrats-title { font-size: 28px; }
          .congrats-sub   { font-size: 16px; }
          .passport-img-wrap { width: 90vw; }
        }
      `}</style>

      <div className="passed-page">
        <Navbar />
        {/* Corner GIFs */}
        <img
          src="/gifs/firework.gif"
          alt=""
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            width: 400,
            pointerEvents: "none",
            zIndex: 1,
            opacity: 0.8,
          }}
        />

        <img
          src="/gifs/firework.gif"
          alt=""
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 400,
            pointerEvents: "none",
            zIndex: 1,
            opacity: 0.8,
          }}
        />

        <img
          src="/gifs/firework.gif"
          alt=""
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            width: 400,
            pointerEvents: "none",
            zIndex: 1,
            opacity: 0.8,
          }}
        />

        <img
          src="/gifs/firework.gif"
          alt=""
          style={{
            position: "absolute",
            bottom: 10,
            right: 10,
            width: 400,
            pointerEvents: "none",
            zIndex: 1,
            opacity: 0.8,
          }}
        />

        <div className="passed-inner">
          <h1 className="congrats-title">Congratulations You Did It</h1>
          <p className="congrats-sub">
            Are You Ready To Collect
            <br />
            Your Passport Stamps
          </p>

          <div className="passport-img-wrap">
            <Image
              src="/homepage/collect-earn.png"
              alt="Passport stamps"
              width={700}
              height={611}
              style={{
                width: "77%",
                height: "auto",
                display: "block",
                margin: "0 auto",
              }}
              priority
            />
          </div>

          <button
            className="collect-btn subtitle_v2"
            onClick={handleCollectStamp}
          >
            COLLECT STAMP
          </button>
        </div>
      </div>
    </>
  );
}
