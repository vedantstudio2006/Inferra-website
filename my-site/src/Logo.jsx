import logo from "./assets/logo.png";
import "./Logo.css";

// Inferra Labs badge.
// size    = logo diameter in px (the visible picture)
// padding = empty space around the logo, in px
// margin  = outer space around the whole logo box, in px
export default function Logo({ size = 28, padding = 6, margin = 0 }) {
  return (
    <img
      src={logo}
      alt="Inferra Labs"
      draggable="false"
      className="brand-logo"
      style={{
        "--logo-size": `${size}px`,
        "--logo-pad": `${padding}px`,
        "--logo-margin": `${margin}px`,
      }}
    />
  );
}
