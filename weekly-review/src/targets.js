/**
 * Reads nutrition targets out of Notion notes instead of hardcoding them.
 *
 * Maintenance calories in particular are expected to change over time, so a
 * note may hold a whole history. Any of these shapes work:
 *
 *   Maintenance calories: 2,600 kcal
 *   Maintenance | 2600 kcal
 *   2026-08-29 — maintenance 2,600 kcal
 *   From 1 September 2026: maintenance calories 2,550 kcal
 *
 * When several dated values exist, the one in force at the end of the review
 * window wins; values dated in the future are noted but not applied. There is
 * deliberately no fallback constant: if the note cannot be read, the run fails
 * loudly rather than quietly reviewing you against a stale number.
 */

import { blocksToLines, fetchBlockTree, readTitle } from './notion.js';
import { normalizeLine, parseDateInText, parseNumberAfter } from './util/parse.js';
import { compareDays, formatDay } from './util/date.js';

export class MissingTargetError extends Error {
  constructor(field, sources) {
    const where = sources.map((source) => `- ${source.label} (${source.pageId})`).join('\n');
    super(
      `Could not find a value for "${field}" in any configured note.\n` +
      `Searched:\n${where}\n\n` +
      `Add a line to one of those pages, for example:\n` +
      `  Maintenance calories: 2,600 kcal\n` +
      `Optionally date it to record a change:\n` +
      `  From 1 September 2026: maintenance calories 2,550 kcal`,
    );
    this.name = 'MissingTargetError';
    this.field = field;
  }
}

/** Pull the text of every configured note, tagged with where it came from. */
export async function loadTargetSources(client, sources) {
  const loaded = [];

  for (const source of sources) {
    try {
      const [page, blocks] = await Promise.all([
        client.getPage(source.pageId).catch(() => null),
        fetchBlockTree(client, source.pageId, 3),
      ]);

      const lines = blocksToLines(blocks);
      if (page) {
        const title = readTitle(page);
        if (title) lines.unshift(title);
      }

      loaded.push({
        ...source,
        lines,
        lastEdited: page?.last_edited_time ?? null,
        ok: true,
      });
    } catch (error) {
      loaded.push({ ...source, lines: [], ok: false, error: error.message });
    }
  }

  return loaded;
}

/**
 * Scan loaded note text for every candidate value of every configured field.
 * Exported for testing without a network round trip.
 */
export function extractCandidates(sources, fields) {
  const candidates = {};

  for (const [field, spec] of Object.entries(fields)) {
    candidates[field] = [];
    // Longest synonym first, so "maintenance calories" is preferred over "maintenance".
    const synonyms = [...spec.synonyms].sort((a, b) => b.length - a.length);

    for (const source of sources) {
      source.lines.forEach((rawLine, lineIndex) => {
        const line = normalizeLine(rawLine);
        const haystack = line.toLowerCase();

        const synonym = synonyms.find((candidate) => haystack.includes(candidate));
        if (!synonym) return;

        const labelEnd = haystack.indexOf(synonym) + synonym.length;
        const parsed = parseNumberAfter(line, labelEnd);
        if (!parsed) return;

        if (typeof spec.min === 'number' && parsed.value < spec.min) return;
        if (typeof spec.max === 'number' && parsed.value > spec.max) return;

        candidates[field].push({
          value: parsed.value,
          // A date on the line means "in force from", not "measured on".
          effectiveFrom: parseDateInText(line),
          line,
          lineIndex,
          sourceLabel: source.label,
          sourcePageId: source.pageId,
          matchedOn: synonym,
        });
      });
    }
  }

  return candidates;
}

