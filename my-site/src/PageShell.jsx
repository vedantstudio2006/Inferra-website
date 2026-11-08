import { useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import bg from "./assets/home3-bg.png"; // same image as the hero
import { pages, getNeighbors } from "./pages";
import "./Page.css";

export default function PageShell({ children }) {
  const { pathname } = useLocation();
  const neighbors = getNeighbors(pathname);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="pg" style={{ backgroundImage: `url(${bg})` }}>
      <div className="pg__frame">
        <header className="pg__nav">
          <Link to="/" className="pg__logo" aria-label="Home">
            <svg width="50" height="22" viewBox="0 0 50 22" fill="none" stroke="#fff" strokeWidth="1">
              <path d="M1 8 L25 13 L49 8 V20 L25 15 L1 20 Z" />
              <circle cx="25" cy="6" r="4" fill="#fff" />
            </svg>
          </Link>
          <nav className="pg__links">
            {pages.map((p) => (
              <NavLink
                key={p.path}
                to={p.path}
                end
                className={({ isActive }) => (isActive ? "is-active" : undefined)}
              >
                {p.label}
              </NavLink>
            ))}
          </nav>
          <a className="pg__contact" href="#contact">Contact</a>
        </header>

        <main className="pg__main">{children}</main>

        <footer className="pg__foot">
          {neighbors ? (
            <>
              <Link to={neighbors.prev.path} className="pg__step">‹ Previous · {neighbors.prev.label}</Link>
              <span className="pg__year">2026© Inferra Labs</span>
              <Link to={neighbors.next.path} className="pg__step pg__step--next">{neighbors.next.label} · Next ›</Link>
            </>
          ) : (
            <Link to="/" className="pg__step">‹ Back to Home</Link>
          )}
        </footer>
      </div>
    </div>
  );
}
