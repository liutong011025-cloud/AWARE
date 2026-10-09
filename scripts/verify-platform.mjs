import assert from "node:assert/strict";
const origin = "http://127.0.0.1:5173";
const accounts = new Map();
async function post(username, body, cookieOverride) {
  const response = await fetch(`${origin}/api/platform`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", Cookie: cookieOverride ?? accounts.get(username) ?? "" }, body: JSON.stringify(body) });
  const cookie = response.headers.get("set-cookie");
  if (cookie) accounts.set(username, cookie.split(";")[0]);
  return { status: response.status, data: await response.json() };
}
async function state(username) { return (await fetch(`${origin}/api/platform`, { headers: { Cookie: accounts.get(username) } })).json(); }
const password = process.env.AWARE_TEST_PASSWORD;
assert(password, "Set the test password in the process environment.");
assert.equal((await post("bad", { action: "login", username: "constructor", password: "incorrect" })).status, 401);
assert.equal((await post("bad", { action: "login", username: "lb", password: "incorrect" })).status, 401);
const owned = {};
for (const [username, condition] of [["lb", "appraisal"], ["gy", "monitoring"], ["zf", "direct"]]) {
  assert.equal((await post(username, { action: "login", username, password })).status, 200);
  const before = await state(username);
  assert.equal(before.user.condition, condition);
  const existing = before.sessions.some(s => s.status === "active");
  const created = await post(username, { action: "create" });
  assert.equal(created.status, 200);
  const session = created.data.session;
  owned[username] = session.id;
  if (!existing) {
    const result = await post(username, { action: "save", sessionId: session.id, html: '<p><b>Verification draft</b></p><script>alert(1)</script><img src=x onerror=alert(1)>', text: "Verification draft", revision: session.revision, elapsed: 4 });
    assert.equal(result.status, 200);
    const stored = (await state(username)).sessions.find(s => s.id === session.id);
    assert(stored.html.includes("<b>Verification draft</b>"));
    assert(!/script|onerror|<img/i.test(stored.html));
    assert.equal((await post(username, { action: "save", sessionId: session.id, html: "old", text: "old", revision: session.revision, elapsed: 1 })).status, 409);
  }
  const answers = { activity: "Argument development", first: 4, second: 2, delegation: 0, assistance: "" };
  assert.equal((await post(username, { action: "checkpoint", sessionId: session.id, selection: "", answers, next: "writing" })).status, 400);
  assert.equal((await post(username, { action: "event", sessionId: session.id, type: "ask_ai_clicked", payload: { selectedText: "  " } })).status, 400);
  const result = await post(username, { action: "checkpoint", sessionId: session.id, selection: "Verification draft", answers, next: "writing" });
  assert.equal(result.status, condition === "direct" ? 400 : 200);
  if (condition !== "direct") assert.equal((await post(username, { action: "checkpoint", sessionId: session.id, selection: "", answers: { ...answers, first: 7 }, next: "writing" })).status, 400);
  assert.equal((await post(username, { action: "export", sessionId: session.id })).status, 200);
  if (!existing) assert.equal((await post(username, { action: "finish", sessionId: session.id })).status, 200);
  console.log(`${username}: login, condition, session, validation, persistence/export passed${existing ? " (existing draft preserved)" : ", HTML safety and revision conflict passed"}`);
}
assert.equal((await post("gy", { action: "export", sessionId: owned.lb })).status, 404);
assert.equal((await fetch(`${origin}/api/platform`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create" }) })).status, 403);
for (const username of accounts.keys()) if (["lb", "gy", "zf"].includes(username)) assert.equal((await post(username, { action: "logout" })).status, 200);
console.log("Cross-account access, origin protection and logout passed.");
