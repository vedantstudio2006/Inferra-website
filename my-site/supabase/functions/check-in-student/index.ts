// Staff scans a QR pass (or does a manual lookup) at a room.
// Returns a result code; the panel is notified only on a successful check-in.
import {
  serviceClient, corsFor, reply, requireUser, rolesOf, sha256Hex,
  TOKEN_RE, UUID_RE, broadcastToPanel,
} from "../_shared/interview.ts";

const MAX_BODY = 4096;
const SCANS_PER_MINUTE = 30;

Deno.serve(async (req) => {
  const cors = corsFor(req);
  if (!cors.ok) return new Response("Origin not allowed", { status: 403 });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors.headers });
  if (req.method !== "POST") return reply({ error: "Method not allowed." }, 405, cors.headers);

  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return reply({ error: "Request too large." }, 413, cors.headers);
    const body = JSON.parse(raw || "{}");

    const admin = serviceClient();
    const user = await requireUser(req, admin);
    if (!user) return reply({ error: "Please sign in." }, 401, cors.headers);

    const roles = await rolesOf(admin, user.id);
    const isAdmin = roles.includes("admin");
    if (!isAdmin && !roles.includes("staff")) return reply({ error: "Staff access only." }, 403, cors.headers);

    // The room comes from the browser, so it is checked against the staff account here.
    const roomPanelId = String(body.room_panel_id || "");
    if (!UUID_RE.test(roomPanelId)) return reply({ error: "Select a room first." }, 400, cors.headers);
    if (!isAdmin) {
      const { data } = await admin.from("staff_panel_access")
        .select("panel_id").eq("user_id", user.id).eq("panel_id", roomPanelId).maybeSingle();
      if (!data) return reply({ error: "You are not assigned to this room." }, 403, cors.headers);
    }

    // Scan throttling per staff account
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await admin.from("scan_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id).gte("created_at", since);
    if ((count ?? 0) >= SCANS_PER_MINUTE) {
      return reply({ error: "Too many scans. Wait a minute and try again." }, 429, cors.headers);
    }
    await admin.from("scan_attempts").insert({ user_id: user.id });

    let tokenHash: string | null = null;
    let applicationId: string | null = null;
    let manualReason: string | null = null;

    if (body.mode === "manual") {
      applicationId = String(body.application_id || "").trim();
      manualReason = String(body.reason || "").trim();
      if (!UUID_RE.test(applicationId)) return reply({ error: "Enter a valid application reference." }, 400, cors.headers);
      if (manualReason.length < 3 || manualReason.length > 200) {
        return reply({ error: "Enter a reason for the manual check-in (3 to 200 characters)." }, 400, cors.headers);
      }
    } else {
      const token = String(body.token || "").trim();
      if (!TOKEN_RE.test(token)) return reply({ result: "invalid" }, 200, cors.headers);
      tokenHash = await sha256Hex(token); // raw token is never stored or logged
    }

    const { data: outcome, error: rpcError } = await admin.rpc("perform_check_in", {
      p_token_hash: tokenHash,
      p_application_id: applicationId,
      p_staff_id: user.id,
      p_room_panel_id: roomPanelId,
      p_manual_reason: manualReason,
    });
    if (rpcError || !outcome) {
      console.error("check-in failed:", rpcError?.message ?? "no result");
      return reply({ error: "Check-in failed. Try again." }, 500, cors.headers);
    }

    const result = outcome as Record<string, unknown>;

    // Staff see only the name, reference and department of the student they scanned.
    let student: Record<string, string> | null = null;
    if (typeof result.application_id === "string") {
      const { data: app } = await admin.from("applications")
        .select("first_name, last_name, department, academic_year")
        .eq("id", result.application_id).maybeSingle();
      if (app) {
        student = {
          name: `${app.first_name} ${app.last_name}`,
          reference: result.application_id,
          department: app.department,
          academic_year: app.academic_year,
        };
      }
    }

    if (result.result === "checked_in") {
      // Notification only: no name, no reference, no token
      await broadcastToPanel(admin, String(result.panel_id), "session_started", {
        session_id: result.session_id,
        panel_id: result.panel_id,
        started_at: new Date().toISOString(),
      });
    }

    return reply({ ...result, student }, 200, cors.headers);
  } catch (error) {
    console.error("check-in error:", error instanceof Error ? error.message : "unknown");
    return reply({ error: "Something went wrong. Try again." }, 500, cors.headers);
  }
});
