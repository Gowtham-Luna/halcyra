import { useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "./lib/supabase";

interface Props {
  heading?: string;
  tagline?: string;
  compact?: boolean;
  onBack?: () => void;
}

export function AuthForm({
  heading = "Halcyra",
  tagline = "AI-assisted course authoring",
  compact,
  onBack,
}: Props) {
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
    <div className={`auth-card ${compact ? "auth-card-compact" : ""}`}>
      {onBack && (
        <button className="link back" onClick={onBack}>← Back</button>
      )}
      {!compact && <h1>{heading}</h1>}
      <p className="tagline">{tagline}</p>
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
