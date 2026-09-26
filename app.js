'use strict';

/* =========================================================
   Daybook — a local-first productivity app.
   All data lives in localStorage under STORE.
   ========================================================= */

const STORE = 'daybook.v1';
const DEFAULT_PIN = '1234';
const PIN_LEN = 4;

const NAV = [
  { id: 'today', label: 'Today', locked: true },
  { id: 'calendar', label: 'Calendar' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'notes', label: 'Notes' },
  { id: 'habits', label: 'Habits' },
  { id: 'stats', label: 'Stats' },
  { id: 'settings', label: 'Settings', locked: true },
];
const SECTIONS = { focus: 'Focus line', timer: 'Focus timer', schedule: 'Schedule', due: 'Due today', habits: 'Habits', goals: 'Goals' };
const ACCENTS = { indigo: '#4f46e5', teal: '#0d8f86', rose: '#d6285a', amber: '#c26a00', green: '#178a3e' };
const PRIORITY = { none: 'None', low: 'Low', med: 'Medium', high: 'High' };
const PRIO_RANK = { high: 0, med: 1, low: 2, none: 3 };
const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240];
const REPEAT = { none: 'Does not repeat', daily: 'Every day', weekdays: 'Every weekday (Mon–Fri)', weekly: 'Every week', monthly: 'Every month' };
const REPEAT_SHORT = { daily: 'Daily', weekdays: 'Weekdays', weekly: 'Weekly', monthly: 'Monthly' };
const TIMER_MODES = { focus: ['Focus', 25], short: ['Short break', 5], long: ['Long break', 15] };

/* ---------- Icons ---------- */
const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  today: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  calendar: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>'),
  tasks: svg('<path d="M10 6h10M10 12h10M10 18h10"/><path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17"/>'),
  notes: svg('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'),
  habits: svg('<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>'),
  stats: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  settings: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  trash: svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>'),
  check: svg('<path d="M20 6 9 17l-5-5"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  up: svg('<path d="m18 15-6-6-6 6"/>'),
  down: svg('<path d="m6 9 6 6 6-6"/>'),
  left: svg('<path d="m15 18-6-6 6-6"/>'),
  right: svg('<path d="m9 18 6-6-6-6"/>'),
  grip: svg('<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>'),
  bolt: svg('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
  bell: svg('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>'),
};

/* ---------- Helpers ---------- */
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 10);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const todayStr = () => ymd(new Date());
const startOfWeek = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return addDays(x, -((x.getDay() + 6) % 7)); };
const nowMinutes = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
const toHHMM = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const fromHHMM = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const fmtTime = (m) => { const h = Math.floor(m / 60) % 24; return `${h % 12 || 12}:${pad(m % 60)} ${h < 12 ? 'AM' : 'PM'}`; };
const fmtDate = (s, o = { month: 'short', day: 'numeric' }) => parse(s).toLocaleDateString(undefined, o);
const hourLabel = (h) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lastNDays = (n) => Array.from({ length: n }, (_, i) => ymd(addDays(new Date(), i - n + 1)));
const fmtHours = (min) => { const h = min / 60; return `${Number.isInteger(h) ? h : h.toFixed(1)} h`; };

/* ---------- Starting state ---------- */
function emptyState() {
  return {
    version: 1,
    passcode: DEFAULT_PIN,
    settings: {
      theme: 'system', density: 'comfortable', accent: 'indigo',
      sections: Object.keys(SECTIONS).map((id) => ({ id, visible: true })),
      hiddenNav: [],
      dayStart: '08:00', dayEnd: '22:00',
    },
    focus: {},
    lists: [{ id: 'l-inbox', name: 'Inbox', color: 1 }],
    tasks: [],
    notes: [],
    habits: [],
    goals: [],
    reviews: {},
    pomodoros: [],
    busy: [],
  };
}

/* ---------- Persistence ---------- */
function load() {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) return normalize(JSON.parse(raw));
  } catch (_) { /* start empty */ }
  return emptyState();
}
function normalize(s) {
  const base = emptyState();
  const out = { ...base, ...s, settings: { ...base.settings, ...(s.settings || {}) } };
  for (const k of ['lists', 'tasks', 'notes', 'habits', 'goals', 'pomodoros', 'busy']) if (!Array.isArray(out[k])) out[k] = [];
  if (!out.lists.length) out.lists = base.lists;
  const known = new Set(out.settings.sections.map((x) => x.id));
  Object.keys(SECTIONS).forEach((id) => {
    if (known.has(id)) return;
    // New sections slot in after the one they follow in SECTIONS, so upgrades land in a sensible place.
    const keys = Object.keys(SECTIONS), prev = keys[keys.indexOf(id) - 1];
    const at = out.settings.sections.findIndex((x) => x.id === prev);
    out.settings.sections.splice(at + 1, 0, { id, visible: true });
  });
  out.settings.sections = out.settings.sections.filter((x) => SECTIONS[x.id]);
  out.tasks.forEach((t) => { t.subtasks = t.subtasks || []; t.repeat = t.repeat || 'none'; });
  out.habits.forEach((h) => { h.log = h.log || {}; });
  return out;
}
function save() {
  try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (_) { /* storage blocked; sync may still work */ }
  queuePush();
}

