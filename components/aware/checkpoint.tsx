"use client";
import { useState } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { activities, assistance, type Condition } from "@/lib/aware";

export type Answers = { activity: string; first: number | null; second: number | null; delegation: number | null; assistance: string };
function Rating({ id, title, question, endpoints, value, change }: { id: string; title: string; question: string; endpoints: string[]; value: number | null; change: (v: number) => void }) {
  return <div className="rating-field"><h4 id={`${id}-title`}>{title}</h4><p id={`${id}-question`}>{question}</p>
    <RadioGroup className="rating-options" aria-labelledby={`${id}-title`} aria-describedby={`${id}-question`} value={value === null ? "" : String(value)} onValueChange={v => change(Number(v))}>
      {[1, 2, 3, 4, 5].map(n => <div className="rating-option" key={n}><RadioGroupItem value={String(n)} id={`${id}-${n}`} aria-label={`${n} of 5`} /><label htmlFor={`${id}-${n}`}>{n}</label></div>)}
    </RadioGroup><div className="scale-ends"><span>{endpoints[0]}</span><span>{endpoints[1]}</span></div>
  </div>;
}
function Choice({ label, value, choices, onChange, id }: { label: string; value: string; choices: string[]; onChange: (v: string) => void; id: string }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger id={id} className="form-select" aria-label={label}><SelectValue placeholder="Select an option" /></SelectTrigger><SelectContent position="popper">{choices.map(v => <SelectItem value={v} key={v}>{v}</SelectItem>)}</SelectContent></Select>;
}
export default function Checkpoint({ condition, onClose, onComplete }: { condition: Condition; onClose: () => void; onComplete: (answers: Answers, next: "writing" | "ai") => Promise<void> }) {
  const appraisal = condition === "appraisal";
  const [answers, setAnswers] = useState<Answers>({ activity: "", first: null, second: null, delegation: null, assistance: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const update = <K extends keyof Answers>(key: K, value: Answers[K]) => setAnswers(a => ({ ...a, [key]: value }));
  async function complete(next: "writing" | "ai") {
    if (!answers.activity || answers.first === null || answers.second === null || answers.delegation === null || (next === "ai" && !answers.assistance)) { setError("Please complete the questions above. Choose planned AI assistance if you continue to AI."); return; }
    setBusy(true); setError("");
    try { await onComplete(answers, next); } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); setBusy(false); }
  }
  return <Dialog open onOpenChange={v => { if (!v && !busy) onClose(); }}><DialogContent className={`checkpoint condition-${condition}`} onInteractOutside={e => e.preventDefault()}>
    <div className="checkpoint-head"><p className="eyebrow">AWARE · CHECKPOINT</p><DialogTitle>Before you continue to AI</DialogTitle><DialogDescription>Consider your current activity and {appraisal ? "the support you need." : "your progress."}</DialogDescription></div>
    <div className="checkpoint-body">
      <section className="checkpoint-section"><h3><span>1</span>Current activity</h3><label className="question-label" htmlFor="activity">Which writing activity are you working on?</label><Choice id="activity" label="Current activity" choices={activities} value={answers.activity} onChange={v => update("activity", v)} /></section>
      <section className="checkpoint-section"><h3><span>2</span>{appraisal ? "Your appraisal" : "Your monitoring"}</h3>
        <Rating id="first" title={appraisal ? "Learning significance" : "Task completion"} question={appraisal ? "How important is doing this work yourself for your learning?" : "How much of this writing activity have you completed?"} endpoints={appraisal ? ["Not at all important", "Extremely important"] : ["Not started", "Completed"]} value={answers.first} change={v => update("first", v)} />
        <Rating id="second" title={appraisal ? "Current capacity" : "Activity allocation"} question={appraisal ? "How much progress can you make without AI right now?" : "How much of your writing time in this session has been spent on this activity?"} endpoints={appraisal ? ["No progress", "Substantial progress"] : ["None", "All"]} value={answers.second} change={v => update("second", v)} />
      </section>
      <section className="checkpoint-section"><h3><span>3</span>Your intended support</h3><div className="delegation-label"><h4>Intended delegation</h4><output>{answers.delegation === null ? "Choose 0–5" : `${answers.delegation} / 5`}</output></div><p className="question-text">How much of the cognitive work do you intend to delegate to AI?</p>
        <Slider className="delegation-slider" min={0} max={5} step={1} value={[answers.delegation ?? 0]} onValueChange={v => update("delegation", v[0])} onValueCommit={v => update("delegation", v[0])} aria-label="Intended delegation" />
        <div className="slider-ticks">{[0, 1, 2, 3, 4, 5].map(n => <Button type="button" variant="ghost" key={n} onClick={() => update("delegation", n)} aria-label={`Delegate ${n} of 5`} aria-pressed={answers.delegation === n}>{n}</Button>)}</div><div className="scale-ends"><span>None</span><span>All</span></div>
        <label className="question-label assistance-label" htmlFor="assistance">Planned AI assistance</label><p className="question-text">If you choose AI, what will you ask it to do?</p><Choice id="assistance" label="Planned AI assistance" choices={assistance} value={answers.assistance} onChange={v => update("assistance", v)} />
      </section>
      {error && <p role="alert" className="error-message">{error}</p>}
    </div>
    <div className="checkpoint-footer"><Button variant="outline" disabled={busy} onClick={() => complete("writing")}><ArrowLeft />Return to writing</Button><Button className="condition-button" disabled={busy} onClick={() => complete("ai")}>{busy ? "Saving…" : "Continue to AI"}<ArrowUpRight /></Button></div>
  </DialogContent></Dialog>;
}
