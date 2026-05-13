"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

export default function PassportPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    const name = localStorage.getItem("firstName");
    if (name) setFirstName(name);
  }, []);

  return (
    <>
      <style>{`
        .passport-page {
          background-color: var(--pink-primary);
          max-height: 100vh;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        /* Yellow tape strips — top and bottom */
        .tape-top {
          position: absolute;
          top: 80px;
          left: 0;
          width: 100%;
          z-index: 2;
          pointer-events: none;
        }

        .tape-bottom {
          position: absolute;
          bottom: 40px;
          left: 0;
          width: 100%;
          z-index: 2;
          pointer-events: none;
        }

        .tape-top img,
        .tape-bottom img {
          width: 100%;
          height: auto;
          display: block;
        }

        /* Passport container */
        .passport-wrap {
          position: relative;
          width: 370px;
          height: 712px;
          z-index: 3;
          cursor: pointer;
          transition: transform 0.2s;
          margin-top: 80px;
          margin-bottom: 20px;
        }

        .passport-wrap:hover {
          transform: scale(1.02);
        }

        /* Name overlay on the passport */
        .passport-name {
          position: absolute;
          bottom: 100px;
          left: 0;
          right: 0;
          text-align: center;
          z-index: 4;
          pointer-events: none;
          font-family: var(--font-gafiton), sans-serif;
          font-weight: 400;
          font-size: 36px;
          line-height: 100%;
          letter-spacing: 3%;
          text-transform: capitalize;
          color: var(--yellow-primary);
        }

        @media (max-width: 600px) {
          .passport-wrap {
            width: 80vw;
            height: auto;
          }
          .passport-name { font-size: 24px; bottom: 60px; }
        }
      `}</style>

      <div className="passport-page">
        <Navbar />

        {/* Top tape strip */}
        <div className="tape-top">
          <Image
            src="/passport/tape-top.png"
            alt=""
            width={1440}
            height={80}
            style={{
              width: "100%",
              height: "auto",
              transform: "translateY(-15px) rotateZ(-1deg)",
            }}
          />
        </div>

        {/* Passport — clickable */}
        <div
          className="passport-wrap"
          onClick={() => {
            router.push("/passport/viewed");
          }}
          role="button"
          aria-label="Open passport"
        >
          <Image
            src="/passport/passport-closed.png"
            alt="Your passport"
            width={439}
            height={712}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            priority
          />
          {/* Username overlay */}
          <p className="passport-name">
            {firstName ? `${firstName}'s` : "Your"}
            <br />
            Passport
          </p>
        </div>

        {/* Bottom tape strip */}
        <div className="tape-bottom">
          <Image
            src="/passport/tape-bottom.png"
            alt=""
            width={1440}
            height={80}
            style={{
              width: "100%",
              height: "auto",
              transform: "translateY(60px) rotateZ(3deg)",
            }}
          />
        </div>
      </div>
    </>
  );
}
