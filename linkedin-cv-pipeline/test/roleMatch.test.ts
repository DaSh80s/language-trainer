import { describe, expect, it } from 'vitest';
import { extractRoleHints, matchOpportunity, titleSimilarity } from '../src/core/roleMatch.js';
import type { Opportunity } from '../src/types.js';
import { OPPORTUNITIES } from './stubs.js';

describe('extractRoleHints (locked against real jobs-listings@linkedin.com mail)', () => {
  it('parses the real subject format with embedded client ref', () => {
    const hints = extractRoleHints(
      'New application: TEMOS Business Analyst (rfx1560984) from Polina Zemlicka Ulendeeva',
      '',
    );
    expect(hints.title).toBe('TEMOS Business Analyst (rfx1560984)');
    expect(hints.clientRef).toBe('rfx1560984');
  });

  it('survives the double-space variant seen in real mail', () => {
    const hints = extractRoleHints(
      'New application: Identity & Access Management Specialist  from Akhil Sikka',
      '',
    );
    expect(hints.title).toBe('Identity & Access Management Specialist');
    expect(hints.clientRef).toBeNull();
  });

  it('parses a plain subject without a ref', () => {
    expect(extractRoleHints('New application: Data Analyst from Mohamed Achraf Khemakhem', '').title).toBe(
      'Data Analyst',
    );
  });

  it('falls back to the "{title} at {company} · {location}" body line', () => {
    const hints = extractRoleHints(
      'Your job has a new applicant',
      'TEMOS Business Analyst (rfx1560984) at Rigby AG · Zurich, Switzerland',
    );
    expect(hints.title).toBe('TEMOS Business Analyst (rfx1560984)');
    expect(hints.clientRef).toBe('rfx1560984');
  });

  it('returns nulls when nothing matches', () => {
    expect(extractRoleHints('Weekly digest', 'Here is your hiring summary.')).toEqual({
      title: null,
      clientRef: null,
    });
  });
});

describe('titleSimilarity', () => {
  it('ignores (m/f/d)-style noise and casing', () => {
    expect(titleSimilarity('Senior Backend Engineer (m/f/d)', 'senior backend engineer')).toBe(1);
  });

  it('scores unrelated titles low', () => {
    expect(titleSimilarity('Product Manager', 'Senior Backend Engineer')).toBeLessThan(0.5);
  });
});

describe('matchOpportunity', () => {
  const luxOpp: Opportunity = {
    id: 'opp-lux',
    title: 'LUX - Senior Data Engineer SQL (rfx1557530)',
    jobDescription: 'SQL, Data Vault.',
    clientRef: 'rfx1557530',
  };

  it('matches by client ref before anything else, even when titles diverge', () => {
    const hints = extractRoleHints('New application: Data Engineer (rfx1557530) from Jane Doe', '');
    expect(matchOpportunity(hints, [...OPPORTUNITIES, luxOpp])?.id).toBe('opp-lux');
  });

  it('matches by ref embedded in the opportunity title when Client ref. no. is empty', () => {
    const noRef = { ...luxOpp, clientRef: undefined };
    const hints = extractRoleHints('New application: Anything (rfx1557530) from Jane Doe', '');
    expect(matchOpportunity(hints, [noRef])?.id).toBe('opp-lux');
  });

  it('falls back to fuzzy title match above the threshold', () => {
    const hints = extractRoleHints('New application: Senior Backend Engineer from Maya Cohen', '');
    expect(matchOpportunity(hints, OPPORTUNITIES)?.id).toBe('opp-backend');
  });

  it('returns null below the threshold or without hints', () => {
    expect(
      matchOpportunity(extractRoleHints('New application: Chief Astrology Officer from X Y', ''), OPPORTUNITIES),
    ).toBeNull();
    expect(matchOpportunity({ title: null, clientRef: null }, OPPORTUNITIES)).toBeNull();
  });
});
