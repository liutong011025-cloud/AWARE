import { activities, assistance, type Condition } from "@/lib/aware";
import { cleanHTML } from "@/lib/clean-html";
import { prisma } from "@/lib/prisma";
import { eventJson, writingSessionJson } from "@/lib/session-record";
import { studentAssignment, teacherAction, teacherOverview } from "@/lib/teacher-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const users: Record<string, { condition: Condition; salt: string; hash: string }> = {
  lb: { condition: "appraisal", salt: "8f3c89c8074e35e65e93dd9e05ff4bae", hash: "b601db19b2d82f32da6ecbe20d28878daa8ef0654e602e2a447725ed51345017" },
  gy: { condition: "monitoring", salt: "20b265700c9b735acd9c86ec660bf8d4", hash: "578b1ec764565c65438db95a5d8639ba64356239f970eb2b7d95bf57f91e9222" },
  zf: { condition: "direct", salt: "f15023d461ed8792bcf0f1b2905bccd8", hash: "79943b54193ac4aa63795eea1f32e41c94dcd152cbfc93db6cba49e212d2714d" },
  nicole: { condition: "direct", salt: "e64527badc1eaa77e7c53a9b5cc706ca", hash: "68095270fd7c112ace356fa9e798adc507e71bb91b669f1050fec2a934d121e3" },
};
const encode = new TextEncoder();
const hex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, "0")).join("");
const digest = async (text: string) => hex(await crypto.subtle.digest("SHA-256", encode.encode(text)));
const reply = (data: unknown, status = 200, headers: Record<string, string> = {}) => Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
function cookie(req: Request, token: string, age = 28800) { return `aware_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`; }
function clientAddress(req: Request) {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "local").trim();
}
async function identity(req: Request) {
  const token = req.headers.get("cookie")?.match(/(?:^|;\s*)aware_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (!token) return null;
  const row = await prisma.authSession.findFirst({
    where: { tokenHash: await digest(token), expires: { gt: BigInt(Date.now()) } },
    select: { username: true },
  });
  return row && users[row.username] ? { username: row.username, condition: users[row.username].condition, role: row.username === "nicole" ? "teacher" : "student" } : null;
}
export async function GET(req: Request) {
  try {
    const user = await identity(req);
    if (!user) return reply({ user: null });
    if (user.role === "teacher") return reply({ user, teacher: await teacherOverview() });
    const [sessions, assignment] = await Promise.all([
      prisma.writingSession.findMany({
        where: { username: user.username },
        orderBy: { created: "desc" },
        take: 100,
        select: { id: true, html: true, plainText: true, status: true, revision: true, elapsed: true, created: true, updated: true, condition: true, sourceData: true, taskTitle: true },
      }),
      studentAssignment(user.username),
    ]);
    return reply({ user: { ...user, condition: assignment.condition }, sessions: sessions.map(session => writingSessionJson(session, "list")), materials: assignment.materials });
  } catch { return reply({ error: "The workspace is temporarily unavailable. Please try again." }, 503); }
}
export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin");
    if (!origin || origin !== new URL(req.url).origin) return reply({ error: "Please use the website to make this request." }, 403);
    if (Number(req.headers.get("content-length") || 0) > 150000) return reply({ error: "This document is too large." }, 413);
    const raw = await req.text();
    if (raw.length > 150000) return reply({ error: "This document is too large." }, 413);
    let body: Record<string, unknown>;
    try { body = JSON.parse(raw); } catch { return reply({ error: "Invalid request." }, 400); }
    if (!body || typeof body !== "object") return reply({ error: "Invalid request." }, 400);
    const action = body.action;
    if (action === "login") {
      const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
      const password = typeof body.password === "string" ? body.password : "";
      if (username.length > 32 || password.length > 100) return reply({ error: "Username or password is incorrect." }, 401);
      const key = await digest(clientAddress(req) + ":" + username);
      const now = Date.now();
      const cutoff = BigInt(now - 900000);
      const stamped = BigInt(now);
      await prisma.$executeRaw`
        INSERT INTO login_attempts ("key", attempts, since) VALUES (${key}, 1, ${stamped})
        ON CONFLICT ("key") DO UPDATE SET
          attempts = CASE WHEN login_attempts.since < ${cutoff} THEN 1 ELSE login_attempts.attempts + 1 END,
          since = CASE WHEN login_attempts.since < ${cutoff} THEN ${stamped} ELSE login_attempts.since END
      `;
      const attempt = await prisma.loginAttempt.findUnique({ where: { key }, select: { attempts: true } });
      if (attempt && attempt.attempts > 12) return reply({ error: "Too many attempts. Please try again in 15 minutes." }, 429);
      const accountExists = Object.prototype.hasOwnProperty.call(users, username);
      const account = accountExists ? users[username] : users.lb;
      const material = await crypto.subtle.importKey("raw", encode.encode(password), "PBKDF2", false, ["deriveBits"]);
      const calculated = hex(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: encode.encode(account.salt), iterations: 100000, hash: "SHA-256" }, material, 256));
      let diff = 0;
      for (let i = 0; i < calculated.length; i++) diff |= calculated.charCodeAt(i) ^ account.hash.charCodeAt(i);
      if (!accountExists || diff !== 0) return reply({ error: "Username or password is incorrect." }, 401);
      const token = hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
      const tokenHash = await digest(token);
      await prisma.$transaction([
        prisma.authSession.deleteMany({ where: { expires: { lt: stamped } } }),
        prisma.authSession.create({ data: { tokenHash, username, expires: BigInt(now + 28800000) } }),
        prisma.loginAttempt.deleteMany({ where: { key } }),
      ]);
      return reply({ ok: true }, 200, { "Set-Cookie": cookie(req, token) });
    }
    const user = await identity(req);
    if (!user) return reply({ error: "Your session has expired. Please sign in again." }, 401);
    if (action === "logout") {
      const token = req.headers.get("cookie")?.match(/aware_session=([a-f0-9]{64})/)?.[1];
      if (token) await prisma.authSession.deleteMany({ where: { tokenHash: await digest(token) } });
      return reply({ ok: true }, 200, { "Set-Cookie": cookie(req, "", 0) });
    }
    if (typeof action === "string" && action.startsWith("teacher.")) {
      if (user.role !== "teacher") return reply({ error: "Teacher access is required." }, 403);
      return teacherAction(body);
    }
    if (user.role === "teacher") return reply({ error: "Use the teacher management actions." }, 403);
    if (action === "create") {
      const active = await prisma.writingSession.findFirst({
        where: { username: user.username, status: "active" },
        orderBy: { created: "desc" },
        select: { id: true, html: true, plainText: true, status: true, revision: true, elapsed: true, created: true, updated: true, condition: true, sourceData: true, taskTitle: true },
      });
      if (active) return reply({ session: writingSessionJson(active, "list") });
      const id = crypto.randomUUID(), now = Date.now();
      const assignment = await studentAssignment(user.username);
      const sourceData = JSON.stringify(assignment.materials);
      await prisma.writingSession.create({
        data: {
          id, username: user.username, html: "", plainText: "", status: "active", revision: 0, elapsed: 0,
          created: BigInt(now), updated: BigInt(now), condition: assignment.condition, sourceSetId: assignment.materials.id, sourceData, taskTitle: assignment.materials.title,
        },
      });
      return reply({ session: { id, html: "", plain_text: "", status: "active", revision: 0, elapsed: 0, created: now, updated: now, condition: assignment.condition, source_data: sourceData, task_title: assignment.materials.title } });
    }
    if (typeof body.sessionId !== "string") return reply({ error: "Please open a writing session first." }, 400);
    const session = await prisma.writingSession.findFirst({ where: { id: body.sessionId, username: user.username } });
    if (!session) return reply({ error: "Session not found." }, 404);
    const sessionCondition = (session.condition as Condition | null) || users[user.username].condition;
    const eventData = (type: string, payload: unknown) => ({ id: crypto.randomUUID(), sessionId: body.sessionId as string, username: user.username, type, payload: JSON.stringify(payload), created: BigInt(Date.now()) });
    if (action === "export") {
      const events = await prisma.event.findMany({ where: { sessionId: body.sessionId, username: user.username }, orderBy: { created: "asc" }, select: { type: true, payload: true, created: true } });
      return reply({ user, session: writingSessionJson(session), events: events.map(event => eventJson(event, false)), note: "External GenAI conversations are not captured by AWARE." });
    }
    if (session.status !== "active") return reply({ error: "This session has already ended." }, 409);
    if (action === "save") {
      if (typeof body.html !== "string" || typeof body.text !== "string" || body.html.length > 100000 || body.text.length > 60000 || !Number.isInteger(body.revision)) return reply({ error: "Invalid document." }, 400);
      const html = cleanHTML(body.html);
      const elapsed = typeof body.elapsed === "number" && Number.isFinite(body.elapsed) ? Math.max(0, Math.min(Math.round(body.elapsed), 864000)) : 0;
      const changed = await prisma.$executeRaw`
        UPDATE writing_sessions
        SET html = ${html}, plain_text = ${body.text}, elapsed = GREATEST(elapsed, ${elapsed}), revision = revision + 1, updated = ${BigInt(Date.now())}
        WHERE id = ${body.sessionId} AND username = ${user.username} AND revision = ${body.revision} AND status = 'active'
      `;
      if (!changed) return reply({ error: "This session changed in another tab. Copy your latest writing before reloading to avoid losing it." }, 409);
      if (html !== session.html) await prisma.event.create({ data: eventData("draft_saved", { html, text: body.text, revision: Number(body.revision) + 1, elapsed }) });
      return reply({ revision: Number(body.revision) + 1 });
    }
    if (action === "checkpoint") {
      if (sessionCondition === "direct") return reply({ error: "This account does not use a checkpoint." }, 400);
      if (body.next !== "writing" && body.next !== "ai") return reply({ error: "Choose your next step." }, 400);
      const answers = body.answers as Record<string, unknown> | undefined;
      const rating = (v: unknown) => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5;
      if (!answers || !activities.includes(String(answers.activity)) || !rating(answers.first) || !rating(answers.second) || !Number.isInteger(answers.delegation) || Number(answers.delegation) < 0 || Number(answers.delegation) > 5 || (body.next === "ai" && !assistance.includes(String(answers.assistance)))) return reply({ error: "Please complete the checkpoint before continuing." }, 400);
      if (typeof body.selection !== "string" || !body.selection.trim() || body.selection.length > 12000) return reply({ error: "Select text in your response before asking AI." }, 400);
      await prisma.event.create({ data: eventData("checkpoint_completed", { condition: sessionCondition, answers, selectedText: body.selection, next: body.next }) });
      return reply({ ok: true });
    }
    if (action === "event") {
      const allowed = ["source_viewed", "text_selected", "ask_ai_clicked", "ai_handoff", "returned_to_workspace", "text_pasted", "text_copied"];
      if (!allowed.includes(String(body.type)) || JSON.stringify(body.payload || {}).length > 15000) return reply({ error: "Invalid event." }, 400);
      if (body.type === "ask_ai_clicked" || body.type === "ai_handoff") {
        const text = (body.payload as Record<string, unknown> | undefined)?.selectedText;
        if (typeof text !== "string" || !text.trim() || text.length > 12000) return reply({ error: "Select text in your response before asking AI." }, 400);
      }
      await prisma.event.create({ data: eventData(String(body.type), body.payload || {}) });
      return reply({ ok: true });
    }
    if (action === "finish") {
      const completed = eventData("session_completed", {});
      await prisma.$transaction([
        prisma.writingSession.updateMany({ where: { id: body.sessionId, username: user.username }, data: { status: "completed", updated: BigInt(Date.now()) } }),
        prisma.event.create({ data: completed }),
      ]);
      return reply({ ok: true });
    }
    return reply({ error: "Unknown action." }, 400);
  } catch { return reply({ error: "Unable to save right now. Your writing is still on screen. Please try again." }, 503); }
}
