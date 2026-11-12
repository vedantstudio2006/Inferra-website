import { useState } from "react";
import { supabase } from "../lib/supabase";

// Staff and judge accounts are created by the admin in Supabase Auth.
// There is no public sign-up for these roles.
export default function Login({ title, hint }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError("Email or password is incorrect.");
  }

  return (
    <section className="iv__login">
      <h1 className="pg__title">{title}</h1>
      <p className="pg__lead">{hint}</p>
      <form className="iv__form" onSubmit={handleSubmit}>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        {error && <p className="iv__error" role="alert">{error}</p>}
        <button className="iv__btn" type="submit" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
      </form>
    </section>
  );
}