let state = load();
// Recorded so helpers outside the browser (the Cowork plugin) know what "today" means here.
try { state.settings.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (_) { /* unknown */ }
const ui = {
  locked: true, pin: '', fails: 0, lockUntil: 0, lockErr: '',
  calView: 'week', calDate: todayStr(), calScroll: null,
  taskF: { q: '', list: 'all', prio: 'all', due: 'all', status: 'open' },
  noteQ: '', noteList: 'all', activeNote: null,
  hoursRange: 'week',
  placing: null, skipClick: false, showKey: false,
  reminded: {},
  timer: { mode: 'focus', left: TIMER_MODES.focus[1] * 60, running: false, endAt: 0, taskId: '' },
};

/* ---------- Lookups ---------- */
const taskById = (id) => state.tasks.find((t) => t.id === id);
const listById = (id) => state.lists.find((l) => l.id === id);
const habitById = (id) => state.habits.find((h) => h.id === id);
const goalById = (id) => state.goals.find((g) => g.id === id);
const listColor = (id) => { const l = listById(id); return l ? `var(--c${l.color})` : 'var(--muted)'; };
const doneOn = (t, ds) => t.done && t.doneAt && ymd(new Date(t.doneAt)) === ds;

function taskSort(a, b) {
  if (a.done !== b.done) return a.done ? 1 : -1;
  if (a.due !== b.due) { if (!a.due) return 1; if (!b.due) return -1; return a.due < b.due ? -1 : 1; }
  if (PRIO_RANK[a.priority] !== PRIO_RANK[b.priority]) return PRIO_RANK[a.priority] - PRIO_RANK[b.priority];
  return a.title.localeCompare(b.title);
}
function dueLabel(due, done) {
  const T = todayStr();
  if (due === T) return 'Due today';
  if (due === ymd(addDays(new Date(), 1))) return 'Due tomorrow';
  if (due < T && !done) return `Overdue · ${fmtDate(due)}`;
  return `Due ${fmtDate(due)}`;
}
function streak(h) {
  let d = new Date();
  if (!h.log[ymd(d)]) d = addDays(d, -1);
  let n = 0;
  while (h.log[ymd(d)]) { n++; d = addDays(d, -1); }
  return n;
}
function weekCount(h) {
  const start = startOfWeek(new Date());
  let n = 0;
  for (let i = 0; i < 7; i++) if (h.log[ymd(addDays(start, i))]) n++;
  return n;
}

/* ---------- Repeating tasks ---------- */
const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
function stepDate(ds, repeat) {
  const d = parse(ds);
  if (repeat === 'daily') d.setDate(d.getDate() + 1);
  else if (repeat === 'weekdays') { do d.setDate(d.getDate() + 1); while (d.getDay() === 0 || d.getDay() === 6); }
  else if (repeat === 'weekly') d.setDate(d.getDate() + 7);
  else if (repeat === 'monthly') {
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  }
  return ymd(d);
}
// Completing a repeating task keeps it as done (for stats) and creates the next occurrence,
// always landing after today so an overdue task doesn't spawn another overdue one.
function spawnNext(t) {
  const base = t.due || t.block?.date || todayStr();
  let next = stepDate(base, t.repeat);
  while (next <= todayStr()) next = stepDate(next, t.repeat);
  const shift = daysBetween(base, next);
  const copy = {
    ...t, id: uid(), done: false, doneAt: null, nextId: null, createdAt: Date.now(),
    subtasks: t.subtasks.map((x) => ({ ...x, id: uid(), done: false })),
    due: t.due ? next : null,
    block: t.block ? { ...t.block, date: ymd(addDays(parse(t.block.date), shift)) } : null,
  };
  t.nextId = copy.id;
  state.tasks.push(copy);
  return copy;
}

/* ---------- Scheduling ---------- */
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const taskDur = (t) => t.block?.dur || t.est || 60;
const fmtDur = (m) => (m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m / 60} h`);
const busyOn = (ds) => { const wd = parse(ds).getDay(); return state.busy.filter((b) => b.days.includes(wd)); };
function occupied(ds, excludeId) {
  return [
    ...state.tasks.filter((t) => t.block && t.block.date === ds && t.id !== excludeId).map((t) => ({ start: t.block.start, end: t.block.start + t.block.dur })),
    ...busyOn(ds).map((b) => ({ start: b.start, end: b.end })),
  ].sort((a, b) => a.start - b.start);
}
// The first gap of `dur` minutes within the day's hours, at or after fromDate/fromMin, never in the past.
function findSlot(dur, fromDate = todayStr(), fromMin = 0, { excludeId, days = 14 } = {}) {
  const dayStart = fromHHMM(state.settings.dayStart), dayEnd = fromHHMM(state.settings.dayEnd);
  const T = todayStr();
  if (fromDate < T) { fromDate = T; fromMin = 0; }
  for (let i = 0; i < days; i++) {
    const ds = ymd(addDays(parse(fromDate), i));
    let start = Math.max(dayStart, i === 0 ? fromMin : 0, ds === T ? nowMinutes() : 0);
    start = Math.ceil(start / 15) * 15;
    for (const o of occupied(ds, excludeId)) {
      if (o.end <= start) continue;
      if (o.start - start >= dur) break;
      start = Math.ceil(o.end / 15) * 15;
    }
    if (start + dur <= dayEnd) return { date: ds, start };
  }
  return null;
}
const slotLabel = (slot) => `${slot.date === todayStr() ? 'Today' : fmtDate(slot.date, { weekday: 'short', month: 'short', day: 'numeric' })} at ${fmtTime(slot.start)}`;
// Schedules a task into the first free slot, with an Undo toast. Returns false if nothing fits.
function autoSchedule(t, fromDate, fromMin, { sameDay = false, quiet = false } = {}) {
  const dur = taskDur(t);
  const slot = findSlot(dur, fromDate, fromMin, { excludeId: t.id, days: sameDay ? 1 : 14 });
  if (!slot) {
    if (!quiet) toast(sameDay ? 'No free time left that day' : `No free ${fmtDur(dur)} gap in the next 2 weeks`);
    return false;
  }
  const undo = quiet ? null : snapshot();
  t.block = { date: slot.date, start: slot.start, dur };
  if (!quiet) { closeModal(); save(); render(); toast(`Scheduled ${slotLabel(slot)}`, undo); }
  return true;
}

/* Plain-English quick add: "Essay fri 3pm 2h #school !high every week" */
const WD_RE = '([Ss]un(?:day)?|[Mm]on(?:day)?|[Tt]ue(?:s(?:day)?)?|[Ww]ed(?:nesday)?|[Tt]hu(?:r(?:s(?:day)?)?)?|[Ff]ri(?:day)?|[Ss]at(?:urday)?)';
const MONTH_RE = '(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?';
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
function nextWeekday(name) {
  const target = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(name.slice(0, 3).toLowerCase());
  const d = new Date();
  return ymd(addDays(d, (target - d.getDay() + 7) % 7));
}
function futureDate(month, day, year) {
  const now = new Date();
  let d = new Date(year ?? now.getFullYear(), month, day);
  if (year == null && ymd(d) < todayStr()) d = new Date(now.getFullYear() + 1, month, day);
  return d.getMonth() === month ? ymd(d) : null;
}
function parseQuick(input) {
  let s = ` ${input} `;
  const out = { priority: 'none', repeat: 'none', listId: null, est: null, date: null, time: null };
  const take = (re, fn) => { s = s.replace(re, (...m) => (fn(...m) === false ? m[0] : ' ')); };
  const PRIO = { h: 'high', high: 'high', m: 'med', med: 'med', medium: 'med', l: 'low', low: 'low' };
  take(/\s!(high|h|medium|med|m|low|l)(?=\s)/i, (_, p) => { out.priority = PRIO[p.toLowerCase()]; });
  take(/\s#([\w-]+)(?=\s)/, (_, name) => {
    const l = state.lists.find((x) => x.name.toLowerCase().replace(/\s+/g, '').startsWith(name.toLowerCase()));
    if (!l) return false;
    out.listId = l.id;
  });
  take(/\s(?:every\s+day|daily)(?=\s)/i, () => { out.repeat = 'daily'; });
  take(/\s(?:every\s+weekday|weekdays)(?=\s)/i, () => { out.repeat = 'weekdays'; });
  take(/\s(?:every\s+month|monthly)(?=\s)/i, () => { out.repeat = 'monthly'; });
  take(new RegExp(`\\severy\\s+${WD_RE}(?=\\s)`, 'i'), (_, d) => { out.repeat = 'weekly'; out.date = nextWeekday(d); });
  take(/\s(?:every\s+week|weekly)(?=\s)/i, () => { out.repeat = 'weekly'; });
  take(/\s(?:for\s+)?(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?)(?:\s*(\d+)\s*(?:m|min|mins|minutes?))?(?=\s)/i, (_, h, m) => { out.est = Math.round(parseFloat(h) * 60 + (+m || 0)); });
  take(/\s(?:for\s+)?(\d+)\s*(?:m|min|mins|minutes?)(?=\s)/i, (_, m) => { out.est = +m; });
  take(/\s(?:at\s+|@)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)(?=\s)/i, (_, h, m, ap) => {
    if (+h > 12 || +m > 59) return false;
    out.time = ((+h % 12) + (/p/i.test(ap) ? 12 : 0)) * 60 + (+m || 0);
  });
  take(/\s(?:at\s+|@)?([01]?\d|2[0-3]):([0-5]\d)(?=\s)/, (_, h, m) => { out.time = +h * 60 + +m; });
  take(/\s(?:at|@)\s*(\d{1,2})(?=\s)/i, (_, h) => {
    if (+h < 1 || +h > 12) return false;
    out.time = (+h <= 7 ? +h + 12 : +h) * 60; // "at 4" means 4 PM; "at 9" means 9 AM
  });
  take(/\s(?:at\s+)?(?:noon|midday)(?=\s)/i, () => { out.time = 720; });
  take(/\stonight(?=\s)/i, () => { out.date = out.date || todayStr(); if (out.time == null) out.time = 1140; });
  take(/\s(?:this\s+|in\s+the\s+)?(morning|afternoon|evening)(?=\s)/i, (_, p) => { if (out.time == null) out.time = { morning: 540, afternoon: 840, evening: 1080 }[p.toLowerCase()]; });
  take(/\s(?:due\s+|on\s+|by\s+)?today(?=\s)/i, () => { out.date = todayStr(); });
  take(/\s(?:due\s+|on\s+|by\s+)?(?:tomorrow|tmrw|tmr)(?=\s)/i, () => { out.date = ymd(addDays(new Date(), 1)); });
  take(/\snext\s+week(?=\s)/i, () => { out.date = ymd(addDays(startOfWeek(new Date()), 7)); });
  take(/\sin\s+(\d+)\s+(days?|weeks?)(?=\s)/i, (_, n, u) => { out.date = ymd(addDays(new Date(), +n * (/w/i.test(u) ? 7 : 1))); });
  take(new RegExp(`\\s(?:due\\s+|on\\s+|by\\s+)?(?:next\\s+)?${WD_RE}(?=\\s)`), (m, d) => {
    out.date = nextWeekday(d);
    if (/next/.test(m) && out.date <= ymd(addDays(new Date(), 6))) out.date = ymd(addDays(parse(out.date), out.date === todayStr() ? 7 : 0));
  });
  take(new RegExp(`\\s(?:due\\s+|on\\s+|by\\s+)?${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?=\\s)`, 'i'), (_, mo, d) => { const x = futureDate(MONTHS.indexOf(mo.toLowerCase()), +d); if (!x) return false; out.date = x; });
  take(new RegExp(`\\s(?:due\\s+|on\\s+|by\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH_RE}(?=\\s)`, 'i'), (_, d, mo) => { const x = futureDate(MONTHS.indexOf(mo.toLowerCase()), +d); if (!x) return false; out.date = x; });
  take(/\s(?:due\s+|on\s+|by\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s)/, (_, mo, d, y) => {
    const x = futureDate(+mo - 1, +d, y ? (y.length === 2 ? 2000 + +y : +y) : null);
    if (!x) return false;
    out.date = x;
  });
  let title = s.replace(/\s+/g, ' ').trim().replace(/\s+(at|on|by|for|due)$/i, '');
  if (!title) title = input.trim();
  const date = out.date || (out.time != null ? todayStr() : null);
  return {
    title, priority: out.priority, repeat: out.repeat, listId: out.listId, est: out.est, due: date,
    block: out.time != null ? { date, start: out.time, dur: out.est || 60 } : null,
  };
}
function quickPreview(p) {
  const bits = [];
  if (p.block) bits.push(`${ICONS.clock}${slotLabel(p.block)}`);
  else if (p.due) bits.push(`Due ${p.due === todayStr() ? 'today' : fmtDate(p.due, { weekday: 'short', month: 'short', day: 'numeric' })}`);
  if (p.est) bits.push(`~${fmtDur(p.est)}`);
  if (p.listId) bits.push(`<span class="dot" style="background:${listColor(p.listId)}"></span>${esc(listById(p.listId).name)}`);
  if (p.priority !== 'none') bits.push(`${PRIORITY[p.priority]} priority`);
  if (p.repeat !== 'none') bits.push(`↻ ${REPEAT_SHORT[p.repeat]}`);
  return bits.map((b) => `<span class="chip">${b}</span>`).join('');
}
const quickHint = () => `Try: essay fri 3pm 2h #${state.lists[0].name.toLowerCase().split(' ')[0]} !high`;
function quickAddHtml(where, placeholder) {
  return `<div class="quick-add"><input class="input" data-quickadd="${where}" placeholder="${placeholder}" aria-label="Quick add task">
    <div class="qa-preview" data-qa-preview><span class="muted small">${esc(quickHint())}</span></div></div>`;
}
function quickAdd(input) {
  const raw = input.value.trim();
  if (!raw) return;
  const p = parseQuick(raw);
  const where = input.dataset.quickadd;
  const listId = p.listId || (where === 'tasks' && ui.taskF.list !== 'all' ? ui.taskF.list : state.lists[0].id);
  const due = p.due || (where === 'today' ? todayStr() : null);
  state.tasks.push({
    id: uid(), title: p.title, listId, priority: p.priority, due, done: false, doneAt: null, notes: '', subtasks: [],
    block: p.block, est: p.est, repeat: p.repeat !== 'none' && !due && !p.block ? 'none' : p.repeat, createdAt: Date.now(),
  });
  save(); render();
  toast(p.block ? `Added and scheduled ${slotLabel(p.block)}` : 'Task added');
  $(`[data-quickadd="${where}"]`)?.focus();
}

/* =========================================================
   Rendering
   ========================================================= */
const app = $('#app');
const main = $('#main');

// When hosted, the viewer may stamp its own theme on <html>; "System" falls back to that.
const hostTheme = document.documentElement.dataset.theme;
function applySettings() {
  const r = document.documentElement;
  const s = state.settings;
  const theme = s.theme === 'system' ? hostTheme : s.theme;
  if (theme) r.dataset.theme = theme; else delete r.dataset.theme;
  r.dataset.density = s.density;
  r.dataset.accent = s.accent;
}
function currentView() {
  const v = location.hash.slice(1);
  const item = NAV.find((n) => n.id === v);
  if (!item || state.settings.hiddenNav.includes(v)) return 'today';
  return v;
}
function renderNav() {
  const v = currentView();
  $('#nav').innerHTML = NAV.filter((n) => !state.settings.hiddenNav.includes(n.id))
    .map((n) => `<a href="#${n.id}" class="${n.id === v ? 'active' : ''}">${ICONS[n.id]}${n.label}</a>`).join('');
}
function render() {
  applySettings();
  renderNav();
  const v = currentView();
  main.innerHTML = VIEWS[v]();
  if (v === 'calendar') afterCalendar();
}

/* ---------- Shared bits ---------- */
function taskRow(t) {
  const list = listById(t.listId);
  const meta = [];
  if (list) meta.push(`<span class="chip"><span class="dot" style="background:${listColor(t.listId)}"></span>${esc(list.name)}</span>`);
  if (t.priority !== 'none') meta.push(`<span class="chip ${t.priority === 'high' ? 'prio-high' : ''}">${PRIORITY[t.priority]} priority</span>`);
  if (t.due) meta.push(`<span class="chip ${!t.done && t.due < todayStr() ? 'overdue' : ''}">${dueLabel(t.due, t.done)}</span>`);
  if (t.block) meta.push(`<span class="chip">${ICONS.clock}${fmtDate(t.block.date)} · ${fmtTime(t.block.start)}</span>`);
  else if (t.est) meta.push(`<span class="chip">~${fmtDur(t.est)}</span>`);
  if (t.repeat && t.repeat !== 'none') meta.push(`<span class="chip">↻ ${REPEAT_SHORT[t.repeat]}</span>`);
  if (t.subtasks.length) meta.push(`<span class="chip">${t.subtasks.filter((s) => s.done).length}/${t.subtasks.length} subtasks</span>`);
  const subs = t.subtasks.length ? `<ul class="subtasks">${t.subtasks.map((s) => `
    <li class="${s.done ? 'done' : ''}"><input type="checkbox" class="check" data-action="toggle-sub" data-id="${t.id}" data-sub="${s.id}" ${s.done ? 'checked' : ''} aria-label="Complete subtask"><span>${esc(s.title)}</span></li>`).join('')}</ul>` : '';
  return `<div class="task ${t.done ? 'done' : ''}">
    <input type="checkbox" class="check round" data-action="toggle-task" data-id="${t.id}" ${t.done ? 'checked' : ''} aria-label="Complete task">
    <div class="task-body">
      <div class="task-title" data-action="edit-task" data-id="${t.id}">${esc(t.title)}</div>
      <div class="task-meta">${meta.join('')}</div>${subs}
    </div>
    <div class="task-actions">
      ${!t.done && !t.block ? `<button class="btn icon ghost sm" data-action="next-slot" data-id="${t.id}" aria-label="Schedule in next free slot" data-tip="Schedule in next free slot">${ICONS.bolt}</button>` : ''}
      <button class="btn icon ghost sm" data-action="edit-task" data-id="${t.id}" aria-label="Edit">${ICONS.edit}</button>
      <button class="btn icon ghost sm" data-action="delete-task" data-id="${t.id}" aria-label="Delete">${ICONS.trash}</button>
    </div>
  </div>`;
}
const listOptions = (sel, extra = '') => extra + state.lists.map((l) => `<option value="${l.id}" ${l.id === sel ? 'selected' : ''}>${esc(l.name)}</option>`).join('');
const pageHead = (title, sub = '', right = '') => `<div class="page-head"><div><h1>${title}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div><div class="row wrap">${right}</div></div>`;
const goalBar = (g) => {
  const pct = g.target ? clamp(Math.round((g.current / g.target) * 100), 0, 100) : 0;
  return `<div class="goal"><div class="row"><b>${esc(g.title)}</b><span class="spacer"></span><span class="muted small">${g.current} / ${g.target} ${esc(g.unit)} · ${pct}%</span></div><div class="bar" data-tip="${pct}% complete"><span style="width:${pct}%"></span></div></div>`;
};

/* ---------- Today ---------- */
const TODAY_SECTIONS = {
  focus() {
    return `<section class="card focus-card span-2">
      <div class="focus-label">Today's focus</div>
      <input class="focus-input" data-bind="focus" value="${esc(state.focus[todayStr()] || '')}" placeholder="What one thing would make today a win?" aria-label="Today's focus">
    </section>`;
  },
  timer() {
    const tm = ui.timer, T = todayStr();
    const total = TIMER_MODES[tm.mode][1] * 60;
    const today = state.pomodoros.filter((p) => ymd(new Date(p.at)) === T);
    const mins = today.reduce((a, p) => a + p.min, 0);
    const open = state.tasks.filter((t) => !t.done).sort(taskSort);
    const seg = Object.entries(TIMER_MODES).map(([k, [l]]) => `<button class="${tm.mode === k ? 'on' : ''}" data-action="timer-mode" data-mode="${k}">${l}</button>`).join('');
    return `<section class="card">
      <div class="card-head"><h2>Focus timer</h2><span class="chip">${today.length} session${today.length === 1 ? '' : 's'} today · ${mins} min</span></div>
      <div class="seg">${seg}</div>
      <div class="timer-display ${tm.running ? 'running' : ''}" id="timer-display">${timerText()}</div>
      <div class="bar"><span id="timer-bar" style="width:${(1 - tm.left / total) * 100}%"></span></div>
      <div class="row" style="margin-top:12px">
        <select class="input" data-timer-task aria-label="Task you're focusing on"><option value="">Not linked to a task</option>${open.map((t) => `<option value="${t.id}" ${t.id === tm.taskId ? 'selected' : ''}>${esc(t.title)}</option>`).join('')}</select>
        <button class="btn primary" data-action="timer-toggle" style="min-width:84px;justify-content:center">${tm.running ? 'Pause' : tm.left < total ? 'Resume' : 'Start'}</button>
        <button class="btn" data-action="timer-reset">Reset</button>
      </div>
    </section>`;
  },
  schedule() {
    const T = todayStr(), now = nowMinutes();
    const items = [
      ...state.tasks.filter((t) => t.block && t.block.date === T),
      ...busyOn(T).map((b) => ({ busy: b, block: { start: b.start, dur: b.end - b.start } })),
    ].sort((a, b) => a.block.start - b.block.start);
    const body = items.length ? `<div class="sched">${items.map((t) => {
      const { start, dur } = t.block;
      const isNow = now >= start && now < start + dur;
      if (t.busy) {
        return `<div class="sched-item busy ${isNow ? 'now' : ''}" data-action="edit-busy" data-id="${t.busy.id}">
          <span class="time">${fmtTime(start)}<br><span class="muted">${fmtTime(start + dur)}</span></span><span class="title">${esc(t.busy.title)}</span></div>`;
      }
      return `<div class="sched-item ${t.done ? 'done' : ''} ${isNow ? 'now' : ''}" style="border-left-color:${listColor(t.listId)}" data-action="edit-task" data-id="${t.id}">
        <span class="time">${fmtTime(start)}<br><span class="muted">${fmtTime(start + dur)}</span></span><span class="title">${esc(t.title)}${isNow ? ' <span class="chip">Now</span>' : ''}</span></div>`;
    }).join('')}</div>` : `<div class="empty">Nothing time-blocked yet. Drag tasks onto the calendar.</div>`;
    return `<section class="card"><div class="card-head"><h2>Schedule</h2><button class="btn sm ghost" data-action="go" data-to="calendar">${ICONS.calendar} Calendar</button></div>${body}</section>`;
  },
  due() {
    const T = todayStr();
    const items = state.tasks.filter((t) => t.due && (t.done ? t.due === T && doneOn(t, T) : t.due <= T)).sort(taskSort);
    const open = items.filter((t) => !t.done).length;
    return `<section class="card"><div class="card-head"><h2>Due today</h2><span class="chip">${open} open</span></div>
      ${items.length ? items.map(taskRow).join('') : '<div class="empty">Nothing due today.</div>'}
      ${quickAddHtml('today', 'Add a task, press Enter')}</section>`;
  },
  habits() {
    const T = todayStr();
    const rows = state.habits.map((h) => `<div class="habit-pill">
      <input type="checkbox" class="check" data-action="habit-toggle" data-id="${h.id}" data-date="${T}" ${h.log[T] ? 'checked' : ''} aria-label="${esc(h.name)}">
      <span class="spacer">${esc(h.name)}</span>
      ${h.reminder ? `<span class="chip">${ICONS.bell}${fmtTime(fromHHMM(h.reminder))}</span>` : ''}
      <span class="chip">${streak(h)}-day streak</span></div>`).join('');
    const done = state.habits.filter((h) => h.log[T]).length;
    return `<section class="card"><div class="card-head"><h2>Habits</h2><span class="chip">${done}/${state.habits.length} today</span></div>${rows || '<div class="empty">No habits yet.</div>'}</section>`;
  },
  goals() {
    return `<section class="card"><div class="card-head"><h2>Goals</h2><button class="btn sm ghost" data-action="go" data-to="habits">Manage</button></div>
      ${state.goals.length ? state.goals.map(goalBar).join('') : '<div class="empty">No goals yet.</div>'}</section>`;
  },
};
const missedTasks = () => state.tasks.filter((t) => !t.done && t.block && t.block.date < todayStr());
function catchUpCard() {
  const missed = missedTasks().sort(taskSort);
  if (!missed.length) return '';
  return `<section class="card catchup span-2">
    <div class="card-head"><h2>Not finished yet</h2><span class="muted small">${missed.length} time block${missed.length === 1 ? '' : 's'} from earlier days</span></div>
    ${missed.map((t) => `<div class="task"><span class="dot" style="background:${listColor(t.listId)};margin-top:6px"></span>
      <div class="task-body"><div class="task-title" data-action="edit-task" data-id="${t.id}">${esc(t.title)}</div>
      <div class="task-meta"><span class="chip overdue">Was ${fmtDate(t.block.date, { weekday: 'short', month: 'short', day: 'numeric' })}, ${fmtTime(t.block.start)}</span></div></div>
      <button class="btn sm" data-action="next-slot" data-id="${t.id}">${ICONS.bolt} Next free slot</button></div>`).join('')}
    <div class="row" style="margin-top:10px"><button class="btn primary" data-action="catchup-all">Reschedule all</button>
      <button class="btn" data-action="catchup-clear">Unschedule all</button></div>
  </section>`;
}
function viewToday() {
  const h = new Date().getHours();
  const hello = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const secs = catchUpCard() + state.settings.sections.filter((s) => s.visible).map((s) => TODAY_SECTIONS[s.id]()).join('');
  return pageHead(hello, new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
    `<button class="btn primary" data-action="new-task">${ICONS.plus} New task</button>`) +
    `<div class="today-grid">${secs || '<div class="card span-2 empty">All dashboard sections are hidden. Turn them back on in Settings.</div>'}</div>`;
}

/* ---------- Calendar ---------- */
function calDays() {
  const d = parse(ui.calDate);
  if (ui.calView === 'day') return [ui.calDate];
  const s = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => ymd(addDays(s, i)));
}
function calTitle() {
  const d = parse(ui.calDate);
  if (ui.calView === 'month') return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  if (ui.calView === 'day') return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const days = calDays();
  return `${fmtDate(days[0])} – ${fmtDate(days[6])}, ${parse(days[6]).getFullYear()}`;
}
function layoutDay(items) {
  // Assign overlapping blocks to side-by-side lanes.
  const out = [];
  let cluster = [], end = -1;
  const flush = () => {
    const lanes = [];
    const placed = cluster.map((t) => {
      let i = lanes.findIndex((e) => e <= t.block.start);
      if (i < 0) { i = lanes.length; lanes.push(0); }
      lanes[i] = t.block.start + t.block.dur;
      return { t, lane: i };
    });
    placed.forEach((p) => out.push({ ...p, lanes: lanes.length }));
    cluster = [];
  };
  items.forEach((t) => {
    if (cluster.length && t.block.start >= end) { flush(); end = -1; }
    cluster.push(t);
    end = Math.max(end, t.block.start + t.block.dur);
  });
  if (cluster.length) flush();
  return out;
}
function timeGrid(days) {
  const T = todayStr();
  const cols = `56px repeat(${days.length}, minmax(0, 1fr))`;
  const head = days.map((ds) => {
    const d = parse(ds);
    return `<div class="${ds === T ? 'is-today' : ''}">${d.toLocaleDateString(undefined, { weekday: 'short' })}<b>${d.getDate()}</b></div>`;
  }).join('');
  const hours = Array.from({ length: 24 }, (_, h) => `<div>${h ? hourLabel(h) : ''}</div>`).join('');
  const colsHtml = days.map((ds) => {
    // Tasks and recurring busy times share lanes so overlaps sit side by side.
    const items = [
      ...state.tasks.filter((t) => t.block && t.block.date === ds).map((t) => ({ t, block: t.block })),
      ...busyOn(ds).map((b) => ({ busy: b, block: { start: b.start, dur: b.end - b.start } })),
    ].sort((a, b) => a.block.start - b.block.start || b.block.dur - a.block.dur);
    const blocks = layoutDay(items).map(({ t: item, lane, lanes }) => {
      const { start, dur } = item.block;
      const pos = `top:calc(var(--hour) * ${start / 60});height:calc(var(--hour) * ${dur / 60} - 2px);left:calc(${(lane / lanes) * 100}% + 3px);width:calc(${100 / lanes}% - 6px);right:auto`;
      const time = dur >= 30 ? `<span>${fmtTime(start)} – ${fmtTime(start + dur)}</span>` : '';
      if (item.busy) {
        return `<div class="block busy" data-action="edit-busy" data-id="${item.busy.id}" style="${pos}" title="${esc(item.busy.title)}"><b>${esc(item.busy.title)}</b>${time}</div>`;
      }
      const t = item.t;
      return `<div class="block ${t.done ? 'done' : ''}" draggable="true" data-drag="${t.id}" data-action="edit-task" data-id="${t.id}"
        style="--bc:${listColor(t.listId)};${pos}" title="${esc(t.title)}"><b>${esc(t.title)}</b>${time}
        <span class="resize" data-resize="${t.id}" aria-hidden="true"></span></div>`;
    }).join('');
    const nowLine = ds === T ? `<div class="now-line" style="top:calc(var(--hour) * ${nowMinutes() / 60})"></div>` : '';
    return `<div class="day-col ${ds === T ? 'is-today' : ''}" data-day="${ds}" data-action="slot" style="height:calc(var(--hour) * 24)">${blocks}${nowLine}</div>`;
  }).join('');
  return `<div class="card cal"><div class="cal-scroll" id="cal-scroll">
    <div class="cal-head" style="grid-template-columns:${cols}"><div></div>${head}</div>
    <div class="cal-body" style="grid-template-columns:${cols}"><div class="hours">${hours}</div>${colsHtml}</div>
  </div></div>`;
}
function monthGrid() {
  const d = parse(ui.calDate);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const start = startOfWeek(first);
  const T = todayStr();
  const dows = Array.from({ length: 7 }, (_, i) => `<div class="dow">${addDays(start, i).toLocaleDateString(undefined, { weekday: 'short' })}</div>`).join('');
  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = addDays(start, i), ds = ymd(day);
    const blocked = state.tasks.filter((t) => t.block && t.block.date === ds).sort((a, b) => a.block.start - b.block.start);
    const dueOnly = state.tasks.filter((t) => !t.block && !t.done && t.due === ds);
    const all = [...blocked, ...dueOnly];
    const chips = all.slice(0, 3).map((t) => `<div class="mchip" style="--bc:${listColor(t.listId)}" draggable="true" data-drag="${t.id}" data-action="edit-task" data-id="${t.id}" title="${esc(t.title)}">${t.block ? `${fmtTime(t.block.start).replace(':00', '')} ` : ''}${esc(t.title)}</div>`).join('');
    const more = all.length > 3 ? `<div class="muted small">+${all.length - 3} more</div>` : '';
    return `<div class="mcell ${day.getMonth() !== d.getMonth() ? 'other' : ''} ${ds === T ? 'is-today' : ''}" data-action="open-day" data-day="${ds}"><div class="mnum">${day.getDate()}</div>${chips}${more}</div>`;
  }).join('');
  return `<div class="card cal"><div class="month">${dows}${cells}</div></div>`;
}
function viewCalendar() {
  const unscheduled = state.tasks.filter((t) => !t.done && !t.block).sort(taskSort);
  const tray = `<aside class="card tray" data-drop="tray">
    <div class="card-head"><h2>Unscheduled</h2><span class="chip">${unscheduled.length}</span></div>
    <p class="muted small" style="margin:0 0 10px">Drag a task onto the calendar, or use Schedule. Drop a block here to unschedule it.</p>
    <div style="margin-bottom:10px">${quickAddHtml('tray', 'New task, press Enter')}</div>
    ${unscheduled.map((t) => `<div class="tray-item" draggable="true" data-drag="${t.id}" style="border-left-color:${listColor(t.listId)}">
      <div class="task-title" data-action="edit-task" data-id="${t.id}">${esc(t.title)}</div>
      <div class="row">${t.due ? `<span class="chip ${t.due < todayStr() ? 'overdue' : ''}">${dueLabel(t.due)}</span>` : ''}${t.priority === 'high' ? '<span class="chip prio-high">High</span>' : ''}
      ${t.est ? `<span class="chip">~${fmtDur(t.est)}</span>` : ''}
      <span class="spacer"></span>
      <button class="btn sm icon" data-action="next-slot" data-id="${t.id}" aria-label="Next free slot" data-tip="Next free slot">${ICONS.bolt}</button>
      <button class="btn sm" data-action="schedule-task" data-id="${t.id}">Schedule</button></div></div>`).join('') || '<div class="empty">Everything is scheduled.</div>'}
  </aside>`;
  const seg = ['day', 'week', 'month'].map((v) => `<button class="${ui.calView === v ? 'on' : ''}" data-action="cal-view" data-view="${v}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('');
  const toolbar = `<button class="btn icon" data-action="cal-step" data-dir="-1" aria-label="Previous">${ICONS.left}</button>
    <button class="btn" data-action="cal-today">Today</button>
    <button class="btn icon" data-action="cal-step" data-dir="1" aria-label="Next">${ICONS.right}</button>
    <div class="seg">${seg}</div>`;
  const placing = ui.placing && taskById(ui.placing);
  const banner = placing ? `<div class="place-banner" role="status"><span>Tap a time on the calendar for <b>${esc(placing.title)}</b> (${fmtDur(taskDur(placing))})</span>
    <button class="btn sm" data-action="place-cancel">Cancel</button></div>` : '';
  return pageHead('Calendar', calTitle(), toolbar) + banner +
    `<div class="cal-layout ${placing ? 'placing' : ''}">${tray}<div>${ui.calView === 'month' ? monthGrid() : timeGrid(calDays())}</div></div>`;
}
function afterCalendar() {
  const sc = $('#cal-scroll');
  if (!sc) return;
  const col = $('.day-col', sc);
  const hourPx = col ? col.getBoundingClientRect().height / 24 : 52;
  sc.scrollTop = ui.calScroll ?? hourPx * 7;
  sc.addEventListener('scroll', () => { ui.calScroll = sc.scrollTop; }, { passive: true });
}

/* ---------- Tasks ---------- */
function filteredTasks() {
  const f = ui.taskF, T = todayStr(), weekEnd = ymd(addDays(new Date(), 7)), q = f.q.trim().toLowerCase();
  return state.tasks.filter((t) => {
    if (f.status === 'open' && t.done) return false;
    if (f.status === 'done' && !t.done) return false;
    if (f.list !== 'all' && t.listId !== f.list) return false;
    if (f.prio !== 'all' && t.priority !== f.prio) return false;
    if (f.due === 'overdue' && !(t.due && t.due < T && !t.done)) return false;
    if (f.due === 'today' && t.due !== T) return false;
    if (f.due === 'week' && !(t.due && t.due >= T && t.due <= weekEnd)) return false;
    if (f.due === 'none' && t.due) return false;
    if (q && ![t.title, t.notes, ...t.subtasks.map((s) => s.title)].some((x) => x.toLowerCase().includes(q))) return false;
    return true;
  }).sort(taskSort);
}
function taskListHtml() {
  const items = filteredTasks();
  return `<div class="muted small" style="margin:0 0 8px 4px">${items.length} task${items.length === 1 ? '' : 's'}</div>
    <div class="card">${items.length ? items.map(taskRow).join('') : '<div class="empty">No tasks match these filters.</div>'}</div>`;
}
function viewTasks() {
  const f = ui.taskF;
  const sel = (key, opts) => `<select class="input" data-filter="${key}" aria-label="${key}">${opts.map(([v, l]) => `<option value="${v}" ${f[key] === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  const filters = `<div class="filters">
    <input type="search" class="input" data-filter="q" placeholder="Search tasks and subtasks" value="${esc(f.q)}" aria-label="Search">
    ${sel('list', [['all', 'All lists'], ...state.lists.map((l) => [l.id, esc(l.name)])])}
    ${sel('prio', [['all', 'Any priority'], ['high', 'High'], ['med', 'Medium'], ['low', 'Low'], ['none', 'No priority']])}
    ${sel('due', [['all', 'Any due date'], ['overdue', 'Overdue'], ['today', 'Due today'], ['week', 'Next 7 days'], ['none', 'No due date']])}
    ${sel('status', [['open', 'Open'], ['done', 'Completed'], ['all', 'All']])}
  </div>`;
  return pageHead('Tasks', `${state.tasks.filter((t) => !t.done).length} open across ${state.lists.length} lists`,
    `<button class="btn primary" data-action="new-task">${ICONS.plus} New task</button>`) +
    `<div class="card" style="margin-bottom:14px">${quickAddHtml('tasks', 'Add a task, press Enter')}</div>` + filters + `<div id="task-list">${taskListHtml()}</div>`;
}

/* ---------- Notes ---------- */
function filteredNotes() {
  const q = ui.noteQ.trim().toLowerCase();
  return state.notes
    .filter((n) => (ui.noteList === 'all' || n.listId === ui.noteList) && (!q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
function highlight(text, q) {
  if (!q) return esc(text);
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return esc(text);
  return esc(text.slice(0, i)) + `<mark>${esc(text.slice(i, i + q.length))}</mark>` + esc(text.slice(i + q.length));
}
function noteItemsHtml() {
  const q = ui.noteQ.trim();
  const notes = filteredNotes();
  return notes.map((n) => {
    let snippet = n.body.replace(/\s+/g, ' ');
    const i = q ? snippet.toLowerCase().indexOf(q.toLowerCase()) : -1;
    if (i > 30) snippet = '…' + snippet.slice(i - 20);
    const list = listById(n.listId);
    return `<div class="note-item ${n.id === ui.activeNote ? 'active' : ''}" data-action="open-note" data-id="${n.id}">
      <div class="t">${highlight(n.title || 'Untitled', q)}</div>
      <div class="p">${highlight(snippet.slice(0, 90) || 'Empty note', q)}</div>
      ${list ? `<div style="margin-top:6px"><span class="chip"><span class="dot" style="background:${listColor(n.listId)}"></span>${esc(list.name)}</span></div>` : ''}
    </div>`;
  }).join('') || '<div class="empty">No notes found.</div>';
}
function noteEditorHtml() {
  const n = state.notes.find((x) => x.id === ui.activeNote);
  if (!n) return '<div class="empty">Select a note or create a new one.</div>';
  const list = listById(n.listId);
  const openCount = list ? state.tasks.filter((t) => t.listId === list.id && !t.done).length : 0;
  return `<div class="row wrap">
      <select class="input" style="width:auto" data-note-field="listId" aria-label="Linked list">${listOptions(n.listId, '<option value="">No linked list</option>')}</select>
      ${list ? `<button class="btn sm ghost" data-action="note-list-tasks" data-list="${list.id}">${openCount} open task${openCount === 1 ? '' : 's'} in ${esc(list.name)} →</button>` : ''}
      <span class="spacer"></span>
      <span class="muted small">Edited ${new Date(n.updatedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
      <button class="btn sm danger" data-action="delete-note" data-id="${n.id}">${ICONS.trash} Delete</button>
    </div>
    <input class="note-title" data-note-field="title" value="${esc(n.title)}" placeholder="Untitled" aria-label="Note title">
    <textarea class="note-body" data-note-field="body" placeholder="Start writing…" aria-label="Note body">${esc(n.body)}</textarea>`;
}
function viewNotes() {
  const notes = filteredNotes();
  if (!state.notes.some((n) => n.id === ui.activeNote)) ui.activeNote = notes[0]?.id || null;
  return pageHead('Notes', `${state.notes.length} notes`, `<button class="btn primary" data-action="new-note">${ICONS.plus} New note</button>`) +
    `<div class="notes-layout">
      <div class="card note-list">
        <div class="stack" style="gap:8px;padding:4px 4px 8px">
          <input type="search" class="input" data-note-search placeholder="Search notes" value="${esc(ui.noteQ)}" aria-label="Search notes">
          <select class="input" data-note-listfilter aria-label="Filter by list">${listOptions(ui.noteList, `<option value="all">All lists</option>`)}</select>
        </div>
        <div id="note-items">${noteItemsHtml()}</div>
      </div>
      <div class="card" id="note-editor">${noteEditorHtml()}</div>
    </div>`;
}

/* ---------- Habits ---------- */
function viewHabits() {
  const days = lastNDays(7), T = todayStr();
  const head = days.map((ds) => `<th class="${ds === T ? 'is-today' : ''}">${parse(ds).toLocaleDateString(undefined, { weekday: 'narrow' })}<br>${parse(ds).getDate()}</th>`).join('');
  const rows = state.habits.map((h) => {
    const wc = weekCount(h);
    return `<tr>
      <td><b>${esc(h.name)}</b><div class="muted small">${h.goal}× per week${h.reminder ? ` · reminder ${fmtTime(fromHHMM(h.reminder))}` : ''}</div></td>
      ${days.map((ds) => `<td><button class="tick ${h.log[ds] ? 'on' : ''}" data-action="habit-toggle" data-id="${h.id}" data-date="${ds}" aria-label="${esc(h.name)}, ${fmtDate(ds)}" aria-pressed="${!!h.log[ds]}">${h.log[ds] ? ICONS.check : ''}</button></td>`).join('')}
      <td class="streak">${streak(h)}d</td>
      <td style="min-width:90px"><span class="small">${wc}/${h.goal}</span><div class="bar"><span style="width:${clamp((wc / h.goal) * 100, 0, 100)}%"></span></div></td>
      <td style="white-space:nowrap"><button class="btn icon ghost sm" data-action="edit-habit" data-id="${h.id}" aria-label="Edit">${ICONS.edit}</button><button class="btn icon ghost sm" data-action="delete-habit" data-id="${h.id}" aria-label="Delete">${ICONS.trash}</button></td>
    </tr>`;
  }).join('');

  const wk = ymd(startOfWeek(new Date()));
  const r = state.reviews[wk] || {};
  const wkStart = startOfWeek(new Date()).getTime();
  const doneThisWeek = state.tasks.filter((t) => t.done && t.doneAt >= wkStart).length;
  const blockedMin = state.tasks.filter((t) => t.block && t.block.date >= wk && t.block.date <= ymd(addDays(parse(wk), 6))).reduce((a, t) => a + t.block.dur, 0);
  const elapsed = Math.round((new Date() - wkStart) / 86400000) + 1;
  const possible = state.habits.length * Math.min(elapsed, 7);
  const hits = state.habits.reduce((a, h) => a + weekCount(h), 0);
  const past = Object.keys(state.reviews).filter((k) => k !== wk).sort().reverse();
  const notify = 'Notification' in window && Notification.permission !== 'granted'
    ? `<button class="btn" data-action="enable-notify">${ICONS.bell} Enable reminder notifications</button>` : '';

  return pageHead('Habits', 'Small things, done often.', `${notify}<button class="btn primary" data-action="new-habit">${ICONS.plus} New habit</button>`) +
    `<div class="stack">
      <section class="card"><div class="table-scroll"><table class="htable">
        <thead><tr><th>Habit</th>${head}<th>Streak</th><th>This week</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="11" class="empty">No habits yet. Add one to start a streak.</td></tr>`}</tbody>
      </table></div></section>
      <div class="grid grid-2">
        <section class="card"><div class="card-head"><h2>Goals</h2><button class="btn sm" data-action="new-goal">${ICONS.plus} Add goal</button></div>
          ${state.goals.map((g) => `${goalBar(g)}<div class="row" style="margin:-4px 0 14px">
            <button class="btn sm" data-action="goal-step" data-id="${g.id}" data-delta="-1" aria-label="Decrease">−1</button>
            <button class="btn sm" data-action="goal-step" data-id="${g.id}" data-delta="1" aria-label="Increase">+1</button>
            <span class="spacer"></span>
            <button class="btn icon ghost sm" data-action="edit-goal" data-id="${g.id}" aria-label="Edit">${ICONS.edit}</button>
            <button class="btn icon ghost sm" data-action="delete-goal" data-id="${g.id}" aria-label="Delete">${ICONS.trash}</button></div>`).join('') || '<div class="empty">No goals yet.</div>'}
        </section>
        <section class="card"><div class="card-head"><h2>Weekly review</h2><span class="muted small">Week of ${fmtDate(wk)} · saves automatically</span></div>
          <div class="row wrap" style="margin-bottom:12px">
            <span class="chip">${doneThisWeek} tasks done</span><span class="chip">${fmtHours(blockedMin)} blocked</span>
            <span class="chip">${possible ? Math.round((hits / possible) * 100) : 0}% habit check-ins</span>
          </div>
          <div class="stack" style="gap:10px">
            <label class="field">What went well?<textarea class="input" rows="2" data-review="wins">${esc(r.wins || '')}</textarea></label>
            <label class="field">What got in the way?<textarea class="input" rows="2" data-review="challenges">${esc(r.challenges || '')}</textarea></label>
            <label class="field">Focus for next week<textarea class="input" rows="2" data-review="next">${esc(r.next || '')}</textarea></label>
          </div>
          ${past.length ? `<div style="margin-top:14px"><div class="muted small" style="margin-bottom:6px">Past reviews</div>${past.map((k) => {
            const p = state.reviews[k];
            return `<details style="margin-bottom:6px"><summary>Week of ${fmtDate(k)}</summary><div class="small" style="padding:6px 0 0 14px;white-space:pre-wrap"><b>Went well:</b> ${esc(p.wins || '—')}\n<b>In the way:</b> ${esc(p.challenges || '—')}\n<b>Next:</b> ${esc(p.next || '—')}</div></details>`;
          }).join('')}</div>` : ''}
        </section>
      </div>
    </div>`;
}

/* ---------- Stats ---------- */
function completionChart(days, counts) {
  const W = 640, H = 210, L = 30, R = 8, Tp = 18, B = 26;
  const pw = W - L - R, ph = H - Tp - B;
  const max = Math.max(4, Math.ceil(Math.max(...counts) / 2) * 2);
  const slot = pw / days.length, bw = Math.min(28, slot * 0.62);
  const y = (v) => Tp + ph - (v / max) * ph;
  const peak = counts.indexOf(Math.max(...counts));
  const grid = [0, max / 2, max].map((v) => `<line class="gridline" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${L - 8}" y="${y(v) + 3}" text-anchor="end">${v}</text>`).join('');
  const T = todayStr();
  const bars = days.map((ds, i) => {
    const v = counts[i], x = L + i * slot + (slot - bw) / 2, top = y(v), h = Tp + ph - top, r = Math.min(4, h, bw / 2);
    const path = h > 0 ? `<path class="barmark" d="M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${top + h} Z"/>` : '';
    const label = i === peak && v > 0 ? `<text class="val" x="${x + bw / 2}" y="${top - 5}" text-anchor="middle">${v}</text>` : '';
    return `<g><rect class="hit" x="${L + i * slot}" y="${Tp}" width="${slot}" height="${ph}" data-tip="${fmtDate(ds, { weekday: 'short', month: 'short', day: 'numeric' })} · ${v} completed"/>${path}${label}
      <text class="axis" x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" style="${ds === T ? 'font-weight:700;fill:var(--text)' : ''}">${parse(ds).getDate()}</text></g>`;
  }).join('');
  return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tasks completed per day, last 14 days">${grid}${bars}</svg>`;
}
function viewStats() {
  const days14 = lastNDays(14);
  const counts = days14.map((ds) => state.tasks.filter((t) => doneOn(t, ds)).length);
  const total = counts.reduce((a, b) => a + b, 0);

  const wk = startOfWeek(new Date());
  const [from, to] = ui.hoursRange === 'week' ? [ymd(wk), ymd(addDays(wk, 6))] : [lastNDays(30)[0], todayStr()];
  const byList = state.lists.map((l) => ({
    l, min: state.tasks.filter((t) => t.listId === l.id && t.block && t.block.date >= from && t.block.date <= to).reduce((a, t) => a + t.block.dur, 0),
  })).sort((a, b) => b.min - a.min);
  const maxMin = Math.max(1, ...byList.map((x) => x.min));
  const totalBlocked = byList.reduce((a, x) => a + x.min, 0);
  const weekBlocked = state.tasks.filter((t) => t.block && t.block.date >= ymd(wk) && t.block.date <= ymd(addDays(wk, 6))).reduce((a, t) => a + t.block.dur, 0);

  const days30 = lastNDays(30);
  const habitRows = state.habits.map((h) => {
    const hits = days30.filter((ds) => h.log[ds]).length;
    return { h, hits, pct: Math.round((hits / 30) * 100) };
  });
  const overall = habitRows.length ? Math.round(habitRows.reduce((a, r) => a + r.pct, 0) / habitRows.length) : 0;

  const since = parse(days14[0]).getTime();
  const focusMin = state.pomodoros.filter((p) => p.at >= since).reduce((a, p) => a + p.min, 0);
  const kpi = (l, v) => `<div class="card kpi"><div class="l">${l}</div><div class="v">${v}</div></div>`;
  const seg = [['week', 'This week'], ['30d', 'Last 30 days']].map(([v, l]) => `<button class="${ui.hoursRange === v ? 'on' : ''}" data-action="hours-range" data-val="${v}">${l}</button>`).join('');

  return pageHead('Stats', 'How your days are adding up.') +
    `<div class="kpis">${kpi('Completed · 14 days', total)}${kpi('Daily average', (total / 14).toFixed(1))}${kpi('Blocked this week', fmtHours(weekBlocked))}${kpi('Habit consistency · 30 days', `${overall}%`)}${kpi('Focus time · 14 days', fmtHours(focusMin))}</div>
    <div class="stack">
      <section class="card"><div class="card-head"><h2>Tasks completed · last 14 days</h2><span class="muted small">${total} total</span></div>${completionChart(days14, counts)}</section>
      <div class="grid grid-2">
        <section class="card"><div class="card-head"><h2>Hours blocked by list</h2><div class="seg">${seg}</div></div>
          ${byList.map(({ l, min }) => `<div class="hbar"><span class="row" style="min-width:0"><span class="dot" style="background:var(--c${l.color})"></span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.name)}</span></span>
            <div class="track"><div class="fill" style="width:${(min / maxMin) * 100}%;background:var(--c${l.color})" data-tip="${esc(l.name)} · ${fmtHours(min)}"></div></div><span class="n">${fmtHours(min)}</span></div>`).join('')}
          <div class="muted small">${fmtHours(totalBlocked)} time-blocked in total</div>
        </section>
        <section class="card"><div class="card-head"><h2>Habit consistency · 30 days</h2>
          <span class="row small muted"><span class="heat-cell on" style="width:10px"></span>Done <span class="heat-cell" style="width:10px"></span>Missed</span></div>
          <div class="heat">${habitRows.map(({ h, pct }) => `<div class="heat-row"><span class="name" title="${esc(h.name)}">${esc(h.name)}</span>
            ${days30.map((ds) => `<span class="heat-cell ${h.log[ds] ? 'on' : ''}" data-tip="${esc(h.name)} · ${fmtDate(ds)} · ${h.log[ds] ? 'done' : 'missed'}"></span>`).join('')}
            <span class="pct">${pct}%</span></div>`).join('') || '<div class="empty">No habits yet.</div>'}</div>
          <div class="muted small" style="margin-top:8px">${fmtDate(days30[0])} → today</div>
        </section>
      </div>
    </div>`;
}

/* ---------- Settings ---------- */
function viewSettings() {
  const s = state.settings;
  const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${s[key] === v ? 'on' : ''}" data-action="set" data-key="${key}" data-val="${v}">${l}</button>`).join('')}</div>`;
  const row = (title, desc, control) => `<div class="set-row"><div class="l"><b>${title}</b><span>${desc}</span></div>${control}</div>`;
  return pageHead('Settings') + `<div class="grid grid-2" style="align-items:start">
    <section class="card"><h2>Appearance</h2>
      ${row('Theme', 'Follow the system or pick one.', seg('theme', [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']]))}
      ${row('Density', 'Tighter spacing shows more at once.', seg('density', [['comfortable', 'Comfortable'], ['compact', 'Compact']]))}
      ${row('Accent color', 'Used for highlights and buttons.', `<div class="swatches">${Object.entries(ACCENTS).map(([k, c]) =>
        `<button class="swatch ${s.accent === k ? 'on' : ''}" style="background:${c}" data-action="set" data-key="accent" data-val="${k}" aria-label="${k}" title="${k[0].toUpperCase() + k.slice(1)}"></button>`).join('')}</div>`)}
    </section>

    <section class="card"><h2>Security</h2>
      ${row('Lock Daybook', 'Blur everything behind a passcode.', `<button class="btn" data-action="lock">Lock now</button>`)}
      <form data-form="passcode" class="stack" style="gap:10px;padding-top:12px">
        <b>Change passcode</b>
        <div class="fields" style="grid-template-columns:repeat(3,minmax(0,1fr))">
          <label class="field">Current<input class="input" type="password" name="cur" inputmode="numeric" maxlength="${PIN_LEN}" autocomplete="off"></label>
          <label class="field">New<input class="input" type="password" name="next" inputmode="numeric" maxlength="${PIN_LEN}" autocomplete="off"></label>
          <label class="field">Confirm<input class="input" type="password" name="confirm" inputmode="numeric" maxlength="${PIN_LEN}" autocomplete="off"></label>
        </div>
        <div class="row"><span class="small" id="pin-msg"></span><span class="spacer"></span><button class="btn primary">Update passcode</button></div>
      </form>
    </section>

    ${syncCard()}

    <section class="card"><h2>Schedule</h2>
      ${row('Day hours', 'Next free slot and Reschedule only use this window.', `<div class="row">
        <input class="input" type="time" step="900" id="day-start" data-setting="dayStart" value="${s.dayStart}" aria-label="Day starts" style="width:auto">
        <span class="muted">to</span>
        <input class="input" type="time" step="900" id="day-end" data-setting="dayEnd" value="${s.dayEnd}" aria-label="Day ends" style="width:auto"></div>`)}
      <div class="set-row"><div class="l"><b>Busy times</b><span>Your class timetable or anything that repeats each week. Nothing gets scheduled on top of these.</span></div>
        <button class="btn" data-action="new-busy">${ICONS.plus} Add busy time</button></div>
      ${state.busy.length ? `<div class="stack" style="gap:6px">${[...state.busy].sort((a, b) => a.start - b.start).map((b) => `<div class="row busy-row">
        <b class="spacer">${esc(b.title)}</b>
        <span class="muted small">${busyDays(b.days)} · ${fmtTime(b.start)} – ${fmtTime(b.end)}</span>
        <button class="btn icon ghost sm" data-action="edit-busy" data-id="${b.id}" aria-label="Edit">${ICONS.edit}</button>
        <button class="btn icon ghost sm" data-action="delete-busy" data-id="${b.id}" aria-label="Delete">${ICONS.trash}</button></div>`).join('')}</div>` : ''}
    </section>

    <section class="card"><h2>Today dashboard</h2><p class="muted small">Drag or use the arrows to reorder. Untick to hide a section.</p>
      <ul class="order-list" id="order-list">${s.sections.map((sec, i) => `<li draggable="true" data-order="${sec.id}" class="${sec.visible ? '' : 'off'}">
        <span class="grip">${ICONS.grip}</span>
        <input type="checkbox" class="check" data-action="section-toggle" data-id="${sec.id}" ${sec.visible ? 'checked' : ''} aria-label="Show ${SECTIONS[sec.id]}">
        <span class="name spacer">${SECTIONS[sec.id]}</span>
        <button class="btn icon ghost sm" data-action="section-move" data-id="${sec.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">${ICONS.up}</button>
        <button class="btn icon ghost sm" data-action="section-move" data-id="${sec.id}" data-dir="1" ${i === s.sections.length - 1 ? 'disabled' : ''} aria-label="Move down">${ICONS.down}</button>
      </li>`).join('')}</ul>
    </section>

    <section class="card"><h2>Navigation</h2>
      ${NAV.map((n) => row(n.label, n.locked ? 'Always shown' : 'Show in the sidebar',
        `<input type="checkbox" class="check" data-action="nav-toggle" data-id="${n.id}" ${s.hiddenNav.includes(n.id) ? '' : 'checked'} ${n.locked ? 'disabled' : ''} aria-label="Show ${n.label}">`)).join('')}
    </section>

    <section class="card"><h2>Lists</h2><p class="muted small">Lists group tasks and notes. Deleting a list moves its tasks to the first list.</p>
      <div class="stack" style="gap:8px">${state.lists.map((l) => `<div class="row"><span class="dot" style="background:var(--c${l.color})"></span>
        <input class="input" data-list-name="${l.id}" value="${esc(l.name)}" aria-label="List name">
        <button class="btn icon ghost sm" data-action="delete-list" data-id="${l.id}" ${state.lists.length < 2 ? 'disabled' : ''} aria-label="Delete list">${ICONS.trash}</button></div>`).join('')}
        <div class="row"><input class="input" data-new-list placeholder="New list name, press Enter" aria-label="New list"><button class="btn" data-action="add-list">Add</button></div>
      </div>
    </section>

    <section class="card"><h2>Data</h2><p class="muted small">A copy of everything is kept in this browser. Export a backup file any time. While syncing, Delete all data erases it on every device.</p>
      <div class="row wrap">
        <button class="btn" data-action="export">Export JSON</button>
        <label class="btn">Import JSON<input type="file" accept="application/json" data-import hidden></label>
        <span class="spacer"></span>
        <button class="btn danger" data-action="reset">Delete all data</button>
      </div>
    </section>
  </div>`;
}

const VIEWS = { today: viewToday, calendar: viewCalendar, tasks: viewTasks, notes: viewNotes, habits: viewHabits, stats: viewStats, settings: viewSettings };

/* =========================================================
   Modals & toasts
   ========================================================= */
function openModal(html) {
  $('#modal-root').innerHTML = `<div class="modal-back" data-action="modal-back"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
  setTimeout(() => $('.modal input:not([type=checkbox]), .modal select')?.focus(), 0);
}
function closeModal() { $('#modal-root').innerHTML = ''; pendingConfirm = null; flushRender(); }
let pendingConfirm = null;
function askConfirm(message, yesLabel, onYes) {
  openModal(`<h2>${esc(message)}</h2><div class="modal-foot"><span class="spacer"></span>
    <button type="button" class="btn" data-action="close-modal">Cancel</button>
    <button type="button" class="btn primary danger" data-action="confirm-yes">${esc(yesLabel)}</button></div>`);
  pendingConfirm = onYes;
  setTimeout(() => $('[data-action="confirm-yes"]')?.focus(), 0);
}
// Pass `undo` to offer an Undo button; it restores the state captured by snapshot().
const undoFns = new Map();
function toast(msg, undo) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  if (undo) {
    const id = uid();
    undoFns.set(id, undo);
    el.insertAdjacentHTML('beforeend', ` <button class="toast-undo" data-action="toast-undo" data-id="${id}">Undo</button>`);
    setTimeout(() => undoFns.delete(id), 6000);
  }
  $$('#toasts .toast').slice(0, -1).forEach((old) => old.remove()); // keep at most two on screen
  $('#toasts').append(el);
  setTimeout(() => el.remove(), undo ? 6000 : 2600);
}
function snapshot() {
  const json = JSON.stringify(state);
  return () => { state = normalize(JSON.parse(json)); save(); render(); };
}

const durOptions = (sel) => [...new Set([...DURATIONS, sel])].sort((a, b) => a - b).map((d) => `<option value="${d}" ${d === sel ? 'selected' : ''}>${d < 60 ? `${d} min` : fmtHours(d).replace(' h', ' hr')}</option>`).join('');
const subRow = (s = { id: uid(), title: '', done: false }) => `<div class="sub-edit" data-sub-id="${s.id}">
  <input type="checkbox" class="check" data-sub-done ${s.done ? 'checked' : ''} aria-label="Done">
  <input class="input" data-sub-title value="${esc(s.title)}" placeholder="Subtask">
  <button type="button" class="btn icon ghost sm" data-action="remove-sub-row" aria-label="Remove">${ICONS.trash}</button></div>`;

function nextSlot() { return clamp(Math.ceil((nowMinutes() + 1) / 60) * 60, 0, 23 * 60); }

function openTaskModal(id, defaults = {}) {
  const t = id ? taskById(id) : { title: '', listId: state.lists[0].id, priority: 'none', due: null, notes: '', subtasks: [], block: null, ...defaults };
  if (!t) return;
  const b = t.block || { date: t.due || ui.calDate, start: nextSlot(), dur: t.est || 60 };
  openModal(`<form data-form="task" data-id="${id || ''}"><h2>${id ? 'Edit task' : 'New task'}</h2>
    <div class="fields">
      <label class="field full">Title<input class="input" name="title" required value="${esc(t.title)}"></label>
      <label class="field">List<select class="input" name="listId">${listOptions(t.listId)}</select></label>
      <label class="field">Priority<select class="input" name="priority">${Object.entries(PRIORITY).map(([v, l]) => `<option value="${v}" ${t.priority === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field">Due date<input class="input" type="date" name="due" value="${t.due || ''}"></label>
      <label class="field">Time estimate<select class="input" name="est"><option value="">Not set</option>${DURATIONS.map((d) => `<option value="${d}" ${t.est === d ? 'selected' : ''}>${fmtDur(d)}</option>`).join('')}</select></label>
      <label class="field">Repeat<select class="input" name="repeat">${Object.entries(REPEAT).map(([v, l]) => `<option value="${v}" ${(t.repeat || 'none') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field full">Calendar<span class="row" style="height:36px;font-weight:500;color:var(--text)"><input type="checkbox" class="check" name="blocked" data-action="toggle-block-fields" ${t.block ? 'checked' : ''}> Time-block this task</span></label>
      <div class="full fields ${t.block ? '' : 'hidden'}" id="block-fields" style="grid-template-columns:repeat(3,minmax(0,1fr))">
        <label class="field">Date<input class="input" type="date" name="bdate" value="${b.date}"></label>
        <label class="field">Start<input class="input" type="time" name="bstart" step="900" value="${toHHMM(b.start)}"></label>
        <label class="field">Duration<select class="input" name="bdur">${durOptions(b.dur)}</select></label>
        ${id && t.block ? `<div class="full row wrap"><span class="small muted">Move:</span>
          <button type="button" class="btn sm" data-action="push" data-how="hour" data-id="${id}">+1 hour</button>
          <button type="button" class="btn sm" data-action="push" data-how="later" data-id="${id}">Later today</button>
          <button type="button" class="btn sm" data-action="push" data-how="nextday" data-id="${id}">Next day</button>
          <button type="button" class="btn sm" data-action="push" data-how="next" data-id="${id}">Next free slot</button></div>` : ''}
      </div>
      <label class="field full">Notes<textarea class="input" name="notes" rows="3">${esc(t.notes)}</textarea></label>
      <div class="full"><div class="field" style="margin-bottom:6px">Subtasks</div><div id="sub-edit">${t.subtasks.map(subRow).join('')}</div>
        <button type="button" class="btn sm" data-action="add-sub-row">${ICONS.plus} Add subtask</button></div>
    </div>
    <div class="modal-foot">
      ${id ? `<button type="button" class="btn danger" data-action="delete-task" data-id="${id}">Delete</button>` : ''}
      <span class="spacer"></span>
      <button type="button" class="btn" data-action="close-modal">Cancel</button>
      <button class="btn primary">Save</button>
    </div></form>`);
}
// Quick picks: each finds the first free gap from a starting point, so none of them double-book.
function quickPicks() {
  const now = nowMinutes(), T = todayStr(), tmr = ymd(addDays(new Date(), 1));
  return [
    ['next', 'Next free slot', T, 0],
    ['hour', 'In 1 hour', T, now + 60],
    now < 17 * 60 && ['afternoon', 'This afternoon', T, 13 * 60],
    now < 21 * 60 && ['tonight', 'Tonight', T, 19 * 60],
    ['tomorrow', 'Tomorrow', tmr, 0],
  ].filter(Boolean);
}
function openScheduleModal(id) {
  const t = taskById(id);
  const first = findSlot(taskDur(t), ui.calDate, 0, { excludeId: id }) || { date: todayStr(), start: nextSlot() };
  const picks = quickPicks().map(([k, label, ds, from]) => {
    const slot = findSlot(taskDur(t), ds, from, { excludeId: id, days: k === 'next' ? 14 : 1 });
    return slot ? `<button type="button" class="pick" data-action="quick-pick" data-id="${id}" data-date="${slot.date}" data-start="${slot.start}">
      <b>${label}</b><span>${slotLabel(slot)}</span></button>` : '';
  }).join('');
  openModal(`<form data-form="schedule" data-id="${id}"><h2>Schedule “${esc(t.title)}”</h2>
    <div class="picks">${picks}
      <button type="button" class="pick" data-action="place-start" data-id="${id}"><b>Pick on calendar</b><span>Tap a time on the calendar</span></button></div>
    <div class="muted small" style="margin:16px 0 8px">Or choose a time</div>
    <div class="fields" style="grid-template-columns:repeat(3,minmax(0,1fr))">
      <label class="field">Date<input class="input" type="date" name="date" value="${first.date}" required></label>
      <label class="field">Start<input class="input" type="time" name="start" step="900" value="${toHHMM(first.start)}" required></label>
      <label class="field">Duration<select class="input" name="dur">${durOptions(taskDur(t))}</select></label>
    </div>
    <div class="modal-foot"><span class="spacer"></span><button type="button" class="btn" data-action="close-modal">Cancel</button><button class="btn primary">Schedule</button></div></form>`);
}
function busyDays(days) {
  const key = [...days].sort().join('');
  if (key === '12345') return 'Weekdays';
  if (key === '0123456') return 'Every day';
  if (key === '06') return 'Weekends';
  return [1, 2, 3, 4, 5, 6, 0].filter((d) => days.includes(d)).map((d) => WEEKDAYS[d]).join(', ');
}
function openBusyModal(id) {
  const b = id ? state.busy.find((x) => x.id === id) : { title: '', days: [1, 2, 3, 4, 5], start: 480, end: 900 };
  if (!b) return;
  openModal(`<form data-form="busy" data-id="${id || ''}"><h2>${id ? 'Edit busy time' : 'New busy time'}</h2>
    <div class="fields">
      <label class="field full">Name<input class="input" name="title" required value="${esc(b.title)}" placeholder="School, Period 3: Biology, Work…"></label>
      <div class="field full">Days<div class="day-picks">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<label class="day-pick"><input type="checkbox" name="days" value="${d}" ${b.days.includes(d) ? 'checked' : ''}><span>${WEEKDAYS[d]}</span></label>`).join('')}</div></div>
      <label class="field">Starts<input class="input" type="time" step="300" name="start" value="${toHHMM(b.start)}" required></label>
      <label class="field">Ends<input class="input" type="time" step="300" name="end" value="${toHHMM(b.end)}" required></label>
    </div>
    <div class="small" id="busy-msg" style="color:var(--danger);margin-top:8px"></div>
    <div class="modal-foot">${id ? `<button type="button" class="btn danger" data-action="delete-busy" data-id="${id}">Delete</button>` : ''}<span class="spacer"></span>
      <button type="button" class="btn" data-action="close-modal">Cancel</button><button class="btn primary">Save</button></div></form>`);
}
function openHabitModal(id) {
  const h = id ? habitById(id) : { name: '', goal: 5, reminder: '' };
  openModal(`<form data-form="habit" data-id="${id || ''}"><h2>${id ? 'Edit habit' : 'New habit'}</h2>
    <div class="fields">
      <label class="field full">Name<input class="input" name="name" required value="${esc(h.name)}"></label>
      <label class="field">Weekly goal<select class="input" name="goal">${[1, 2, 3, 4, 5, 6, 7].map((n) => `<option value="${n}" ${h.goal === n ? 'selected' : ''}>${n}× per week</option>`).join('')}</select></label>
      <label class="field">Reminder (optional)<input class="input" type="time" name="reminder" value="${h.reminder || ''}"></label>
    </div>
    <div class="modal-foot"><span class="spacer"></span><button type="button" class="btn" data-action="close-modal">Cancel</button><button class="btn primary">Save</button></div></form>`);
}
function openGoalModal(id) {
  const g = id ? goalById(id) : { title: '', current: 0, target: 10, unit: '' };
  openModal(`<form data-form="goal" data-id="${id || ''}"><h2>${id ? 'Edit goal' : 'New goal'}</h2>
    <div class="fields">
      <label class="field full">Goal<input class="input" name="title" required value="${esc(g.title)}"></label>
      <label class="field">Progress<input class="input" type="number" min="0" step="any" name="current" value="${g.current}"></label>
      <label class="field">Target<input class="input" type="number" min="1" step="any" name="target" value="${g.target}" required></label>
      <label class="field full">Unit<input class="input" name="unit" value="${esc(g.unit)}" placeholder="books, km, sessions…"></label>
    </div>
    <div class="modal-foot"><span class="spacer"></span><button type="button" class="btn" data-action="close-modal">Cancel</button><button class="btn primary">Save</button></div></form>`);
}

const FORMS = {
  task(f) {
    const d = new FormData(f);
    const subtasks = $$('.sub-edit', f).map((row) => ({
      id: row.dataset.subId, title: $('[data-sub-title]', row).value.trim(), done: $('[data-sub-done]', row).checked,
    })).filter((s) => s.title);
    const fields = {
      title: d.get('title').trim(), listId: d.get('listId'), priority: d.get('priority'), due: d.get('due') || null,
      notes: d.get('notes'), subtasks, repeat: d.get('repeat'), est: +d.get('est') || null,
      block: d.get('blocked') ? { date: d.get('bdate') || todayStr(), start: fromHHMM(d.get('bstart') || '09:00'), dur: +d.get('bdur') } : null,
    };
    if (!fields.title) return;
    if (fields.repeat !== 'none' && !fields.due && !fields.block) fields.due = todayStr();
    if (f.dataset.id) Object.assign(taskById(f.dataset.id), fields);
    else state.tasks.push({ id: uid(), done: false, doneAt: null, createdAt: Date.now(), ...fields });
    commit(f.dataset.id ? 'Task saved' : 'Task added');
  },
  schedule(f) {
    const d = new FormData(f);
    taskById(f.dataset.id).block = { date: d.get('date'), start: fromHHMM(d.get('start')), dur: +d.get('dur') };
    commit(`Scheduled for ${fmtDate(d.get('date'))} at ${fmtTime(fromHHMM(d.get('start')))}`);
  },
  busy(f) {
    const d = new FormData(f);
    const fields = { title: d.get('title').trim(), days: d.getAll('days').map(Number), start: fromHHMM(d.get('start')), end: fromHHMM(d.get('end')) };
    if (!fields.days.length) { $('#busy-msg').textContent = 'Pick at least one day.'; return; }
    if (fields.end <= fields.start) { $('#busy-msg').textContent = 'The end time needs to be after the start time.'; return; }
    if (f.dataset.id) Object.assign(state.busy.find((b) => b.id === f.dataset.id), fields);
    else state.busy.push({ id: uid(), ...fields });
    commit('Busy time saved');
  },
  habit(f) {
    const d = new FormData(f);
    const fields = { name: d.get('name').trim(), goal: +d.get('goal'), reminder: d.get('reminder') || '' };
    if (f.dataset.id) Object.assign(habitById(f.dataset.id), fields);
    else state.habits.push({ id: uid(), log: {}, ...fields });
    commit('Habit saved');
  },
  goal(f) {
    const d = new FormData(f);
    const fields = { title: d.get('title').trim(), current: +d.get('current') || 0, target: +d.get('target') || 1, unit: d.get('unit').trim() };
    if (f.dataset.id) Object.assign(goalById(f.dataset.id), fields);
    else state.goals.push({ id: uid(), ...fields });
    commit('Goal saved');
  },
  passcode(f) {
    const d = new FormData(f);
    const msg = $('#pin-msg');
    const fail = (m) => { msg.textContent = m; msg.style.color = 'var(--danger)'; };
    if (d.get('cur') !== state.passcode) return fail('Current passcode is wrong.');
    if (!new RegExp(`^\\d{${PIN_LEN}}$`).test(d.get('next'))) return fail(`Use exactly ${PIN_LEN} digits.`);
    if (d.get('next') !== d.get('confirm')) return fail("New passcodes don't match.");
    state.passcode = d.get('next');
    save();
    f.reset();
    msg.textContent = 'Passcode updated.';
    msg.style.color = 'var(--accent)';
  },
};
function commit(msg) { save(); closeModal(); render(); if (msg) toast(msg); }

/* =========================================================
   Actions (click delegation)
   ========================================================= */
const ACTIONS = {
  'toggle-nav': () => app.classList.toggle('nav-open'),
  'confirm-yes': () => { const fn = pendingConfirm; closeModal(); fn?.(); },

  'timer-mode': (el) => { Object.assign(ui.timer, { mode: el.dataset.mode, left: TIMER_MODES[el.dataset.mode][1] * 60, running: false }); render(); },
  'timer-toggle': () => {
    const tm = ui.timer;
    if (tm.running) { tm.left = Math.max(0, Math.ceil((tm.endAt - Date.now()) / 1000)); tm.running = false; }
    else { tm.endAt = Date.now() + tm.left * 1000; tm.running = true; }
    render();
  },
  'timer-reset': () => { Object.assign(ui.timer, { left: TIMER_MODES[ui.timer.mode][1] * 60, running: false }); render(); },
  go: (el) => { location.hash = el.dataset.to; },
  lock: () => lock(),
  'close-modal': () => closeModal(),
  'modal-back': (el, e) => { if (e.target === el) closeModal(); },

  'new-task': () => openTaskModal(null, { due: currentView() === 'today' ? todayStr() : null }),
  'edit-task': (el) => openTaskModal(el.dataset.id),
  'delete-task': (el) => {
    const t = taskById(el.dataset.id);
    if (!t) return;
    askConfirm(`Delete “${t.title}”?`, 'Delete', () => {
      state.tasks = state.tasks.filter((x) => x !== t);
      commit('Task deleted');
    });
  },
  'toggle-task': (el) => {
    const t = taskById(el.dataset.id);
    t.done = !t.done;
    t.doneAt = t.done ? Date.now() : null;
    let next = null;
    if (t.done) {
      t.subtasks.forEach((s) => { s.done = true; });
      if (t.repeat && t.repeat !== 'none' && !taskById(t.nextId)) next = spawnNext(t);
    } else if (t.nextId) {
      // Un-completing takes back the occurrence it created, unless that one has been done too.
      const n = taskById(t.nextId);
      if (n && !n.done) { state.tasks = state.tasks.filter((x) => x !== n); t.nextId = null; }
      else if (!n) t.nextId = null;
    }
    save(); render();
    if (next) toast(`Done. Next one is ${fmtDate(next.due || next.block.date, { weekday: 'short', month: 'short', day: 'numeric' })}`);
    else if (t.done) toast('Nice, task completed');
  },
  'toggle-sub': (el) => {
    const t = taskById(el.dataset.id);
    const s = t.subtasks.find((x) => x.id === el.dataset.sub);
    s.done = !s.done;
    save(); render();
  },
  'toggle-block-fields': (el) => $('#block-fields').classList.toggle('hidden', !el.checked),
  'add-sub-row': () => { $('#sub-edit').insertAdjacentHTML('beforeend', subRow()); $('#sub-edit .sub-edit:last-child [data-sub-title]').focus(); },
  'remove-sub-row': (el) => el.closest('.sub-edit').remove(),
  'schedule-task': (el) => openScheduleModal(el.dataset.id),

  'cal-view': (el) => { ui.calView = el.dataset.view; render(); },
  'cal-today': () => { ui.calDate = todayStr(); ui.calScroll = null; render(); },
  'cal-step': (el) => {
    const dir = +el.dataset.dir, d = parse(ui.calDate);
    if (ui.calView === 'month') d.setMonth(d.getMonth() + dir, 1);
    else d.setDate(d.getDate() + dir * (ui.calView === 'week' ? 7 : 1));
    ui.calDate = ymd(d);
    render();
  },
  'open-day': (el) => {
    const t = ui.placing && taskById(ui.placing);
    if (t) { ui.placing = null; autoSchedule(t, el.dataset.day, 0, { sameDay: true }); return; }
    ui.calView = 'day'; ui.calDate = el.dataset.day; render();
  },
  slot: (el, e) => {
    const r = el.getBoundingClientRect();
    const exact = ((e.clientY - r.top) / (r.height / 24)) * 60;
    const t = ui.placing && taskById(ui.placing);
    if (t) {
      const undo = snapshot();
      const dur = taskDur(t);
      t.block = { date: el.dataset.day, start: clamp(Math.floor(exact / 15) * 15, 0, 1440 - dur), dur };
      ui.placing = null;
      save(); render();
      toast(`Scheduled ${slotLabel(t.block)}`, undo);
      return;
    }
    const m = clamp(Math.floor(exact / 30) * 30, 0, 23 * 60);
    openTaskModal(null, { due: el.dataset.day, block: { date: el.dataset.day, start: m, dur: 60 } });
  },
  'next-slot': (el) => autoSchedule(taskById(el.dataset.id)),
  'quick-pick': (el) => {
    const t = taskById(el.dataset.id), undo = snapshot();
    t.block = { date: el.dataset.date, start: +el.dataset.start, dur: taskDur(t) };
    closeModal(); save(); render();
    toast(`Scheduled ${slotLabel(t.block)}`, undo);
  },
  'place-start': (el) => {
    ui.placing = el.dataset.id;
    closeModal();
    if (currentView() !== 'calendar') location.hash = 'calendar'; else render();
  },
  'place-cancel': () => { ui.placing = null; render(); },
  push: (el) => {
    const t = taskById(el.dataset.id), how = el.dataset.how, b = t.block;
    if (how === 'hour') {
      const undo = snapshot();
      b.start = Math.min(b.start + 60, 1440 - b.dur);
      closeModal(); save(); render();
      toast(`Moved to ${slotLabel(b)}`, undo);
    } else if (how === 'later') autoSchedule(t, todayStr(), b.date === todayStr() ? b.start + b.dur : 0, { sameDay: true });
    else if (how === 'nextday') autoSchedule(t, ymd(addDays(parse(b.date < todayStr() ? todayStr() : b.date), 1)), b.start);
    else autoSchedule(t);
  },
  'toast-undo': (el) => { const fn = undoFns.get(el.dataset.id); undoFns.delete(el.dataset.id); el.closest('.toast')?.remove(); fn?.(); },
  'catchup-all': () => {
    const undo = snapshot();
    const missed = missedTasks().sort(taskSort);
    let placed = 0;
    missed.forEach((t) => { if (autoSchedule(t, todayStr(), 0, { quiet: true })) placed++; });
    save(); render();
    toast(placed === missed.length ? `Rescheduled ${placed} task${placed === 1 ? '' : 's'}` : `Rescheduled ${placed} of ${missed.length}. No room for the rest in the next 2 weeks.`, undo);
  },
  'catchup-clear': () => {
    const undo = snapshot();
    missedTasks().forEach((t) => { t.block = null; });
    save(); render();
    toast('Moved back to unscheduled', undo);
  },
  'edit-busy': (el) => openBusyModal(el.dataset.id),
  'new-busy': () => openBusyModal(null),
  'delete-busy': (el) => askConfirm('Delete this busy time?', 'Delete', () => {
    state.busy = state.busy.filter((b) => b.id !== el.dataset.id);
    commit('Busy time deleted');
  }),

  'new-note': () => {
    const n = { id: uid(), title: '', body: '', listId: ui.noteList !== 'all' ? ui.noteList : '', updatedAt: Date.now() };
    state.notes.push(n);
    ui.activeNote = n.id; ui.noteQ = '';
    save(); render();
    $('.note-title')?.focus();
  },
  'open-note': (el) => { ui.activeNote = el.dataset.id; render(); },
  'delete-note': (el) => {
    askConfirm('Delete this note?', 'Delete', () => {
      state.notes = state.notes.filter((n) => n.id !== el.dataset.id);
      ui.activeNote = null;
      commit('Note deleted');
    });
  },
  'note-list-tasks': (el) => { ui.taskF = { ...ui.taskF, list: el.dataset.list, status: 'open' }; location.hash = 'tasks'; },

  'habit-toggle': (el) => {
    const h = habitById(el.dataset.id), ds = el.dataset.date;
    if (h.log[ds]) delete h.log[ds]; else h.log[ds] = true;
    save(); render();
  },
  'new-habit': () => openHabitModal(null),
  'edit-habit': (el) => openHabitModal(el.dataset.id),
  'delete-habit': (el) => {
    const h = habitById(el.dataset.id);
    askConfirm(`Delete habit “${h.name}” and its history?`, 'Delete', () => {
      state.habits = state.habits.filter((x) => x !== h);
      commit('Habit deleted');
    });
  },
  'enable-notify': async () => {
    let p = 'denied';
    try { p = await Notification.requestPermission(); } catch (_) { /* blocked when embedded */ }
    toast(p === 'granted' ? 'Reminders will pop up as notifications' : 'Reminders will show inside Daybook');
    render();
  },
  'new-goal': () => openGoalModal(null),
  'edit-goal': (el) => openGoalModal(el.dataset.id),
  'delete-goal': (el) => {
    askConfirm('Delete this goal?', 'Delete', () => {
      state.goals = state.goals.filter((g) => g.id !== el.dataset.id);
      commit('Goal deleted');
    });
  },
  'goal-step': (el) => {
    const g = goalById(el.dataset.id);
    g.current = Math.max(0, g.current + +el.dataset.delta);
    save(); render();
  },

  'hours-range': (el) => { ui.hoursRange = el.dataset.val; render(); },

  set: (el) => { state.settings[el.dataset.key] = el.dataset.val; save(); render(); },
  'section-toggle': (el) => {
    state.settings.sections.find((s) => s.id === el.dataset.id).visible = el.checked;
    save(); render();
  },
  'section-move': (el) => {
    const arr = state.settings.sections, i = arr.findIndex((s) => s.id === el.dataset.id), j = i + +el.dataset.dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    save(); render();
  },
  'nav-toggle': (el) => {
    const hidden = new Set(state.settings.hiddenNav);
    if (el.checked) hidden.delete(el.dataset.id); else hidden.add(el.dataset.id);
    state.settings.hiddenNav = [...hidden];
    save(); render();
  },
  'add-list': () => addList($('[data-new-list]').value),
  'delete-list': (el) => {
    const l = listById(el.dataset.id);
    if (state.lists.length < 2) return;
    askConfirm(`Delete list “${l.name}”? Its tasks move to another list.`, 'Delete', () => {
      state.lists = state.lists.filter((x) => x !== l);
      const fallback = state.lists[0].id;
      state.tasks.forEach((t) => { if (t.listId === l.id) t.listId = fallback; });
      state.notes.forEach((n) => { if (n.listId === l.id) n.listId = ''; });
      if (ui.taskF.list === l.id) ui.taskF.list = 'all';
      commit('List deleted');
    });
  },
  export: async () => {
    const data = JSON.stringify(state, null, 2), filename = `daybook-backup-${todayStr()}.json`;
    const dl = window.claude?.use ? await window.claude.use('downloads') : null;
    if (dl) {
      try { await dl.save({ filename, data }); } catch (e) { if (e?.code !== 'declined') toast('Export is unavailable here'); }
      return;
    }
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },
  reset: () => {
    askConfirm('Delete all tasks, notes, habits, goals and reviews? This cannot be undone. Your passcode and settings are kept.', 'Delete everything', () => {
      state = { ...emptyState(), passcode: state.passcode, settings: state.settings };
      ui.activeNote = null;
      ui.taskF.list = 'all';
      commit('All data deleted');
    });
  },
};

function addList(name) {
  name = name.trim();
  if (!name) return;
  const used = new Set(state.lists.map((l) => l.color));
  const color = [1, 2, 3, 4, 5, 6, 7, 8].find((c) => !used.has(c)) || (state.lists.length % 8) + 1;
  state.lists.push({ id: uid(), name, color });
  commit('List added');
}

/* =========================================================
   Lock screen
   ========================================================= */
function lock() {
  ui.locked = true; ui.pin = ''; ui.lockErr = '';
  closeModal();
  app.classList.remove('nav-open');
  document.activeElement?.blur();
  renderLock();
}
function renderLock() {
  const el = $('#lock');
  app.classList.toggle('blurred', ui.locked);
  app.inert = ui.locked;
  el.classList.toggle('hidden', !ui.locked);
  if (!ui.locked) { el.innerHTML = ''; return; }
  const now = new Date();
  el.innerHTML = `<div class="lock-card" role="dialog" aria-modal="true" aria-label="Daybook is locked">
    <div class="brand-mark">✓</div>
    <h1>Daybook is locked</h1>
    <div class="lock-time">${now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · ${now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
    <div class="pin-dots" id="pin-dots" aria-label="${ui.pin.length} of ${PIN_LEN} digits entered">${Array.from({ length: PIN_LEN }, (_, i) => `<span class="${i < ui.pin.length ? 'on' : ''}"></span>`).join('')}</div>
    <div class="lock-err" role="alert">${esc(ui.lockErr)}</div>
    <div class="keypad">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button class="key" data-key="${n}">${n}</button>`).join('')}
      <span></span><button class="key" data-key="0">0</button><button class="key txt" data-key="del">Delete</button>
    </div>
    ${state.passcode === DEFAULT_PIN ? '<div class="lock-hint">Default passcode is 1234. Change it in Settings.</div>' : ''}
  </div>`;
}
function pressKey(k) {
  if (Date.now() < ui.lockUntil) return;
  if (k === 'del') { ui.pin = ui.pin.slice(0, -1); ui.lockErr = ''; renderLock(); return; }
  if (ui.pin.length >= PIN_LEN) return;
  ui.pin += k;
  ui.lockErr = '';
  renderLock();
  if (ui.pin.length < PIN_LEN) return;

  if (ui.pin === state.passcode) {
    ui.locked = false; ui.pin = ''; ui.fails = 0;
    renderLock();
    render();
    return;
  }
  ui.fails++;
  if (ui.fails >= 5) {
    ui.lockUntil = Date.now() + 30000;
    ui.lockErr = 'Too many attempts. Try again in 30 seconds.';
    ui.fails = 0;
    setTimeout(() => { ui.lockErr = ''; renderLock(); }, 30000);
  } else {
    ui.lockErr = 'Wrong passcode. Try again.';
  }
  renderLock();
  $('#pin-dots').classList.add('shake');
  setTimeout(() => { ui.pin = ''; renderLock(); }, 450);
}

/* =========================================================
   Events
   ========================================================= */
document.addEventListener('click', (e) => {
  if (ui.locked) {
    const k = e.target.closest('.key');
    if (k) pressKey(k.dataset.key);
    return;
  }
  if (ui.skipClick) { ui.skipClick = false; return; } // the click that ends a resize shouldn't open the task
  if (ui.placing) {
    const col = e.target.closest('.day-col');
    if (col) { ACTIONS.slot(col, e); return; }
  }
  const el = e.target.closest('[data-action]');
  if (el && ACTIONS[el.dataset.action]) ACTIONS[el.dataset.action](el, e);
});

document.addEventListener('submit', (e) => {
  e.preventDefault();
  FORMS[e.target.dataset.form]?.(e.target);
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.bind === 'focus') { state.focus[todayStr()] = t.value; save(); }
  else if (t.dataset.quickadd) {
    const box = t.parentElement.querySelector('[data-qa-preview]');
    box.innerHTML = t.value.trim() ? quickPreview(parseQuick(t.value)) || '<span class="muted small">No date or time found</span>' : `<span class="muted small">${esc(quickHint())}</span>`;
  }
  else if (t.dataset.filter) { ui.taskF[t.dataset.filter] = t.value; $('#task-list').innerHTML = taskListHtml(); }
  else if (t.hasAttribute('data-note-search')) { ui.noteQ = t.value; $('#note-items').innerHTML = noteItemsHtml(); }
  else if (t.dataset.noteField && t.tagName !== 'SELECT') {
    const n = state.notes.find((x) => x.id === ui.activeNote);
    n[t.dataset.noteField] = t.value;
    n.updatedAt = Date.now();
    save();
    $('#note-items').innerHTML = noteItemsHtml();
  }
  else if (t.dataset.review) {
    const wk = ymd(startOfWeek(new Date()));
    state.reviews[wk] = { ...(state.reviews[wk] || {}), [t.dataset.review]: t.value, savedAt: Date.now() };
    save();
  }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.noteField === 'listId') {
    const n = state.notes.find((x) => x.id === ui.activeNote);
    n.listId = t.value; n.updatedAt = Date.now();
    save(); render();
  } else if (t.dataset.setting && t.value) {
    state.settings[t.dataset.setting] = t.value;
    if (state.settings.dayEnd <= state.settings.dayStart) { toast('The day has to end after it starts'); state.settings.dayEnd = '22:00'; render(); }
    save();
  } else if (t.hasAttribute('data-timer-task')) {
    ui.timer.taskId = t.value;
  } else if (t.hasAttribute('data-note-listfilter')) {
    ui.noteList = t.value; ui.activeNote = null; render();
  } else if (t.dataset.listName) {
    const name = t.value.trim();
    if (name) { listById(t.dataset.listName).name = name; save(); render(); }
  } else if (t.hasAttribute('data-import') && t.files[0]) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.tasks)) throw new Error('bad file');
        state = normalize(data);
        commit('Backup imported');
      } catch (_) { toast("That file isn't a Daybook backup"); }
    };
    reader.readAsText(t.files[0]);
  }
});

document.addEventListener('keydown', (e) => {
  if (ui.locked) {
    if (/^\d$/.test(e.key)) pressKey(e.key);
    else if (e.key === 'Backspace') pressKey('del');
    return;
  }
  if (e.key === 'Escape') { closeModal(); app.classList.remove('nav-open'); }
  if (e.key === 'Enter' && e.target.dataset.quickadd) quickAdd(e.target);
  if (e.key === 'Escape' && ui.placing) { ui.placing = null; render(); }
  if (e.key === 'Enter' && e.target.hasAttribute('data-new-list')) addList(e.target.value);
});

window.addEventListener('hashchange', () => {
  app.classList.remove('nav-open');
  if (currentView() !== 'calendar') ui.placing = null;
  render();
  window.scrollTo(0, 0);
});

/* ---------- Drag & drop: calendar ---------- */
let drag = null;
let ghost = null;
const clearDropMarks = () => { $$('.drop-over').forEach((x) => x.classList.remove('drop-over')); ghost?.remove(); };
function dropMinutes(col, e) {
  const r = col.getBoundingClientRect();
  const m = ((e.clientY - r.top) / (r.height / 24)) * 60 - drag.offsetMin;
  return clamp(Math.round(m / 15) * 15, 0, 1440 - drag.dur);
}

document.addEventListener('dragstart', (e) => {
  if (resize) { e.preventDefault(); return; }
  const order = e.target.closest?.('[data-order]');
  if (order) { drag = { order: order.dataset.order }; order.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', drag.order); return; }
  const el = e.target.closest?.('[data-drag]');
  if (!el) return;
  const t = taskById(el.dataset.drag);
  let offsetMin = 0;
  if (el.classList.contains('block')) {
    const hourPx = el.parentElement.getBoundingClientRect().height / 24;
    offsetMin = ((e.clientY - el.getBoundingClientRect().top) / hourPx) * 60;
  }
  drag = { id: t.id, dur: taskDur(t), offsetMin };
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', t.id);
});

document.addEventListener('dragover', (e) => {
  if (!drag) return;
  if (drag.order) {
    const li = e.target.closest('#order-list li');
    if (li) e.preventDefault();
    return;
  }
  const col = e.target.closest('.day-col'), cell = e.target.closest('.mcell'), tray = e.target.closest('[data-drop="tray"]');
  if (!col && !cell && !tray) { clearDropMarks(); return; }
  e.preventDefault();
  if (col) {
    const start = dropMinutes(col, e);
    const hourPx = col.getBoundingClientRect().height / 24;
    if (!ghost) { ghost = document.createElement('div'); ghost.className = 'drop-ghost'; }
    if (ghost.parentElement !== col) { clearDropMarks(); col.append(ghost); }
    ghost.style.top = `${(start / 60) * hourPx}px`;
    ghost.style.height = `${(drag.dur / 60) * hourPx - 2}px`;
    ghost.textContent = fmtTime(start);
  } else if (cell && !cell.classList.contains('drop-over')) {
    clearDropMarks(); cell.classList.add('drop-over');
  } else if (tray && !tray.classList.contains('drop-over')) {
    clearDropMarks(); tray.classList.add('drop-over');
  }
});

document.addEventListener('drop', (e) => {
  if (!drag) return;
  e.preventDefault();
  if (drag.order) {
    const li = e.target.closest('#order-list li');
    if (li && li.dataset.order !== drag.order) {
      const arr = state.settings.sections;
      const from = arr.findIndex((s) => s.id === drag.order);
      const [item] = arr.splice(from, 1);
      const r = li.getBoundingClientRect();
      let to = arr.findIndex((s) => s.id === li.dataset.order);
      if (e.clientY > r.top + r.height / 2) to++;
      arr.splice(to, 0, item);
      save(); render();
    }
    drag = null;
    return;
  }
  const t = taskById(drag.id);
  const col = e.target.closest('.day-col'), cell = e.target.closest('.mcell'), tray = e.target.closest('[data-drop="tray"]');
  if (col) {
    const start = dropMinutes(col, e);
    t.block = { date: col.dataset.day, start, dur: drag.dur };
    toast(`Blocked ${fmtDate(col.dataset.day)}, ${fmtTime(start)} – ${fmtTime(start + drag.dur)}`);
  } else if (cell) {
    t.block = { date: cell.dataset.day, start: t.block?.start ?? 540, dur: drag.dur };
    toast(`Blocked ${fmtDate(cell.dataset.day)} at ${fmtTime(t.block.start)}`);
  } else if (tray && t.block) {
    t.block = null;
    toast('Moved back to unscheduled');
  }
  drag = null;
  clearDropMarks();
  save(); render();
});

document.addEventListener('dragend', () => { drag = null; clearDropMarks(); $$('.dragging').forEach((x) => x.classList.remove('dragging')); });

/* ---------- Resizing calendar blocks ---------- */
let resize = null;
document.addEventListener('pointerdown', (e) => {
  const handle = e.target.closest?.('[data-resize]');
  if (!handle || ui.locked) return;
  e.preventDefault();
  const block = handle.parentElement, t = taskById(handle.dataset.resize);
  resize = { t, block, top: block.getBoundingClientRect().top, hourPx: block.parentElement.getBoundingClientRect().height / 24, dur: t.block.dur, undo: snapshot() };
  handle.setPointerCapture(e.pointerId);
  block.classList.add('resizing');
});
document.addEventListener('pointermove', (e) => {
  if (!resize) return;
  const { t, block, top, hourPx } = resize;
  resize.dur = clamp(Math.round((((e.clientY - top) / hourPx) * 60) / 15) * 15, 15, 1440 - t.block.start);
  block.style.height = `${(resize.dur / 60) * hourPx - 2}px`;
  const label = block.querySelector('span:not(.resize)');
  if (label) label.textContent = `${fmtTime(t.block.start)} – ${fmtTime(t.block.start + resize.dur)}`;
});
function endResize() {
  if (!resize) return;
  const { t, dur, undo } = resize;
  resize = null;
  ui.skipClick = true;
  setTimeout(() => { ui.skipClick = false; }, 0); // cleared if the release produced no click
  if (dur === t.block.dur) { render(); return; }
  t.block.dur = dur;
  save(); render();
  toast(`${t.title}: ${fmtDur(dur)}, ends ${fmtTime(t.block.start + dur)}`, undo);
}
document.addEventListener('pointerup', endResize);
document.addEventListener('pointercancel', endResize);

/* ---------- Tooltip ---------- */
const tip = document.createElement('div');
tip.className = 'tooltip hidden';
document.body.append(tip);
document.addEventListener('mouseover', (e) => {
  const el = e.target.closest?.('[data-tip]');
  if (!el) { tip.classList.add('hidden'); return; }
  tip.textContent = el.dataset.tip;
  tip.classList.remove('hidden');
});
document.addEventListener('mousemove', (e) => {
  if (tip.classList.contains('hidden')) return;
  tip.style.left = `${Math.min(e.clientX + 12, innerWidth - tip.offsetWidth - 8)}px`;
  tip.style.top = `${e.clientY + 16}px`;
});

/* ---------- Timers: now-line, lock clock, habit reminders ---------- */
function checkReminders() {
  const T = todayStr(), hhmm = toHHMM(nowMinutes());
  state.habits.forEach((h) => {
    if (h.reminder !== hhmm || h.log[T] || ui.reminded[h.id] === T) return;
    ui.reminded[h.id] = T;
    const body = `Time for: ${h.name}`;
    if ('Notification' in window && Notification.permission === 'granted') new Notification('Daybook reminder', { body });
    toast(body);
  });
}
setInterval(() => {
  checkReminders();
  const line = $('.now-line');
  if (line) line.style.top = `calc(var(--hour) * ${nowMinutes() / 60})`;
  if (ui.locked && !ui.pin) renderLock();
}, 20000);

/* ---------- Focus timer ---------- */
function timerText() { const s = Math.max(0, ui.timer.left); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; }
function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [660, 880, 990].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * 0.22;
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + 0.22);
    });
  } catch (_) { /* no audio */ }
}
function finishTimer() {
  const tm = ui.timer;
  tm.running = false;
  let next = 'focus', msg = 'Break over. Ready to focus?';
  if (tm.mode === 'focus') {
    state.pomodoros.push({ at: Date.now(), min: TIMER_MODES.focus[1], taskId: tm.taskId || null });
    save();
    const n = state.pomodoros.filter((p) => ymd(new Date(p.at)) === todayStr()).length;
    next = n % 4 === 0 ? 'long' : 'short';
    msg = `Focus session done. Time for a ${next === 'long' ? 'long' : 'short'} break.`;
  }
  Object.assign(tm, { mode: next, left: TIMER_MODES[next][1] * 60 });
  chime();
  try { if (Notification.permission === 'granted') new Notification('Daybook', { body: msg }); } catch (_) { /* unavailable */ }
  toast(msg);
  safeRender();
}
setInterval(() => {
  const tm = ui.timer;
  if (tm.running) {
    tm.left = Math.max(0, Math.ceil((tm.endAt - Date.now()) / 1000));
    if (tm.left === 0) finishTimer();
  }
  const disp = $('#timer-display');
  if (disp) {
    disp.textContent = timerText();
    $('#timer-bar').style.width = `${(1 - tm.left / (TIMER_MODES[tm.mode][1] * 60)) * 100}%`;
  }
  document.title = tm.running ? `${timerText()} · ${TIMER_MODES[tm.mode][0]}` : 'Daybook';
}, 1000);

/* ---------- Deferred rendering ----------
   Remote updates and timer events shouldn't wipe out whatever the person is typing,
   so they re-render only once nothing is being edited. */
let renderPending = false;
function isEditing() {
  const a = document.activeElement;
  return !!$('#modal-root').firstChild || !!(a && a !== document.body && a.matches('input:not([type=checkbox]), textarea, select'));
}
function safeRender() { if (isEditing()) renderPending = true; else render(); }
function flushRender() { if (renderPending && !isEditing()) { renderPending = false; render(); } }
document.addEventListener('focusout', () => setTimeout(flushRender, 0));

/* ---------- Sync ----------
   Two ways to keep devices in step, both mirroring the whole state as one JSON document:
   - Key sync (GitHub Pages or a local file): the state is encrypted on the device with a
     private sync key and stored in a secret gist on the person's GitHub account, so GitHub
     only ever sees ciphertext.
   - Account sync (hosted on claude.ai): one private document per signed-in person.
   Without either, localStorage is the only copy. */
const SYNC_KEY_STORE = 'daybook.sync';
const sync = { write: null, ready: false, lastJson: '', timer: 0, writing: false, again: false, dirty: false, status: 'local' };
const SYNC_LABEL = {
  local: 'Saved on this device', connecting: 'Connecting…', saving: 'Saving…', synced: 'Synced across your devices',
  error: 'Offline. Changes are saved here and will sync later.', readonly: 'Read-only: changes are not saved', full: 'Too much data to sync',
};
// Persisted so edits made offline still get pushed after a reload.
function markDirty(v) {
  sync.dirty = v;
  try { if (v) localStorage.setItem('daybook.syncDirty', '1'); else localStorage.removeItem('daybook.syncDirty'); } catch (_) { /* ignore */ }
}
function setSync(status) {
  sync.status = status;
  for (const el of $$('#sync-status, #cloud-status')) { el.textContent = SYNC_LABEL[status]; el.dataset.status = status; }
}
function queuePush() {
  if (!sync.write || !sync.ready) return;
  markDirty(true);
  setSync('saving');
  clearTimeout(sync.timer);
  sync.timer = setTimeout(pushNow, 600);
}
async function pushNow() {
  clearTimeout(sync.timer);
  sync.timer = 0;
  if (!sync.write) return;
  if (sync.writing) { sync.again = true; return; }
  const json = JSON.stringify(state);
  if (json === sync.lastJson) { markDirty(false); setSync('synced'); return; }
  if (json.length > 250000) { setSync('full'); return; }
  sync.writing = true;
  try {
    await sync.write(json);
    sync.lastJson = json;
    markDirty(false);
    setSync('synced');
  } catch (e) {
    markDirty(true);
    setSync(e?.code === 'invalid_argument' ? 'readonly' : 'error');
  } finally {
    sync.writing = false;
    if (sync.again) { sync.again = false; pushNow(); }
  }
}
function applyRemote(json, force = false) {
  // Local edits that haven't been sent yet win; they overwrite the remote copy on the next push.
  if (!force && (sync.timer || sync.writing || sync.dirty)) return;
  try {
    const next = normalize(JSON.parse(json));
    sync.lastJson = json;
    state = next;
    try { localStorage.setItem(STORE, json); } catch (_) { /* ignore */ }
    setSync('synced');
    if (ui.locked) renderLock();
    safeRender();
  } catch (_) { setSync('error'); }
}

/* Account sync (claude.ai) */
async function initAccountSync() {
  if (!window.claude?.use) return;
  setSync('connecting');
  const [user, db] = await Promise.all([window.claude.use('user'), window.claude.use('db')]);
  const id = user ? await user.id() : null;
  if (!db || !id) { setSync('local'); return; }
  const ref = db.doc(`data/users/${id}/daybook`);
  sync.write = (json) => ref.set({ json, savedAt: Date.now() });
  ref.onSnapshot((snap) => {
    if (snap.metadata.hasPendingWrites) return;
    if (!snap.exists) {
      // Only a server-confirmed "nothing saved yet" means this is the first device: upload what's here.
      if (!snap.metadata.fromCache && !sync.ready) { sync.ready = true; pushNow(); }
      return;
    }
    sync.ready = true;
    const { json } = snap.data();
    if (json === sync.lastJson) setSync('synced');
    else applyRemote(json);
  }, () => setSync('error'));
}

/* Key sync (GitHub gist) */
const cloud = { key: '', token: '', aes: null, file: '', gistId: '', etag: '', poll: 0 };
const KEY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I to misread
const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=gist&description=Daybook%20sync';
// Hosted on claude.ai the page can't reach GitHub, so it uses account sync there instead.
const cloudConfigured = () => !window.claude?.use;
function newSyncKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return [...bytes].map((b) => KEY_ALPHABET[b % 32]).join('').match(/.{4}/g).join('-');
}
function normalizeKey(raw) {
  const chars = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (chars.length !== 24 || [...chars].some((c) => !KEY_ALPHABET.includes(c))) return null;
  return chars.match(/.{4}/g).join('-');
}
const validToken = (t) => /^(ghp_|github_pat_|gho_)[A-Za-z0-9_]{20,}$/.test(t);
// A sync code bundles everything another device needs: the encryption key and the GitHub token.
const syncCode = () => `${cloud.key}~${cloud.token}`;
function parseSyncCode(raw) {
  const [k, t] = raw.trim().split('~');
  const key = normalizeKey(k || ''), token = (t || '').trim();
  return key && validToken(token) ? { key, token } : null;
}
const utf8 = new TextEncoder();
function toB64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function deriveCloud(key) {
  const hash = await crypto.subtle.digest('SHA-256', utf8.encode(`daybook-vault-id:${key}`));
  const hex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const base = await crypto.subtle.importKey('raw', utf8.encode(key), 'PBKDF2', false, ['deriveKey']);
  const aes = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: utf8.encode('daybook-vault-enc'), iterations: 200000, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  return { aes, file: `daybook-${hex.slice(0, 16)}.txt` };
}
async function encryptJson(json) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cloud.aes, utf8.encode(json));
  return `v1.${toB64(iv)}.${toB64(ct)}`;
}
async function decryptJson(data) {
  const [, iv, ct] = data.trim().split('.');
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, cloud.aes, fromB64(ct));
  return new TextDecoder().decode(plain);
}
async function gh(path, { method = 'GET', body, token = cloud.token, etag } = {}) {
  const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` };
  if (body) headers['Content-Type'] = 'application/json';
  if (etag) headers['If-None-Match'] = etag;
  const res = await fetch(`https://api.github.com${path}`, { method, headers, body: body && JSON.stringify(body), cache: 'no-store' });
  if (res.status === 304) return { notModified: true };
  if (res.status === 401) throw Object.assign(new Error('bad_token'), { code: 'bad_token' });
  if (!res.ok) throw Object.assign(new Error(`GitHub ${res.status}`), { code: 'http' });
  return { data: await res.json(), etag: res.headers.get('ETag') || '' };
}
async function gistContent(gist) {
  const f = gist.files[cloud.file];
  if (!f) throw Object.assign(new Error('not_found'), { code: 'not_found' });
  if (!f.truncated) return f.content;
  return (await fetch(f.raw_url, { cache: 'no-store' })).text();
}
// Every Daybook sync gist on the account, whatever its key.
async function daybookGists(token) {
  const { data } = await gh('/gists?per_page=100', { token });
  return data.filter((g) => Object.keys(g.files || {}).some((f) => /^daybook-[0-9a-f]{16}\.txt$/.test(f)));
}
async function findGist(token, file) {
  for (let page = 1; page <= 10; page++) {
    const { data } = await gh(`/gists?per_page=100&page=${page}`, { token });
    const hit = data.find((g) => g.files && g.files[file]);
    if (hit) return hit.id;
    if (data.length < 100) return null;
  }
  return null;
}
async function cloudWrite(json) {
  const content = await encryptJson(json);
  const { data } = cloud.gistId
    ? await gh(`/gists/${cloud.gistId}`, { method: 'PATCH', body: { files: { [cloud.file]: { content } } } })
    : await gh('/gists', { method: 'POST', body: { description: 'Daybook sync (encrypted)', public: false, files: { [cloud.file]: { content } } } });
  cloud.gistId = data.id;
  cloud.etag = '';
  saveCloudLocal();
}
async function cloudPull() {
  if (sync.writing || sync.timer) return;
  if (sync.dirty) { pushNow(); return; }
  try {
    const res = await gh(`/gists/${cloud.gistId}`, { etag: cloud.etag });
    if (res.notModified) { if (sync.status !== 'saving') setSync('synced'); return; }
    // updated_at only has one-second resolution, so compare the decrypted content itself.
    const json = await decryptJson(await gistContent(res.data));
    cloud.etag = res.etag;
    if (json === sync.lastJson) setSync('synced'); else applyRemote(json);
  } catch (_) { setSync('error'); }
}
function saveCloudLocal() {
  try { localStorage.setItem(SYNC_KEY_STORE, JSON.stringify({ key: cloud.key, token: cloud.token, gistId: cloud.gistId })); } catch (_) { /* lasts this visit only */ }
}
function startPolling() {
  clearInterval(cloud.poll);
  cloud.poll = setInterval(() => { if (!document.hidden) cloudPull(); }, 15000);
}
async function startCloud({ key, token }, mode) {
  setSync('connecting');
  const d = await deriveCloud(key);
  let gistId = null, gist = null;
  if (mode === 'download') {
    gistId = await findGist(token, d.file);
    if (!gistId) throw Object.assign(new Error('not_found'), { code: 'not_found' });
    ({ data: gist } = await gh(`/gists/${gistId}`, { token }));
  } else {
    await gh('/gists?per_page=1', { token }); // checks the token works before anything changes
  }
  Object.assign(cloud, d, { key, token, gistId: gistId || '', etag: '' });
  sync.write = cloudWrite;
  sync.ready = true;
  sync.lastJson = '';
  if (gist) {
    const json = await decryptJson(await gistContent(gist));
    saveCloudLocal();
    markDirty(false);
    applyRemote(json, true);
  } else {
    await pushNow();
    if (!cloud.gistId) throw Object.assign(new Error('upload failed'), { code: 'http' });
  }
  startPolling();
}
function stopCloud() {
  clearInterval(cloud.poll);
  Object.assign(cloud, { key: '', token: '', aes: null, file: '', gistId: '', etag: '', poll: 0 });
  Object.assign(sync, { write: null, ready: false, lastJson: '' });
  markDirty(false);
  try { localStorage.removeItem(SYNC_KEY_STORE); } catch (_) { /* ignore */ }
  setSync('local');
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && cloud.gistId) cloudPull(); });

