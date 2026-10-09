export function writingSessionJson(row: {
  id: string;
  username?: string;
  html: string;
  plainText: string;
  status: string;
  revision: number;
  elapsed: number;
  created: bigint;
  updated: bigint;
  condition: string | null;
  sourceSetId?: string | null;
  sourceData: string | null;
  taskTitle: string | null;
}, fields: "list" | "full" = "full") {
  const session = {
    id: row.id,
    html: row.html,
    plain_text: row.plainText,
    status: row.status,
    revision: row.revision,
    elapsed: row.elapsed,
    created: Number(row.created),
    updated: Number(row.updated),
    condition: row.condition,
    source_data: row.sourceData,
    task_title: row.taskTitle,
  };
  if (fields === "list") return session;
  return { ...session, username: row.username, source_set_id: row.sourceSetId ?? null };
}

export function eventJson(row: { id?: string; type: string; payload: string; created: bigint }, withId: boolean) {
  const event = { type: row.type, payload: row.payload, created: Number(row.created) };
  return withId ? { id: row.id, ...event } : event;
}
