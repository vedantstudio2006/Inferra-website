import { useState } from "react";
import PageShell from "./PageShell";
import "./Department.css";

// Put the 5 background images in src/assets/departments/ and write the file names below.
const img = (file) => new URL(`./assets/departments/${file}`, import.meta.url).href;

// EDIT THIS LIST. "tags" are separated by commas.
const departments = [
  
  {
    name: "AI & Machine Learning",
    bg: "AI.png",
    text: "Teams train and test models on real data, from image recognition to simple chatbots.",
    tags: "Python, data, model training",
  },
  {
    name: "Web & App Development",
    bg: "Web.png",
    text: "Students design and ship real websites and apps for clubs, events and local businesses.",
    tags: "React, Node.js, UI design",
  },
  {
    name: "Cyber Security",
    bg: "CyberSecurity.png",
    text: "Build skills to identify vulnerabilities, defend digital systems and solve real-world security challenges.",
    tags: "Ethical Hacking, Linux, Web Security, Digital Forensics",
  },
  {
    name: "Outreach Cell",
    bg: "Outreach.png",
    text: "Build meaningful connections with industry professionals, collaborate with communities and bring opportunities, partnerships and ideas to Inferra Labs.",
    tags: "Industry Relations, Networking, Partnerships, Community Engagement",
  },
  {
    name: "Design & Media",
    bg: "Design.png",
    text: "Branding, posters, video and motion work that gives every project its identity.",
    tags: "Branding, video, motion",
  },
];

export default function Department() {
  const [active, setActive] = useState(null); // index of the hovered department

  // Full-screen images, stacked. The active one fades in over the default background.
  const backdrop = (
    <div className="dp__bgs" aria-hidden="true">
      {departments.map((d, i) => (
        <div
          key={d.name}
          className={`dp__bg${active === i ? " is-on" : ""}`}
          style={{ backgroundImage: `url(${img(d.bg)})` }}
        />
      ))}
    </div>
  );

  return (
    <PageShell backdrop={backdrop}>
      <div className="pg__split">
        <div>
          <h1 className="pg__title">Departments</h1>
          <p className="pg__lead">
            Pick the area you want to build in. Every department works on real projects, not exercises.
          </p>
        </div>

        <div
          className={`dp__list${active !== null ? " has-active" : ""}`}
          onMouseLeave={() => setActive(null)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setActive(null);
          }}
        >
          {departments.map((d, i) => (
            <article
              key={d.name}
              className={`dp__row${active === i ? " is-active" : ""}`}
              style={{ "--i": i }}
              tabIndex={0}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
            >
              <span className="dp__num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>

              <div className="dp__body">
                <h2 className="dp__name">
                  <span>{d.name}</span>
                  <svg className="dp__arrow" viewBox="0 0 34 34" width="34" height="34" fill="none" stroke="#fff" strokeWidth="1.4" aria-hidden="true">
                    <circle cx="17" cy="17" r="16" />
                    <path d="M11 23 L23 11 M13 11 H23 V21" />
                  </svg>
                </h2>
                <p className="dp__text">{d.text}</p>
                <ul className="dp__tags">
                  {d.tags.split(",").map((t, k) => (
                    <li key={t} style={{ "--k": k }}>{t.trim()}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
