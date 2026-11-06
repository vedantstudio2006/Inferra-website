import PageShell from "./PageShell";

// Edit this text with your real details.
const facts = [
  {
    title: "Our mission",
    text: "Give students a place to build technology that matters, with real users and real deadlines.",
  },
  {
    title: "What we do",
    text: "We run projects across web, AI, robotics and design, guided by mentors and senior students.",
  },
  {
    title: "Who can join",
    text: "Any student who wants to learn by building. No experience needed, only curiosity.",
  },
];

export default function About() {
  return (
    <PageShell>
      <div className="pg__split">
        <div>
          <h1 className="pg__title">About Inferra Labs</h1>
          <p className="pg__lead">
            We craft digital experiences and engineering projects that don't just look good, they last.
          </p>
        </div>

        <div className="pg__rows">
          {facts.map((f) => (
            <article className="pg__row" key={f.title}>
              <h2>{f.title}</h2>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
