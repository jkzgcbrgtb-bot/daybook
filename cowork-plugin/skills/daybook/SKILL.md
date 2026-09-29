---
name: daybook
description: Reads and updates the user's Daybook planner (tasks, time-blocked calendar, notes, habits, goals, focus line). Use when the user mentions Daybook, their tasks, to-dos, homework, what's due, their schedule or calendar, habits, or asks to add, move, schedule, check off, or look up something in their planner, for example "add bio lab due Thursday", "what's due this week?", "find me an hour for my essay", "check off reading", or "what's on today?".
---

# Daybook

Daybook is the user's personal planner. Its data syncs, encrypted, through a private GitHub gist. The `daybook.mjs` tool reads and writes that data exactly as the user's devices do, so changes appear on their phone and computers within about 15 seconds.

Run every command with Node 18 or newer:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/daybook.mjs" <command> [options]
```

Every command prints JSON on success, or `{"error": "..."}` on stderr with a non-zero exit. Relay errors to the user in plain words, since they are written to be read as-is. Run `help` for the full command list.

## First-time connection

If a command fails with "Not connected to Daybook yet":

1. Ask the user for their sync code. They'll find it in Daybook → Settings → Sync → **Copy** next to "Your sync code". It looks like `ABCD-EFGH-JKLM-NPQR-STUV-WXYZ~ghp_…`.
2. Run `connect "<code>"`. This saves the code to `daybook-sync-code.txt` in the current working folder (readable only by the user) and confirms it works.
3. Tell the user it's connected, and that the code file stays in this folder. Anyone with that file can read their Daybook, so they shouldn't share the folder.

Never print, repeat, or summarize the sync code back to the user or into any file other than the code file. If no folder is available to save into, pass the code for the session with the environment variable `DAYBOOK_SYNC_CODE` instead.

## Tasks vs. events

- **Task:** something to do, which gets checked off (homework, "email coach", "clean room"). Tasks live in lists and can also be time-blocked on the calendar.
- **Event:** something that happens at a set time (a tennis match, dentist, class trip, party, game). Events only sit on the calendar: no checkbox, never crossed off, not in task lists.

When the user says something *happens* at a time, add an event. When it's something they need to *do*, add a task, time-blocked if they gave a time. If it's unclear, ask.

## Commands

| Goal | Command |
|---|---|
| Today at a glance | `summary` (or `summary --date 2026-10-02`) |
| Find tasks | `tasks` · `tasks --status all` · `tasks --list School` · `tasks --due-by 2026-10-05` · `tasks --search essay` |
| One task in full | `task <id>` |
| Add a task | `add-task --title "Bio lab report" --due 2026-10-01 --estimate 90 --priority high --list School --add-subtask "Collect data"` |
| Add and time-block | add `--date 2026-10-01 --time 16:00 --minutes 90`, or `--next-free` for the first open gap |
| Change a task | `update-task <id> --due 2026-10-03 --priority med --append-notes "…" --complete-subtask "Collect data"` |
| Check off / reopen | `update-task <id> --done` · `update-task <id> --undone` |
| Schedule an existing task | `schedule <id> --next-free` · `schedule <id> --next-free --from 2026-10-01 --after 15:00` · `schedule <id> --date 2026-10-01 --time 16:00` |
| Unschedule | `update-task <id> --unschedule` |
| Open time | `free-slots --minutes 60` · `free-slots --date 2026-10-01 --minutes 30` |
| Events | `events` · `add-event --title "Tennis match vs Central" --date 2026-10-02 --time 16:00 --end 18:00` · `update-event <id> --time 17:00` |
| Notes | `notes --search biology` · `note <id>` · `add-note --title "…" --body-file draft.md --list School` · `update-note <id> --append "…"` |
| Habits | `habits` · `check-habit "read"` · `check-habit "read" --undo` |
| Focus line | `focus` (read) · `focus Finish the bio lab` (set) |
| Goals | `goals` · `update-goal <id> --add 1` |
| Lists, class times, day hours | `lists` |
| Recently finished | `completed --since 2026-09-20` |

For long text (notes, drafts), write it to a file first and pass `--body-file`, `--notes-file` or `--append-file`, instead of putting it on the command line.

## How to act

- **Dates and times:** convert what the user says ("Thursday", "after school", "tonight") into `YYYY-MM-DD` and 24-hour `HH:MM` in their time zone. `summary` and `lists` report the time zone, today's date, and the current time. Check the weekday before using a date.
- **Look before adding.** Search `tasks --search` first so you don't create a duplicate. If a similar task exists, ask whether to update it instead.
- **Scheduling:** prefer `--next-free` or `free-slots`, which respect the user's class timetable ("busy times") and day hours. If a `schedule` result includes a `warning` about an overlap, tell the user.
- **Lists and colors:** each list is a color category. School subjects (Math, English, Latin, Law, APES, APUSH) have kind `subject`, general school work is `School`, and the rest are Work, Golf, Tennis, Lift, Routine and Inbox. Leave out `--list` when adding. The tool sorts the task by its title the same way the app does, and a subject beats everything else. Pass `--list` only when the user names a list, or when the title wouldn't reveal it (for example "read ch. 5" for Latin: use `--list Latin`). `lists` shows each list's sorting words.
- **Split sessions:** tasks with `session_of` are sessions of a bigger task, split in the app. Checking off a session ticks its line in the parent automatically. Don't schedule the parent task itself while it has sessions.
- **Habits:** a habit runs on specific days (`schedule` like "Mon, Wed, Fri") or a number of times per week. `summary` lists only the habits due today. Streaks skip rest days. Ticking a habit on a rest day counts as a bonus and never breaks anything.
- **Estimates:** when the user says how long something takes, pass `--estimate` in minutes. Scheduling uses it as the block length.
- **Adding and editing** tasks, notes, schedule blocks, habits and the focus line is allowed without asking first, but only for what the user asked for or what the work-ahead skill calls for.
- **Deleting** (`delete-task`, `delete-event`, `delete-note`) always needs the user's explicit OK in this conversation first. Say exactly what will be deleted.
- **Checking off tasks:** only mark a task done when the user says it's done. Never mark a task done because you drafted work for it; use the work-ahead flow instead.
- **Afterward,** confirm what changed in one or two short lines, with dates written naturally ("Thursday Oct 1 at 4 PM"), and don't show ids.
