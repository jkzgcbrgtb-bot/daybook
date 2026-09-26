# Daybook plugin for Claude Cowork

Lets Claude read and update your [Daybook](https://jkzgcbrgtb-bot.github.io/daybook/) planner and work ahead on your tasks.

## Skills

- **daybook**: look things up and make changes. For example: "What's due this week?", "Add bio lab due Thursday, 90 minutes, high priority", "Find me an hour for my essay tomorrow after school", "Check off reading".
- **work-ahead**: say "work ahead" or "prep my week". Claude picks up to 3 upcoming tasks it can help with, does the prep work (outlines, study guides, research notes, practice questions, message drafts), and saves each result as a Daybook note called "Claude: <task>". It also adds a "Review Claude's draft" subtask. For school assignments it prepares you to do the work rather than writing what you'd hand in.

## What Claude may change

- It can add and edit tasks, notes, time blocks, habits and the focus line.
- It always asks before deleting anything.
- It never checks off a task for you.

## Setup

1. Install the plugin in Claude Cowork.
2. Choose a folder for Cowork to work in, and keep using the same one.
3. Ask Claude "What's on my Daybook today?". The first time, it asks for your sync code, which is in Daybook → Settings → Sync → **Copy**. It saves the code as `daybook-sync-code.txt` in that folder, so you only do this once. Keep that folder private: the file gives access to your Daybook.

Cowork needs internet access to `api.github.com`.

## How it works

`scripts/daybook.mjs` is a small Node 18+ tool with no dependencies. It finds your sync gist using the sync code, decrypts it with the same AES-GCM key derivation the web app uses, and applies changes. It re-checks the data right before each save, so an edit made on your phone at the same moment isn't overwritten. Run `node scripts/daybook.mjs help` for all commands.
