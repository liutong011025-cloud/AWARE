"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, BookOpen, Check, ChevronRight, Clock3, Copy, Download, FileText, LogOut, Bold, Italic, Underline, List, ListOrdered, Undo2, Redo2, X, Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Checkpoint, { type Answers } from "./checkpoint";
import Logo from "./logo";
import { api, AI_URL, type User, type WritingSession } from "@/lib/aware";
import { demoMaterials, type SourceSet } from "@/lib/materials";
import { allowedFont, editorFonts, editorSizes } from "@/lib/editor-format";

type SaveState = "saved" | "saving" | "unsaved" | "error";
const wordCount = (text: string) => text.trim() ? text.trim().split(/\s+/).length : 0;
const clockText = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
const dateText = (time: number) => new Date(time).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export default function Workspace({ user, initialSessions, assignedMaterials }: { user: User; initialSessions: WritingSession[]; assignedMaterials?: SourceSet }) {
  const [sessions, setSessions] = useState(initialSessions);
  const [session, setSession] = useState<WritingSession | null>(() => initialSessions.find(s => s.status === "active") || null);
  const activeCondition = session ? (session.condition || ({ lb: "appraisal", gy: "monitoring", zf: "direct" } as const)[user.username as "lb" | "gy" | "zf"] || user.condition) : user.condition;
  const materials = useMemo<SourceSet>(() => session ? (session.source_data ? JSON.parse(session.source_data) : demoMaterials) : (assignedMaterials || demoMaterials), [session?.source_data, session?.id, assignedMaterials]);
  const [view, setView] = useState("today");
  const [source, setSource] = useState("a");
  const [selection, setSelection] = useState("");
  const [font, setFont] = useState("Arial");
  const [fontSize, setFontSize] = useState("19");
  const [checkpoint, setCheckpoint] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [words, setWords] = useState(() => wordCount(session?.plain_text || ""));
  const [elapsed, setElapsed] = useState(session?.elapsed || 0);
  const [changeCount, setChangeCount] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [protocol, setProtocol] = useState(false);
  const [finishDialog, setFinishDialog] = useState(false);
  const [external, setExternal] = useState(false);
  const editor = useRef<HTMLDivElement>(null);
  const revision = useRef(session?.revision || 0);
  const latestHtml = useRef(session?.html || "");
  const latestText = useRef(session?.plain_text || "");
  const savedHtml = useRef(session?.html || "");
  const elapsedRef = useRef(elapsed);
  const savedElapsed = useRef(elapsed);
  const saving = useRef<Promise<void> | null>(null);
  const range = useRef<Range | null>(null);
  const pendingFormat = useRef<{ command: string; value: string } | null>(null);
  const initializedSession = useRef<string | null>(null);

  const log = useCallback(async (type: string, payload: Record<string, unknown> = {}) => {
    if (!session || session.status !== "active") return;
    try { await api("event", { sessionId: session.id, type, payload }); } catch { setNotice("An activity record could not be saved. Your draft is unaffected."); }
  }, [session]);

  const saveNow = useCallback(async () => {
    if (saving.current) await saving.current;
    if (!session || session.status !== "active") return;
    const html = latestHtml.current, text = latestText.current;
    if (html === savedHtml.current && elapsedRef.current === savedElapsed.current) return;
    setSaveState("saving");
    const task = (async () => {
      try {
        const result = await api<{ revision: number }>("save", { sessionId: session.id, html, text, revision: revision.current, elapsed: elapsedRef.current });
        revision.current = result.revision; savedHtml.current = html; savedElapsed.current = elapsedRef.current;
        setSaveState(latestHtml.current === html ? "saved" : "unsaved"); setError("");
        setSessions(list => list.map(s => s.id === session.id ? { ...s, html, plain_text: text, revision: result.revision, elapsed: elapsedRef.current, updated: Date.now() } : s));
      } catch (e) { setSaveState("error"); setError(e instanceof Error ? e.message : "Unable to save. Please try again."); throw e; }
    })();
    saving.current = task;
    try { await task; } finally { if (saving.current === task) saving.current = null; }
  }, [session]);

  useEffect(() => {
    if (initializedSession.current === (session?.id || null)) return;
    initializedSession.current = session?.id || null;
    if (editor.current) editor.current.innerHTML = session?.html || "";
    latestHtml.current = session?.html || ""; latestText.current = session?.plain_text || ""; savedHtml.current = latestHtml.current;
    revision.current = session?.revision || 0; elapsedRef.current = session?.elapsed || 0;
    savedElapsed.current = elapsedRef.current;
    setElapsed(elapsedRef.current); setWords(wordCount(latestText.current)); setSaveState("saved"); setSelection("");
    range.current = null; setFont("Arial"); setFontSize("19");
    (CSS as unknown as { highlights?: Map<string, unknown> }).highlights?.delete("aware-selection");
  }, [session]);
  useEffect(() => {
    const capture = () => selectText();
    document.addEventListener("selectionchange", capture);
    return () => document.removeEventListener("selectionchange", capture);
  }, []);
  useEffect(() => {
    if (!session || session.status !== "active") return;
    const timer = setInterval(() => { if (document.visibilityState === "visible") { elapsedRef.current += 1; setElapsed(elapsedRef.current); } }, 1000);
    return () => clearInterval(timer);
  }, [session]);
  useEffect(() => {
    if (!changeCount) return;
    const timer = setTimeout(() => { void saveNow().catch(() => {}); }, 1000);
    return () => clearTimeout(timer);
  }, [changeCount, saveNow]);
  useEffect(() => { if (!session || session.status !== "active") return; const timer = setInterval(() => { void saveNow().catch(() => {}); }, 30000); return () => clearInterval(timer); }, [saveNow, session]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (latestHtml.current !== savedHtml.current) { e.preventDefault(); e.returnValue = ""; } };
    const onOnline = () => { void saveNow().catch(() => {}); };
    window.addEventListener("beforeunload", warn); window.addEventListener("online", onOnline);
    return () => { window.removeEventListener("beforeunload", warn); window.removeEventListener("online", onOnline); };
  }, [saveNow]);
  useEffect(() => {
    const doc = document as Document & { modelContext?: { registerTool: (tool: unknown, options: { signal: AbortSignal }) => void } };
    if (!doc.modelContext) return;
    const controller = new AbortController();
    try { void Promise.resolve(doc.modelContext.registerTool({ name: "get_writing_workspace_status", description: "Read the current AWARE writing session status, condition, word count, and save state. Does not include writing text or credentials.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: async (input: unknown) => { if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length) throw new Error("This tool accepts an empty object only."); return { content: [{ type: "text", text: JSON.stringify({ condition: activeCondition, sessionStatus: session?.status || "not started", words, saveState }) }] }; } }, { signal: controller.signal })).catch(() => {}); } catch { /* WebMCP is optional; the visible workspace remains available. */ }
    return () => controller.abort();
  }, [activeCondition, session?.status, words, saveState]);

  function edited() {
    if (!editor.current) return;
    latestHtml.current = editor.current.innerHTML; latestText.current = editor.current.innerText;
    setWords(wordCount(latestText.current)); setSaveState("unsaved"); setChangeCount(n => n + 1);
    selectText();
  }
  function selectText() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editor.current) return;
    if (!editor.current.contains(sel.anchorNode) || !editor.current.contains(sel.focusNode)) {
      // Menus and checkpoints may temporarily take focus, but selecting elsewhere
      // must never leave an old passage eligible for Ask AI.
      if (!sel.toString().trim() && document.activeElement?.closest(".editor-toolbar, .editor-font-menu, .ask-button, .selection-strip, [role=dialog]")) return;
      range.current = null; setSelection("");
      (CSS as unknown as { highlights?: Map<string, unknown> }).highlights?.delete("aware-selection");
      return;
    }
    const text = sel.toString().trim();
    range.current = sel.getRangeAt(0).cloneRange();
    setSelection(text.slice(0, 12000));
    const node = sel.focusNode?.nodeType === Node.ELEMENT_NODE ? sel.focusNode as Element : sel.focusNode?.parentElement;
    if (node) {
      const style = window.getComputedStyle(node);
      setFont(allowedFont(style.fontFamily.split(",")[0].replace(/["']/g, "")) || "Arial");
      const size = Math.round(parseFloat(style.fontSize));
      setFontSize(String(editorSizes.includes(size as typeof editorSizes[number]) ? size : 19));
    }
    const highlights = (CSS as unknown as { highlights?: Map<string, unknown> }).highlights;
    const Highlight = (window as unknown as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight;
    if (highlights && Highlight) { highlights.delete("aware-selection"); if (text) highlights.set("aware-selection", new Highlight(range.current)); }
  }
  function validRange() {
    return !!editor.current && !!range.current && editor.current.contains(range.current.startContainer) && editor.current.contains(range.current.endContainer);
  }
  function selectedText() {
    return validRange() && !range.current!.collapsed ? range.current!.toString().trim().slice(0, 12000) : "";
  }
  function format(command: string, value?: string) {
    if (!editor.current || session?.status !== "active") return;
    editor.current.focus();
    const selected = window.getSelection();
    if (!validRange()) { range.current = document.createRange(); range.current.selectNodeContents(editor.current); range.current.collapse(false); }
    selected?.removeAllRanges(); selected?.addRange(range.current!);
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand(command, false, value);
    edited(); selectText();
    if (command === "fontName" && value) setFont(value);
    if (command === "fontSize" && value) setFontSize(String(editorSizes[Number(value) - 1]));
  }
  function applyPickerFormat(event: Event) {
    if (!pendingFormat.current) return;
    event.preventDefault();
    const { command, value } = pendingFormat.current;
    pendingFormat.current = null;
    // Radix releases its focus trap before this callback; native editing can
    // now restore the saved range and keep the caret in the writing surface.
    format(command, value);
  }
  async function start() { setBusy(true); setError(""); try { await saveNow(); const result = await api<{ session: WritingSession }>("create"); setSession(result.session); setSessions(list => list.some(s => s.id === result.session.id) ? list : [result.session, ...list]); setView("today"); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  async function openRecord(record: WritingSession) { try { await saveNow(); if (session?.id !== record.id) setSession(record); setView("today"); } catch { /* Keep the unsaved draft visible instead of navigating away. */ } }
  async function signout() { setBusy(true); try { await saveNow(); await api("logout"); window.location.reload(); } catch (e) { setError((e as Error).message); setBusy(false); } }
  async function sendToAI(answers?: Answers) {
    const text = selectedText();
    if (!text) throw new Error("Select text in your response before asking AI.");
    // Reserve a new tab within the user's click; navigate only after the save succeeds.
    const target = window.open("about:blank", "_blank");
    if (target) target.opener = null;
    try {
      await saveNow();
      if (answers) await api("checkpoint", { sessionId: session!.id, answers, selection: text, next: "ai" });
      await api("event", { sessionId: session!.id, type: "ai_handoff", payload: { selectedText: text, condition: activeCondition, destination: AI_URL } });
      setCheckpoint(false); setExternal(true);
      if (target) target.location.replace(AI_URL);
      else setNotice("Your browser blocked the new tab. Use Open EdUHK GenAI below.");
    } catch (e) { target?.close(); throw e; }
  }
  async function ask() {
    if (!session) return;
    const text = selectedText();
    if (!text) { setSelection(""); setNotice("Select text in your response before asking AI."); return; }
    setSelection(text);
    void log("ask_ai_clicked", { condition: activeCondition, selectedText: text });
    setError("");
    if (activeCondition !== "direct") { setCheckpoint(true); void log("text_selected", { selectedText: text }); return; }
    setBusy(true); try { await sendToAI(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function completeCheckpoint(answers: Answers, next: "writing" | "ai") {
    if (next === "ai") return sendToAI(answers);
    await saveNow(); await api("checkpoint", { sessionId: session!.id, answers, selection, next }); setCheckpoint(false); setNotice("Checkpoint saved. Continue your writing."); editor.current?.focus();
  }
  async function finish() { setBusy(true); try { await saveNow(); await api("finish", { sessionId: session!.id }); setSession(s => s ? { ...s, html: latestHtml.current, plain_text: latestText.current, status: "completed", elapsed: elapsedRef.current, revision: revision.current } : null); setSessions(list => list.map(s => s.id === session?.id ? { ...s, status: "completed" } : s)); setFinishDialog(false); setView("records"); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  async function exportSession(id: string) { try { const data = await api("export", { sessionId: id }); const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = `aware-${user.username}-${id.slice(0, 8)}.json`; a.click(); URL.revokeObjectURL(url); } catch (e) { setError((e as Error).message); } }
  async function copySelected() { try { await navigator.clipboard.writeText(selection); setNotice("Selected text copied. You can paste it into EdUHK GenAI."); void log("text_copied", { selectedText: selection }); } catch { setNotice("Copy was blocked by your browser. Select the text and use Ctrl+C."); } }

  return <div className={`workspace condition-${activeCondition}`}>
    <header className="app-header"><Logo compact /><nav aria-label="Main navigation"><Button variant="ghost" className={view === "today" ? "nav-active" : ""} onClick={() => setView("today")}>Today</Button><Button variant="ghost" className={view === "records" ? "nav-active" : ""} onClick={() => setView("records")}>Records <span className="count">{sessions.length}</span></Button><Button variant="ghost" onClick={() => setProtocol(true)}>Protocol</Button></nav><div className="account"><span className="user-initial">{user.username.toUpperCase()}</span><Button variant="ghost" className="icon-button" aria-label="Sign out" onClick={signout} disabled={busy}><LogOut /></Button></div></header>
    {notice && <div className="notice" role="status"><span>{notice}</span><Button variant="ghost" className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice("")}><X /></Button></div>}
    {error && <div className="workspace-error" role="alert">{error} {saveState === "error" && <Button variant="outline" onClick={() => { void saveNow().catch(() => {}); }}>Retry save</Button>}</div>}
    <main className="workspace-main">
      <div className="workspace-lines" aria-hidden="true"><span /><span /><span /><i /></div>
      <section hidden={view !== "today"}>
        <div className="task-heading"><div><h1>Source-based writing task</h1><p>{materials.title}</p></div><div className="session-time"><Clock3 /><div><strong>{clockText(elapsed)}</strong><span>Active writing time</span></div></div></div>
        {!session ? <div className="start-session"><BookOpen /><h2>A space for your next draft.</h2><p>Read both sources, develop your position, and write a response of approximately 500 words.</p><Button className="condition-button" onClick={start} disabled={busy}>{busy ? "Opening…" : "Start writing session"}<ChevronRight /></Button></div> : <div className="writing-layout">
          <aside className="source-pane"><div className="pane-heading"><h2>Source texts</h2><Tabs value={source} onValueChange={v => { setSource(v); void log("source_viewed", { source: v.toUpperCase() }); }}><TabsList><TabsTrigger value="a">Source A</TabsTrigger><TabsTrigger value="b">Source B</TabsTrigger></TabsList></Tabs></div>
            <article className="source-article"><p className="source-eyebrow">SOURCE {source.toUpperCase()} · {materials.isDemo ? "DEMONSTRATION EXCERPT" : "READING MATERIAL"}</p><h3>{source === "a" ? materials.aTitle : materials.bTitle}</h3><p className="source-meta">{wordCount(source === "a" ? materials.aBody : materials.bBody)} words</p>{(source === "a" ? materials.aBody : materials.bBody).split(/\n\s*\n/).map((text, index) => materials.isDemo && index === 1 ? <blockquote key={index}>{text}</blockquote> : <p key={index}>{text}</p>)}<div className="source-end"><span /><BookOpen /><span /></div>{materials.isDemo && <p className="source-footnote">Preview materials. Full study sources will be supplied separately.</p>}</article>
          </aside>
          <section className="response-pane" aria-label="Writing editor"><div className="pane-heading"><h2>Your response</h2><span className="word-count"><strong>{words}</strong> / ~500 words</span></div><div className="task-instructions"><p className="eyebrow">TASK</p><p>{materials.prompt}</p></div>
            <div className="editor-shell"><div className="editor-toolbar" role="toolbar" aria-label="Text formatting">
              <div className="editor-font-controls">
                <Select value={font} onValueChange={value => { pendingFormat.current = { command: "fontName", value }; }} disabled={session.status !== "active"}><SelectTrigger className="editor-font-control editor-font-family" aria-label="Font family" onPointerDownCapture={selectText}><SelectValue /></SelectTrigger><SelectContent className="editor-font-menu" position="popper" onCloseAutoFocus={applyPickerFormat}>{editorFonts.map(value => <SelectItem key={value} value={value} style={{ fontFamily: value }}>{value}</SelectItem>)}</SelectContent></Select>
                <Select value={fontSize} onValueChange={value => { pendingFormat.current = { command: "fontSize", value: String(editorSizes.indexOf(Number(value) as typeof editorSizes[number]) + 1) }; }} disabled={session.status !== "active"}><SelectTrigger className="editor-font-control editor-font-size" aria-label="Font size" onPointerDownCapture={selectText}><SelectValue /></SelectTrigger><SelectContent className="editor-font-menu" position="popper" onCloseAutoFocus={applyPickerFormat}>{editorSizes.map(value => <SelectItem key={value} value={String(value)}>{value}</SelectItem>)}</SelectContent></Select>
              </div>{[{ icon: Bold, label: "Bold", cmd: "bold" }, { icon: Italic, label: "Italic", cmd: "italic" }, { icon: Underline, label: "Underline", cmd: "underline" }, { icon: List, label: "Bullet list", cmd: "insertUnorderedList" }, { icon: ListOrdered, label: "Numbered list", cmd: "insertOrderedList" }, { icon: Undo2, label: "Undo", cmd: "undo" }, { icon: Redo2, label: "Redo", cmd: "redo" }].map(({ icon: Icon, label, cmd }) => <Button variant="ghost" className="icon-button" key={cmd} title={label} aria-label={label} disabled={session.status !== "active"} onMouseDown={e => e.preventDefault()} onClick={() => format(cmd)}><Icon /></Button>)}</div>
              <div ref={editor} className="writing-editor" role="textbox" aria-label="Your response" aria-multiline="true" contentEditable={session.status === "active"} suppressContentEditableWarning data-placeholder="Begin your response here…" onInput={edited} onMouseUp={selectText} onKeyUp={selectText} onPaste={e => { e.preventDefault(); const text = e.clipboardData.getData("text/plain"); document.execCommand("insertText", false, text); edited(); void log("text_pasted", { text }); }} onDrop={e => e.preventDefault()} />
              {selection && session.status === "active" && <div className="selection-strip"><div><span className="eyebrow">SELECTED TEXT</span><p>“{selection}”</p></div><Button variant="ghost" className="icon-button" onClick={copySelected} title="Copy selected text" aria-label="Copy selected text"><Copy /></Button></div>}
              <div className="editor-footer"><span className={`save-state ${saveState}`} role="status">{saveState === "saved" ? <Check /> : <span className="status-dot" />}{saveState === "saved" ? "All changes saved" : saveState === "saving" ? "Saving…" : saveState === "error" ? "Not saved — retry" : "Unsaved changes"}</span>{session.status === "active" && <Button className="condition-button ask-button" disabled={busy || !selection.trim()} aria-describedby="ask-ai-help" onMouseDown={e => e.preventDefault()} onClick={ask}>Ask AI<ArrowUpRight /></Button>}</div>
            </div><p className="selection-help" id="ask-ai-help">{selection ? "EdUHK GenAI opens in a new tab. Your writing stays here." : "Select text in your response to enable Ask AI."}</p>
            {external && <div className="external-note"><p>EdUHK GenAI opens separately. Your selected text is not sent automatically.</p><a href={AI_URL} target="_blank" rel="noopener noreferrer">Open EdUHK GenAI <ArrowUpRight /></a><Button variant="ghost" onClick={() => { setExternal(false); void log("returned_to_workspace"); }}>Return to writing</Button></div>}
          </section>
        </div>}
        {session && <div className="workspace-bottom"><span><span className="tiny-dot" /> Session {session.id.slice(0, 8).toUpperCase()}</span>{session.status === "active" ? <Button variant="outline" onClick={() => setFinishDialog(true)}>End writing session</Button> : <Button className="condition-button" onClick={start} disabled={busy}><Plus />Start a new session</Button>}</div>}
      </section>
      {view === "records" && <section className="records-view"><p className="eyebrow muted">YOUR WORK</p><div className="records-title"><h1>Writing records</h1><Button className="condition-button" onClick={start} disabled={busy}><Plus />{sessions.some(s => s.status === "active") ? "Continue writing" : "New session"}</Button></div><p className="muted">Your drafts and completed writing sessions.</p>{sessions.length === 0 ? <div className="empty-records"><FileText /><h2>No sessions yet</h2><p>Start your first writing session to see it here.</p></div> : <div className="record-list">{sessions.map(s => <article key={s.id} className="record"><FileText /><div><h3>{s.task_title || "Predictive learning analytics"}</h3><p>{dateText(s.created)} · {wordCount(s.plain_text)} words · {s.status === "active" ? "In progress" : "Completed"}</p></div><Button variant="outline" onClick={() => openRecord(s)}>Open <ChevronRight /></Button><Button variant="ghost" className="icon-button" aria-label={`Export session ${s.id.slice(0, 8)}`} onClick={() => exportSession(s.id)}><Download /></Button></article>)}</div>}</section>}
    </main>
    {checkpoint && <Checkpoint condition={activeCondition} onClose={() => setCheckpoint(false)} onComplete={completeCheckpoint} />}
    <Dialog open={protocol} onOpenChange={setProtocol}><DialogContent className="protocol-dialog"><DialogHeader><DialogTitle>Writing protocol</DialogTitle><DialogDescription>AWARE research preview</DialogDescription></DialogHeader><ol><li><strong>Read both sources.</strong> Integrate evidence, develop a defensible position, and address relevant counterarguments.</li><li><strong>Write approximately 500 words.</strong> Your draft is saved to your account as you write.</li><li><strong>Select text, then Ask AI.</strong> Select part of your response to enable Ask AI. Depending on your assigned condition, you may complete a checkpoint before choosing to return to writing or continue to AI.</li><li><strong>You decide whether to use AI.</strong> There is no minimum number of AI requests.</li></ol><p>EdUHK GenAI opens in a separate tab and may require its own sign-in. AWARE records activity within this workspace, not conversations on the external website.</p><p className="muted">This is a functional test version with demonstration reading materials. Do not enter identifiable or confidential participant data.</p></DialogContent></Dialog>
    <Dialog open={finishDialog} onOpenChange={setFinishDialog}><DialogContent className="finish-dialog"><DialogHeader><DialogTitle>End this writing session?</DialogTitle><DialogDescription>Your latest writing will be saved. You can read or export it in Records, then start a new session.</DialogDescription></DialogHeader><div className="dialog-actions"><Button variant="outline" onClick={() => setFinishDialog(false)} disabled={busy}><ArrowLeft />Keep writing</Button><Button className="condition-button" onClick={finish} disabled={busy}>{busy ? "Saving…" : "Save and end session"}</Button></div></DialogContent></Dialog>
  </div>;
}
