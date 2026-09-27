#!/usr/bin/env node
// Daybook command-line tool for Claude Cowork.
// Reads and writes the same encrypted GitHub gist the Daybook web app syncs through,
// using the sync code from Daybook → Settings → Sync. Prints JSON. Node 18+, no dependencies.

import { webcrypto } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const subtle = webcrypto.subtle;
const API = process.env.DAYBOOK_API || 'https://api.github.com';
const CODE_FILE = 'daybook-sync-code.txt';
const KEY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PRIORITIES = ['none', 'low', 'med', 'high'];
const REPEATS = ['none', 'daily', 'weekdays', 'weekly', 'monthly'];
const REVIEW_SUBTASK = "Review Claude's draft";

/* ---------- small helpers ---------- */
class UserError extends Error {}
const fail = (msg) => { throw new UserError(msg); };
const uid = () => Math.random().toString(36).slice(2, 10);
const pad = (n) => String(n).padStart(2, '0');
const toHHMM = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
function fromHHMM(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim());
  if (!m || +m[1] > 23 || +m[2] > 59) fail(`Time must look like 14:30, got "${s}"`);
  return +m[1] * 60 + +m[2];
}
function checkDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s)) || Number.isNaN(Date.parse(`${s}T00:00:00Z`))) fail(`Date must look like 2026-10-02, got "${s}"`);
  return s;
}
// Dates are plain YYYY-MM-DD strings; arithmetic happens in UTC so DST never shifts a day.
const utc = (ds) => { const [y, m, d] = ds.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const ymdUTC = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const addDays = (ds, n) => { const d = utc(ds); d.setUTCDate(d.getUTCDate() + n); return ymdUTC(d); };
const weekday = (ds) => utc(ds).getUTCDay();
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

let TZ = process.env.DAYBOOK_TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;
function nowParts() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).map((p) => [p.type, p.value]));
  return { today: `${parts.year}-${parts.month}-${parts.day}`, minutes: +parts.hour * 60 + +parts.minute };
}
const today = () => nowParts().today;
const ymdOf = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));

/* ---------- arguments ---------- */
function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const key = a.slice(2);
    const next = argv[i + 1];
    const val = next === undefined || next.startsWith('--') ? true : (i++, next);
    if (key in out) out[key] = [].concat(out[key], val); else out[key] = val;
  }
  return out;
}
const list = (v) => (v === undefined ? [] : [].concat(v));
const text = (args, key) => {
  if (args[`${key}-file`]) return fs.readFileSync(args[`${key}-file`], 'utf8');
  return args[key] === true ? '' : args[key];
};

/* ---------- sync code & crypto (must match app.js) ---------- */
function normalizeKey(raw) {
  const chars = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (chars.length !== 24 || [...chars].some((c) => !KEY_ALPHABET.includes(c))) return null;
  return chars.match(/.{4}/g).join('-');
}
function parseCode(raw) {
  const [k, t] = String(raw || '').trim().split('~');
  const key = normalizeKey(k), token = (t || '').trim();
  if (!key || !/^(ghp_|github_pat_|gho_)[A-Za-z0-9_]{20,}$/.test(token)) {
    fail('That is not a Daybook sync code. Copy it from Daybook → Settings → Sync → Your sync code.');
  }
  return { key, token };
}
function findCodeFile(explicit) {
  const candidates = [explicit, path.join(process.cwd(), CODE_FILE), path.join(os.homedir(), `.${CODE_FILE}`)].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p));
}
function loadCode(args) {
  if (process.env.DAYBOOK_SYNC_CODE) return parseCode(process.env.DAYBOOK_SYNC_CODE);
  const file = findCodeFile(args['code-file']);
  if (!file) fail(`Not connected to Daybook yet. Run: daybook.mjs connect "<sync code>"`);
  return parseCode(fs.readFileSync(file, 'utf8'));
}
const utf8 = new TextEncoder();
async function derive(key) {
  const hash = new Uint8Array(await subtle.digest('SHA-256', utf8.encode(`daybook-vault-id:${key}`)));
  const hex = [...hash].map((b) => b.toString(16).padStart(2, '0')).join('');
  const base = await subtle.importKey('raw', utf8.encode(key), 'PBKDF2', false, ['deriveKey']);
  const aes = await subtle.deriveKey(
    { name: 'PBKDF2', salt: utf8.encode('daybook-vault-enc'), iterations: 200000, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  return { aes, file: `daybook-${hex.slice(0, 16)}.txt` };
}
async function encrypt(aes, json) {
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, aes, utf8.encode(json));
  return `v1.${Buffer.from(iv).toString('base64')}.${Buffer.from(ct).toString('base64')}`;
}
async function decrypt(aes, data) {
  const [, iv, ct] = data.trim().split('.');
  const plain = await subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(iv, 'base64') }, aes, Buffer.from(ct, 'base64'));
  return new TextDecoder().decode(plain);
}

