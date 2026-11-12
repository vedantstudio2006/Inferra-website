// Shared helpers for the interview system. Never log raw QR tokens.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import QRCode from "npm:qrcode@1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const secretKeyMap = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || secretKeyMap.default || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "";
const TOKEN_DAYS = Number(Deno.env.get("QR_TOKEN_VALID_DAYS") || "45");

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/; // 32 random bytes, base64url, no padding

export function serviceClient(): SupabaseClient {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Supabase backend credentials are missing.");
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// CORS: same ALLOWED_ORIGINS secret as submit-application.
export function corsFor(req: Request) {
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") || "http://localhost:5173")
    .split(",").map((s) => s.trim());
  const origin = req.headers.get("Origin") || "";
  const ok = !origin || allowed.includes(origin);
  return {
    ok,
    headers: {
      "Access-Control-Allow-Origin": origin && ok ? origin : allowed[0],
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      Vary: "Origin",
    } as Record<string, string>,
  };
}

export function reply(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

// Validates the caller's Supabase Auth JWT. Returns null if not signed in.
export async function requireUser(req: Request, admin: SupabaseClient) {
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
}

export async function rolesOf(admin: SupabaseClient, userId: string): Promise<string[]> {
  const { data } = await admin.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r) => r.role as string);
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// 32 cryptographically secure random bytes, base64url encoded (43 chars).
export function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Revokes any live pass for the application and stores a hash of a new one.
// Returns the raw token ONCE so it can be put in the QR image.
export async function issueQrToken(admin: SupabaseClient, applicationId: string): Promise<string> {
  await admin.from("student_qr_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("application_id", applicationId)
    .is("revoked_at", null);

  const token = newToken();
  const { error } = await admin.from("student_qr_tokens").insert({
    application_id: applicationId,
    token_hash: await sha256Hex(token),
    expires_at: new Date(Date.now() + TOKEN_DAYS * 86400000).toISOString(),
  });
  if (error) throw new Error("Could not create QR token.");
  return token;
}

export async function qrPngBase64(token: string): Promise<string> {
  const dataUrl = await QRCode.toDataURL(token, { errorCorrectionLevel: "M", margin: 2, width: 600 });
  return dataUrl.split(",")[1];
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c);
}

async function sendResend(payload: Record<string, unknown>): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: RESEND_FROM_EMAIL, ...payload }),
  });
  if (!res.ok) {
    console.error("Resend failed with status", res.status);
    return false;
  }
  return true;
}

// Registration receipt + QR pass. The QR is attached and shown inline (cid).
export async function sendQrEmail(opts: {
  to: string; firstName: string; applicationId: string; department: string; token: string;
}): Promise<boolean> {
  const png = await qrPngBase64(opts.token);
  const name = escapeHtml(opts.firstName);
  const dept = escapeHtml(opts.department);
  const ref = escapeHtml(opts.applicationId);
  return sendResend({
    to: [opts.to],
    subject: "Inferra Labs | Registration Confirmed - Your Interview QR Pass",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#111">
        <h1 style="font-size:24px">Welcome to Inferra Labs, ${name}!</h1>
        <p>Your registration is complete. Keep this email, you will need your QR pass on interview day.</p>
        <p><b>Application reference:</b> ${ref}<br/><b>Department:</b> ${dept}</p>
        <div style="text-align:center;margin:24px 0">
          <img src="cid:qrpass" width="240" height="240" alt="Your interview QR pass"
               style="border:1px solid #ddd;padding:8px" />
        </div>
        <h3>On interview day</h3>
        <ol>
          <li>Arrive at the reporting time shown by the recruitment team.</li>
          <li>Show this QR code to the staff member at the room entrance.</li>
          <li>Do not share or forward this QR code. Anyone with it can check in.</li>
        </ol>
        <p>Your panel and room will be confirmed by a separate email. If you lose this pass, reply to this email and we will send a new one.</p>
        <p>Regards,<br/><b>Inferra Labs Recruitment Team</b></p>
      </div>`,
    attachments: [{ filename: "inferra-labs-qr-pass.png", content: png, content_id: "qrpass" }],
  });
}

// Sends a minimal notification to a panel's private channel (no PII, no tokens).
export async function broadcastToPanel(
  admin: SupabaseClient, panelId: string, event: string, payload: Record<string, unknown>,
) {
  const channel = admin.channel(`panel:${panelId}`, { config: { private: true } });
  const status = await channel.send({ type: "broadcast", event, payload });
  if (status !== "ok") console.error("Panel broadcast did not succeed:", status);
  await admin.removeChannel(channel);
}
