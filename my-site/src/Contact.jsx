import { useState } from "react";
import PageShell from "./PageShell";
import { supabase } from "./lib/supabase";
import "./Contact.css";

// EDIT THESE with your real details. Leave a value empty to hide that row.
const channels = [
  { label: "Email", value: "hello@inferralabs.com", href: "mailto:hello@inferralabs.com" },
  { label: "Phone", value: "+91 00000 00000", href: "tel:+910000000000" },
  { label: "Location", value: "Campus Innovation Hub, Room 101" },
  { label: "Office hours", value: "Mon to Fri, 10:00 to 18:00" },
];

const socials = [
  { label: "GitHub", href: "https://github.com/" },
  { label: "LinkedIn", href: "https://linkedin.com/" },
  { label: "Instagram", href: "https://instagram.com/" },
];

const subjects = [
  "General question",
  "Recruitment",
  "Partnership or sponsorship",
  "Department enquiry",
];

const MESSAGE_MAX = 2000;
const EMPTY = { name: "", email: "", subject: "", message: "", website: "" };

async function readError(error) {
  if (error?.context instanceof Response) {
    const details = await error.context.clone().json().catch(() => null);
    if (details?.error) return details.error;
  }
  return "Could not send your message. Please try again.";
}

export default function Contact() {
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    setError("");

    const { data, error: fnError } = await supabase.functions.invoke("send-contact", { body: form });

    if (fnError || !data?.success) {
      setError(fnError ? await readError(fnError) : data?.error || "Could not send your message.");
      setStatus("error");
      return;
    }
    setForm(EMPTY);
    setStatus("sent");
  }

  return (
    <PageShell>
      <div className="ct">
        <span className="ct__orb ct__orb--a" aria-hidden="true" />
        <span className="ct__orb ct__orb--b" aria-hidden="true" />

        <header className="ct__hero">
          <p className="ct__eyebrow ct__reveal" style={{ "--d": 0 }}>Get in touch</p>
          <h1 className="pg__title ct__reveal" style={{ "--d": 1 }}>
            Let's build<br />something <em>together.</em>
          </h1>
          <p className="pg__lead ct__reveal" style={{ "--d": 2 }}>
            Questions about recruitment, a partnership, or one of our departments? Send us a message and a real person from the team will reply.
          </p>
        </header>

        <div className="ct__grid">
          <aside className="ct__info">
            {channels.filter((c) => c.value).map((c, i) => (
              <div key={c.label} className="ct__card ct__reveal" style={{ "--d": 3 + i }}>
                <span className="ct__index">0{i + 1}</span>
                <span className="ct__label">{c.label}</span>
                {c.href ? <a href={c.href} className="ct__value">{c.value}</a> : <span className="ct__value">{c.value}</span>}
              </div>
            ))}

            <div className="ct__socials ct__reveal" style={{ "--d": 8 }}>
              {socials.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer">{s.label}</a>
              ))}
            </div>
          </aside>

          <section className="ct__panel ct__reveal" style={{ "--d": 4 }}>
            {status === "sent" ? (
              <div className="ct__thanks" role="status">
                <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
                  <circle className="ct__ring" cx="32" cy="32" r="28" fill="none" stroke="#7ee2a8" strokeWidth="2" />
                  <path className="ct__tick" d="M19 33 L28 42 L46 23" fill="none" stroke="#7ee2a8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h2>Message sent</h2>
                <p>Thank you for reaching out. We will reply to your email soon.</p>
                <button className="ct__btn" type="button" onClick={() => setStatus("idle")}>Send another message</button>
              </div>
            ) : (
              <form className="ct__form" onSubmit={handleSubmit}>
                <div className="ct__row">
                  <Field label="Your name">
                    <input required maxLength={80} autoComplete="name" value={form.name} onChange={set("name")} />
                  </Field>
                  <Field label="Email">
                    <input type="email" required maxLength={200} autoComplete="email" value={form.email} onChange={set("email")} />
                  </Field>
                </div>

                <Field label="Topic">
                  <select required value={form.subject} onChange={set("subject")}>
                    <option value="" disabled>Choose a topic</option>
                    {subjects.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>

                <Field label="Message" hint={`${form.message.length} / ${MESSAGE_MAX}`}>
                  <textarea required rows="6" minLength={10} maxLength={MESSAGE_MAX} value={form.message} onChange={set("message")} />
                </Field>

                {/* Honeypot: hidden from people, filled in by bots */}
                <div className="ct__hp" aria-hidden="true">
                  <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} /></label>
                </div>

                {status === "error" && <p className="ct__error" role="alert">{error}</p>}

                <button className="ct__btn ct__btn--main" type="submit" disabled={status === "sending"}>
                  <span>{status === "sending" ? "Sending..." : "Send message"}</span>
                  <span className="ct__arrow" aria-hidden="true">→</span>
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </PageShell>
  );
}

// Field with an animated underline that grows on focus
function Field({ label, hint, children }) {
  return (
    <label className="ct__field">
      <span className="ct__fieldlabel">
        {label}
        {hint && <small>{hint}</small>}
      </span>
      {children}
      <span className="ct__line" aria-hidden="true" />
    </label>
  );
}
