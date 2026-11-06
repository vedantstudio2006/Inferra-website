import PageShell from "./PageShell";

// Edit this list with your real departments.
const departments = [
  {
    name: "Web & App Development",
    text: "Students design and ship real websites and apps for clubs, events and local businesses.",
    focus: "React, Node.js, UI design",
  },
  {
    name: "AI & Machine Learning",
    text: "Teams train and test models on real data, from image recognition to simple chatbots.",
    focus: "Python, data, model training",
  },
  {
    name: "Cyber Security",
    text: "Build skills to identify vulnerabilities, defend digital systems and solve real-world security challenges.",
    focus: "Ethical Hacking, Linux, Web Security, Digital Forensics"
  },
  {
    name: "Outreach Cell",
    text: "Build meaningful connections with industry professionals, collaborate with communities and bring opportunities, partnerships and ideas to Inferra Labs.",
    focus: "Industry Relations, Networking, Partnerships, Community Engagement"
  },
  {
    name: "Design & Media",
    text: "Branding, posters, video and motion work that gives every project its identity.",
    focus: "Branding, video, motion",
  },
];

export default function Department() {
  return (
    <PageShell>
      <div className="pg__split">
        <div>
          <h1 className="pg__title">Departments</h1>
          <p className="pg__lead">
            Pick the area you want to build in. Every department works on real projects, not exercises.
          </p>
        </div>

        <div className="pg__rows">
          {departments.map((d) => (
            <article className="pg__row" key={d.name}>
              <h2>{d.name}</h2>
              <p>{d.text}</p>
              <small>{d.focus}</small>
            </article>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
