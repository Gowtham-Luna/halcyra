import { useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "./lib/supabase";

export function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage(error.message);
    } else if (mode === "signup") {
      setMessage("Account created. If email confirmation is enabled, check your inbox before signing in.");
    }
    setBusy(false);
  }

  return (
    <div className="auth-card">
      <h1>Halcyra</h1>
      <p className="tagline">AI-assisted course authoring</p>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        <button type="submit" disabled={busy}>
          {busy ? "…" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
      </form>
      <button
        className="link"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
      </button>
      {message && <p className="message">{message}</p>}
    </div>
  );
}
