"use client";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Workspace from "./workspace";
import { type User, type WritingSession } from "@/lib/aware";
import Teacher, { type TeacherData } from "./teacher";
import { type SourceSet } from "@/lib/materials";
import LoginStory from "./login-story";

function Login() {
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    const form = new FormData(e.currentTarget);
    try {
      const response = await fetch("/api/platform", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", username: form.get("username"), password: form.get("password") }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Please try again.");
      window.location.reload();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to connect. Please try again."); }
    finally { setBusy(false); }
  }
  return <main className="login-page login-constellation">
    <LoginStory />
    <section className="login-side" aria-labelledby="login-heading">
      <div className="login-form-wrap">
        <p className="eyebrow muted">YOUR WRITING WORKSPACE</p>
        <h2 id="login-heading">Welcome back.</h2>
        <p className="login-intro">Sign in to continue your writing session.</p>
        <form onSubmit={login} className="login-form">
          <div className="field"><label htmlFor="username">Username</label><Input id="username" name="username" autoComplete="username" placeholder="Enter your username" required maxLength={32} /></div>
          <div className="field"><label htmlFor="password">Password</label><div className="password-field"><Input id="password" name="password" autoComplete="current-password" type={visible ? "text" : "password"} placeholder="Enter your password" required maxLength={100} /><Button type="button" variant="ghost" className="password-toggle" onClick={() => setVisible(v => !v)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff /> : <Eye />}</Button></div></div>
          {error && <p role="alert" className="error-message">{error}</p>}
          <Button className="login-submit" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
        </form>
        <p className="login-note">Use the account provided for your study session.<br />Your work will be saved as you write.</p>
      </div>
      <p className="login-bottom">AWARE · Research preview</p>
    </section>
  </main>;
}

export default function Platform() {
  type PlatformState = { user: User | null; sessions?: WritingSession[]; teacher?: TeacherData; materials?: SourceSet; error?: string };
  const [state, setState] = useState<PlatformState | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { const controller = new AbortController(); fetch("/api/platform", { signal: controller.signal }).then(async response => { const result = await response.json() as PlatformState; if (!response.ok) throw new Error(result.error); setState(result); }).catch(e => { if (e.name !== "AbortError") setError("Unable to connect to the workspace. Please refresh to try again."); }); return () => controller.abort(); }, []);
  if (error) return <div className="loading-screen"><p role="alert">{error}</p><Button variant="outline" onClick={() => window.location.reload()}>Refresh</Button></div>;
  if (!state) return <div className="loading-screen" role="status">Opening your workspace…</div>;
  if (state.user?.role === "teacher" && state.teacher) return <Teacher initialData={state.teacher} />;
  return state.user ? <Workspace user={state.user} initialSessions={state.sessions || []} assignedMaterials={state.materials} /> : <Login />;
}
