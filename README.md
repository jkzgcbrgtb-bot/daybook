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
- **Tasks**: search, plus filters for list, priority, due date and status. Add, edit and delete tasks and their subtasks. Tasks can repeat daily, on weekdays, weekly or monthly, and completing one creates the next occurrence.
- **Notes**: search with highlighting, auto-save, and linking to a list (with a jump to that list's open tasks).
- **Habits**: 7-day tick grid, streaks, weekly goals, reminder times (browser notifications or in-app toasts), goals with +/− progress, and an auto-saving weekly review with a summary of the week.
- **Stats**: 14-day completion chart, focus time, hours blocked by list (this week or last 30 days), and a 30-day habit consistency heatmap.
- **Settings**: theme, density, five accent colors, dashboard section order and visibility, nav item visibility, passcode change, lists, and JSON export, import and reset.

## Data

Opened as a local file, Daybook stores everything in `localStorage` under `daybook.v1`, so the data stays in that browser.

The hosted version on claude.ai also saves your data to your account, in one private document per person (`data/users/<id>/daybook`). Any device signed in to the same account sees the same data, and the sidebar shows the sync status. The passcode is a privacy screen, not encryption: anyone with access to the browser's storage can read the data. Use Settings → Data → Export JSON to back up or move your data.

## Files

- `index.html` is the shell.
- `styles.css` holds the theme tokens (light and dark, accents, density) and all styles.
- `app.js` holds state, views, interactions, drag and drop, and the lock screen.
