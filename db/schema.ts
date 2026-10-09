import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const authSessions = sqliteTable("auth_sessions", {
  tokenHash: text("token_hash").primaryKey(), username: text("username").notNull(), expires: integer("expires").notNull(),
});
export const loginAttempts = sqliteTable("login_attempts", { key: text("key").primaryKey(), attempts: integer("attempts").notNull(), since: integer("since").notNull() });
export const writingSessions = sqliteTable("writing_sessions", {
  id: text("id").primaryKey(), username: text("username").notNull(), html: text("html").notNull().default(""), plainText: text("plain_text").notNull().default(""),
  status: text("status").notNull().default("active"), revision: integer("revision").notNull().default(0), elapsed: integer("elapsed").notNull().default(0),
  created: integer("created").notNull(), updated: integer("updated").notNull(),
  condition: text("condition"), sourceSetId: text("source_set_id"), sourceData: text("source_data"), taskTitle: text("task_title"),
}, table => [index("sessions_user").on(table.username)]);
export const events = sqliteTable("events", {
  id: text("id").primaryKey(), sessionId: text("session_id").notNull().references(() => writingSessions.id), username: text("username").notNull(),
  type: text("type").notNull(), payload: text("payload").notNull(), created: integer("created").notNull(),
}, table => [index("events_session").on(table.sessionId)]);
export const sourceSets = sqliteTable("source_sets", { id: text("id").primaryKey(), data: text("data").notNull(), updated: integer("updated").notNull() });
export const studyAssignments = sqliteTable("study_assignments", { username: text("username").primaryKey(), condition: text("condition").notNull(), sourceSetId: text("source_set_id").notNull().references(() => sourceSets.id), updated: integer("updated").notNull() });
