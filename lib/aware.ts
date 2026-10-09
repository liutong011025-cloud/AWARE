export type Condition = "appraisal" | "monitoring" | "direct";
export type User = { username: string; condition: Condition; role?: "teacher" | "student" };
export type WritingSession = { id: string; html: string; plain_text: string; status: string; revision: number; elapsed: number; created: number; updated: number; condition?: Condition; source_data?: string; task_title?: string; username?: string };
export const conditions = {
  appraisal: { label: "Appraisal-aware", full: "Appraisal-aware condition" },
  monitoring: { label: "Self-monitoring", full: "Generic self-monitoring condition" },
  direct: { label: "AI-as-usual", full: "AI-as-usual condition" },
};
export const activities = ["Understanding sources or concepts", "Generating or developing ideas", "Argument development", "Organisation and coherence", "Drafting language", "Revision or evaluation", "Citation or academic conventions", "Other"];
export const assistance = ["Explain a source or concept", "Generate or develop ideas", "Develop an argument or reasoning", "Improve organisation and coherence", "Draft language", "Revise or evaluate writing", "Help with citations or conventions", "Other"];
export const AI_URL = "https://genai.eduhk.hk/";
export async function api<T = Record<string, unknown>>(action: string, data: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch("/api/platform", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...data }) });
  const result = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Could not save. Please try again.");
  return result as T;
}
