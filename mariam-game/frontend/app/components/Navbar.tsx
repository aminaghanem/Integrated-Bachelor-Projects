"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  const [token, setToken] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setToken(localStorage.getItem("token"));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    window.location.href = "/";
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          background: transparent;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 40px 40px 0 40px;
        }

        .brand span {
          display: block;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 32px;
          padding-top: 4px;
        }

        .nav-link {
          font-family: Helvetica, Arial, sans-serif;
          font-weight: 400;
          font-size: 18px;
          line-height: 106%;
          letter-spacing: 0%;
          text-align: center;
          color: #ffffff;
          text-decoration: none;
          transition: opacity 0.2s;
          white-space: nowrap;
        }

        .nav-link:hover { opacity: 0.75; }


        /* Mobile */
        .hamburger {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: white;
          padding-top: 4px;
        }

        .mobile-menu {
          display: none;
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(26, 26, 110, 0.97);
          z-index: 49;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 36px;
        }

        .mobile-menu.open { display: flex; }

        .mobile-link {
          font-family: Helvetica, Arial, sans-serif;
          font-weight: 400;
          font-size: 22px;
          color: #ffffff;
          text-decoration: none;
        }

        .mobile-logout {
          font-family: Helvetica, Arial, sans-serif;
          font-weight: 400;
          font-size: 22px;
          color: #ff6db7;
          background: none;
          border: none;
          cursor: pointer;
        }

        .close-btn {
          position: absolute;
          top: 40px; right: 40px;
          background: none;
          border: none;
          color: white;
          font-size: 28px;
          cursor: pointer;
          line-height: 1;
        }

        @media (max-width: 640px) {
          .nav-links { display: none; }
          .hamburger { display: block; }
          .navbar { padding: 40px 24px 0 24px; }
        }
      `}</style>

      <header className="navbar">
        <Image
          src="/planet play.png"
          alt="Planet Play"
          width={80}
          height={34}
          priority
        />

        {/* Desktop nav */}
        <nav className="nav-links">
          {token ? (
            <>
              <Link href="/dashboard" className="nav-link">
                Home
              </Link>
              <Link href="/map" className="nav-link">
                Explore
              </Link>
              <Link href="/my-collection" className="nav-link">
                My Collection
              </Link>
              <Link href="/passport" className="nav-link">
                Profile
              </Link>
              <button onClick={handleLogout} className="nav-link">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="nav-link">
                Login
              </Link>
              <Link href="/signup" className="nav-link">
                Signup
              </Link>
            </>
          )}
        </nav>

        {/* Hamburger (mobile) */}
        <button
          className="hamburger"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </header>

      {/* Mobile menu overlay */}
      <div className={`mobile-menu ${open ? "open" : ""}`}>
        <button className="close-btn" onClick={() => setOpen(false)}>
          ✕
        </button>
        {token ? (
          <>
            <Link
              href="/explore"
              className="mobile-link"
              onClick={() => setOpen(false)}
            >
              Explore
            </Link>
            <Link
              href="/collection"
              className="mobile-link"
              onClick={() => setOpen(false)}
            >
              My Collection
            </Link>
            <button onClick={handleLogout} className="mobile-logout">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="mobile-link"
              onClick={() => setOpen(false)}
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="mobile-link"
              onClick={() => setOpen(false)}
            >
              Signup
            </Link>
          </>
        )}
      </div>
    </>
  );
}
