// Judge view: returns the active student for the judge's OWN panel only.
// The panel is derived from the logged-in judge's assignment, never from the browser.
import { serviceClient, corsFor, reply, requireUser } from "../_shared/interview.ts";

Deno.serve(async (req) => {
  const cors = corsFor(req);
  if (!cors.ok) return new Response("Origin not allowed", { status: 403 });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors.headers });
  if (req.method !== "GET" && req.method !== "POST") return reply({ error: "Method not allowed." }, 405, cors.headers);

  try {
    const admin = serviceClient();
    const user = await requireUser(req, admin);
    if (!user) return reply({ error: "Please sign in." }, 401, cors.headers);

    const { data: assignment } = await admin.from("panel_judges")
      .select("panel_id, interview_panels(id, panel_name, room_name)")
      .eq("judge_user_id", user.id).maybeSingle();
    if (!assignment) return reply({ error: "You are not assigned to a panel." }, 403, cors.headers);

    const panelRow = assignment.interview_panels as unknown as { panel_name: string; room_name: string };
    const panel = { id: assignment.panel_id, name: panelRow.panel_name, room: panelRow.room_name };

    const { data: session } = await admin.from("interview_sessions")
      .select(`id, started_at, application_id,
        applications(first_name, last_name, branch, academic_year, department, skills,
                     previous_experience, github, linkedin, resume_path)`)
      .eq("panel_id", panel.id).eq("status", "active").maybeSingle();

    let sessionOut = null;
    let evaluation: Record<string, unknown> = { submitted: false };

    if (session) {
      const app = session.applications as unknown as Record<string, any>;

      let resumeUrl: string | null = null;
      if (app.resume_path) {
        const { data: signed } = await admin.storage.from("resumes").createSignedUrl(app.resume_path, 300);
        resumeUrl = signed?.signedUrl ?? null; // valid for 5 minutes
      }

      const { data: ev } = await admin.from("judge_evaluations")
        .select("technical_score, communication_score, problem_solving_score, feedback")
        .eq("session_id", session.id).eq("judge_user_id", user.id).maybeSingle();
      if (ev) evaluation = { submitted: true, scores: ev };

      sessionOut = {
        id: session.id,
        started_at: session.started_at,
        reference: session.application_id,
        name: `${app.first_name} ${app.last_name}`,
        branch: app.branch,
        academic_year: app.academic_year,
        department: app.department,
        skills: app.skills ?? [],
        previous_experience: app.previous_experience,
        github: app.github,
        linkedin: app.linkedin,
        resume_url: resumeUrl,
      };
    }

    // Queue summary for this panel only (counts, no names)
    const { data: queue } = await admin.from("interview_queue").select("status").eq("panel_id", panel.id);
    const counts: Record<string, number> = {};
    for (const row of queue ?? []) counts[row.status] = (counts[row.status] ?? 0) + 1;

    return reply({ panel, session: sessionOut, evaluation, queue: counts }, 200, cors.headers);
  } catch (error) {
    console.error("panel session error:", error instanceof Error ? error.message : "unknown");
    return reply({ error: "Could not load the current interview." }, 500, cors.headers);
  }
});
