import "./Hero.css";
import "./Landing.css";
import bg from "./assets/home3-bg.png";
import { Link, useNavigate } from "react-router-dom";

const links = [
  { label: "Home", to: "/" },
  { label: "Department", to: "/department" },
  { label: "Team", to: "/team" },
  { label: "About", to: "/about" },
];

export default function Hero() {
  const navigate = useNavigate();
  const onMove = (e) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    e.currentTarget.style.setProperty("--px", (e.clientX / window.innerWidth - 0.5).toFixed(3));
    e.currentTarget.style.setProperty("--py", (e.clientY / window.innerHeight - 0.5).toFixed(3));
  };
  return (
    <main className="hero" onMouseMove={onMove} style={{ "--bg": `url(${bg})` }}>
      <div className="frame">
        {/* ---------- TOP NAV ---------- */}
        <header className="nav">
          <div className="nav__logo">
            <svg width="50" height="22" viewBox="0 0 50 22" fill="none" stroke="#fff" strokeWidth="1">
              <path d="M1 8 L25 13 L49 8 V20 L25 15 L1 20 Z" />
              <circle cx="25" cy="6" r="4" fill="#fff" />
            </svg>
          </div>
          <nav className="nav__links">
            {links.map((l) => (
              <Link key={l.label} to={l.to}>{l.label}</Link>
            ))}
          </nav>
          <a className="nav__contact" href="#contact">Contact</a>
        </header>

        {/* ---------- HEADLINE ---------- */}
        <h1 className="headline" aria-label="Inferra Labs">
          {"Inferra Labs".split("").map((ch, i) => (
            <span key={i} className="ch" style={{ "--d": i }} aria-hidden="true">
              {ch === " " ? "\u00A0" : ch}
            </span>
          ))}
        </h1>

        {/* ---------- CONNECTOR LINES (SVG, % based) ---------- */}
        <svg className="lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline points="20,38 27,38 34,51.5" />
          <polyline points="66,51.5 69,43.5 78,43.5" />
        </svg>
        <span className="dot" style={{ left: "34%", top: "51.5%" }} />
        <span className="dot" style={{ left: "66%", top: "43.5%" }} />

        {/* ---------- LEFT GLASS CARD ---------- */}
        <aside className="card card--left">
          <h3>Think. Build. Innovate.</h3>
          <p>Where students create technology that matters.</p>
          <div className="card__btns">
            <span className="chip chip--light">S</span>
            <button className="chip chip--dark" aria-label="Add">+</button>
          </div>
        </aside>

        {/* ---------- RIGHT GLASS CARD ---------- */}
        <aside className="card card--right">
          <h3>Beyond Classrooms</h3>
          <p>Building skills through real-world engineering.</p>
          {/* <div className="avatars">
            {[1, 2, 3].map((i) => (
              <img key={i} src={`https://i.pravatar.cc/60?img=${i + 10}`} alt="" />
            ))}
          </div> */}
        </aside>

        {/* ---------- GRID LINES ---------- */}
        <div className="hline" />
        <div className="vline vline--left" />
        <div className="vline vline--right" />
        <span className="diamond" style={{ left: "25%", top: "64%" }} />
        <span className="diamond" style={{ left: "73%", top: "64%" }} />

        {/* ---------- DASHED ARC ---------- */}
        <div className="arc" />

        {/* ---------- CENTER BUTTON ---------- */}
        <Link to="/recruitment" className="cta" aria-label="Recruitment">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#111" strokeWidth="1.5">
            <path d="M4 14 L14 4 M6 4 H14 V12" />
          </svg>
          <span className="cta__label">Recruitment</span>
        </Link>

        {/* ---------- PREV / NEXT ---------- */}
        <button className="step step--prev" onClick={() => navigate("/about")}>‹ Previous</button>
        <button className="step step--next" onClick={() => navigate("/department")}>Next ›</button>

        {/* ---------- BOTTOM-LEFT PANEL ---------- */}
        <small className="year">2025©</small>
        <div className="grid-panel">
          <i style={{ left: "35%", top: "33%" }} />
          <i style={{ left: "35%", top: "50%" }} />
          <i style={{ left: "52%", top: "50%" }} />
          <i style={{ left: "52%", top: "66%" }} />
          <i style={{ left: "69%", top: "66%" }} />
        </div>

        {/* ---------- BOTTOM-RIGHT PANEL ---------- */}
        <div className="sign-panel">
          <p>Creating brands for the future of technology</p>
          <svg viewBox="0 0 120 50" width="120" height="50" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round">
            <path className="sig" pathLength="1" d="M18 8 C12 20 8 36 14 44 C20 38 18 20 28 12 M20 26 C34 22 44 28 40 36 C50 30 60 18 70 24 C76 36 90 22 112 20" />
          </svg>
        </div>

        {/* ---------- BOTTOM TEXT ---------- */}
        <p className="blurb">
          We craft brands and digital experiences that don't just look beautiful,
          they endure. Every pixel, every detail, designed to echo long after the
          screen goes dark.
        </p>
      </div>
    </main>
  );
}
