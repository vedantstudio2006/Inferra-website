import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import PageShell from "../PageShell";
import { supabase } from "../lib/supabase";
import { callFunction } from "./api";
import { useAuthSession } from "./session";
import Login from "./Login";
import "./interview.css";

const READER_ID = "iv-qr-reader";

// Maps a check-in result code to what the staff member should see.
function describe(r) {
  switch (r.result) {
    case "checked_in":
      return { tone: "ok", title: "Check-in successful", text: `${r.panel_name} has been notified.` };
    case "wrong_room":
      return { tone: "warn", title: "Wrong room",
        text: `This student is assigned to ${r.assigned_panel_name} (${r.assigned_room_name}). Send them there. Nothing was activated here.` };
    case "already_checked_in":
      return { tone: "warn", title: "Already checked in",
        text: `Checked in at ${new Date(r.checked_in_at).toLocaleTimeString()}. No new session was created.` };
    case "panel_busy":
      return { tone: "warn", title: "Panel is busy",
        text: `${r.panel_name} is still interviewing another student. Finish that interview first.` };
    case "not_assigned":
      return { tone: "warn", title: "Not assigned yet", text: "This student has no panel assigned. Ask the admin." };
    case "invalid":
    case "revoked":
    case "expired":
      return { tone: "bad", title: "QR pass not valid",
        text: "This pass is invalid, expired or was replaced. Use manual lookup, or ask the admin to resend the pass." };
    case "reason_required":
      return { tone: "bad", title: "Reason needed", text: "A reason is required for manual check-in." };
    case "conflict":
      return { tone: "warn", title: "Please scan again", text: "Another scan was processed at the same moment." };
    default:
      return { tone: "bad", title: "Could not check in", text: r.error || "Something went wrong." };
  }
}

export default function StaffCheckIn() {
  const session = useAuthSession();
  if (session === undefined) return <PageShell><p className="pg__lead">Loading...</p></PageShell>;
  return (
    <PageShell>
      {session ? <Scanner /> : <Login title="Staff check-in" hint="Sign in with the staff account given to you by the admin." />}
    </PageShell>
  );
}

function Scanner() {
  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState("");
  const [loadError, setLoadError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [manual, setManual] = useState({ application_id: "", reason: "" });
  const scannerRef = useRef(null);
  const busyRef = useRef(false);

  // Rooms this staff member may use (RLS limits this to their own assignments)
  useEffect(() => {
    supabase.from("staff_panel_access")
      .select("interview_panels(id, panel_name, room_name)")
      .then(({ data, error }) => {
        if (error) return setLoadError("Could not load your rooms.");
        const list = (data ?? []).map((r) => r.interview_panels).filter(Boolean);
        setRooms(list);
        if (list.length === 1) setRoomId(list[0].id);
      });
  }, []);

  const handleScan = useCallback(async (text) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    scannerRef.current?.pause(true);
    try {
      setResult(await callFunction("check-in-student", { body: { token: text.trim(), room_panel_id: roomId } }));
    } catch (e) {
      setResult({ result: "error", error: e.message });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [roomId]);

  // Camera scanner: starts when a room is chosen, stops when the room changes or the page closes
  useEffect(() => {
    if (!roomId) return undefined;
    setCameraError("");
    const scanner = new Html5Qrcode(READER_ID);
    scannerRef.current = scanner;
    let cancelled = false;

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      (text) => handleScan(text),
      () => {},
    ).catch(() => {
      if (!cancelled) setCameraError("Camera not available or permission denied. Allow camera access, or use manual lookup below.");
    });

    return () => {
      cancelled = true;
      scanner.stop().catch(() => {}).finally(() => {
        try { scanner.clear(); } catch { /* already cleared */ }
      });
      scannerRef.current = null;
    };
  }, [roomId, handleScan]);

  function nextScan() {
    setResult(null);
    scannerRef.current?.resume();
  }

  async function handleManual(e) {
    e.preventDefault();
    scannerRef.current?.pause(true);
    setBusy(true);
    try {
      setResult(await callFunction("check-in-student", {
        body: { mode: "manual", application_id: manual.application_id, reason: manual.reason, room_panel_id: roomId },
      }));
      setManual({ application_id: "", reason: "" });
    } catch (err) {
      setResult({ result: "error", error: err.message });
    } finally {
      setBusy(false);
    }
  }

  const room = rooms.find((r) => r.id === roomId);

  return (
    <section className="iv__staff">
      <h1 className="pg__title">Check-in</h1>
      <p className="pg__lead">Scan the student's QR pass at the room entrance.</p>

      {loadError && <p className="iv__error" role="alert">{loadError}</p>}
      {rooms.length === 0 && !loadError && <p className="iv__error">You are not assigned to any room. Ask the admin.</p>}

      {rooms.length > 1 && (
        <label className="iv__field">
          Room
          <select value={roomId} onChange={(e) => { setRoomId(e.target.value); setResult(null); }}>
            <option value="">Select the room you are at</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.room_name} ({r.panel_name})</option>)}
          </select>
        </label>
      )}
      {room && <p className="iv__room">Scanning at <b>{room.room_name}</b> ({room.panel_name})</p>}

      {roomId && (
        <div className="iv__scanner">
          {cameraError && <p className="iv__error" role="alert">{cameraError}</p>}
          <div id={READER_ID} className="iv__reader" />
          {busy && <p className="iv__hint">Checking...</p>}
        </div>
      )}

      {result && (() => {
        const view = describe(result);
        return (
          <div className={`iv__result iv__result--${view.tone}`} role="status">
            <h2>{view.title}</h2>
            <p>{view.text}</p>
            {result.student && (
              <dl className="iv__student">
                <div><dt>Name</dt><dd>{result.student.name}</dd></div>
                <div><dt>Reference</dt><dd className="iv__mono">{result.student.reference}</dd></div>
                <div><dt>Department</dt><dd>{result.student.department}</dd></div>
              </dl>
            )}
            <button className="iv__btn" type="button" onClick={nextScan}>Scan next</button>
          </div>
        );
      })()}

      {roomId && (
        <details className="iv__manual">
          <summary>Manual lookup (scanner not working)</summary>
          <form className="iv__form" onSubmit={handleManual}>
            <label>
              Application reference
              <input value={manual.application_id} onChange={(e) => setManual({ ...manual, application_id: e.target.value })} required placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
            </label>
            <label>
              Reason (required and logged)
              <input value={manual.reason} onChange={(e) => setManual({ ...manual, reason: e.target.value })} required minLength={3} maxLength={200} placeholder="e.g. QR image would not load" />
            </label>
            <button className="iv__btn" type="submit" disabled={busy}>Check in manually</button>
          </form>
        </details>
      )}

      <button className="iv__link" type="button" onClick={() => supabase.auth.signOut()}>Sign out</button>
    </section>
  );
}