/** Choose the value in force on `asOfDay` from a field's candidates. */
export function selectValue(candidates, asOfDay) {
  if (!candidates.length) return null;

  const dated = candidates.filter((candidate) => candidate.effectiveFrom);
  const undated = candidates.filter((candidate) => !candidate.effectiveFrom);

  const inForce = dated
    .filter((candidate) => compareDays(candidate.effectiveFrom, asOfDay) <= 0)
    .sort((a, b) => compareDays(a.effectiveFrom, b.effectiveFrom));

  const upcoming = dated
    .filter((candidate) => compareDays(candidate.effectiveFrom, asOfDay) > 0)
    .sort((a, b) => compareDays(a.effectiveFrom, b.effectiveFrom));

  let chosen;
  if (inForce.length) {
    chosen = inForce[inForce.length - 1];
  } else if (undated.length) {
    // No dates at all: the last one written wins, which is how people append.
    chosen = undated[undated.length - 1];
  } else {
    // Only future-dated values exist; using one is better than failing outright.
    chosen = upcoming[0];
  }

  const distinctUndated = new Set(undated.map((candidate) => candidate.value));
  const warnings = [];

  if (!dated.length && distinctUndated.size > 1) {
    warnings.push(
      `Found ${distinctUndated.size} different undated values (${[...distinctUndated].join(', ')}); ` +
      `used the last one written. Date the lines to remove the ambiguity.`,
    );
  }

  // A dated line beat an undated one. That is the documented rule, but it is
  // also exactly how an out-of-date "history" section silently overrides a
  // current headline, so say so rather than letting it pass unseen.
  if (inForce.length && undated.length) {
    const conflicting = [...distinctUndated].filter((value) => value !== chosen.value);
    if (conflicting.length) {
      warnings.push(
        `Used the dated value ${chosen.value} (${chosen.effectiveFrom}) in preference to ` +
        `undated value(s) ${conflicting.join(', ')} found in the same note. ` +
        `If the undated line is the current one, date it or remove the older dated lines.`,
      );
    }
  }

  return { ...chosen, warnings, upcoming: upcoming[0] ?? null };
}

/**
 * Resolve all targets for a review window.
 * @returns {{values: object, provenance: object, warnings: string[]}}
 */
export async function resolveTargets(client, targetsConfig, asOfDay) {
  const sources = await loadTargetSources(client, targetsConfig.sources);
  const warnings = sources
    .filter((source) => !source.ok)
    .map((source) => `Could not read note "${source.label}" (${source.pageId}): ${source.error}`);

  const candidates = extractCandidates(sources, targetsConfig.fields);
  const values = {};
  const provenance = {};

  for (const [field, spec] of Object.entries(targetsConfig.fields)) {
    const selected = selectValue(candidates[field], asOfDay);

    if (selected) {
      values[field] = selected.value;
      provenance[field] = {
        source: 'note',
        label: selected.sourceLabel,
        pageId: selected.sourcePageId,
        line: selected.line,
        effectiveFrom: selected.effectiveFrom,
        description: selected.effectiveFrom
          ? `from your "${selected.sourceLabel}", in force since ${formatDay(selected.effectiveFrom)}`
          : `from your "${selected.sourceLabel}"`,
      };
      warnings.push(...selected.warnings.map((warning) => `${field}: ${warning}`));
      if (selected.upcoming) {
        warnings.push(
          `${field}: a newer value of ${selected.upcoming.value} takes effect ` +
          `${formatDay(selected.upcoming.effectiveFrom)} and was not applied to this review.`,
        );
      }
      continue;
    }

    if (spec.derive && values[spec.derive.from] !== undefined && values[spec.derive.from] !== null) {
      values[field] = values[spec.derive.from] + spec.derive.offset;
      provenance[field] = {
        source: 'derived',
        description: `derived as ${spec.derive.from} ${spec.derive.offset >= 0 ? '+' : '-'} ${Math.abs(spec.derive.offset)}`,
      };
      continue;
    }

    if (spec.required) throw new MissingTargetError(field, targetsConfig.sources);

    values[field] = null;
    provenance[field] = { source: 'missing', description: 'not found in your notes' };
  }

  return { values, provenance, warnings, sources };
}
