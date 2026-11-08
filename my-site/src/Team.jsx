import PageShell from "./PageShell";
import "./Team.css";

// Put the photos in src/assets/team/ and write the file names below.
// If a photo is missing, the card shows the member's initials instead.
const photo = (file) => new URL(`./assets/team/${file}`, import.meta.url).href;

// EDIT THIS LIST with the real details. Leave a link as "" to hide its icon.
const members = [
  {
    role: "President",
    name: "Abhishek Patil",
    photo: "President.jpg",
    branch: "Mechnical Engineering",
    year: "Third year",
    specialization: "Leadership, Product Strategy",
    linkedin: "https://linkedin.com/in/username",
    github: "https://github.com/username",
    email: "name@example.com",
  },
  {
    role: "Vice President",
    name: "Pranav Bhongale",
    photo: "Vice_President.jpg",
    branch: "Mechnical Engineering",
    year: "Third year",
    specialization: "Operations, Team Management",
    linkedin: "https://linkedin.com/in/username",
    github: "https://github.com/username",
    email: "name@example.com",
  },
  {
    role: "Technical Head",
    name: "Proova Rane",
    photo: "Technical_Head.jpg",
    branch: "Electrical Engineering",
    year: "Third year",
    specialization: "Full-Stack, AI / ML",
    linkedin: "https://linkedin.com/in/username",
    github: "https://github.com/username",
    email: "name@example.com",
  },
  {
    role: "Project Manager",
    name: "Sudarshan Sooryavanshi",
    photo: "Project_Manager.jpg",
    branch: "Artifical & Data Science",
    year: "Second year",
    specialization: "Planning, Agile Delivery",
    linkedin: "https://linkedin.com/in/username",
    github: "https://github.com/username",
    email: "name@example.com",
  },
  {
    role: "Associate Project Manager",
    name: "Sharvaree Vyawahare",
    photo: "Associate_Project_Manager.JPG",
    branch: "Computer Engineering",
    year: "Third year",
    specialization: "Coordination, UI Design",
    linkedin: "https://linkedin.com/in/username",
    github: "https://github.com/username",
    email: "name@example.com",
  },
  {
    role: "Secretary",
    name: "Vaibhav Rane",
    photo: "Secretary.jpg",
    branch: "Computer Engineering",
    year: "Second year",
    specialization: "Documentation, Communication",
    linkedin: "https://linkedin.com/in/username",
    github: "https://github.com/username",
    email: "name@example.com",
  },
];

/* ---------- small inline icons ---------- */
const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z" />
  </svg>
);
const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);
const MailIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="1" />
    <path d="M3 7l9 6 9-6" />
  </svg>
);

/* ---------- 3D tilt that follows the mouse ---------- */
const reduceMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function tilt(e) {
  if (reduceMotion()) return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  el.style.setProperty("--rx", `${(-y * 7).toFixed(2)}deg`);
  el.style.setProperty("--ry", `${(x * 9).toFixed(2)}deg`);
  el.style.setProperty("--mx", `${((x + 0.5) * 100).toFixed(0)}%`);
  el.style.setProperty("--my", `${((y + 0.5) * 100).toFixed(0)}%`);
}
function untilt(e) {
  e.currentTarget.style.setProperty("--rx", "0deg");
  e.currentTarget.style.setProperty("--ry", "0deg");
}

const initials = (name) =>
  name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export default function Team() {
  return (
    <PageShell>
      <h1 className="pg__title tm__title">Meet the Team</h1>
      <p className="pg__lead">The students who lead Inferra Labs.</p>

      <section className="tm__grid">
        {members.map((m, i) => (
          <article
            key={m.role}
            className="tm__card"
            style={{ "--i": i }}
            tabIndex={0}
            onMouseMove={tilt}
            onMouseLeave={untilt}
          >
            <span className="tm__idx">{String(i + 1).padStart(2, "0")}</span>

            <div className="tm__photo" data-initials={initials(m.name)}>
              <img
                src={photo(m.photo)}
                alt={`${m.name}, ${m.role}`}
                loading="lazy"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            </div>

            <div className="tm__info">
              <header className="tm__head">
                <span className="tm__role">{m.role}</span>
                <h2 className="tm__name">{m.name}</h2>
              </header>

              <dl className="tm__details">
                <div><dt>Branch</dt><dd>{m.branch}</dd></div>
                <div><dt>Year</dt><dd>{m.year}</dd></div>
                <div><dt>Specialization</dt><dd>{m.specialization}</dd></div>
              </dl>

              <div className="tm__links">
                {m.linkedin && (
                  <a href={m.linkedin} target="_blank" rel="noreferrer" aria-label={`${m.name} on LinkedIn`}><LinkedInIcon /></a>
                )}
                {m.github && (
                  <a href={m.github} target="_blank" rel="noreferrer" aria-label={`${m.name} on GitHub`}><GitHubIcon /></a>
                )}
                {m.email && (
                  <a href={`mailto:${m.email}`} aria-label={`Email ${m.name}`}><MailIcon /></a>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>
    </PageShell>
  );
}
