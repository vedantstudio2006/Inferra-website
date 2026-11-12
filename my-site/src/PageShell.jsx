import { useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import Logo from "./Logo";
import bg from "./assets/home3-bg.png"; // same image as the hero

import { pages, getNeighbors } from "./pages";
import "./Page.css";

export default function PageShell({ children, backdrop }) {
  const { pathname } = useLocation();
  const neighbors = getNeighbors(pathname);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="pg" style={{ backgroundImage: `url(${bg})` }}>
      {backdrop}
      <div className="pg__frame">
        <header className="pg__nav">
          <Link to="/" className="pg__logo" aria-label="Home">
            <Logo size={28} padding={6} margin={0} />

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
          <Link to="/contact" className="pg__contact">Contact</Link>
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
