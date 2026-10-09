---
name: work-ahead
description: Works ahead on the user's Daybook tasks by picking the ones Claude can genuinely help with (research, outlines, study guides, practice questions, plans, drafts of messages) and saving the prep work as Daybook notes for the user to review. Use when the user says "work ahead", "get ahead on my tasks", "prep my week", "what can you do from my to-do list", "help me get a head start", or runs this on a schedule.
---

# Work ahead

Pick up the user's upcoming Daybook tasks, do the prep work that can be done without them, and leave it in Daybook for review. Use the `daybook` skill's tool for all reading and writing:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/daybook.mjs" <command> [options]
```

If the tool reports "Not connected to Daybook yet", follow the first-time connection steps in the `daybook` skill.

## 1. Gather

1. Run `summary`, then `tasks --due-by <date 10 days from today>` and `tasks` (all open tasks).
2. Skip any task where `claude_draft` is true. Its draft is already waiting for review. Only revisit it if the user asks, or if the task's notes show they want changes.
3. Run `notes --search <topic>` for each candidate, to reuse anything the user has already written.

4. Run `classes`. An upcoming test with listed topics is a great work-ahead target: make a study guide covering exactly those topics, attached to the test's next unfinished study session.

## 2. Choose

Pick up to **3 tasks** per run, choosing the soonest due first, then high priority. A task qualifies only if Claude can produce something the user would genuinely use, from information it has or can research:

- **Good fits:** research summaries with sources, outlines, study guides, flashcards, practice questions with answers, reading notes, step-by-step plans, packing or shopping lists, drafts of emails or messages (never sent), comparison tables, schedules or checklists.
- **Skip:** physical errands, anything that needs the user's private information or accounts, anything that sends, buys, submits or books on their behalf, and tasks too vague to act on. For a vague task, add one clarifying question to the task with `update-task <id> --append-notes "Claude: …?"` instead of guessing.

**School assignments:** help the user learn and get started, but never produce the finished work they would hand in. For an essay, give an outline, thesis options, evidence to look into, and questions to answer, not a written essay. For problem sets, give worked examples of similar problems and a study guide, not the answers to the assigned problems. For a lab report, give the structure, what each section needs, and questions to think about, not written sections. If a task says it's graded or is clearly an assignment to submit, follow this even if the task seems small.

## 3. Do the work

For each chosen task:

1. Produce the prep work. Keep it skimmable, with headings and bullets and the most useful part first. Cite sources for anything factual that came from research.
2. Write it to a Markdown file, then save it with:
   `attach-draft <task id> --body-file <file>`
   This creates or updates the note "Claude: <task title>", adds a pointer in the task's notes, and adds a "Review Claude's draft" subtask. Don't mark the task done; the user reviews and checks it off themselves.
3. If the task has no time estimate and you can tell roughly how long the remaining work will take the user, set it with `update-task <id> --estimate <minutes>`.
4. If the task is unscheduled and due within 3 days, suggest a time from `free-slots`, but only schedule it if the user agrees. On a scheduled run with no one to ask, leave it unscheduled and mention it in the report.

## 4. Report

End with a short summary for the user:

- **Drafted:** each task, one line on what's in the note, and where to find it (Daybook → Notes → "Claude: …").
- **Skipped:** briefly why, and any question left on a task.
- **Heads-up:** anything due soon that isn't scheduled, or overdue items.

Don't delete anything during work-ahead, and don't change due dates, priorities or titles unless the user asks.
