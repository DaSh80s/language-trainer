/**
 * Minimal Notion REST client.
 *
 * Deliberately dependency-free: Node 20's built-in fetch is enough, and this
 * runs in CI where every extra dependency is another thing to audit.
 */

const DEFAULT_VERSION = '2022-06-28';
const BASE_URL = 'https://api.notion.com/v1';
const MAX_ATTEMPTS = 5;

export class NotionError extends Error {
  constructor(message, { status, code, requestId } = {}) {
    super(message);
    this.name = 'NotionError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class NotionClient {
  constructor({ token, version = DEFAULT_VERSION, fetchImpl = fetch, logger = console }) {
    if (!token) throw new NotionError('NOTION_TOKEN is not set.');
    this.token = token;
    this.version = version;
    this.fetch = fetchImpl;
    this.logger = logger;
  }

  async request(path, { method = 'GET', body } = {}) {
    let lastError;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      let response;
      try {
        response = await this.fetch(`${BASE_URL}${path}`, {
          method,
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Notion-Version': this.version,
            'Content-Type': 'application/json',
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      } catch (cause) {
        // Network-level failure: worth retrying.
        lastError = new NotionError(`Network error calling ${method} ${path}: ${cause.message}`);
        await sleep(2 ** attempt * 250);
        continue;
      }

      if (response.ok) return response.json();

      const payload = await response.json().catch(() => ({}));
      lastError = new NotionError(
        payload.message ?? `Notion returned ${response.status} for ${method} ${path}`,
        { status: response.status, code: payload.code, requestId: payload.request_id },
      );

      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === MAX_ATTEMPTS) throw lastError;

      const retryAfter = Number(response.headers.get('retry-after'));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 2 ** attempt * 250;
      this.logger.warn?.(`Notion ${response.status} on ${path}; retrying in ${waitMs}ms (attempt ${attempt}/${MAX_ATTEMPTS})`);
      await sleep(waitMs);
    }

    throw lastError;
  }

  /** Query every page of a database, following pagination to the end. */
  async queryDatabase(databaseId, { filter, sorts, pageSize = 100, maxPages = 50 } = {}) {
    const results = [];
    let cursor;
    let pages = 0;

    do {
      const body = { page_size: pageSize };
      if (filter) body.filter = filter;
      if (sorts) body.sorts = sorts;
      if (cursor) body.start_cursor = cursor;

      const response = await this.request(`/databases/${databaseId}/query`, { method: 'POST', body });
      results.push(...response.results);
      cursor = response.has_more ? response.next_cursor : undefined;
      pages += 1;
    } while (cursor && pages < maxPages);

    return results;
  }

  getDatabase(databaseId) {
    return this.request(`/databases/${databaseId}`);
  }

  getPage(pageId) {
    return this.request(`/pages/${pageId}`);
  }

  async getBlockChildren(blockId, { maxPages = 20 } = {}) {
    const results = [];
    let cursor;
    let pages = 0;

    do {
      const query = new URLSearchParams({ page_size: '100' });
      if (cursor) query.set('start_cursor', cursor);
      const response = await this.request(`/blocks/${blockId}/children?${query}`);
      results.push(...response.results);
      cursor = response.has_more ? response.next_cursor : undefined;
      pages += 1;
    } while (cursor && pages < maxPages);

    return results;
  }

  /** Append children in chunks, because the API caps each call at 100 blocks. */
  async appendBlockChildren(blockId, children) {
    const appended = [];
    for (let index = 0; index < children.length; index += 100) {
      const chunk = children.slice(index, index + 100);
      const response = await this.request(`/blocks/${blockId}/children`, {
        method: 'PATCH',
        body: { children: chunk },
      });
      appended.push(...response.results);
    }
    return appended;
  }

  deleteBlock(blockId) {
    return this.request(`/blocks/${blockId}`, { method: 'DELETE' });
  }

  createPage(body) {
    return this.request('/pages', { method: 'POST', body });
  }
}

/* ------------------------------------------------------------------ *
 * Property readers
 * ------------------------------------------------------------------ */

export function richTextToPlain(richText) {
  if (!Array.isArray(richText)) return '';
  return richText.map((run) => run.plain_text ?? '').join('');
}

/**
 * Look a property up by name, tolerating invisible characters.
 *
 * Notion property names can carry a byte-order mark or zero-width character
 * picked up from a paste - the "Done" checkbox in All tasks is really
 * "\uFEFFDone" - which makes an exact key lookup fail for no visible reason.
 */
function normalisePropertyKey(key) {
  let out = '';
  for (const character of key) {
    const code = character.codePointAt(0);
    const invisible = code === 0xfeff || (code >= 0x200b && code <= 0x200f);
    if (!invisible) out += character;
  }
  return out.trim().toLowerCase();
}

export function getProperty(page, name) {
  if (!name) return null;
  const properties = page.properties ?? {};
  if (properties[name]) return properties[name];

  const wanted = normalisePropertyKey(name);
  const key = Object.keys(properties).find((candidate) => normalisePropertyKey(candidate) === wanted);
  return key ? properties[key] : null;
}

/** Unwrap formula and single-value rollup properties down to the underlying value. */
function unwrap(property) {
  if (!property) return null;
  if (property.type === 'formula') return property.formula;
  if (property.type === 'rollup') {
    if (property.rollup?.type === 'array' && property.rollup.array?.length) return property.rollup.array[0];
    return property.rollup;
  }
  return property;
}

export function readTitle(page) {
  const property = Object.values(page.properties ?? {}).find((candidate) => candidate.type === 'title');
  return richTextToPlain(property?.title ?? []);
}

export function readNumber(page, name) {
  const value = unwrap(getProperty(page, name));
  if (!value) return null;
  if (typeof value.number === 'number') return value.number;
  // A number stored as text still deserves a best-effort read.
  if (value.type === 'rich_text') {
    const parsed = Number(richTextToPlain(value.rich_text).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Returns an ISO date/datetime string, or null. */
export function readDate(page, name) {
  const property = getProperty(page, name);
  if (!property) return null;
  const value = unwrap(property);
  if (value?.date?.start) return value.date.start;
  if (value?.type === 'date' && typeof value.date === 'string') return value.date;
  if (value?.type === 'created_time') return value.created_time;
  if (value?.type === 'last_edited_time') return value.last_edited_time;
  if (typeof value?.string === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value.string)) return value.string;
  return null;
}

export function readSelectName(page, name) {
  const value = unwrap(getProperty(page, name));
  if (!value) return null;
  if (value.select) return value.select.name ?? null;
  if (value.status) return value.status.name ?? null;
  if (Array.isArray(value.multi_select)) return value.multi_select.map((option) => option.name).join(', ') || null;
  if (typeof value.string === 'string') return value.string || null;
  if (value.type === 'rich_text') return richTextToPlain(value.rich_text) || null;
  return null;
}

export function readMultiSelectNames(page, name) {
  const value = unwrap(getProperty(page, name));
  if (Array.isArray(value?.multi_select)) return value.multi_select.map((option) => option.name);
  if (value?.select?.name) return [value.select.name];
  return [];
}

export function readCheckbox(page, name) {
  const value = unwrap(getProperty(page, name));
  if (typeof value?.checkbox === 'boolean') return value.checkbox;
  if (typeof value?.boolean === 'boolean') return value.boolean;
  return null;
}

export function readRelationIds(page, name) {
  const value = unwrap(getProperty(page, name));
  return Array.isArray(value?.relation) ? value.relation.map((item) => item.id) : [];
}

/** Flatten a block tree into plain text lines, for parsing notes. */
export function blocksToLines(blocks) {
  const lines = [];

  const walk = (list) => {
    for (const block of list) {
      const content = block[block.type];
      if (content?.rich_text) {
        const text = richTextToPlain(content.rich_text).trim();
        if (text) lines.push(text);
      }
      if (block.type === 'table_row') {
        const cells = (content?.cells ?? []).map((cell) => richTextToPlain(cell).trim());
        if (cells.some(Boolean)) lines.push(cells.join(' | '));
      }
      if (block.children?.length) walk(block.children);
    }
  };

  walk(blocks);
  return lines;
}

/** Fetch a block subtree, following has_children one level at a time. */
export async function fetchBlockTree(client, blockId, depth = 3) {
  const blocks = await client.getBlockChildren(blockId);
  if (depth <= 1) return blocks;

  for (const block of blocks) {
    if (block.has_children) {
      block.children = await fetchBlockTree(client, block.id, depth - 1);
    }
  }
  return blocks;
}
