# Daybook

A local-first productivity app: plain HTML, CSS and JavaScript. No build step and no dependencies.

## Run it

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

The default passcode is **1234**. You can change it in Settings → Security.

## Features

- **Lock screen**: the app stays blurred behind a passcode keypad. A wrong code shakes the dots and shows an error, and 5 misses trigger a 30-second cooldown. You can lock from the sidebar, the mobile top bar, or Settings.
- **Today**: focus line, a focus timer (25-minute focus sessions with 5- and 15-minute breaks, optionally linked to a task), today's time blocks (the current one is highlighted), due and overdue tasks with subtasks, quick add, habit check-offs, and goal progress bars.
- **Calendar**: day, week and month views. Drag an unscheduled task onto the grid to time-block it, or press **Schedule** on touch devices. Drag blocks to move them, or drop one back on the tray to unschedule it. Click a block to edit it, or an empty slot to create a task.
- **Tasks vs. events**:
  - **Tasks** live in lists, can be time-blocked, and get checked off. Scheduled tasks have a check circle right on their calendar block.
  - **Events** are added by clicking an empty time or with **New event** (for example a match, an appointment or a party). They only sit on the calendar: no checkbox, never crossed off, not in task lists.
  - Events can repeat (every day, weekday, week, 2 weeks or month), optionally until a date, and single dates can be skipped.
  - Both block time for Next free slot and Plan my day, and either can be turned into the other.
- **Scheduling helpers**:
  - Quick add understands plain English, like `essay fri 3pm 2h #school !high every week`, and shows a preview as you type.
  - Tasks can have a time estimate.
  - **Next free slot** (⚡) finds the first gap that fits, within your day hours and around your busy times.
  - The Schedule dialog has quick picks (In 1 hour, This afternoon, Tonight, Tomorrow) and **Pick on calendar**, which works on phones.
  - Drag a block's bottom edge to resize it.
  - When blocks overlap, they split the width evenly (any number at once). Drag a block's side edge to give it more or less of the width, and double-click the edge to split evenly again.
  - A block's Move options are +1 hour, Later today, Next day and Next free slot.
  - **Not finished yet** on Today reschedules missed blocks in one tap.
  - Every automatic change can be undone from its notification.
- **Color categories**: every list has a color and sorting words. New tasks (quick add, the task editor, or Cowork) go to the list whose word appears in the title. School subjects win over everything else, so "math test" goes to Math, and "work on" never counts as Work. The defaults are School, the subjects Math, English, Latin, Law, APES and APUSH, and the categories Work, Golf, Tennis, Lift and Routine, all editable in Settings → Lists & colors. Colors show as stripes on task rows, calendar blocks and the schedule, with a color key on the Calendar page.
- **Plan my day** (Today and Calendar): fills free time today or tomorrow with the most important unscheduled tasks. Overdue comes first, then the soonest due, then priority. Tasks fit around busy times and existing blocks, with 10-minute breaks, and important tasks that don't fit are listed. You get a preview where you can untick tasks, and Undo afterwards.
- **Split into sessions** (in a task): spreads a big task over the days before it's due as separate session tasks, each placed in free time. Checking off a session ticks it in the main task.
- **Time tracking**: the focus timer logs time against the linked task, including sessions stopped early, and auto-links whatever is on the calendar right now. Tasks show time spent. Stats compares estimates with actual time per list, and after 3 finished tasks, Plan my day and Split use that ratio to set realistic lengths.
- **Busy times** (Settings → Schedule): repeating weekly blocks, such as a class timetable, that show on the calendar and are never scheduled over.
- **Tasks**: search, plus filters for list, priority, due date and status. Add, edit and delete tasks and their subtasks. Tasks can repeat daily, on weekdays, weekly or monthly, and completing one creates the next occurrence.
- **Classes**: one card per school subject with upcoming tests (countdown and what each covers), assignments due (with a quick-add box for that class), grades, and a points-based average with a letter grade.
- **Tests and study plans**: add a test with its class, date, time and topics. **Plan studying** spreads one session per topic before the test, plus an optional full review the day before, each placed in free time as normal tasks. Re-planning keeps finished sessions. Today has a **Test countdown** with a live clock, study progress and the next session.
- **Notes**: search with highlighting, auto-save, and linking to a list (with a jump to that list's open tasks).
- **Habits**:
  - Each habit runs on specific days (Mon/Wed/Fri) or a number of times per week, has a list color and a reminder time, and can be added from one-tap templates (Lift, Tennis practice, Golf range, Latin vocab review and more).
  - Streaks skip rest days. For "× a week" habits they count weeks in a row with the goal met, and each habit shows its best streak.
  - Today shows only the habits due today, grouped Morning, Afternoon, Evening or Anytime, as large tap targets.
  - The Habits page also has a 7-day grid (rest days are dashed, and ticking one counts as a bonus), goals, and an auto-saving weekly review.
- **Stats**: 14-day completion chart, focus time, hours blocked by list (this week or last 30 days), and a 30-day habit consistency heatmap.
- **Settings**: theme, density, five accent colors, dashboard section order and visibility, nav item visibility, passcode change, lists, and JSON export, import and reset.

## Data

Opened as a local file, Daybook stores everything in `localStorage` under `daybook.v1`, so the data stays in that browser.

### Key sync (GitHub)

Settings → Sync keeps devices in step through a secret gist on your GitHub account, and no sign-in is needed on each device:

- On the first device, paste a GitHub token that has only the `gist` scope and click **Start syncing**. Daybook shows a **sync code**. Paste that code on your other devices to connect them.
- Data is encrypted with AES-GCM on the device, using a key derived from the sync code's random 24-character key, before it's uploaded. The gist only holds ciphertext.
- Devices check for changes every 15 seconds and whenever the page comes back into view. Edits made offline sync once the connection returns.
- **Remove from this device** stops syncing and erases the local copy, which is useful on a shared computer.
- You can revoke the token at any time in GitHub → Settings → Developer settings → Personal access tokens. Syncing stops until you connect again with a new token.

### Account sync (claude.ai)

The hosted version on claude.ai also saves your data to your account, in one private document per person (`data/users/<id>/daybook`). Any device signed in to the same account sees the same data, and the sidebar shows the sync status. The passcode is a privacy screen, not encryption: anyone with access to the browser's storage can read the data. Use Settings → Data → Export JSON to back up or move your data.

## Claude Cowork plugin

`daybook.plugin` (built from `cowork-plugin/`) lets Claude Cowork read and update Daybook through the same encrypted sync, and work ahead on tasks by saving prep work as notes for review. See `cowork-plugin/README.md`.

## Files

- `index.html` is the shell.
- `styles.css` holds the theme tokens (light and dark, accents, density) and all styles.
- `app.js` holds state, views, interactions, drag and drop, and the lock screen.
