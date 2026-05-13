"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";

export default function QuizFailed({ countryName }: { countryName: string }) {
  const router = useRouter();

  return (
    <>
      <style>{`
        .failed-page {
          background-color: var(--midnight-blue);
          min-height: 100vh;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-bottom: 80px;
        }

        .failed-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding-top: 80px;
          width: 100%;
          max-width: 1440px;
          margin: 0 auto;
          gap: 32px;
        }

        .sorry-title {
          font-family: var(--font-gafiton), sans-serif;
          font-weight: 400;
          font-size: 96px;
          line-height: 100%;
          letter-spacing: 0%;
          text-transform: capitalize;
          color: white;
          margin: 0;
        }

        .sad-globe-wrap {
          width: 231px;
          height: 232px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .failed-message {
          font-family: var(--font-gafiton), sans-serif;
          font-weight: 400;
          font-size: 32px;
          line-height: 100%;
          letter-spacing: 0.02em;
          text-align: center;
          text-transform: uppercase;
          color: white;
          margin: 0;
          max-width: 600px;
        }

        .back-btn {
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
          margin-top: 50px;
        }

        .back-btn:hover {
          transform: translate(-2px, -2px);
          box-shadow: 3px 3px 0px var(--yellow-primary);
        }

        @media (max-width: 768px) {
          .sorry-title    { font-size: 64px; }
          .failed-message { font-size: 22px; }
          .sad-globe-wrap { width: 160px; height: 160px; }
        }
      `}</style>

      <div className="failed-page">
        <Navbar />
        <div className="failed-inner">
          <h1 className="sorry-title">Sorry!</h1>

          <div className="sad-globe-wrap">
            <Image
              src="/quiz/sad-globe.png"
              alt="Sad globe"
              width={231}
              height={232}
              style={{ width: "100%", height: "auto" }}
              priority
            />
          </div>

          <p className="failed-message">
            It&apos;s Okay Revisit The Country
            <br />
            And Retake The Quiz
          </p>

          <button
            className="back-btn subtitle_v2"
            onClick={() => router.push(`/${countryName.toLowerCase()}`)}
          >
            BACK TO COUNTRY
          </button>
        </div>
      </div>
    </>
  );
}
