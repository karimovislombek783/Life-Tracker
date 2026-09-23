// This Vercel edition keeps data in this browser. There is no server database.
export type Priority = { text: string; done: boolean };
export type Session = { id: string; day: string; category: string; minutes: number; note: string; created_at: string };
export type Day = { day: string; priorities: string; sleep: number | null; energy: number | null; reflection: string; updated_at: string };
export type TrackerData = { entry: Day | null; sessions: Session[]; weekDays: Day[]; weekSessions: Session[] };
type Store = { days: Record<string, Day>; sessions: Session[] };
const KEY = "daymark-tracker-v1";
function readStore(): Store {
  const raw = localStorage.getItem(KEY);
  if (!raw) return { days: {}, sessions: [] };
  const parsed = JSON.parse(raw) as Store;
  if (!parsed || typeof parsed.days !== "object" || !Array.isArray(parsed.sessions)) throw new Error("Saved data could not be read in this browser.");
  return parsed;
}
function writeStore(store: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(store)); }
  catch { throw new Error("Browser storage is unavailable or full. Your changes were not saved."); }
}
export function readTracker(day: string): TrackerData {
  const store = readStore();
  const start = new Date(`${day}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 6);
  const since = start.toISOString().slice(0, 10);
  return {
    entry: store.days[day] ?? null,
    sessions: store.sessions.filter(s => s.day === day).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    weekDays: Object.values(store.days).filter(d => d.day >= since && d.day <= day).sort((a, b) => a.day.localeCompare(b.day)),
    weekSessions: store.sessions.filter(s => s.day >= since && s.day <= day),
  };
}
export function writeTracker(day: string, action: Record<string, unknown>) {
  const store = readStore();
  if (action.action === "save_day") {
    const priorities = action.priorities as Priority[];
    if (!Array.isArray(priorities) || priorities.length > 3 || priorities.some(p => typeof p.text !== "string" || p.text.length > 120 || typeof p.done !== "boolean")) throw new Error("Check your priorities.");
    const sleep = action.sleep === null ? null : Number(action.sleep);
    const energy = action.energy === null ? null : Number(action.energy);
    if ((sleep !== null && (!Number.isInteger(sleep) || sleep < 0 || sleep > 1440)) || (energy !== null && (!Number.isInteger(energy) || energy < 1 || energy > 5))) throw new Error("Check sleep and energy.");
    if (typeof action.reflection !== "string" || action.reflection.length > 500) throw new Error("The note is too long.");
    store.days[day] = { day, priorities: JSON.stringify(priorities.map(p => ({ text: p.text.trim(), done: p.done }))), sleep, energy, reflection: action.reflection.trim(), updated_at: new Date().toISOString() };
  } else if (action.action === "add_session") {
    const minutes = Number(action.minutes);
    if (!["SAT", "Olympiad", "Research", "School", "Other"].includes(String(action.category)) || !Number.isInteger(minutes) || minutes < 1 || minutes > 480 || typeof action.note !== "string" || action.note.length > 120) throw new Error("Check the session details.");
    store.sessions.push({ id: crypto.randomUUID(), day, category: String(action.category), minutes, note: action.note.trim(), created_at: new Date().toISOString() });
  } else if (action.action === "delete_session") {
    store.sessions = store.sessions.filter(s => !(s.id === action.id && s.day === day));
  } else throw new Error("Unknown action.");
  writeStore(store);
}
