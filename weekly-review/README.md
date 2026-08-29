# Weekly review generator

Fills the Notion **Weekly review** page automatically every Saturday morning:
the fitness and nutrition review, the year/week progress readout, next week's
notable meetings, and next week's key tasks.

It replaces the four custom AI blocks in the template, which could not do the
job — they cannot fetch URLs, cannot see Notion Calendar, do not run on
duplication, and read database *rows* unreliably.

## The idea

Almost none of this work is a language task. It is arithmetic (calorie
averages, a weight trend, a deficit, percentages of the year) and filtering
(which meetings matter, which tasks are due). So:

- **Code computes every number** from the Notion API. Real queries, real rows.
- **A model writes only the prose** — the actions, the encouragement, the
  realism check — over facts it is handed and told not to recalculate.

That split is why a small free model is enough, and why the output is
trustworthy: no figure on the page was produced by a language model.

## What each section produces

| Template toggle | Content |
|---|---|
| Calories (total and average) | Verdict, intake vs **maintenance read from your Notion note**, protein/fibre, weight trend, scale-vs-food-log cross-check, milestone status, A–F grades, up to three actions |
| What week of the year are we going into now? | ISO week, year progress bar, season, working days left, next Swiss holiday, days to the weight deadline |
| What big meetings do I have next week? | Monday–Sunday, external meetings only, routine/declined/all-day filtered out |
| What are the key things I want to get done next week? | Big three, grouped by project, overdue, routine count, realism check |

## Maintenance calories are never hardcoded

The maintenance figure is read from your Notion note at run time, so updating
the note is all that is needed. Any of these work:

```
Maintenance calories: 2,600 kcal
Maintenance | 2'600 kcal
Maintenance calories: 2,600 kcal (updated 12 August 2026)
From 1 September 2026: maintenance calories 2,550 kcal
```

Rules:

- A **dated** line takes effect from its date. The most recent one in force at
  the end of the review window is used.
- A line dated in the **future** is not applied, but is flagged on the page.
- An **undated** line is used when there are no dated ones.
- If both exist and disagree, the dated one wins **and a warning is logged**,
  because an out-of-date history section silently overriding a current headline
  is exactly the failure worth catching.
- If no value can be found at all, the run **fails loudly**. It will never fall
  back to a stale constant and review you against the wrong number.

The same mechanism reads the fat-loss target, protein target and fibre target
from the Food analysis note. If the fat-loss target is missing it is derived as
maintenance − 400.

## Setup

### 1. Notion integration

Create an internal integration at <https://www.notion.so/profile/integrations>,
**in the personal "Daniel" workspace** — not Rigby. Then share these with it
(⋯ → Connections): Food Log, Notes, All tasks, the weekly-journal database, the
Maintenance calories note, the Food analysis note.

### 2. Configure

The config is already filled in with values **verified against the live
workspace**, so there is nothing to look up for this installation:

| What | Database | Notes |
|---|---|---|
| Food log | `382ee9fd…` **Food Diary** | `Effective date` is a *formula*, so queries filter on `Logged for` |
| Weight | `102c8a95…` **Notes database** | value in the numeric `Number` property; date parsed from the title |
| Tasks | `46573cd6…` **All tasks** | no Status or Priority: completion is the `Done` checkbox, priority is the Eisenhower multi-select |
| Review pages | `1212eaed…` **Journals** | title `text`, date `date`, tag `Weekly journal` |

Only `NOTION_TOKEN` is needed. To re-check the schemas after changing something
in Notion:

```bash
cd weekly-review
cp .env.example .env          # add NOTION_TOKEN
npm run discover
```

Without a terminal, run the **Weekly review** workflow from the Actions tab
with **mode: discover** — same output, token held as a repository secret.

> One gotcha worth knowing: the `Done` checkbox in All tasks is really named
> `\uFEFFDone` — a byte-order mark from a paste. An exact key lookup fails
> silently, so property lookup ignores invisible characters.

### 3. Check it without touching Notion

```bash
npm run demo        # full pipeline against fixtures, no network, no workspace
npm run dry-run     # real Notion data, prints what it would write, writes nothing
npm test
```

### 4. Schedule it

Add these as repository secrets, then the workflow in
`.github/workflows/weekly-review.yml` runs each Saturday and can be triggered
by hand from the Actions tab:

