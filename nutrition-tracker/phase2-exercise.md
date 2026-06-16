# Phase 2 — Exercise cross-reference (later)

Not in the first build. Designed so it slots in without reworking the Food Log.

## Exercise database schema

A separate **Exercise** database (same personal workspace as the Food Log).

| Property | Type | Notes |
|---|---|---|
| **Activity** | Title | e.g. "Football", "Run", "Gym — upper body" |
| **Date** | Date | Date/time of the session |
| **Activity type** | Select | Cardio / Strength / Sport / Walk / Other |
| **Duration (min)** | Number | |
| **Intensity** | Select | Low / Moderate / High |
| **Calories burned** | Number | AI-estimated from type + duration + intensity |
| **Notes** | Text | Context (match, long run, etc.) |
| **Enrichment status** | Select | Pending / Enriched — same working-field pattern as Food Log |

DDL:

```sql
CREATE TABLE (
  "Activity" TITLE,
  "Date" DATE,
  "Activity type" SELECT('Cardio':orange, 'Strength':blue, 'Sport':green, 'Walk':yellow, 'Other':gray),
  "Duration (min)" NUMBER,
  "Intensity" SELECT('Low':gray, 'Moderate':yellow, 'High':red),
  "Calories burned" NUMBER,
  "Notes" RICH_TEXT,
  "Enrichment status" SELECT('Pending':yellow, 'Enriched':green)
)
```

It reuses the **same capture pattern**: dictate an activity → `Pending` → Claude Code
estimates calories burned → `Enriched`. The Shortcut gains a "Log Workout" branch.

## Cross-reference logic

Claude Code reads **both** databases by date to give fuel- and recovery-aware insight:

- *"You played football Sunday morning (~700 kcal burned) and had a salad after — that
  meal was light on protein for the work you'd done."*
- *"Net calories this week ran a ~300/day deficit once training is accounted for."*
- Surface **timing**: protein/carbs in the 1–2h window around sessions.

Join on date (and time of day where available):

```sql
SELECT f."date:Date:start" AS day,
       SUM(f."Calories")        AS kcal_in,
       SUM(e."Calories burned") AS kcal_out
FROM "collection://<FOOD_LOG_DS>"  f
LEFT JOIN "collection://<EXERCISE_DS>" e
  ON substr(f."date:Date:start",1,10) = substr(e."date:Date:start",1,10)
GROUP BY day;
```

(Run as two queries + merge if cross-source joins aren't supported.)

## Why it slots in cleanly

- Same `Enrichment status` working-field pattern → the enrichment runbook generalises.
- Date is the join key, already present and consistent in both schemas.
- No change to the Food Log is required to add this later.
