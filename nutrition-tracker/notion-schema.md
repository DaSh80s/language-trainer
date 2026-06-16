# Food Log — Notion database schema

Dedicated database for food tracking, separate from general notes. British English
throughout ("Fibre"). Run the DDL below through the Notion `create-database` tool once
the connection points at the **personal** account.

## CREATE TABLE (ready to run)

```sql
CREATE TABLE (
  "Item" TITLE,
  "Date" DATE,
  "Time of day" SELECT('Morning':yellow, 'Midday':orange, 'Afternoon':blue, 'Evening':purple, 'Night':gray),
  "Meal type" SELECT('Breakfast':yellow, 'Lunch':orange, 'Dinner':blue, 'Snack':green),
  "Calories" NUMBER,
  "Protein (g)" NUMBER,
  "Carbs (g)" NUMBER,
  "Fat (g)" NUMBER,
  "Fibre (g)" NUMBER,
  "Portion size" NUMBER,
  "Quantity" RICH_TEXT,
  "Source" SELECT('Repeat item':green, 'Fresh entry':blue),
  "Frequent item" CHECKBOX,
  "Beverage" RICH_TEXT,
  "Complexity" SELECT('Quick':green, 'Cooked':orange),
  "Photo" FILES,
  "Notes" RICH_TEXT,
  "Enrichment status" SELECT('Pending':yellow, 'Enriched':green, 'Recalculate':orange, 'Recalculated':blue)
)
```

Title param: `"Food Log"`.

## Property reference

| Property | Type | Notes |
|---|---|---|
| **Item** | Title | Name of the food/meal, e.g. "Chicken breast and rice" |
| **Date** | Date | Defaults to capture date/time |
| **Time of day** | Select | Morning / Midday / Afternoon / Evening / Night — spot breakfast-vs-dinner patterns |
| **Meal type** | Select | Breakfast / Lunch / Dinner / Snack |
| **Calories** | Number | AI-estimated unless specified |
| **Protein (g)** | Number | |
| **Carbs (g)** | Number | |
| **Fat (g)** | Number | |
| **Fibre (g)** | Number | British spelling |
| **Portion size** | Number | In grams — used to scale values |
| **Quantity** | Text | Countable items, e.g. "2 eggs", "1 apple" |
| **Source** | Select | Repeat item (saved meals) / Fresh entry (dictated new) |
| **Frequent item** | Checkbox | Flags regulars worth quick-tapping in the Shortcut |
| **Beverage** | Text | Drinks / water logged separately from food |
| **Complexity** | Select | Quick / Cooked — effort level |
| **Photo** | Files & media | Optional, can be added after capture |
| **Notes** | Text | Context: homemade, restaurant, etc. |
| **Enrichment status** | Select | Pending / Enriched / Recalculate / Recalculated — working field for Claude Code |

`Enrichment status` drives the workflow:

- **Pending** — dictated/captured, not yet enriched. Claude Code finds these and fills macros.
- **Enriched** — macros estimated and filled.
- **Recalculate** — a photo or more detail was added; flagged for a refined pass.
- **Recalculated** — refined using photo + original input.

## Recommended optional extras

Not in the spec, but the earlier setup attempt used them and they're genuinely useful.
Add via `update-data-source` after creation if wanted:

- **Confidence** — Select(High / Medium / Low): how sure the estimate is. Low-confidence
  entries are good candidates for adding a photo later.
- **Sugar (g)** — Number: sits naturally alongside Carbs.
- **Per 100g** — Text: the per-100g basis used, so estimates can be re-scaled if the
  portion is corrected.

## Suggested views (create after the table exists)

- **Inbox** — table, `FILTER "Enrichment status" = "Pending" OR "Enrichment status" = "Recalculate"`,
  sorted by Date desc. This is Claude Code's work queue.
- **Calendar** — calendar by Date.
- **Frequent meals** — table, `FILTER "Frequent item" = checked`. Source for the
  Shortcut quick-tap menu.
- **This week** — table, filtered to the current week, for quick eyeballing.
