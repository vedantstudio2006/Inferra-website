import { useState } from "react";
import PageShell from "./PageShell";
import "./Recruitment.css";

// 1. Create a free form at https://formspree.io
// 2. Paste your form's endpoint here (looks like https://formspree.io/f/abcdwxyz)
const FORM_ENDPOINT = "https://formspree.io/f/xkjjelww";

const interests = [
  "Web & App Development",
  "AI & Machine Learning",
  "Cyber Security",
  "OutReach Cell",
  "Design & Media",
];
const years = ["First year", "Second year", "Third year", "Final year"];

export default function Recruitment() {
  const [status, setStatus] = useState("idle"); // idle | sending | success | error

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(e.currentTarget),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <PageShell>
      <div className="pg__split">
        <div>
          <h1 className="pg__title">Recruitment</h1>
          <p className="pg__lead">
            Join Inferra Labs. Fill in the form and we will contact you by email about the next steps.
          </p>
        </div>

        {status === "success" ? (
          <div className="rec__done">
            <h2>You're registered</h2>
            <p>Thanks for applying. Check your email, we will get back to you soon.</p>
          </div>
        ) : (
          <form className="rec__form" onSubmit={handleSubmit}>
            <div className="rec__field">
              <label htmlFor="name">Full name</label>
              <input id="name" name="name" required autoComplete="name" />
            </div>
            <div className="rec__field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="rec__field">
              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" type="tel" autoComplete="tel" />
            </div>
            <div className="rec__field">
              <label htmlFor="branch">Branch / course</label>
              <input id="branch" name="branch" required />
            </div>
            <div className="rec__field">
              <label htmlFor="year">Year</label>
              <select id="year" name="year" required defaultValue="">
                <option value="" disabled>Select year</option>
                {years.map((y) => <option key={y}>{y}</option>)}
              </select>
            </div>
            <div className="rec__field">
              <label htmlFor="interest">Department you want to join</label>
              <select id="interest" name="interest" required defaultValue="">
                <option value="" disabled>Select department</option>
                {interests.map((i) => <option key={i}>{i}</option>)}
              </select>
            </div>
            <div className="rec__field rec__field--full">
              <label htmlFor="message">Why do you want to join?</label>
              <textarea id="message" name="message" rows="4" />
            </div>

            <button className="rec__submit" type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Sending..." : "Register"}
            </button>
            {status === "error" && (
              <p className="rec__error" role="alert">
                Could not send the form. Check your internet connection and try again.
              </p>
            )}
          </form>
        )}
      </div>
    </PageShell>
  );
}