| Secret | Needed for |
|---|---|
| `NOTION_TOKEN` | required |
| `GEMINI_API_KEY` | prose (first choice) |
| `GROQ_API_KEY` | prose (fallback) |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | prose (fallback) |
| `ICS_FEEDS` | the meetings section |

Providers are tried in the order given by `LLM_PROVIDERS`
(default `gemini,groq,cloudflare`). If all of them fail or none is configured,
each section falls back to deterministic sentences built from the same facts —
the page still gets written, it just reads more plainly.

## Meetings

The meetings section needs published calendar feeds. This deliberately avoids
the Outlook AI connector, which would need tenant-wide Microsoft 365 admin
consent.

In Outlook: Settings → Calendar → Shared calendars → publish, permission "can
view all details", and copy the **ICS** link. In Google Calendar: Settings →
your calendar → "Secret address in iCal format".

```
ICS_FEEDS=[{"label":"Work","url":"https://outlook.office365.com/owa/calendar/.../calendar.ics"},{"label":"Personal","url":"https://calendar.google.com/calendar/ical/.../basic.ics"}]
```

These URLs are effectively passwords for your calendar — keep them in secrets.

With no feeds configured the section says so plainly rather than inventing
meetings.

### Untrusted calendar data

The handoff found hidden instruction text inside a subscribed feed. Everything
from a calendar or task list is treated as data: control and bidi characters are
stripped, titles are truncated, include/exclude decisions are made by rules in
code rather than by a model reading titles, and anything passed to the model is
fenced in an `UNTRUSTED` block it is told never to obey. There is a test for
this.

## Running it

```bash
npm start                          # fill this week's page
node src/index.js run --dry-run    # compute only
node src/index.js run --date 2026-08-29
node src/index.js run --page <notion-page-id>
node src/index.js run --no-llm     # deterministic prose only
node src/index.js run --out out/facts.json
```

It finds the review page by date in the weekly-journal database, then locates
each toggle **by its heading text** — block URLs change on every duplication and
are never used.

Re-runs are safe. Each generated section begins with a hidden marker paragraph;
a re-run deletes from that marker onward and writes fresh content, so output
replaces rather than stacks.

## Known limitations

- **The page must exist first.** Duplicate the template as usual; this fills it
  in. That keeps the inline linked views and synced blocks the API cannot
  recreate.
- **The old AI blocks are not removed.** Delete them from the template once
  you are happy with the output, or they will sit alongside it.
- The schedule is UTC, so the Saturday run lands at 07:00 Zurich in summer and
  06:00 in winter.
- Seasons use fixed approximate solstice/equinox dates.
- Holidays cover national plus canton Zurich; Sechseläuten and Knabenschiessen
  are not included.
- `RRULE` support covers the common cases (daily/weekly/monthly/yearly with
  `INTERVAL`, `COUNT`, `UNTIL`, `BYDAY`, plus `EXDATE` and `RECURRENCE-ID`).
  Exotic rules are ignored rather than guessed at.

## Worth doing in Notion itself

- ~~Move weight entries to a numeric property~~ — already done: the `Number`
  property holds the value, so only the date is still parsed from the title.
- Set the Eisenhower field (`Do, delete, delegate, automate`) on the tasks that
  matter. Without it the "big three" is just the three earliest due dates,
  which is not a useful weekly priority.
- Archive the legacy "Weight and Calorie Tracker" — this tool never reads it,
  but it still pollutes workspace search.
- Remove the "Zurich School Holidays" subscription containing injected text.

## Layout

```
src/
  index.js       CLI and orchestration
  config.js      config + .env loading
  notion.js      REST client, pagination, property readers
  targets.js     maintenance and nutrition targets read from notes
  nutrition.js   block 1 maths
  progress.js    block 2 date arithmetic
  tasks.js       block 4 grouping and prioritising
  meetings.js    block 3 filtering and sanitising
  ics.js         iCalendar parser with recurrence expansion
  llm.js         Gemini / Groq / Cloudflare with fallback
  render.js      Notion block builders
  util/          date and text parsing helpers
test/            unit tests plus an offline end-to-end run
scripts/demo.js  the whole pipeline against fixtures
```
