import assert from "node:assert/strict";
const origin = "http://127.0.0.1:5173";
const cookies = {};
async function call(who, body) { const response = await fetch(`${origin}/api/platform`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", Cookie: cookies[who] || "" }, body: JSON.stringify(body) }); const cookie = response.headers.get("set-cookie"); if (cookie) cookies[who] = cookie.split(";")[0]; return { status: response.status, body: await response.json() }; }
async function state(who) { return (await fetch(`${origin}/api/platform`, { headers: { Cookie: cookies[who] || "" } })).json(); }
assert(process.env.AWARE_TEACHER_TEST_PASSWORD && process.env.AWARE_TEST_PASSWORD);
assert.equal((await call("teacher", { action: "login", username: "Nicole", password: process.env.AWARE_TEACHER_TEST_PASSWORD })).status, 200);
assert.equal((await call("student", { action: "login", username: "gy", password: process.env.AWARE_TEST_PASSWORD })).status, 200);
const before = await state("teacher");
assert.equal(before.user.role, "teacher"); assert.equal(before.teacher.students.length, 3);
assert.equal((await call("student", { action: "teacher.assign", username: "lb", condition: "direct", sourceSetId: before.teacher.materials[0].id })).status, 403);
assert.equal((await call("teacher", { action: "teacher.saveMaterials", materials: { title: "Incomplete" } })).status, 400);
const original = before.teacher.materials[0];
const assignment = before.teacher.students.find(s => s.username === "gy");
try {
  const changed = { ...original, title: `${original.title} [temporary verification]` };
  assert.equal((await call("teacher", { action: "teacher.saveMaterials", materials: changed })).status, 200);
  assert.equal((await call("teacher", { action: "teacher.assign", username: "gy", condition: "appraisal", sourceSetId: original.id })).status, 200);
  const student = await state("student");
  assert.equal(student.user.condition, "appraisal"); assert.equal(student.materials.title, changed.title); assert.equal(student.teacher, undefined);
  if (before.teacher.sessions.length) {
    const sessionId = before.teacher.sessions[0].id;
    const review = await call("teacher", { action: "teacher.session", sessionId });
    assert.equal(review.status, 200); assert(Array.isArray(review.body.events)); assert.equal(typeof review.body.session.plain_text, "string");
    assert.equal((await call("student", { action: "teacher.session", sessionId })).status, 403);
  }
  console.log("Teacher login, source editing, student assignment, assigned-source visibility, session review, and student privilege denial passed.");
} finally {
  assert.equal((await call("teacher", { action: "teacher.saveMaterials", materials: original })).status, 200);
  assert.equal((await call("teacher", { action: "teacher.assign", username: "gy", condition: assignment.condition, sourceSetId: assignment.source_set_id })).status, 200);
  await call("teacher", { action: "logout" }); await call("student", { action: "logout" });
  console.log("Temporary changes restored; existing student writing was not modified.");
}
