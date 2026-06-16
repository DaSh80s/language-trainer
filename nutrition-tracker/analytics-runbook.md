# Analytics & trends runbook

Pull entries from the Food Log and produce totals, comparisons, and pattern insight.
Triggered by a command ("run my weekly nutrition summary") or on a schedule. Go beyond
arithmetic — surface *why* the numbers moved.

All queries run against `collection://<FOOD_LOG_DATA_SOURCE_ID>` via the Notion
`query-data-sources` tool (SQL mode). Only include enriched data:
`"Enrichment status" IN ('Enriched','Recalculated')`.

## Totals — day / week / month

```sql
-- Daily totals for the last 30 days
SELECT substr("date:Date:start", 1, 10) AS day,
       ROUND(SUM("Calories"))    AS kcal,
       ROUND(SUM("Protein (g)")) AS protein,
       ROUND(SUM("Carbs (g)"))   AS carbs,
       ROUND(SUM("Fat (g)"))     AS fat,
       ROUND(SUM("Fibre (g)"))   AS fibre
FROM "collection://<FOOD_LOG_DATA_SOURCE_ID>"
WHERE "Enrichment status" IN ('Enriched','Recalculated')
GROUP BY day
ORDER BY day DESC;
```

Swap the `GROUP BY` to `strftime('%Y-%W', "date:Date:start")` for weekly or
`substr("date:Date:start",1,7)` for monthly buckets.

## Comparisons (this period vs last)

Compute the same totals for the current and prior period, then report deltas in plain
English:

- *"You ate ~300 more calories this week than last (2,400 vs 2,100/day average)."*
- *"Protein dipped on weekends — Sat/Sun averaged 90g vs 140g on weekdays."*
- *"Fibre is trending up: 22g/day this month vs 16g last."*

## Pattern insight (contextual, not just sums)

Cross-tabulate macros against the working fields to find behaviour, not just numbers:

- **Time of day / Meal type** — protein by `Time of day`; which meals carry the day's
  calories. *"You hit your protein target more often when breakfast is eaten at home
  (Cooked) vs grabbed on the go (Quick)."*
- **Complexity** — Quick vs Cooked: calorie and macro differences.
- **Source** — do repeat meals skew the averages? Are fresh entries higher-variance?
- **Confidence** (if present) — flag how much of the period's totals rest on Low-confidence
  estimates, so Dan knows when to add photos.

Example grouping:

```sql
SELECT "Time of day",
       COUNT(*) AS meals,
       ROUND(AVG("Protein (g)")) AS avg_protein
FROM "collection://<FOOD_LOG_DATA_SOURCE_ID>"
WHERE "Enrichment status" IN ('Enriched','Recalculated')
  AND "date:Date:start" >= date('now','-30 day')
GROUP BY "Time of day";
```

## Historical context

Always anchor a summary against history: this week vs the 4-week trailing average, this
month vs the same month's running mean. Note streaks and records ("highest-protein week
logged").

## Output shape

A weekly summary should read like a coach's note, not a spreadsheet:

1. **Headline** — one line: did this week move in a good direction?
2. **Totals** — daily averages for kcal + macros, with deltas vs last period.
3. **Patterns** — 2–3 behavioural observations tied to the fields above.
4. **Nudge** — one concrete, specific suggestion for next week.

Keep it short. Lead with the insight, not the table.
