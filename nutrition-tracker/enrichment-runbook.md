# Enrichment runbook

How Claude Code turns raw captured entries into structured nutrition data. Run on
demand ("enrich my food log") or on a schedule. **Adaptive, never blocking:** work with
whatever data is present, estimate the rest, flag uncertainty — never refuse an entry
for missing fields.

> Non-interactive note: a scheduled run needs the Notion MCP tools pre-authorised
> (interactive permission pre-grant) or the run will stall on the first tool call.

## 1. Find the work queue

Query the Food Log data source for entries needing processing:

```sql
SELECT * FROM "collection://<FOOD_LOG_DATA_SOURCE_ID>"
WHERE "Enrichment status" = 'Pending' OR "Enrichment status" = 'Recalculate'
```

Process `Pending` (first estimate) and `Recalculate` (photo/detail added) entries.

## 2. Parse the raw input

The raw dictation lands in **Item** (and sometimes **Notes**). Extract:

- **Food(s)** and preparation (grilled, fried, raw, homemade, restaurant).
- **Portion** — grams if stated ("about 200 grams" → `Portion size = 200`), else
  estimate from the description and typical serving sizes.
- **Quantity** — countable items ("2 eggs", "1 apple") → `Quantity`, and use standard
  per-unit weights to derive portion.
- **Beverages** — drinks/water → `Beverage`, logged separately from the food macros.
- **Meal type** — infer from wording or capture time (see Time of day below).
- **Complexity** — "Quick" (grab-and-go, pre-made) vs "Cooked" (prepared meal).

If the input is explicit ("180g chicken breast, 200 cals, 40g protein"), trust the
stated numbers and only fill the gaps.

## 3. Estimate nutrition (the adaptive core)

For each food, estimate per-100g values, scale by portion, and sum:

- Calories, Protein (g), Carbs (g), Fat (g), Fibre (g) — British spelling.
- Prefer branded/standard reference values when the item is identifiable
  (e.g. "Migros chicken curry sandwich").
- Vague input ("a sandwich") → use a sensible average and set **Confidence = Low**
  (if the Confidence field exists). Never leave the entry unprocessed.
- Keep the per-100g basis in **Per 100g** (if present) so values can be re-scaled later
  if the portion is corrected.

**Confidence guidance** (if the field exists):
- High — branded item or weighed portion with known macros.
- Medium — common food, estimated portion.
- Low — vague description, guessed portion. Good candidate for a later photo.

## 4. Fill Time of day & Meal type

- **Time of day** from the capture timestamp: Morning / Midday / Afternoon / Evening /
  Night. These buckets feed pattern analysis (e.g. protein by time of day).
- **Meal type** from wording + time. Don't overwrite a value Dan already set.

## 5. Set status and source

- New dictated entry → set `Source = Fresh entry` (if not already set), then
  `Enrichment status = Enriched`.
- Quick-tap repeat → already `Source = Repeat item` and pre-enriched; skip.

## 6. Recalculation loop (photo added)

For entries with `Enrichment status = Recalculate`:

1. Read the **Photo** *and* the original dictated **Item**/**Notes** together.
2. Use the photo to refine — correct portion size, catch missed sides/sauces, sharpen
   the estimate. The photo *refines*; it never replaces the original context.
3. Update macros, bump Confidence if warranted, and set
   `Enrichment status = Recalculated`.

## 7. Write back

Use the Notion `update-page` tool per entry. Only set fields you computed; leave
user-entered values untouched. Remember the expanded date format for the Date property
(`date:Date:start`, `date:Date:is_datetime`).

## Worked examples

| Raw input | Enriched result (illustrative) |
|---|---|
| "grilled salmon with a side salad, about 200 grams" | Item: Grilled salmon w/ side salad · Portion 200g · ~360 kcal · P 40 · C 6 · F 20 · Fibre 3 · Complexity Cooked · Confidence Medium |
| "2 eggs and toast" | Quantity "2 eggs + 1 slice toast" · Portion ~150g · ~250 kcal · P 16 · C 18 · F 13 · Confidence Medium |
| "a sandwich" | Portion ~180g · ~350 kcal · P 14 · C 40 · F 14 · Confidence **Low** (add a photo to refine) |
| "180g chicken breast, 200 cals, 40g protein" | Trust stated values; estimate only carbs/fat/fibre · Confidence High |
