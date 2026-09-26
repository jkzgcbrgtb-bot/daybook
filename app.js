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
const SECTIONS = { focus: 'Focus line', schedule: 'Schedule', due: 'Due today', habits: 'Habits', goals: 'Goals' };
const ACCENTS = { indigo: '#4f46e5', teal: '#0d8f86', rose: '#d6285a', amber: '#c26a00', green: '#178a3e' };
const PRIORITY = { none: 'None', low: 'Low', med: 'Medium', high: 'High' };
const PRIO_RANK = { high: 0, med: 1, low: 2, none: 3 };
const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240];

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

/* ---------- Seed data ---------- */
function seed() {
  const now = new Date();
  const T = ymd(now);
  const D = (n) => ymd(addDays(now, n));
  let s = 7;
  const rng = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const st = (title, done = false) => ({ id: uid(), title, done });

  const lists = [
    { id: 'l-work', name: 'Work', color: 1 },
    { id: 'l-personal', name: 'Personal', color: 2 },
    { id: 'l-health', name: 'Health', color: 3 },
    { id: 'l-learn', name: 'Learning', color: 4 },
  ];
  const tasks = [];
  const mk = (o) => tasks.push({ id: uid(), title: '', listId: 'l-work', priority: 'none', due: null, done: false, doneAt: null, notes: '', subtasks: [], block: null, createdAt: Date.now(), ...o });

  mk({ title: 'Finish Q4 planning doc', priority: 'high', due: T, block: { date: T, start: 540, dur: 90 },
    subtasks: [st('Draft goals', true), st('Budget table'), st('Send to team for review')] });
  mk({ title: 'Team standup', due: T, block: { date: T, start: 660, dur: 30 } });
  mk({ title: 'Gym — legs day', listId: 'l-health', due: T, block: { date: T, start: 1050, dur: 60 } });
  mk({ title: 'Reply to Sam about the contract', priority: 'med', due: T });
  mk({ title: 'Pay electricity bill', listId: 'l-personal', priority: 'high', due: D(-1) });
  mk({ title: 'Read chapter 4 of Deep Work', listId: 'l-learn', due: D(2) });
  mk({ title: 'Book dentist appointment', listId: 'l-personal', priority: 'low' });
  mk({ title: 'Prep slides for Monday review', priority: 'med', due: D(3), subtasks: [st('Outline'), st('Charts'), st('Rehearse')] });
  mk({ title: 'Meal prep for the week', listId: 'l-health' });
  mk({ title: 'Refactor onboarding flow', priority: 'med', due: D(5) });
  mk({ title: 'Plan weekend hike', listId: 'l-personal', priority: 'low', due: D(4) });
  mk({ title: '1:1 with Priya', due: D(1), block: { date: D(1), start: 840, dur: 45 } });
  mk({ title: 'Spanish lesson', listId: 'l-learn', block: { date: D(2), start: 1140, dur: 60 } });

  const history = ['Inbox zero', 'Code review', 'Write weekly update', 'Groceries', 'Yoga class', 'Online course module',
    'Fix login bug', 'Call mom', 'Laundry', 'Design sync', 'Evening run', 'Podcast notes', 'Update resume', 'Budget check-in'];
  for (let i = 1; i <= 14; i++) {
    const n = 1 + Math.floor(rng() * 4);
    for (let j = 0; j < n; j++) {
      const d = D(-i);
      const list = lists[Math.floor(rng() * lists.length)];
      const start = (8 + Math.floor(rng() * 10)) * 60;
      const dur = [30, 45, 60, 90][Math.floor(rng() * 4)];
      mk({ title: history[Math.floor(rng() * history.length)], listId: list.id, due: d, done: true,
        doneAt: parse(d).getTime() + (start + dur) * 60000, block: rng() < 0.75 ? { date: d, start, dur } : null });
    }
  }
  mk({ title: 'Morning journal', listId: 'l-personal', due: T, done: true, doneAt: Date.now() - 3600000 });

  const habits = [
    { id: uid(), name: 'Morning run', goal: 4, reminder: '07:00', p: 0.6 },
    { id: uid(), name: 'Read 20 minutes', goal: 7, reminder: '21:30', p: 0.8 },
    { id: uid(), name: 'Meditate', goal: 5, reminder: '08:00', p: 0.7 },
    { id: uid(), name: 'No phone after 10pm', goal: 6, reminder: '22:00', p: 0.45 },
  ].map(({ p, ...h }) => {
    const log = {};
    for (let i = 1; i <= 30; i++) if (rng() < p) log[D(-i)] = true;
    return { ...h, log };
  });

  return {
    version: 1,
    passcode: DEFAULT_PIN,
    settings: {
      theme: 'system', density: 'comfortable', accent: 'indigo',
      sections: Object.keys(SECTIONS).map((id) => ({ id, visible: true })),
      hiddenNav: [],
    },
    focus: { [T]: 'Ship the Q4 plan before lunch' },
    lists,
    tasks,
    notes: [
      { id: uid(), title: 'Q4 planning — raw ideas', listId: 'l-work', updatedAt: Date.now() - 7200000,
        body: 'Themes:\n- Reduce onboarding drop-off\n- Faster weekly reporting\n- Hire one more designer\n\nOpen questions: budget split between tooling and headcount?' },
      { id: uid(), title: 'Books to read', listId: 'l-learn', updatedAt: Date.now() - 86400000 * 2,
        body: 'Deep Work — Cal Newport\nFour Thousand Weeks — Oliver Burkeman\nThe Pragmatic Programmer\nAtomic Habits (re-read)' },
      { id: uid(), title: 'Running plan', listId: 'l-health', updatedAt: Date.now() - 86400000 * 5,
        body: 'Mon: easy 5k\nWed: intervals 6×400m\nSat: long run, +1km each week\n\nGoal: half marathon in spring.' },
    ],
    habits,
    goals: [
      { id: uid(), title: 'Read 12 books this year', current: 7, target: 12, unit: 'books' },
      { id: uid(), title: 'Run 200 km', current: 128, target: 200, unit: 'km' },
      { id: uid(), title: 'Ship portfolio site', current: 3, target: 5, unit: 'milestones' },
    ],
    reviews: {},
  };
}

