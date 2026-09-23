"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, Clock3, Moon, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { readTracker, writeTracker } from "@/lib/local-tracker";

const categories = ["SAT", "Olympiad", "Research", "School", "Other"] as const;
type Priority = { text: string; done: boolean };
type Session = { id: string; day: string; category: string; minutes: number; note: string };
type Day = { day: string; priorities: string; sleep: number | null; energy: number | null; reflection: string };
type Data = { entry: Day | null; sessions: Session[]; weekDays: Day[]; weekSessions: Session[] };
const emptyPriorities = (): Priority[] => Array.from({ length: 3 }, () => ({ text: "", done: false }));
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const dateLabel = (day: string) => new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));
function shiftDay(day: string, amount: number) {
  const d = new Date(`${day}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + amount); return d.toISOString().slice(0, 10);
}
function readPriorities(raw?: string): Priority[] {
  try { const value = JSON.parse(raw || "[]"); return Array.from({ length: 3 }, (_, i) => ({ text: typeof value[i]?.text === "string" ? value[i].text : "", done: value[i]?.done === true })); }
  catch { return emptyPriorities(); }
}

export default function Home() {
  const [day, setDay] = useState(today);
  const [data, setData] = useState<Data | null>(null);
  const [priorities, setPriorities] = useState<Priority[]>(emptyPriorities);
  const [sleep, setSleep] = useState("");
  const [energy, setEnergy] = useState<number | null>(null);
  const [reflection, setReflection] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("SAT");
  const [minutes, setMinutes] = useState("45");
  const [sessionNote, setSessionNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async (selected: string, applyForm = true) => {
    try {
      const result = readTracker(selected);
      setData(result);
      if (applyForm) {
        setPriorities(readPriorities(result.entry?.priorities));
        setSleep(result.entry?.sleep == null ? "" : String(result.entry.sleep / 60));
        setEnergy(result.entry?.energy ?? null);
        setReflection(result.entry?.reflection ?? "");
        setDirty(false);
      }
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not load your tracker."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(day); }, 0);
    return () => window.clearTimeout(timer);
  }, [day, load]);
  function changeDay(next: string) {
    if (!next || next === day) return;
    setLoading(true);
    setMessage("");
    setDay(next);
  }

  const send = useCallback(async (payload: Record<string, unknown>, applyForm = false) => {
    setSaving(true); setMessage("");
    try {
      writeTracker(day, payload);
      await load(day, applyForm);
      setMessage("Saved");
      return true;
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not save."); return false; }
    finally { setSaving(false); }
  }, [day, load]);
  useEffect(() => {
    type Tool = { registerTool: (tool: {
      name: string; title: string; description: string; inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => Promise<object>;
    }, options: { signal: AbortSignal }) => void | Promise<void> };
    const context = (document as Document & { modelContext?: Tool }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tool = {
      name: "add_study_session",
      title: "Log study session",
      description: "Log a completed study session for the selected day and update the visible tracker.",
      inputSchema: {
        type: "object", properties: {
          category: { type: "string", enum: [...categories] },
          minutes: { type: "integer", minimum: 1, maximum: 480 },
          note: { type: "string", maxLength: 120 },
        }, required: ["category", "minutes"], additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input: unknown) {
        if (!input || typeof input !== "object") throw new Error("Enter a category and minutes.");
        const values = input as { category?: unknown; minutes?: unknown; note?: unknown };
        if (!categories.includes(values.category as typeof categories[number]) || !Number.isInteger(values.minutes) || Number(values.minutes) < 1 || Number(values.minutes) > 480 || (values.note !== undefined && (typeof values.note !== "string" || values.note.length > 120))) throw new Error("Check the session details.");
        if (!await send({ action: "add_session", category: values.category, minutes: values.minutes, note: values.note ?? "" })) throw new Error("Could not save the session.");
        return { saved: true, day, category: values.category, minutes: values.minutes };
      },
    };
    try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(console.error); }
    catch (error) { console.error(error); }
    return () => lifecycle.abort();
  }, [day, send]);
  function editPriority(index: number, patch: Partial<Priority>) {
    setPriorities(current => current.map((p, i) => i === index ? { ...p, ...patch } : p)); setDirty(true);
  }
  async function saveDay() {
    const parsedSleep = sleep.trim() === "" ? null : Number(sleep);
    if (parsedSleep !== null && (!Number.isFinite(parsedSleep) || parsedSleep < 0 || parsedSleep > 24 || !Number.isInteger(parsedSleep * 60))) { setMessage("Enter sleep in hours, from 0 to 24."); return; }
    const ok = await send({ action: "save_day", priorities, sleep: parsedSleep === null ? null : parsedSleep * 60, energy, reflection });
    if (ok) setDirty(false);
  }
  async function addSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await send({ action: "add_session", category, minutes: Number(minutes), note: sessionNote });
    if (ok) setSessionNote("");
  }
  const completed = priorities.filter(p => p.text.trim() && p.done).length;
  const planned = priorities.filter(p => p.text.trim()).length;
  const todayMinutes = data?.sessions.reduce((total, s) => total + s.minutes, 0) ?? 0;
  const focusDuration = todayMinutes < 60 ? `${todayMinutes} min` : `${Math.floor(todayMinutes / 60)} hr${Math.floor(todayMinutes / 60) === 1 ? "" : "s"}${todayMinutes % 60 ? ` ${todayMinutes % 60} min` : ""}`;
  const weekMinutes = data?.weekSessions.reduce((total, s) => total + s.minutes, 0) ?? 0;
  const weekDone = data?.weekDays.reduce((total, d) => total + readPriorities(d.priorities).filter(p => p.text.trim() && p.done).length, 0) ?? 0;
  const weekBars = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const date = shiftDay(day, i - 6);
    return { date, minutes: data?.weekSessions.filter(s => s.day === date).reduce((t, s) => t + s.minutes, 0) ?? 0 };
  }), [data, day]);
  const maxBar = Math.max(60, ...weekBars.map(b => b.minutes));

  return <main className="app-shell">
    <header className="topbar"><div className="topbar-inner">
      <div className="brand"><span className="brand-mark"><span /></span><span>DAYMARK<span className="brand-dot">.</span></span></div>
      <span className="private-label">SAVED ON THIS DEVICE</span>
    </div></header>
    <div className="workspace">
      <div className="page-head"><div><p className="eyebrow">DAILY TRACKER</p><h1>Make today count.</h1><p className="head-sub">A clear place for the work and the life around it.</p></div>
        <div className="date-control"><Button aria-label="Previous day" variant="outline" size="icon" onClick={() => changeDay(shiftDay(day, -1))}><ArrowLeft /></Button><label className="date-picker"><CalendarDays size={18}/><span className="sr-only">Selected date</span><input type="date" value={day} onChange={e => changeDay(e.target.value)} aria-label="Selected date" /></label><Button aria-label="Next day" variant="outline" size="icon" onClick={() => changeDay(shiftDay(day, 1))}><ArrowRight /></Button></div>
      </div>
      <div className="day-strip"><span>{dateLabel(day)}</span><span>{loading ? "Loading your day…" : planned ? `${completed} of ${planned} priorities done` : "Start with one priority"}</span></div>
      {message && <div className={message === "Saved" ? "notice success" : "notice"} role="status">{message}</div>}
      <div className="dashboard-grid">
        <section className="panel priorities-panel" aria-labelledby="priority-title"><div className="panel-heading"><div><p className="panel-kicker">01 / PLAN</p><h2 id="priority-title">Top three priorities</h2></div><span className="mini-count">{completed}/{planned || 3}</span></div>
          <div className="priority-list">{priorities.map((p, i) => <div className="priority-row" key={i}><Checkbox checked={p.done} onCheckedChange={checked => editPriority(i, { done: checked === true })} aria-label={`Complete priority ${i + 1}`} /><span className="priority-index">0{i+1}</span><input className={p.done ? "priority-input is-done" : "priority-input"} value={p.text} onChange={e => editPriority(i, { text: e.target.value })} maxLength={120} placeholder={i === 0 ? "What matters most today?" : "Add a priority"} aria-label={`Priority ${i + 1}`} /></div>)}</div>
          <p className="panel-footnote">A short list you can actually finish.</p>
        </section>
        <section className="panel study-panel" aria-labelledby="study-title"><div className="panel-heading"><div><p className="panel-kicker">02 / DO</p><h2 id="study-title">Study sessions</h2></div><div className="round-icon"><BookOpen size={19}/></div></div>
          <div className="study-summary" aria-live="polite"><span className="study-summary-label">TODAY’S FOCUS</span><strong>{todayMinutes ? focusDuration : "No time logged yet"}</strong></div>
          <form className="session-form" onSubmit={addSession}><label>Focus area<select value={category} onChange={e => setCategory(e.target.value as typeof category)}>{categories.map(c => <option key={c}>{c}</option>)}</select></label><label>Minutes<input type="number" min="1" max="480" required value={minutes} onChange={e => setMinutes(e.target.value)}/></label><label className="session-note">What did you work on? <span>Optional</span><input value={sessionNote} onChange={e => setSessionNote(e.target.value)} maxLength={120} placeholder="e.g. SAT reading practice" /></label><Button type="submit" disabled={saving || loading}><Plus size={16}/> Add session</Button></form>
          <div className="session-list">{data?.sessions.length ? data.sessions.map(s => <div className="session-item" key={s.id}><span className="session-glyph"><Clock3 size={16}/></span><div><strong>{s.category} <span>· {s.minutes} min</span></strong>{s.note && <small>{s.note}</small>}</div><button aria-label={`Delete ${s.category} session`} onClick={() => void send({ action: "delete_session", id: s.id })} disabled={saving}><Trash2 size={16}/></button></div>) : <p className="empty-list">No sessions logged yet. Add one when you finish a study block.</p>}</div>
        </section>
        <section className="panel checkin-panel" aria-labelledby="checkin-title"><div className="panel-heading"><div><p className="panel-kicker">03 / NOTICE</p><h2 id="checkin-title">Morning & evening</h2></div><div className="round-icon"><Moon size={19}/></div></div>
          <p className="checkin-intro">Log sleep and energy in the morning. Come back for the reflection tonight.</p>
          <div className="checkin-fields"><label>Sleep last night <span>hours</span><input type="number" inputMode="decimal" min="0" max="24" step="0.25" value={sleep} onChange={e => {setSleep(e.target.value);setDirty(true)}} placeholder="7.5" /></label><fieldset><legend>Energy today</legend><div className="energy-choices">{[1,2,3,4,5].map(n => <button type="button" key={n} className={energy===n ? "selected" : ""} aria-pressed={energy===n} onClick={() => {setEnergy(energy===n ? null : n);setDirty(true)}}>{n}</button>)}</div><small>Low <span>High</span></small></fieldset><label className="reflection-label">Evening reflection<textarea maxLength={500} rows={3} placeholder="What helped? What would you change?" value={reflection} onChange={e => {setReflection(e.target.value);setDirty(true)}} /></label></div>
          <Button className="save-button" onClick={() => void saveDay()} disabled={saving || loading}><Check size={16}/>{saving ? "Saving…" : "Save day"}</Button>{dirty && <span className="unsaved">Unsaved changes</span>}
        </section>
        <section className="panel week-panel" aria-labelledby="week-title"><div className="panel-heading"><div><p className="panel-kicker">THE LAST SEVEN DAYS</p><h2 id="week-title">A useful overview</h2></div></div>
          <div className="week-metrics"><div><strong>{Math.floor(weekMinutes/60)}h {weekMinutes%60}m</strong><span>focused time</span></div><div><strong>{weekDone}</strong><span>priorities finished</span></div></div><div className="bar-chart" aria-label="Daily study time in the last seven days">{weekBars.map(b => <div className="bar-col" key={b.date} title={`${b.date}: ${b.minutes} minutes`}><span>{b.minutes ? `${b.minutes}m` : ""}</span><div className="bar-track"><div style={{height: `${Math.max(4, (b.minutes/maxBar)*100)}%`}} className={b.minutes ? "bar-fill" : "bar-fill zero"}/></div><small>{new Intl.DateTimeFormat("en-US", { weekday:"short", timeZone:"UTC" }).format(new Date(`${b.date}T00:00:00Z`)).slice(0,2)}</small></div>)}</div>
          <p className="panel-footnote">Progress is information, not a verdict.</p>
        </section>
      </div>
      <footer>Entries stay in this browser on this device. Dates follow Uzbekistan time (UTC+5).</footer>
    </div>
  </main>;
}