/* ---------- GitHub gist storage ---------- */
async function gh(token, p, { method = 'GET', body } = {}) {
  const res = await fetch(`${API}${p}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'User-Agent': 'daybook-cowork',
      'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body && JSON.stringify(body),
  }).catch(() => fail('Could not reach GitHub. Check the internet connection and that api.github.com is allowed.'));
  if (res.status === 401) fail('GitHub rejected the token in the sync code. Make a new sync code in Daybook (Settings → Sync) and reconnect.');
  if (!res.ok) fail(`GitHub returned ${res.status} for ${method} ${p}`);
  return res.json();
}
class Vault {
  static async open(args) {
    const { key, token } = loadCode(args);
    const v = new Vault();
    Object.assign(v, { token }, await derive(key));
    for (let page = 1; page <= 10 && !v.gistId; page++) {
      const gists = await gh(token, `/gists?per_page=100&page=${page}`);
      v.gistId = gists.find((g) => g.files && g.files[v.file])?.id;
      if (gists.length < 100) break;
    }
    if (!v.gistId) fail('No Daybook data matches this sync code. Copy a fresh code from Daybook → Settings → Sync.');
    return v;
  }
  async readRaw() {
    const g = await gh(this.token, `/gists/${this.gistId}`);
    const f = g.files[this.file];
    if (!f) fail('The Daybook sync file is missing from the gist.');
    const content = f.truncated ? await (await fetch(f.raw_url)).text() : f.content;
    return decrypt(this.aes, content);
  }
  async read() {
    const json = await this.readRaw();
    const state = normalize(JSON.parse(json));
    if (state.settings.timeZone && !process.env.DAYBOOK_TZ) TZ = state.settings.timeZone;
    return { state, json };
  }
  async write(state) {
    const content = await encrypt(this.aes, JSON.stringify(state));
    await gh(this.token, `/gists/${this.gistId}`, { method: 'PATCH', body: { files: { [this.file]: { content } } } });
  }
  // Read, change, and write back — re-checking just before the write so an edit made
  // on a device in the meantime is never overwritten; the change is replayed on top of it.
  async mutate(fn) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const { state, json } = await this.read();
      const result = fn(state);
      if ((await this.readRaw()) !== json) continue;
      await this.write(state);
      return result;
    }
    fail('Daybook kept changing on another device while saving. Try again in a moment.');
  }
}
function normalize(s) {
  s.settings = { dayStart: '08:00', dayEnd: '22:00', ...(s.settings || {}) };
  for (const k of ['lists', 'tasks', 'notes', 'habits', 'goals', 'busy', 'pomodoros']) if (!Array.isArray(s[k])) s[k] = [];
  if (!s.lists.length) s.lists.push({ id: 'l-inbox', name: 'Inbox', color: 1 });
  s.focus = s.focus || {};
  s.tasks.forEach((t) => { t.subtasks = t.subtasks || []; t.repeat = t.repeat || 'none'; t.priority = t.priority || 'none'; });
  s.habits.forEach((h) => { h.log = h.log || {}; });
  return s;
}

/* ---------- auto-sorting into lists (mirrors detectList in app.js) ---------- */
const escapeRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function detectList(title, lists) {
  const text = ` ${String(title).toLowerCase().replace(/\bwork(?:ing)? on\b/g, ' ')} `;
  let best = null;
  for (const l of lists) {
    for (const raw of l.keywords || []) {
      const k = raw.trim().toLowerCase();
      if (!k) continue;
      const m = new RegExp(`(^|[^a-z0-9])${escapeRe(k)}s?(?=[^a-z0-9]|$)`).exec(text);
      if (!m) continue;
      const cand = { l, rank: l.kind === 'subject' ? 0 : 1, pos: m.index, len: k.length };
      if (!best || cand.rank < best.rank || (cand.rank === best.rank && (cand.pos < best.pos || (cand.pos === best.pos && cand.len > best.len)))) best = cand;
    }
  }
  return best ? best.l : null;
}

/* ---------- lookups & views ---------- */
function byId(arr, id, what) {
  const hit = arr.find((x) => x.id === id);
  if (!hit) fail(`No ${what} with id "${id}". List them first to get the id.`);
  return hit;
}
function listByName(s, name) {
  if (!name || name === true) return null;
  const n = String(name).toLowerCase();
  const l = s.lists.find((x) => x.name.toLowerCase() === n) || s.lists.find((x) => x.name.toLowerCase().startsWith(n));
  if (!l) fail(`No list called "${name}". Lists: ${s.lists.map((x) => x.name).join(', ')}`);
  return l;
}
const listName = (s, id) => s.lists.find((l) => l.id === id)?.name || null;
function taskView(s, t, full = false) {
  const v = {
    id: t.id, title: t.title, list: listName(s, t.listId), priority: t.priority, due: t.due || null,
    done: t.done, ...(t.est ? { estimate_min: t.est } : {}),
    ...(t.block ? { scheduled: { date: t.block.date, start: toHHMM(t.block.start), end: toHHMM(t.block.start + t.block.dur), minutes: t.block.dur } } : {}),
    ...(t.repeat !== 'none' ? { repeat: t.repeat } : {}),
    ...(t.parentId ? { session_of: s.tasks.find((x) => x.id === t.parentId)?.title || null } : {}),
    subtasks: t.subtasks.map((x) => ({ id: x.id, title: x.title, done: x.done })),
    ...(t.subtasks.some((x) => x.title.startsWith(REVIEW_SUBTASK)) ? { claude_draft: true } : {}),
  };
  if (full || t.notes) v.notes = t.notes || '';
  return v;
}
const PRIO_RANK = { high: 0, med: 1, low: 2, none: 3 };
function taskSort(a, b) {
  if (a.done !== b.done) return a.done ? 1 : -1;
  if ((a.due || '9') !== (b.due || '9')) return (a.due || '9') < (b.due || '9') ? -1 : 1;
  return PRIO_RANK[a.priority] - PRIO_RANK[b.priority];
}

/* ---------- scheduling (mirrors app.js) ---------- */
const busyOn = (s, ds) => s.busy.filter((b) => b.days.includes(weekday(ds)));
function occupied(s, ds, excludeId) {
  return [
    ...s.tasks.filter((t) => t.block && t.block.date === ds && t.id !== excludeId).map((t) => ({ start: t.block.start, end: t.block.start + t.block.dur })),
    ...busyOn(s, ds).map((b) => ({ start: b.start, end: b.end })),
  ].sort((a, b) => a.start - b.start);
}
function findSlot(s, dur, fromDate, fromMin = 0, { excludeId, days = 14 } = {}) {
  const dayStart = fromHHMM(s.settings.dayStart), dayEnd = fromHHMM(s.settings.dayEnd);
  const { today: T, minutes: now } = nowParts();
  if (!fromDate || fromDate < T) { fromDate = T; fromMin = 0; }
  for (let i = 0; i < days; i++) {
    const ds = addDays(fromDate, i);
    let start = Math.max(dayStart, i === 0 ? fromMin : 0, ds === T ? now : 0);
    start = Math.ceil(start / 15) * 15;
    for (const o of occupied(s, ds, excludeId)) {
      if (o.end <= start) continue;
      if (o.start - start >= dur) break;
      start = Math.ceil(o.end / 15) * 15;
    }
    if (start + dur <= dayEnd) return { date: ds, start };
  }
  return null;
}
function stepDate(ds, repeat) {
  if (repeat === 'daily') return addDays(ds, 1);
  if (repeat === 'weekly') return addDays(ds, 7);
  if (repeat === 'weekdays') { let d = addDays(ds, 1); while ([0, 6].includes(weekday(d))) d = addDays(d, 1); return d; }
  const d = utc(ds), day = d.getUTCDate();
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + 1);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return ymdUTC(d);
}
function completeTask(s, t) {
  t.done = true;
  t.doneAt = Date.now();
  t.subtasks.forEach((x) => { x.done = true; });
  // A split session ticks its line in the parent task, as the app does.
  const parentSub = t.parentId && s.tasks.find((x) => x.id === t.parentId)?.subtasks.find((x) => x.id === t.subId);
  if (parentSub) parentSub.done = true;
  if (t.repeat === 'none' || s.tasks.some((x) => x.id === t.nextId)) return null;
  const base = t.due || t.block?.date || today();
  let next = stepDate(base, t.repeat);
  while (next <= today()) next = stepDate(next, t.repeat);
  const shift = Math.round((utc(next) - utc(base)) / 86400000);
  const copy = {
    ...t, id: uid(), done: false, doneAt: null, nextId: null, createdAt: Date.now(),
    subtasks: t.subtasks.map((x) => ({ ...x, id: uid(), done: false })),
    due: t.due ? next : null, block: t.block ? { ...t.block, date: addDays(t.block.date, shift) } : null,
  };
  t.nextId = copy.id;
  s.tasks.push(copy);
  return copy;
}
function streak(h) {
  let d = today();
  if (!h.log[d]) d = addDays(d, -1);
  let n = 0;
  while (h.log[d]) { n++; d = addDays(d, -1); }
  return n;
}

/* ---------- field application shared by add-task and update-task ---------- */
function applyTaskFields(s, t, args) {
  if (typeof args.title === 'string') t.title = args.title.trim();
  if (args.list) t.listId = listByName(s, args.list).id;
  if (args.priority) { if (!PRIORITIES.includes(args.priority)) fail(`Priority must be one of ${PRIORITIES.join(', ')}`); t.priority = args.priority; }
  if (args.due) t.due = args.due === 'none' ? null : checkDate(args.due);
  if (args.estimate) t.est = args.estimate === 'none' ? null : Math.max(5, parseInt(args.estimate, 10) || fail('--estimate is minutes, like 45'));
  if (args.repeat) { if (!REPEATS.includes(args.repeat)) fail(`Repeat must be one of ${REPEATS.join(', ')}`); t.repeat = args.repeat; }
  const notes = text(args, 'notes');
  if (typeof notes === 'string') t.notes = notes;
  const append = text(args, 'append-notes');
  if (typeof append === 'string') t.notes = [t.notes, append].filter(Boolean).join('\n\n');
  for (const title of list(args['add-subtask'])) t.subtasks.push({ id: uid(), title: String(title), done: false });
  for (const ref of list(args['complete-subtask'])) {
    const sub = t.subtasks.find((x) => x.id === ref || x.title.toLowerCase() === String(ref).toLowerCase());
    if (!sub) fail(`No subtask "${ref}" on "${t.title}"`);
    sub.done = true;
  }
  if (args.unschedule) t.block = null;
  if (args.date || args.time) {
    const dur = args.minutes ? parseInt(args.minutes, 10) : t.block?.dur || t.est || 60;
    const date = args.date ? checkDate(args.date) : t.block?.date || t.due || today();
    const start = args.time ? fromHHMM(args.time) : t.block?.start ?? fromHHMM(s.settings.dayStart);
    t.block = { date, start, dur };
  }
  if (!t.title) fail('A task needs a title');
}

/* ---------- commands ---------- */
const COMMANDS = {
  async connect(args) {
    const raw = args._[1] || fail('Usage: connect "<sync code>" [--save <file>]');
    parseCode(raw);
    process.env.DAYBOOK_SYNC_CODE = raw.trim();
    const v = await Vault.open(args);
    const { state } = await v.read();
    const file = args.save && args.save !== true ? args.save : path.join(process.cwd(), CODE_FILE);
    fs.writeFileSync(file, `${raw.trim()}\n`, { mode: 0o600 });
    return { connected: true, saved_to: file, tasks: state.tasks.length, open_tasks: state.tasks.filter((t) => !t.done).length, lists: state.lists.map((l) => l.name) };
  },

  async summary(args, v) {
    const { state: s } = await v.read();
    const T = args.date && args.date !== true ? checkDate(args.date) : today();
    const schedule = [
      ...s.tasks.filter((t) => t.block?.date === T).map((t) => ({ start: toHHMM(t.block.start), end: toHHMM(t.block.start + t.block.dur), title: t.title, task_id: t.id, done: t.done })),
      ...busyOn(s, T).map((b) => ({ start: toHHMM(b.start), end: toHHMM(b.end), title: b.title, busy: true })),
    ].sort((a, b) => (a.start < b.start ? -1 : 1));
    const open = s.tasks.filter((t) => !t.done);
    return {
      date: T, weekday: WEEKDAYS[weekday(T)], time_zone: TZ, now: T === today() ? toHHMM(nowParts().minutes) : undefined,
      focus: s.focus[T] || null,
      overdue: open.filter((t) => t.due && t.due < T).sort(taskSort).map((t) => taskView(s, t)),
      due_today: open.filter((t) => t.due === T).sort(taskSort).map((t) => taskView(s, t)),
      due_next_7_days: open.filter((t) => t.due > T && t.due <= addDays(T, 7)).sort(taskSort).map((t) => taskView(s, t)),
      missed_blocks: open.filter((t) => t.block && t.block.date < T).map((t) => taskView(s, t)),
      schedule,
      habits: s.habits.map((h) => ({ id: h.id, name: h.name, done_today: !!h.log[T], streak_days: streak(h), weekly_goal: h.goal })),
      goals: s.goals.map((g) => ({ id: g.id, title: g.title, current: g.current, target: g.target, unit: g.unit })),
      open_tasks: open.length, unscheduled_open_tasks: open.filter((t) => !t.block).length,
    };
  },

  async tasks(args, v) {
    const { state: s } = await v.read();
    const status = args.status || 'open';
    const lid = args.list ? listByName(s, args.list).id : null;
    const q = typeof args.search === 'string' ? args.search.toLowerCase() : null;
    return s.tasks.filter((t) => (status === 'all' || (status === 'done') === t.done)
      && (!lid || t.listId === lid)
      && (!args['due-by'] || (t.due && t.due <= args['due-by']))
      && (!q || [t.title, t.notes || '', ...t.subtasks.map((x) => x.title)].some((x) => x.toLowerCase().includes(q))))
      .sort(taskSort).map((t) => taskView(s, t));
  },

  async task(args, v) {
    const { state: s } = await v.read();
    return taskView(s, byId(s.tasks, args._[1], 'task'), true);
  },

  async 'add-task'(args, v) {
    if (typeof args.title !== 'string') fail('Usage: add-task --title "..." [--due YYYY-MM-DD] [--date YYYY-MM-DD --time HH:MM --minutes N] [--list name] [--priority high|med|low] [--estimate N] [--repeat weekly] [--notes "..."] [--add-subtask "..."]');
    return v.mutate((s) => {
      const t = { id: uid(), title: '', listId: s.lists[0].id, priority: 'none', due: null, done: false, doneAt: null, notes: '', subtasks: [], block: null, repeat: 'none', est: null, createdAt: Date.now(), createdBy: 'claude' };
      applyTaskFields(s, t, args);
      if (!args.list) t.listId = (detectList(t.title, s.lists) || s.lists[0]).id; // same auto-sorting as the app
      if (t.repeat !== 'none' && !t.due && !t.block) t.due = today();
      if (args['next-free']) {
        const slot = findSlot(s, t.est || 60, today()) || fail('No free gap in the next 2 weeks within day hours.');
        t.block = { date: slot.date, start: slot.start, dur: t.est || 60 };
      }
      s.tasks.push(t);
      return { added: taskView(s, t) };
    });
  },

  async 'update-task'(args, v) {
    const id = args._[1] || fail('Usage: update-task <id> [fields…] [--done] [--undone]');
    return v.mutate((s) => {
      const t = byId(s.tasks, id, 'task');
      applyTaskFields(s, t, args);
      let next = null;
      if (args.done && !t.done) next = completeTask(s, t);
      if (args.undone) { t.done = false; t.doneAt = null; }
      return { updated: taskView(s, t, true), ...(next ? { next_occurrence: taskView(s, next) } : {}) };
    });
  },

  async schedule(args, v) {
    const id = args._[1] || fail('Usage: schedule <id> (--next-free [--from YYYY-MM-DD] [--after HH:MM] | --date YYYY-MM-DD --time HH:MM) [--minutes N]');
    return v.mutate((s) => {
      const t = byId(s.tasks, id, 'task');
      const dur = args.minutes ? parseInt(args.minutes, 10) : t.block?.dur || t.est || 60;
      if (args['next-free']) {
        const from = args.from ? checkDate(args.from) : today();
        const slot = findSlot(s, dur, from, args.after ? fromHHMM(args.after) : 0, { excludeId: t.id })
          || fail(`No free ${dur}-minute gap in the next 2 weeks within day hours (${s.settings.dayStart}–${s.settings.dayEnd}).`);
        t.block = { date: slot.date, start: slot.start, dur };
      } else {
        if (!args.date || !args.time) fail('Give --next-free, or both --date and --time');
        t.block = { date: checkDate(args.date), start: fromHHMM(args.time), dur };
      }
      const clash = occupied(s, t.block.date, t.id).find((o) => o.start < t.block.start + dur && o.end > t.block.start);
      return { scheduled: taskView(s, t), ...(clash ? { warning: `Overlaps something from ${toHHMM(clash.start)} to ${toHHMM(clash.end)}` } : {}) };
    });
  },

  async 'free-slots'(args, v) {
    const { state: s } = await v.read();
    const dur = parseInt(args.minutes || 60, 10);
    const out = [];
    let from = args.date ? checkDate(args.date) : today(), fromMin = 0;
    const count = parseInt(args.count || 5, 10);
    while (out.length < count) {
      const slot = findSlot(s, dur, from, fromMin, { days: args.date ? 1 : 14 });
      if (!slot || (args.date && slot.date !== args.date)) break;
      out.push({ date: slot.date, weekday: WEEKDAYS[weekday(slot.date)], start: toHHMM(slot.start), end: toHHMM(slot.start + dur) });
      from = slot.date; fromMin = slot.start + dur;
    }
    return { minutes: dur, day_hours: `${s.settings.dayStart}–${s.settings.dayEnd}`, slots: out };
  },

  async 'delete-task'(args, v) {
    const id = args._[1] || fail('Usage: delete-task <id>');
    return v.mutate((s) => {
      const t = byId(s.tasks, id, 'task');
      s.tasks = s.tasks.filter((x) => x !== t);
      return { deleted: t.title };
    });
  },

  async notes(args, v) {
    const { state: s } = await v.read();
    const q = typeof args.search === 'string' ? args.search.toLowerCase() : null;
    const lid = args.list ? listByName(s, args.list).id : null;
    return s.notes.filter((n) => (!lid || n.listId === lid) && (!q || `${n.title}\n${n.body}`.toLowerCase().includes(q)))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((n) => ({ id: n.id, title: n.title, list: listName(s, n.listId), updated: new Date(n.updatedAt).toISOString(), preview: n.body.slice(0, 140) }));
  },

  async note(args, v) {
    const { state: s } = await v.read();
    const n = byId(s.notes, args._[1], 'note');
    return { id: n.id, title: n.title, list: listName(s, n.listId), body: n.body };
  },

  async 'add-note'(args, v) {
    const body = text(args, 'body');
    if (typeof args.title !== 'string' || typeof body !== 'string') fail('Usage: add-note --title "..." (--body "..." | --body-file path) [--list name]');
    return v.mutate((s) => {
      const n = { id: uid(), title: args.title.trim(), body, listId: args.list ? listByName(s, args.list).id : '', updatedAt: Date.now() };
      s.notes.push(n);
      return { added: { id: n.id, title: n.title } };
    });
  },

  async 'update-note'(args, v) {
    const id = args._[1] || fail('Usage: update-note <id> [--title "..."] [--body "..." | --body-file path] [--append "..." | --append-file path]');
    return v.mutate((s) => {
      const n = byId(s.notes, id, 'note');
      if (typeof args.title === 'string') n.title = args.title;
      const body = text(args, 'body');
      if (typeof body === 'string') n.body = body;
      const append = text(args, 'append');
      if (typeof append === 'string') n.body = [n.body, append].filter(Boolean).join('\n\n');
      n.updatedAt = Date.now();
      return { updated: { id: n.id, title: n.title } };
    });
  },

  async 'delete-note'(args, v) {
    const id = args._[1] || fail('Usage: delete-note <id>');
    return v.mutate((s) => {
      const n = byId(s.notes, id, 'note');
      s.notes = s.notes.filter((x) => x !== n);
      return { deleted: n.title };
    });
  },

  // Saves work-ahead output: a note with the draft, linked from the task, plus a review subtask.
  async 'attach-draft'(args, v) {
    const id = args._[1];
    const body = text(args, 'body');
    if (!id || typeof body !== 'string') fail('Usage: attach-draft <task id> (--body "..." | --body-file path) [--title "..."]');
    return v.mutate((s) => {
      const t = byId(s.tasks, id, 'task');
      const title = typeof args.title === 'string' ? args.title : `Claude: ${t.title}`;
      const existing = s.notes.find((n) => n.title === title);
      const n = existing || { id: uid(), title, body: '', listId: t.listId, updatedAt: 0 };
      n.body = body;
      n.updatedAt = Date.now();
      if (!existing) s.notes.push(n);
      const pointer = `Claude drafted this. See the note “${title}”.`;
      if (!(t.notes || '').includes(pointer)) t.notes = [t.notes, pointer].filter(Boolean).join('\n\n');
      if (!t.subtasks.some((x) => x.title.startsWith(REVIEW_SUBTASK))) t.subtasks.push({ id: uid(), title: REVIEW_SUBTASK, done: false });
      return { note: { id: n.id, title }, task: taskView(s, t) };
    });
  },

  async habits(args, v) {
    const { state: s } = await v.read();
    const T = today();
    return s.habits.map((h) => ({
      id: h.id, name: h.name, weekly_goal: h.goal, reminder: h.reminder || null, done_today: !!h.log[T], streak_days: streak(h),
      last_7_days: Array.from({ length: 7 }, (_, i) => addDays(T, i - 6)).map((d) => ({ date: d, done: !!h.log[d] })),
    }));
  },

  async 'check-habit'(args, v) {
    const ref = args._[1] || fail('Usage: check-habit <name or id> [--date YYYY-MM-DD] [--undo]');
    return v.mutate((s) => {
      const r = ref.toLowerCase();
      const h = s.habits.find((x) => x.id === ref || x.name.toLowerCase() === r) || s.habits.find((x) => x.name.toLowerCase().includes(r))
        || fail(`No habit "${ref}". Habits: ${s.habits.map((x) => x.name).join(', ')}`);
      const d = args.date ? checkDate(args.date) : today();
      if (args.undo) delete h.log[d]; else h.log[d] = true;
      return { habit: h.name, date: d, done: !!h.log[d], streak_days: streak(h) };
    });
  },

  async focus(args, v) {
    const words = args._.slice(1).join(' ').trim();
    const d = args.date ? checkDate(args.date) : today();
    if (!words) { const { state: s } = await v.read(); return { date: d, focus: s.focus[d] || null }; }
    return v.mutate((s) => { s.focus[d] = words; return { date: d, focus: words }; });
  },

  async goals(args, v) {
    const { state: s } = await v.read();
    return s.goals.map((g) => ({ id: g.id, title: g.title, current: g.current, target: g.target, unit: g.unit, percent: Math.round((g.current / g.target) * 100) }));
  },

  async 'update-goal'(args, v) {
    const id = args._[1] || fail('Usage: update-goal <id> (--add N | --set N)');
    return v.mutate((s) => {
      const g = byId(s.goals, id, 'goal');
      if (args.set !== undefined) g.current = Math.max(0, Number(args.set));
      if (args.add !== undefined) g.current = Math.max(0, g.current + Number(args.add));
      return { goal: g.title, current: g.current, target: g.target };
    });
  },

  async lists(args, v) {
    const { state: s } = await v.read();
    return {
      lists: s.lists.map((l) => ({ name: l.name, kind: l.kind || 'category', sorting_words: l.keywords || [], open_tasks: s.tasks.filter((t) => t.listId === l.id && !t.done).length })),
      busy_times: s.busy.map((b) => ({ title: b.title, days: b.days.map((d) => WEEKDAYS[d]), start: toHHMM(b.start), end: toHHMM(b.end) })),
      day_hours: `${s.settings.dayStart}–${s.settings.dayEnd}`, time_zone: TZ,
    };
  },

  async 'completed'(args, v) {
    const { state: s } = await v.read();
    const since = args.since ? checkDate(args.since) : addDays(today(), -7);
    return s.tasks.filter((t) => t.done && t.doneAt && ymdOf(t.doneAt) >= since)
      .sort((a, b) => b.doneAt - a.doneAt).map((t) => ({ ...taskView(s, t), completed: ymdOf(t.doneAt) }));
  },
};

const HELP = `Daybook tool. Commands (all print JSON):
  connect "<sync code>" [--save file]    Save the sync code and test it
  summary [--date D]                     Today at a glance: overdue, due, schedule, habits, goals
  tasks [--status open|done|all] [--list L] [--due-by D] [--search Q]
  task <id>                              One task in full
  add-task --title T [--due D] [--date D --time HH:MM --minutes N | --next-free]
           [--list L] [--priority high|med|low] [--estimate N] [--repeat daily|weekdays|weekly|monthly]
           [--notes T | --notes-file F] [--add-subtask T]...
  update-task <id> [same fields] [--append-notes T] [--complete-subtask S] [--unschedule] [--done] [--undone] [--due none]
  schedule <id> (--next-free [--from D] [--after HH:MM] | --date D --time HH:MM) [--minutes N]
  free-slots [--date D] [--minutes N] [--count N]
  delete-task <id>
  notes [--search Q] [--list L]  |  note <id>
  add-note --title T (--body T | --body-file F) [--list L]
  update-note <id> [--title T] [--body T | --body-file F] [--append T | --append-file F]
  delete-note <id>
  attach-draft <task id> (--body T | --body-file F) [--title T]
  habits  |  check-habit <name> [--date D] [--undo]
  focus [text…] [--date D]
  goals  |  update-goal <id> (--add N | --set N)
  lists                                  Lists, busy times, day hours, time zone
  completed [--since D]
Dates are YYYY-MM-DD, times are 24-hour HH:MM in the Daybook owner's time zone.`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  if (!cmd || cmd === 'help' || args.help) { console.log(HELP); return; }
  const run = COMMANDS[cmd] || fail(`Unknown command "${cmd}". Run with "help" to see commands.`);
  const vault = cmd === 'connect' ? null : await Vault.open(args);
  if (vault) await vault.read(); // loads the owner's time zone before any date math
  const result = await run(args, vault);
  console.log(JSON.stringify(result, null, 2));
}
main().catch((e) => {
  console.error(JSON.stringify({ error: e instanceof UserError ? e.message : `Unexpected error: ${e.message}` }));
  process.exitCode = 1;
});