/* ---------- Persistence ---------- */
function load() {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) return normalize(JSON.parse(raw));
  } catch (_) { /* fall through to seed */ }
  return seed();
}
function normalize(s) {
  const base = seed();
  const out = { ...base, ...s, settings: { ...base.settings, ...(s.settings || {}) } };
  for (const k of ['lists', 'tasks', 'notes', 'habits', 'goals']) if (!Array.isArray(out[k])) out[k] = [];
  if (!out.lists.length) out.lists = base.lists;
  const known = new Set(out.settings.sections.map((x) => x.id));
  Object.keys(SECTIONS).forEach((id) => known.has(id) || out.settings.sections.push({ id, visible: true }));
  out.settings.sections = out.settings.sections.filter((x) => SECTIONS[x.id]);
  out.tasks.forEach((t) => { t.subtasks = t.subtasks || []; });
  out.habits.forEach((h) => { h.log = h.log || {}; });
  return out;
}
function save() {
  try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (_) { toast('Could not save — storage is unavailable'); }
}

let state = load();
const ui = {
  locked: true, pin: '', fails: 0, lockUntil: 0, lockErr: '',
  calView: 'week', calDate: todayStr(), calScroll: null,
  taskF: { q: '', list: 'all', prio: 'all', due: 'all', status: 'open' },
  noteQ: '', noteList: 'all', activeNote: null,
  hoursRange: 'week',
  reminded: {},
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

/* =========================================================
   Rendering
   ========================================================= */
const app = $('#app');
const main = $('#main');

function applySettings() {
  const r = document.documentElement;
  const s = state.settings;
  if (s.theme === 'system') delete r.dataset.theme; else r.dataset.theme = s.theme;
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
  schedule() {
    const T = todayStr(), now = nowMinutes();
    const items = state.tasks.filter((t) => t.block && t.block.date === T).sort((a, b) => a.block.start - b.block.start);
    const body = items.length ? `<div class="sched">${items.map((t) => {
      const { start, dur } = t.block;
      const isNow = now >= start && now < start + dur;
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
      <input class="input" style="margin-top:10px" data-quickadd="today" placeholder="Add a task due today, press Enter" aria-label="Quick add task"></section>`;
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
function viewToday() {
  const h = new Date().getHours();
  const hello = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const secs = state.settings.sections.filter((s) => s.visible).map((s) => TODAY_SECTIONS[s.id]()).join('');
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
    const items = state.tasks.filter((t) => t.block && t.block.date === ds).sort((a, b) => a.block.start - b.block.start || b.block.dur - a.block.dur);
    const blocks = layoutDay(items).map(({ t, lane, lanes }) => {
      const { start, dur } = t.block;
      return `<div class="block ${t.done ? 'done' : ''}" draggable="true" data-drag="${t.id}" data-action="edit-task" data-id="${t.id}"
        style="--bc:${listColor(t.listId)};top:calc(var(--hour) * ${start / 60});height:calc(var(--hour) * ${dur / 60} - 2px);left:calc(${(lane / lanes) * 100}% + 3px);width:calc(${100 / lanes}% - 6px);right:auto"
        title="${esc(t.title)}"><b>${esc(t.title)}</b>${dur >= 30 ? `<span>${fmtTime(start)} – ${fmtTime(start + dur)}</span>` : ''}</div>`;
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
    <p class="muted small" style="margin:0 0 10px">Drag a task onto the calendar to time-block it, or tap Schedule. Drop a block here to unschedule it.</p>
    ${unscheduled.map((t) => `<div class="tray-item" draggable="true" data-drag="${t.id}" style="border-left-color:${listColor(t.listId)}">
      <div class="task-title" data-action="edit-task" data-id="${t.id}">${esc(t.title)}</div>
      <div class="row">${t.due ? `<span class="chip ${t.due < todayStr() ? 'overdue' : ''}">${dueLabel(t.due)}</span>` : ''}${t.priority === 'high' ? '<span class="chip prio-high">High</span>' : ''}
      <span class="spacer"></span><button class="btn sm" data-action="schedule-task" data-id="${t.id}">Schedule</button></div></div>`).join('') || '<div class="empty">Everything is scheduled.</div>'}
  </aside>`;
  const seg = ['day', 'week', 'month'].map((v) => `<button class="${ui.calView === v ? 'on' : ''}" data-action="cal-view" data-view="${v}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('');
  const toolbar = `<button class="btn icon" data-action="cal-step" data-dir="-1" aria-label="Previous">${ICONS.left}</button>
    <button class="btn" data-action="cal-today">Today</button>
    <button class="btn icon" data-action="cal-step" data-dir="1" aria-label="Next">${ICONS.right}</button>
    <div class="seg">${seg}</div>`;
  return pageHead('Calendar', calTitle(), toolbar) +
    `<div class="cal-layout">${tray}<div>${ui.calView === 'month' ? monthGrid() : timeGrid(calDays())}</div></div>`;
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
    `<button class="btn primary" data-action="new-task">${ICONS.plus} New task</button>`) + filters + `<div id="task-list">${taskListHtml()}</div>`;
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

  const kpi = (l, v) => `<div class="card kpi"><div class="l">${l}</div><div class="v">${v}</div></div>`;
  const seg = [['week', 'This week'], ['30d', 'Last 30 days']].map(([v, l]) => `<button class="${ui.hoursRange === v ? 'on' : ''}" data-action="hours-range" data-val="${v}">${l}</button>`).join('');

  return pageHead('Stats', 'How your days are adding up.') +
    `<div class="kpis">${kpi('Completed · 14 days', total)}${kpi('Daily average', (total / 14).toFixed(1))}${kpi('Blocked this week', fmtHours(weekBlocked))}${kpi('Habit consistency · 30 days', `${overall}%`)}</div>
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

    <section class="card"><h2>Data</h2><p class="muted small">Everything is stored in this browser. Export a backup to move it elsewhere.</p>
      <div class="row wrap">
        <button class="btn" data-action="export">Export JSON</button>
        <label class="btn">Import JSON<input type="file" accept="application/json" data-import hidden></label>
        <span class="spacer"></span>
        <button class="btn danger" data-action="reset">Reset demo data</button>
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
function closeModal() { $('#modal-root').innerHTML = ''; }
function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  $('#toasts').append(el);
  setTimeout(() => el.remove(), 2600);
}

const durOptions = (sel) => DURATIONS.map((d) => `<option value="${d}" ${d === sel ? 'selected' : ''}>${d < 60 ? `${d} min` : fmtHours(d).replace(' h', ' hr')}</option>`).join('');
const subRow = (s = { id: uid(), title: '', done: false }) => `<div class="sub-edit" data-sub-id="${s.id}">
  <input type="checkbox" class="check" data-sub-done ${s.done ? 'checked' : ''} aria-label="Done">
  <input class="input" data-sub-title value="${esc(s.title)}" placeholder="Subtask">
  <button type="button" class="btn icon ghost sm" data-action="remove-sub-row" aria-label="Remove">${ICONS.trash}</button></div>`;

function nextSlot() { return clamp(Math.ceil((nowMinutes() + 1) / 60) * 60, 0, 23 * 60); }

function openTaskModal(id, defaults = {}) {
  const t = id ? taskById(id) : { title: '', listId: state.lists[0].id, priority: 'none', due: null, notes: '', subtasks: [], block: null, ...defaults };
  if (!t) return;
  const b = t.block || { date: t.due || ui.calDate, start: nextSlot(), dur: 60 };
  openModal(`<form data-form="task" data-id="${id || ''}"><h2>${id ? 'Edit task' : 'New task'}</h2>
    <div class="fields">
      <label class="field full">Title<input class="input" name="title" required value="${esc(t.title)}"></label>
      <label class="field">List<select class="input" name="listId">${listOptions(t.listId)}</select></label>
      <label class="field">Priority<select class="input" name="priority">${Object.entries(PRIORITY).map(([v, l]) => `<option value="${v}" ${t.priority === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field">Due date<input class="input" type="date" name="due" value="${t.due || ''}"></label>
      <label class="field">Calendar<span class="row" style="height:36px;font-weight:500;color:var(--text)"><input type="checkbox" class="check" name="blocked" data-action="toggle-block-fields" ${t.block ? 'checked' : ''}> Time-block this task</span></label>
      <div class="full fields ${t.block ? '' : 'hidden'}" id="block-fields" style="grid-template-columns:repeat(3,minmax(0,1fr))">
        <label class="field">Date<input class="input" type="date" name="bdate" value="${b.date}"></label>
        <label class="field">Start<input class="input" type="time" name="bstart" step="900" value="${toHHMM(b.start)}"></label>
        <label class="field">Duration<select class="input" name="bdur">${durOptions(b.dur)}</select></label>
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
function openScheduleModal(id) {
  const t = taskById(id);
  const date = ui.calDate >= todayStr() ? ui.calDate : todayStr();
  openModal(`<form data-form="schedule" data-id="${id}"><h2>Schedule “${esc(t.title)}”</h2>
    <div class="fields" style="grid-template-columns:repeat(3,minmax(0,1fr))">
      <label class="field">Date<input class="input" type="date" name="date" value="${date}" required></label>
      <label class="field">Start<input class="input" type="time" name="start" step="900" value="${toHHMM(nextSlot())}" required></label>
      <label class="field">Duration<select class="input" name="dur">${durOptions(60)}</select></label>
    </div>
    <div class="modal-foot"><span class="spacer"></span><button type="button" class="btn" data-action="close-modal">Cancel</button><button class="btn primary">Schedule</button></div></form>`);
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
      notes: d.get('notes'), subtasks,
      block: d.get('blocked') ? { date: d.get('bdate') || todayStr(), start: fromHHMM(d.get('bstart') || '09:00'), dur: +d.get('bdur') } : null,
    };
    if (!fields.title) return;
    if (f.dataset.id) Object.assign(taskById(f.dataset.id), fields);
    else state.tasks.push({ id: uid(), done: false, doneAt: null, createdAt: Date.now(), ...fields });
    commit(f.dataset.id ? 'Task saved' : 'Task added');
  },
  schedule(f) {
    const d = new FormData(f);
    taskById(f.dataset.id).block = { date: d.get('date'), start: fromHHMM(d.get('start')), dur: +d.get('dur') };
    commit(`Scheduled for ${fmtDate(d.get('date'))} at ${fmtTime(fromHHMM(d.get('start')))}`);
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
  go: (el) => { location.hash = el.dataset.to; },
  lock: () => lock(),
  'close-modal': () => closeModal(),
  'modal-back': (el, e) => { if (e.target === el) closeModal(); },

  'new-task': () => openTaskModal(null, { due: currentView() === 'today' ? todayStr() : null }),
  'edit-task': (el) => openTaskModal(el.dataset.id),
  'delete-task': (el) => {
    const t = taskById(el.dataset.id);
    if (!t || !confirm(`Delete “${t.title}”?`)) return;
    state.tasks = state.tasks.filter((x) => x !== t);
    commit('Task deleted');
  },
  'toggle-task': (el) => {
    const t = taskById(el.dataset.id);
    t.done = !t.done;
    t.doneAt = t.done ? Date.now() : null;
    if (t.done) t.subtasks.forEach((s) => { s.done = true; });
    save(); render();
    if (t.done) toast('Nice — task completed');
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
  'open-day': (el) => { ui.calView = 'day'; ui.calDate = el.dataset.day; render(); },
  slot: (el, e) => {
    const r = el.getBoundingClientRect();
    const m = clamp(Math.floor(((e.clientY - r.top) / (r.height / 24)) * 2) * 30, 0, 23 * 60);
    openTaskModal(null, { due: el.dataset.day, block: { date: el.dataset.day, start: m, dur: 60 } });
  },

  'new-note': () => {
    const n = { id: uid(), title: '', body: '', listId: ui.noteList !== 'all' ? ui.noteList : '', updatedAt: Date.now() };
    state.notes.push(n);
    ui.activeNote = n.id; ui.noteQ = '';
    save(); render();
    $('.note-title')?.focus();
  },
  'open-note': (el) => { ui.activeNote = el.dataset.id; render(); },
  'delete-note': (el) => {
    if (!confirm('Delete this note?')) return;
    state.notes = state.notes.filter((n) => n.id !== el.dataset.id);
    ui.activeNote = null;
    commit('Note deleted');
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
    if (!confirm(`Delete habit “${h.name}” and its history?`)) return;
    state.habits = state.habits.filter((x) => x !== h);
    commit('Habit deleted');
  },
  'enable-notify': async () => {
    const p = await Notification.requestPermission();
    toast(p === 'granted' ? 'Reminders will pop up as notifications' : 'Reminders will show inside Daybook');
    render();
  },
  'new-goal': () => openGoalModal(null),
  'edit-goal': (el) => openGoalModal(el.dataset.id),
  'delete-goal': (el) => {
    if (!confirm('Delete this goal?')) return;
    state.goals = state.goals.filter((g) => g.id !== el.dataset.id);
    commit();
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
    if (state.lists.length < 2 || !confirm(`Delete list “${l.name}”? Its tasks move to another list.`)) return;
    state.lists = state.lists.filter((x) => x !== l);
    const fallback = state.lists[0].id;
    state.tasks.forEach((t) => { if (t.listId === l.id) t.listId = fallback; });
    state.notes.forEach((n) => { if (n.listId === l.id) n.listId = ''; });
    if (ui.taskF.list === l.id) ui.taskF.list = 'all';
    commit('List deleted');
  },
  export: () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `daybook-backup-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  },
  reset: () => {
    if (!confirm('Replace everything with the demo data? Your passcode is kept.')) return;
    const pin = state.passcode;
    state = seed();
    state.passcode = pin;
    commit('Demo data restored');
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
  if (e.key === 'Enter' && e.target.dataset.quickadd) {
    const title = e.target.value.trim();
    if (!title) return;
    state.tasks.push({ id: uid(), title, listId: state.lists[0].id, priority: 'none', due: todayStr(), done: false, doneAt: null, notes: '', subtasks: [], block: null, createdAt: Date.now() });
    save(); render();
    $('[data-quickadd]')?.focus();
  }
  if (e.key === 'Enter' && e.target.hasAttribute('data-new-list')) addList(e.target.value);
});

window.addEventListener('hashchange', () => { app.classList.remove('nav-open'); render(); window.scrollTo(0, 0); });

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
  drag = { id: t.id, dur: t.block?.dur || 60, offsetMin };
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

/* ---------- Boot ---------- */
render();
renderLock();
