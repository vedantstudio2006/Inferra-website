// Admin actions: panels/judges/students, QR reissue and revoke, finishing sessions.
// Judges may call only "complete_session", and only for their own panel.
import {
  serviceClient, corsFor, reply, requireUser, rolesOf, UUID_RE,
  issueQrToken, sendQrEmail, broadcastToPanel,
} from "../_shared/interview.ts";

const LOCKED = ["checked_in", "interviewing", "completed"];

Deno.serve(async (req) => {
  const cors = corsFor(req);
  if (!cors.ok) return new Response("Origin not allowed", { status: 403 });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors.headers });
  if (req.method !== "POST") return reply({ error: "Method not allowed." }, 405, cors.headers);

  try {
    const admin = serviceClient();
    const user = await requireUser(req, admin);
    if (!user) return reply({ error: "Please sign in." }, 401, cors.headers);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const roles = await rolesOf(admin, user.id);
    const isAdmin = roles.includes("admin");
    const forbidden = () => reply({ error: "Admin access only." }, 403, cors.headers);
    const ok = (extra: Record<string, unknown> = {}) => reply({ success: true, ...extra }, 200, cors.headers);
    const bad = (msg: string) => reply({ error: msg }, 400, cors.headers);
    const audit = (fields: Record<string, unknown>) =>
      admin.from("interview_audit_logs").insert({ actor_user_id: user.id, ...fields });

    // ---- judge may only finish a session on their own panel ----
    if (!isAdmin) {
      if (action !== "complete_session") return forbidden();
      const sessionId = String(body.session_id || "");
      if (!UUID_RE.test(sessionId)) return bad("Invalid session.");
      const { data: s } = await admin.from("interview_sessions")
        .select("id, panel_id, application_id, status").eq("id", sessionId).maybeSingle();
      if (!s) return reply({ error: "Session not found." }, 404, cors.headers);
      const { data: pj } = await admin.from("panel_judges")
        .select("panel_id").eq("judge_user_id", user.id).eq("panel_id", s.panel_id).maybeSingle();
      if (!pj) return reply({ error: "This student is not on your panel." }, 403, cors.headers);
    }

    switch (action) {
      case "assign_student": {
        if (!isAdmin) return forbidden();
        const applicationId = String(body.application_id || "");
        const panelId = String(body.panel_id || "");
        if (!UUID_RE.test(applicationId) || !UUID_RE.test(panelId)) return bad("Choose a student and a panel.");
        const queueNumber = body.queue_number === "" || body.queue_number == null ? null : Number(body.queue_number);
        if (queueNumber !== null && (!Number.isInteger(queueNumber) || queueNumber < 1 || queueNumber > 999)) {
          return bad("Queue number must be between 1 and 999.");
        }
        const { data: existing } = await admin.from("interview_queue")
          .select("status").eq("application_id", applicationId).maybeSingle();
        if (existing && LOCKED.includes(existing.status)) {
          return reply({ error: "This student has already checked in and cannot be moved." }, 409, cors.headers);
        }
        const scheduledAt = body.scheduled_at ? new Date(String(body.scheduled_at)) : null;
        const { error } = await admin.from("interview_queue").upsert(
          { application_id: applicationId, panel_id: panelId, queue_number: queueNumber,
            scheduled_at: scheduledAt && !isNaN(scheduledAt.getTime()) ? scheduledAt.toISOString() : null },
          { onConflict: "application_id" },
        );
        if (error) return bad("Could not assign this student.");
        await audit({ application_id: applicationId, panel_id: panelId, action: "assign_student",
          metadata: { queue_number: queueNumber } });
        return ok();
      }

      case "assign_judge":
      case "remove_judge": {
        if (!isAdmin) return forbidden();
        const panelId = String(body.panel_id || "");
        const judgeId = String(body.judge_user_id || "");
        if (!UUID_RE.test(panelId) || !UUID_RE.test(judgeId)) return bad("Choose a panel and a judge.");
        if (action === "assign_judge") {
          const { error } = await admin.from("panel_judges").insert({ panel_id: panelId, judge_user_id: judgeId });
          if (error) {
            if (error.message.includes("at most 3")) return bad("This panel already has 3 judges.");
            if (error.code === "23505") return bad("This judge is already assigned to a panel.");
            return bad("Could not assign this judge.");
          }
        } else {
          await admin.from("panel_judges").delete().eq("panel_id", panelId).eq("judge_user_id", judgeId);
        }
        await audit({ panel_id: panelId, action, metadata: { judge_user_id: judgeId } });
        return ok();
      }

      case "reissue_qr":
      case "revoke_qr": {
        if (!isAdmin) return forbidden();
        const applicationId = String(body.application_id || "");
        if (!UUID_RE.test(applicationId)) return bad("Invalid application.");
        const { data: q } = await admin.from("interview_queue")
          .select("status").eq("application_id", applicationId).maybeSingle();
        if (q && LOCKED.includes(q.status)) {
          return reply({ error: "This student has already checked in." }, 409, cors.headers);
        }

        if (action === "revoke_qr") {
          await admin.from("student_qr_tokens").update({ revoked_at: new Date().toISOString() })
            .eq("application_id", applicationId).is("revoked_at", null);
          await audit({ application_id: applicationId, action: "qr_revoked" });
          return ok();
        }

        const { data: app } = await admin.from("applications")
          .select("id, first_name, email, department").eq("id", applicationId).maybeSingle();
        if (!app) return reply({ error: "Application not found." }, 404, cors.headers);

        // Note: the old QR stops working the moment a new one is issued.
        const token = await issueQrToken(admin, app.id);
        const emailed = await sendQrEmail({
          to: app.email, firstName: app.first_name, applicationId: app.id,
          department: app.department, token,
        });
        await audit({ application_id: applicationId, action: "qr_reissued", metadata: { emailed } });
        return ok({
          emailed,
          message: emailed
            ? "New QR pass emailed. The old pass no longer works."
            : "New QR pass created, but the email failed. Run this again.",
        });
      }

      case "complete_session": {
        const sessionId = String(body.session_id || "");
        if (!UUID_RE.test(sessionId)) return bad("Invalid session.");
        const { data: s } = await admin.from("interview_sessions")
          .select("id, panel_id, application_id, status").eq("id", sessionId).maybeSingle();
        if (!s) return reply({ error: "Session not found." }, 404, cors.headers);
        if (s.status !== "active") return ok({ message: "Already completed." });

        const { data: updated } = await admin.from("interview_sessions")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", sessionId).eq("status", "active").select("id");
        if (!updated || updated.length === 0) return ok({ message: "Already completed." });

        await admin.from("interview_queue").update({ status: "completed" }).eq("application_id", s.application_id);
        await audit({ application_id: s.application_id, panel_id: s.panel_id, action: "session_completed",
          metadata: { session_id: sessionId } });
        await broadcastToPanel(admin, s.panel_id, "session_completed", { session_id: sessionId });
        return ok();
      }

      default:
        return bad("Unknown action.");
    }
  } catch (error) {
    console.error("admin action error:", error instanceof Error ? error.message : "unknown");
    return reply({ error: "Something went wrong. Try again." }, 500, cors.headers);
  }
});
