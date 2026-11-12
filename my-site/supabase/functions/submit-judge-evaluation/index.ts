// A judge submits their own scores for the active session on their panel.
import { serviceClient, corsFor, reply, requireUser, UUID_RE } from "../_shared/interview.ts";

Deno.serve(async (req) => {
  const cors = corsFor(req);
  if (!cors.ok) return new Response("Origin not allowed", { status: 403 });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors.headers });
  if (req.method !== "POST") return reply({ error: "Method not allowed." }, 405, cors.headers);

  try {
    const raw = await req.text();
    if (raw.length > 8192) return reply({ error: "Request too large." }, 413, cors.headers);
    const body = JSON.parse(raw || "{}");

    const admin = serviceClient();
    const user = await requireUser(req, admin);
    if (!user) return reply({ error: "Please sign in." }, 401, cors.headers);

    const sessionId = String(body.session_id || "");
    if (!UUID_RE.test(sessionId)) return reply({ error: "Invalid session." }, 400, cors.headers);

    const scores = {
      technical_score: Number(body.technical_score),
      communication_score: Number(body.communication_score),
      problem_solving_score: Number(body.problem_solving_score),
    };
    for (const [key, value] of Object.entries(scores)) {
      if (!Number.isInteger(value) || value < 0 || value > 10) {
        return reply({ error: `${key.replace("_score", "").replace("_", " ")} must be a whole number from 0 to 10.` }, 400, cors.headers);
      }
    }
    const feedback = String(body.feedback || "").trim();
    if (feedback.length > 2000) return reply({ error: "Feedback must be 2000 characters or fewer." }, 400, cors.headers);

    const { data: assignment } = await admin.from("panel_judges")
      .select("panel_id").eq("judge_user_id", user.id).maybeSingle();
    if (!assignment) return reply({ error: "You are not assigned to a panel." }, 403, cors.headers);

    const { data: session } = await admin.from("interview_sessions")
      .select("id, panel_id, status").eq("id", sessionId).maybeSingle();
    if (!session || session.panel_id !== assignment.panel_id) {
      return reply({ error: "This student is not on your panel." }, 403, cors.headers);
    }
    if (session.status !== "active") return reply({ error: "This interview is closed." }, 409, cors.headers);

    const { error } = await admin.from("judge_evaluations").insert({
      session_id: sessionId,
      judge_user_id: user.id,
      ...scores,
      feedback: feedback || null,
    });
    if (error) {
      if (error.code === "23505") {
        return reply({ error: "You have already submitted an evaluation for this student." }, 409, cors.headers);
      }
      console.error("evaluation insert failed:", error.code);
      return reply({ error: "Could not save your evaluation." }, 500, cors.headers);
    }

    await admin.from("interview_audit_logs").insert({
      actor_user_id: user.id,
      panel_id: session.panel_id,
      action: "evaluation_submitted",
      metadata: { session_id: sessionId },
    });

    return reply({ success: true }, 200, cors.headers);
  } catch (error) {
    console.error("evaluation error:", error instanceof Error ? error.message : "unknown");
    return reply({ error: "Something went wrong. Try again." }, 500, cors.headers);
  }
});
