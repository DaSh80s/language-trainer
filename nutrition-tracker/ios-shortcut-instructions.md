# iOS Shortcut — build instructions

Claude Code can't build a Shortcut directly (it's a visual tool), so here are the
exact steps for Dan. Two capture modes: **Dictation** (free speech) and **Quick-tap**
(repeat meals). Both create a Notion page in the Food Log with `Enrichment status`
set so Claude Code knows what to process.

The reliable, future-proof method is a direct call to the **Notion API** from the
Shortcut (the "Get Contents of URL" action). You'll need two values once, pasted into
the Shortcut:

- **Notion integration token** — create an internal integration at
  <https://www.notion.so/my-integrations> (personal account), copy the secret
  (starts `ntn_…` / `secret_…`), and **share the Food Log database with it** (open the
  database → ••• → Connections → add your integration).
- **Food Log database ID** — the 32-char ID from the database URL. (Claude Code fills
  this into the README at go-live.)

> Security: the token grants write access to that database. Keep the Shortcut private;
> don't share it with the token embedded.

---

## Mode A — Dictation

Creates a `Pending` entry from free speech.

1. **Shortcuts app → + → Add Action.**
2. **Dictate Text.** (Set language if needed.) This is the raw meal description.
3. **Text** action → store the Notion token. Rename the variable to `Token`. *(Or use a
   Shortcut import question / keychain — simplest is a Text action you keep private.)*
4. **Text** action → the database ID. Rename to `DatabaseID`.
5. **Get Contents of URL** with:
   - **URL:** `https://api.notion.com/v1/pages`
   - **Method:** `POST`
   - **Headers:**
     - `Authorization` → `Bearer ` + `Token`
     - `Notion-Version` → `2022-06-28`
     - `Content-Type` → `application/json`
   - **Request Body:** `JSON`, structured as below (use `Dictated Text` from step 2 in
     the **Item** title and **Notes**):

   ```json
   {
     "parent": { "database_id": "DatabaseID" },
     "properties": {
       "Item":   { "title":      [ { "text": { "content": "Dictated Text" } } ] },
       "Date":   { "date":       { "start": "Current Date (ISO 8601)" } },
       "Notes":  { "rich_text":  [ { "text": { "content": "Dictated Text" } } ] },
       "Source": { "select":     { "name": "Fresh entry" } },
       "Enrichment status": { "select": { "name": "Pending" } }
     }
   }
   ```

   In Shortcuts, build this as a **Dictionary** action (cleaner than raw text) and pass
   it as the body — insert the `Dictated Text` and `Current Date` variables into the
   right fields. Use a **Format Date** action (ISO 8601) for the date.
6. *(Optional)* **Show Notification** "Logged ✅" so you get confirmation on the watch.
7. Name it **"Log Meal"**. Add to Home Screen / Apple Watch / "Hey Siri, Log Meal".

Claude Code's next enrichment pass fills macros, portion, meal type, etc. and flips the
status to `Enriched`.

### Adding a photo later (recalculation)

Either add the photo to the Notion entry by hand, or build a tiny **"Refine Last Meal"**
Shortcut that takes a photo, uploads it, and PATCHes the most recent entry to set
`Enrichment status = Recalculate`. Claude Code then refines using photo + original text.
(Notion's API can't accept raw file uploads easily from Shortcuts — simplest is to add
the photo in the Notion app and flip the status field there.)

---

## Mode B — Quick-tap repeat meals

Drops a full, pre-enriched entry in one tap — no dictation.

1. New Shortcut → **Choose from Menu**.
2. Add one menu item per frequent meal (from the **Frequent Meals** list Claude Code
   produces during existing-notes analysis), e.g. "Porridge & banana", "Chicken & rice",
   "Protein shake".
3. Under each menu case, add a **Get Contents of URL** POST exactly like Mode A, but
   with the macros **hard-coded** from the Frequent Meals list and:
   - `"Source": { "select": { "name": "Repeat item" } }`
   - `"Frequent item": { "checkbox": true }`
   - `"Enrichment status": { "select": { "name": "Enriched" } }`  ← already complete
   - all the known fields (Calories, Protein, Carbs, Fat, Fibre, Portion size, Meal type).
4. Set `Date` to the current date in each case.
5. Name it **"Quick Meal"**, pin to Home Screen / Watch.

Because these are pre-enriched, Claude Code skips them — they exist purely for speed.

> Tip: keep one Shortcut with a top-level **Choose from Menu** offering "Dictate a meal"
> vs "Quick meal" so there's a single icon to tap from the watch.

---

## Reference — Notion API property formats

| Field | JSON shape |
|---|---|
| Title (Item) | `{"title":[{"text":{"content":"…"}}]}` |
| Date | `{"date":{"start":"2026-06-16T12:30:00+02:00"}}` |
| Number | `{"number": 207}` |
| Select | `{"select":{"name":"Lunch"}}` |
| Checkbox | `{"checkbox": true}` |
| Rich text (Notes/Quantity/Beverage) | `{"rich_text":[{"text":{"content":"…"}}]}` |

Select option names must match the database exactly (e.g. `Pending`, `Fresh entry`).
