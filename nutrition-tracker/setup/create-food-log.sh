#!/usr/bin/env bash
#
# Create the "Food Log" Notion database.
#
# Runs anywhere that can reach api.notion.com with a personal integration token
# (your Mac/terminal — NOT the Claude Code web sandbox, which firewalls Notion).
#
# Usage:
#   export NOTION_TOKEN="ntn_xxx"          # your personal integration secret
#   ./create-food-log.sh <PARENT_PAGE_ID>  # 32-hex id of a page the integration is connected to
#
# The integration must be connected to the parent page:
#   open the page in Notion -> ••• -> Connections -> add your integration.
#
set -euo pipefail

NOTION_VERSION="2022-06-28"
TOKEN="${NOTION_TOKEN:-}"
PARENT_PAGE_ID="${1:-}"

if [[ -z "$TOKEN" ]]; then
  echo "ERROR: set NOTION_TOKEN env var to your integration secret (ntn_… / secret_…)." >&2
  exit 1
fi
if [[ -z "$PARENT_PAGE_ID" ]]; then
  echo "ERROR: pass the parent page ID as the first argument." >&2
  echo "Usage: NOTION_TOKEN=ntn_xxx ./create-food-log.sh <PARENT_PAGE_ID>" >&2
  exit 1
fi

read -r -d '' BODY <<JSON || true
{
  "parent": { "type": "page_id", "page_id": "${PARENT_PAGE_ID}" },
  "title": [ { "type": "text", "text": { "content": "Food Log" } } ],
  "properties": {
    "Item":            { "title": {} },
    "Date":            { "date": {} },
    "Time of day":     { "select": { "options": [
                          { "name": "Morning",   "color": "yellow" },
                          { "name": "Midday",    "color": "orange" },
                          { "name": "Afternoon", "color": "blue"   },
                          { "name": "Evening",   "color": "purple" },
                          { "name": "Night",     "color": "gray"   } ] } },
    "Meal type":       { "select": { "options": [
                          { "name": "Breakfast", "color": "yellow" },
                          { "name": "Lunch",     "color": "orange" },
                          { "name": "Dinner",    "color": "blue"   },
                          { "name": "Snack",     "color": "green"  } ] } },
    "Calories":        { "number": {} },
    "Protein (g)":     { "number": {} },
    "Carbs (g)":       { "number": {} },
    "Fat (g)":         { "number": {} },
    "Fibre (g)":       { "number": {} },
    "Portion size":    { "number": {} },
    "Quantity":        { "rich_text": {} },
    "Source":          { "select": { "options": [
                          { "name": "Repeat item", "color": "green" },
                          { "name": "Fresh entry", "color": "blue"  } ] } },
    "Frequent item":   { "checkbox": {} },
    "Beverage":        { "rich_text": {} },
    "Complexity":      { "select": { "options": [
                          { "name": "Quick",  "color": "green"  },
                          { "name": "Cooked", "color": "orange" } ] } },
    "Photo":           { "files": {} },
    "Notes":           { "rich_text": {} },
    "Enrichment status": { "select": { "options": [
                          { "name": "Pending",      "color": "yellow" },
                          { "name": "Enriched",     "color": "green"  },
                          { "name": "Recalculate",  "color": "orange" },
                          { "name": "Recalculated", "color": "blue"   } ] } }
  }
}
JSON

echo "Creating 'Food Log' under parent page ${PARENT_PAGE_ID}…"
RESP="$(curl -sS -X POST https://api.notion.com/v1/databases \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Notion-Version: ${NOTION_VERSION}" \
  -H "Content-Type: application/json" \
  --data "${BODY}")"

# Extract id + url without requiring jq.
DB_ID="$(printf '%s' "$RESP" | sed -n 's/.*"id":"\([0-9a-f-]\{36\}\)".*/\1/p' | head -n1)"
DB_URL="$(printf '%s' "$RESP" | sed -n 's/.*"url":"\(https:[^"]*\)".*/\1/p' | head -n1)"

if [[ -z "$DB_ID" ]]; then
  echo "Something went wrong. Full response:" >&2
  printf '%s\n' "$RESP" >&2
  exit 1
fi

echo
echo "✅ Food Log created."
echo "   database_id: ${DB_ID}"
[[ -n "$DB_URL" ]] && echo "   url:         ${DB_URL}"
echo
echo "Next: paste database_id into the iOS Shortcut (see ios-shortcut-instructions.md)"
echo "and into nutrition-tracker/README.md so the enrichment/analytics steps can find it."
