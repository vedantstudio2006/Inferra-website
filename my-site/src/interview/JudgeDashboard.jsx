import { useCallback, useEffect, useState } from "react";
import PageShell from "../PageShell";
import { supabase } from "../lib/supabase";
import { callFunction } from "./api";
import { useAuthSession } from "./session";
import Login from "./Login";
import "./interview.css";

const POLL_MS = 15000; // fallback refresh when the live channel is not connected

export default function JudgeDashboard() {
  const session = useAuthSession();
  if (session === undefined) return <PageShell><p className="pg__lead">Loading...</p></PageShell>;
  return (
    <PageShell>
      {session ? <Dashboard /> : <Login title="Judge panel" hint="Sign in with your judge account." />}
    </PageShell>
  );
}

function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [link, setLink] = useState("connecting"); // connecting | live | reconnecting | offline
  const [syncedAt, setSyncedAt] = useState(null);
  const panelId = data?.panel?.id;

  // Always fetches from the server. Realtime only says "something changed".
  const load = useCallback(async () => {
    try {
      setData(await callFunction("get-panel-current-session", { method: "GET" }));
      setError("");
      setSyncedAt(new Date());
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Private channel for this panel only (access enforced by realtime.messages RLS)
  useEffect(() => {
    if (!panelId) return undefined;
    const channel = supabase.channel(`panel:${panelId}`, { config: { private: true } });

    channel
      .on("broadcast", { event: "session_started" }, () => load())
      .on("broadcast", { event: "session_completed" }, () => load())
      .subscribe((status) => {
        if (status === "SUBSCRIBED") { setLink("live"); load(); } // recover anything missed
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setLink("reconnecting");
        else if (status === "CLOSED") setLink("offline");
      });

    const goOffline = () => setLink("offline");
    const goOnline = () => { setLink("reconnecting"); load(); };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      supabase.removeChannel(channel);
    };
  }, [panelId, load]);

  // Fallback polling while the live channel is not connected
  useEffect(() => {
    if (link === "live") return undefined;
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [link, load]);

  if (!data && !error) return <p className="pg__lead">Loading your panel...</p>;
  if (!data) return <p className="iv__error" role="alert">{error}</p>;

  const { panel, session, evaluation, queue } = data;

  return (
    <section className="iv__judge">
      <header className="iv__judge-head">
        <div>
          <h1 className="pg__title">{panel.name}</h1>
          <p className="pg__lead">{panel.room}</p>
        </div>
        <span className={`iv__conn iv__conn--${link}`}>
          {link === "live" ? "Live" : link === "offline" ? "Offline" : link === "reconnecting" ? "Reconnecting..." : "Connecting..."}
          {syncedAt && <small> · synced {syncedAt.toLocaleTimeString()}</small>}
        </span>
      </header>

      {error && <p className="iv__error" role="alert">Could not refresh: {error}</p>}

      <p className="iv__queue">
        Waiting {queue.waiting ?? 0} · Interviewing {queue.interviewing ?? 0} · Completed {queue.completed ?? 0}
      </p>

      {!session ? (
        <div className="iv__empty">
          <h2>Waiting for the next student</h2>
          <p>This screen updates automatically when a student is checked in at your room.</p>
        </div>
      ) : (
        <>
          <article className="iv__student-card">
            <header>
              <span className="iv__pill">Now interviewing</span>
              <h2>{session.name}</h2>
              <p className="iv__mono">{session.reference}</p>
            </header>
            <dl className="iv__grid">
              <div><dt>Branch</dt><dd>{session.branch}</dd></div>
              <div><dt>Year</dt><dd>{session.academic_year}</dd></div>
              <div><dt>Department</dt><dd>{session.department}</dd></div>
              <div className="iv__wide"><dt>Skills</dt><dd>{session.skills.join(", ") || "-"}</dd></div>
              <div className="iv__wide"><dt>Previous experience</dt><dd className="iv__pre">{session.previous_experience || "-"}</dd></div>
            </dl>
            <div className="iv__links">
              {session.github && <a href={session.github} target="_blank" rel="noreferrer">GitHub</a>}
              {session.linkedin && <a href={session.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>}
              {session.resume_url && <a href={session.resume_url} target="_blank" rel="noreferrer">View resume</a>}
            </div>
          </article>

          {evaluation.submitted ? (
            <div className="iv__done">
              <h3>Your evaluation is submitted</h3>
              <p>Scores: technical {evaluation.scores.technical_score}, communication {evaluation.scores.communication_score}, problem solving {evaluation.scores.problem_solving_score}.</p>
            </div>
          ) : (
            <EvaluationForm key={session.id} sessionId={session.id} onSubmitted={load} />
          )}

          <FinishButton sessionId={session.id} onDone={load} />
        </>
      )}
    </section>
  );
}

function EvaluationForm({ sessionId, onSubmitted }) {
  const empty = { technical_score: "", communication_score: "", problem_solving_score: "" };
  const [scores, setScores] = useState(empty);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await callFunction("submit-judge-evaluation", {
        body: { session_id: sessionId, ...scores, feedback },
      });
      onSubmitted();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const criteria = [
    ["technical_score", "Technical knowledge"],
    ["communication_score", "Communication"],
    ["problem_solving_score", "Problem solving"],
  ];

  return (
    <form className="iv__eval" onSubmit={handleSubmit}>
      <h3>Your evaluation</h3>
      <p className="iv__hint">Score each criterion from 0 to 10. Your scores are private to you until the admin reviews them.</p>
      <div className="iv__scores">
        {criteria.map(([key, label]) => (
          <label key={key}>
            {label}
            <input type="number" min="0" max="10" step="1" required value={scores[key]}
              onChange={(e) => setScores({ ...scores, [key]: e.target.value })} />
          </label>
        ))}
      </div>
      <label className="iv__field">
        Feedback (optional, evidence-based)
        <textarea rows="4" maxLength={2000} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      </label>
      {error && <p className="iv__error" role="alert">{error}</p>}
      <button className="iv__btn" type="submit" disabled={busy}>{busy ? "Submitting..." : "Submit evaluation"}</button>
    </form>
  );
}

function FinishButton({ sessionId, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function finish() {
    if (!window.confirm("Mark this interview as finished? The next student can then be checked in.")) return;
    setBusy(true);
    setError("");
    try {
      await callFunction("admin-manage-interviews", { body: { action: "complete_session", session_id: sessionId } });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="iv__finish">
      <button className="iv__link" type="button" onClick={finish} disabled={busy}>Finish this interview</button>
      {error && <p className="iv__error" role="alert">{error}</p>}
    </div>
  );
}