async function initKeySync() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(SYNC_KEY_STORE) || 'null'); } catch (_) { /* nothing saved */ }
  if (!saved?.key || !saved?.token) return;
  try {
    Object.assign(cloud, await deriveCloud(saved.key), { key: saved.key, token: saved.token, gistId: saved.gistId || '' });
    sync.write = cloudWrite;
    sync.ready = true;
    // Seed lastJson with what's stored here, so the first pull only applies real changes.
    sync.lastJson = JSON.stringify(state);
    try { sync.dirty = localStorage.getItem('daybook.syncDirty') === '1'; } catch (_) { /* ignore */ }
    if (!cloud.gistId) cloud.gistId = await findGist(cloud.token, cloud.file) || '';
    startPolling();
    if (cloud.gistId) await cloudPull(); else await pushNow();
  } catch (_) { setSync('error'); }
}

function syncCard() {
  if (!cloudConfigured()) return '';
  if (!cloud.key) {
    return `<section class="card"><h2>Sync</h2>
      <p class="muted small">Keep your devices in step through your GitHub account. Your data is encrypted on this device before it's uploaded, so the copy on GitHub is unreadable without your sync code.</p>
      <div class="set-row"><div class="l"><b>First device</b><span>Paste a GitHub token that can only access gists. <a href="${TOKEN_URL}" target="_blank" rel="noopener">Create one on GitHub</a>, set Expiration to "No expiration", then click Generate token.</span></div>
        <form data-form="cloud-create" class="row" style="flex:1;min-width:240px">
          <input class="input" id="gh-token-input" name="token" placeholder="ghp_…" autocomplete="off" spellcheck="false" aria-label="GitHub token">
          <button class="btn primary">Start syncing</button></form></div>
      <div class="set-row"><div class="l"><b>Already syncing on another device?</b><span>Paste the sync code from that device's Settings. The synced data replaces what's on this device.</span></div>
        <form data-form="cloud-connect" class="row" style="flex:1;min-width:240px">
          <input class="input" id="sync-code-input" name="code" placeholder="Sync code" autocomplete="off" spellcheck="false" aria-label="Sync code">
          <button class="btn">Connect</button></form></div>
      <div class="small" id="cloud-msg" role="alert"></div>
    </section>`;
  }
  return `<section class="card"><h2>Sync</h2>
    ${settingsRow('Status', `<span id="cloud-status" data-status="${sync.status}">${SYNC_LABEL[sync.status]}</span>`, '<button class="btn" data-action="cloud-now">Sync now</button>')}
    ${settingsRow('Your sync code', 'Paste it into Settings → Sync on your other devices. Keep it private: anyone with it can read your data.',
      `<div class="row" style="min-width:0;max-width:100%"><code class="sync-key">${ui.showKey ? esc(syncCode()) : '••••••••••••••••••••'}</code>
       <button class="btn sm" data-action="cloud-show">${ui.showKey ? 'Hide' : 'Show'}</button>
       <button class="btn sm" data-action="cloud-copy">Copy</button></div>`)}
    ${settingsRow('Disconnect this device', 'Stops syncing here. Your data stays on this device and on your other devices.', '<button class="btn" data-action="cloud-disconnect">Disconnect</button>')}
    ${settingsRow('Remove from this device', 'For a shared or school computer: stops syncing and erases Daybook’s data from this browser only. Your other devices keep everything.', '<button class="btn danger" data-action="cloud-forget">Remove</button>')}
  </section>`;
}
function settingsRow(title, desc, control) {
  return `<div class="set-row"><div class="l"><b>${title}</b><span>${desc}</span></div>${control}</div>`;
}
function cloudFail(e) {
  const msg = $('#cloud-msg');
  if (!msg) return;
  msg.style.color = 'var(--danger)';
  msg.textContent = e?.code === 'bad_token' ? 'GitHub didn’t accept that token. Check it was copied in full and hasn’t been deleted.'
    : e?.code === 'not_found' ? 'No synced data matches that sync code. Copy it again from your other device.'
    : 'Couldn’t reach GitHub. Check your connection and try again.';
}
Object.assign(ACTIONS, {
  'cloud-force': () => {
    const f = $('form[data-form="cloud-create"]');
    f.dataset.force = '1';
    f.requestSubmit();
  },
  'cloud-now': () => (sync.dirty ? pushNow() : cloudPull()),
  'cloud-show': () => { ui.showKey = !ui.showKey; render(); },
  'cloud-copy': async () => {
    try { await navigator.clipboard.writeText(syncCode()); toast('Sync code copied'); }
    catch (_) { ui.showKey = true; render(); toast('Select the code and copy it'); }
  },
  'cloud-disconnect': () => askConfirm('Stop syncing on this device?', 'Disconnect', () => { stopCloud(); ui.showKey = false; render(); toast('This device is no longer syncing'); }),
  'cloud-forget': () => askConfirm('Stop syncing and erase Daybook’s data from this browser? Your other devices keep everything.', 'Remove', () => {
    stopCloud();
    state = emptyState();
    try { localStorage.removeItem(STORE); } catch (_) { /* ignore */ }
    ui.showKey = false;
    ui.activeNote = null;
    render();
    toast('Removed from this device');
  }),
});
FORMS['cloud-create'] = async (f) => {
  const token = (new FormData(f).get('token') || '').trim();
  if (!validToken(token)) return cloudFail({ code: 'bad_token' });
  $('#cloud-msg').textContent = 'Connecting…';
  $('#cloud-msg').style.color = '';
  // Starting a second sync splits devices apart, so steer people to Connect instead.
  if (!f.dataset.force) {
    try {
      if ((await daybookGists(token)).length) {
        $('#cloud-msg').style.color = 'var(--danger)';
        $('#cloud-msg').innerHTML = `This GitHub account already has Daybook syncing on another device. To share data with it, open Settings → Sync on that device, copy its sync code, and paste it into <b>Already syncing on another device?</b> below.
          <button type="button" class="btn sm" data-action="cloud-force" style="margin-top:6px">Start a separate sync anyway</button>`;
        return;
      }
    } catch (e) { return cloudFail(e); }
  }
  try { await startCloud({ key: newSyncKey(), token }, 'upload'); ui.showKey = true; render(); toast('Syncing. Copy your sync code to set up other devices.'); }
  catch (e) { stopCloud(); render(); cloudFail(e); }
};
FORMS['cloud-connect'] = async (f) => {
  const parsed = parseSyncCode(new FormData(f).get('code') || '');
  if (!parsed) {
    $('#cloud-msg').style.color = 'var(--danger)';
    $('#cloud-msg').textContent = 'That doesn’t look like a sync code. Copy the whole code from Settings → Sync on your other device.';
    return;
  }
  $('#cloud-msg').textContent = 'Connecting…';
  $('#cloud-msg').style.color = '';
  try { await startCloud(parsed, 'download'); render(); toast('Connected. This device is now syncing.'); }
  catch (e) { stopCloud(); render(); cloudFail(e); }
};

/* ---------- Boot ---------- */
render();
renderLock();
setSync('local');
if (cloudConfigured()) initKeySync(); else initAccountSync();
