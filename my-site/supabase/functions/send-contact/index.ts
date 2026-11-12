// Public contact form. Sends the message to the team inbox through Resend.
// Secrets: RESEND_API_KEY, RESEND_FROM_EMAIL, CONTACT_TO_EMAIL, ALLOWED_ORIGINS
import { corsFor, reply } from "../_shared/interview.ts";

const SUBJECTS = [
  "General question",
  "Recruitment",
  "Partnership or sponsorship",
  "Department enquiry",
];
const MAX_BODY = 8192;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c);

Deno.serve(async (req) => {
  const cors = corsFor(req);
  if (!cors.ok) return new Response("Origin not allowed", { status: 403 });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors.headers });
  if (req.method !== "POST") return reply({ success: false, error: "Method not allowed." }, 405, cors.headers);

  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return reply({ success: false, error: "Message is too long." }, 413, cors.headers);
    const body = JSON.parse(raw || "{}");

    // Honeypot: bots fill the hidden field, people never do
    if (String(body.website || "").trim()) {
      return reply({ success: true }, 200, cors.headers); // pretend success, send nothing
    }

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();

    if (name.length < 2 || name.length > 80) throw new Error("Please enter your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw new Error("Please enter a valid email address.");
    if (!SUBJECTS.includes(subject)) throw new Error("Please choose a topic.");
    if (message.length < 10 || message.length > 2000) throw new Error("Message must be between 10 and 2000 characters.");

    const apiKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("RESEND_FROM_EMAIL");
    const to = Deno.env.get("CONTACT_TO_EMAIL");
    if (!apiKey || !from || !to) {
      console.error("Contact email secrets are missing.");
      return reply({ success: false, error: "Contact form is not configured yet." }, 500, cors.headers);
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `[Website] ${subject}: ${name}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px">
            <h2 style="margin:0 0 12px">New message from the website</h2>
            <p><b>Name:</b> ${esc(name)}<br/><b>Email:</b> ${esc(email)}<br/><b>Topic:</b> ${esc(subject)}</p>
            <div style="padding:14px;border-left:3px solid #1d4ed8;background:#f3f6fb;white-space:pre-wrap">${esc(message)}</div>
            <p style="color:#666;font-size:12px">Reply to this email to answer ${esc(name)} directly.</p>
          </div>`,
      }),
    });
    if (!res.ok) {
      console.error("Contact email failed with status", res.status);
      return reply({ success: false, error: "Could not send your message. Please try again later." }, 502, cors.headers);
    }

    return reply({ success: true }, 200, cors.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong.";
    const validation = message.startsWith("Please") || message.startsWith("Message must");
    return reply({ success: false, error: validation ? message : "Something went wrong. Try again." },
      validation ? 400 : 500, cors.headers);
  }
});
