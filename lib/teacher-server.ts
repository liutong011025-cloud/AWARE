import { prisma } from "./prisma";
import { demoMaterials, type SourceSet } from "./materials";
import { type Condition } from "./aware";
import { eventJson, writingSessionJson } from "./session-record";

const defaults: Record<string, Condition> = { lb: "appraisal", gy: "monitoring", zf: "direct" };

export async function ensureMaterials() {
  await prisma.sourceSet.createMany({
    data: [{ id: demoMaterials.id, data: JSON.stringify(demoMaterials), updated: BigInt(Date.now()) }],
    skipDuplicates: true,
  });
}

export async function studentAssignment(username: string) {
  const row = await prisma.studyAssignment.findUnique({
    where: { username },
    select: { condition: true, sourceSetId: true },
  });
  const source = row ? await prisma.sourceSet.findUnique({ where: { id: row.sourceSetId }, select: { data: true } }) : null;
  return { condition: (row?.condition as Condition | undefined) || defaults[username] || "direct", materials: source ? JSON.parse(source.data) as SourceSet : demoMaterials };
}

export async function teacherOverview() {
  await ensureMaterials();
  const [materials, assignments, sessions, aiRequests] = await Promise.all([
    prisma.sourceSet.findMany({ orderBy: { updated: "desc" }, select: { data: true } }),
    prisma.studyAssignment.findMany({ select: { username: true, condition: true, sourceSetId: true } }),
    prisma.$queryRaw<Array<{ id: string; username: string; task_title: string | null; status: string; revision: number; elapsed: number; created: bigint; updated: bigint; condition: string | null; characters: number }>>`
      SELECT id, username, task_title, status, revision, elapsed, created, updated, condition, char_length(plain_text) AS characters
      FROM writing_sessions
      ORDER BY updated DESC
      LIMIT 200
    `,
    prisma.event.count({ where: { type: "ai_handoff" } }),
  ]);
  const assigned = assignments.map(row => ({ username: row.username, condition: row.condition as Condition, source_set_id: row.sourceSetId }));
  return {
    materials: materials.map(row => JSON.parse(row.data) as SourceSet),
    students: Object.entries(defaults).map(([username, condition]) => ({ username, condition, source_set_id: demoMaterials.id, ...assigned.find(a => a.username === username) })),
    sessions: sessions.map(row => ({ ...row, created: Number(row.created), updated: Number(row.updated), characters: Number(row.characters) })),
    aiRequests,
  };
}

export async function teacherAction(body: Record<string, unknown>) {
  const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
  if (body.action === "teacher.saveMaterials") {
    const input = body.materials as Partial<SourceSet> | null;
    if (!input || !["title", "prompt", "aTitle", "aBody", "bTitle", "bBody"].every(key => typeof input[key as keyof SourceSet] === "string" && String(input[key as keyof SourceSet]).trim())) return reply({ error: "Complete the task and both source texts." }, 400);
    if (input.title!.length > 200 || input.prompt!.length > 2000 || input.aTitle!.length > 200 || input.bTitle!.length > 200 || input.aBody!.length > 25000 || input.bBody!.length > 25000) return reply({ error: "The text is too long. Use up to 25,000 characters for each source." }, 400);
    let id: string;
    if (input.id) {
      const exists = await prisma.sourceSet.findUnique({ where: { id: input.id }, select: { id: true } });
      if (!exists) return reply({ error: "Material set not found." }, 404);
      id = input.id;
    } else id = crypto.randomUUID();
    const data: SourceSet = { id, title: input.title!.trim(), prompt: input.prompt!.trim(), aTitle: input.aTitle!.trim(), aBody: input.aBody!.trim(), bTitle: input.bTitle!.trim(), bBody: input.bBody!.trim(), isDemo: input.isDemo === true };
    const saved = JSON.stringify(data);
    const updated = BigInt(Date.now());
    await prisma.sourceSet.upsert({ where: { id }, create: { id, data: saved, updated }, update: { data: saved, updated } });
    return reply({ materials: data });
  }
  if (body.action === "teacher.assign") {
    if (typeof body.username !== "string" || !Object.prototype.hasOwnProperty.call(defaults, body.username) || !["appraisal", "monitoring", "direct"].includes(String(body.condition)) || typeof body.sourceSetId !== "string") return reply({ error: "Choose a student, condition, and source set." }, 400);
    if (!(await prisma.sourceSet.findUnique({ where: { id: body.sourceSetId }, select: { id: true } }))) return reply({ error: "Source set not found." }, 404);
    const updated = BigInt(Date.now());
    await prisma.studyAssignment.upsert({
      where: { username: body.username },
      create: { username: body.username, condition: String(body.condition), sourceSetId: body.sourceSetId, updated },
      update: { condition: String(body.condition), sourceSetId: body.sourceSetId, updated },
    });
    return reply({ ok: true });
  }
  if (body.action === "teacher.session") {
    if (typeof body.sessionId !== "string") return reply({ error: "Select a session." }, 400);
    const session = await prisma.writingSession.findUnique({ where: { id: body.sessionId } });
    if (!session) return reply({ error: "Session not found." }, 404);
    const events = await prisma.event.findMany({ where: { sessionId: body.sessionId }, orderBy: { created: "desc" }, take: 1000, select: { id: true, type: true, payload: true, created: true } });
    return reply({ session: writingSessionJson(session), events: events.map(event => eventJson(event, true)), note: "AI events capture AWARE handoffs only; external prompts and responses are not available." });
  }
  return reply({ error: "Unknown teacher action." }, 400);
}
