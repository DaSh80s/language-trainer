import { describe, expect, it } from 'vitest';
import { extractJobTitle, matchOpportunity, titleSimilarity } from '../src/core/roleMatch.js';
import { OPPORTUNITIES } from './stubs.js';

describe('extractJobTitle', () => {
  it('extracts from the standard LinkedIn subject', () => {
    expect(extractJobTitle('New application: Senior Backend Engineer from Maya Cohen', '')).toBe(
      'Senior Backend Engineer',
    );
  });

  it('extracts from the "for" subject variant', () => {
    expect(extractJobTitle('New application for: Product Manager from Avi Levi', '')).toBe('Product Manager');
  });

  it('falls back to the body when the subject is unhelpful', () => {
    expect(extractJobTitle('You have a new applicant', 'Avi Levi applied to your job: Data Analyst.')).toBe(
      'Data Analyst',
    );
  });

  it('returns null when nothing matches', () => {
    expect(extractJobTitle('Weekly digest', 'Here is your hiring summary.')).toBeNull();
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
  it('picks the best opportunity above the threshold', () => {
    expect(matchOpportunity('Senior Backend Engineer', OPPORTUNITIES)?.id).toBe('opp-backend');
    expect(matchOpportunity('Data Analyst', OPPORTUNITIES)?.id).toBe('opp-data');
  });

  it('returns null below the threshold or without a title', () => {
    expect(matchOpportunity('Chief Astrology Officer', OPPORTUNITIES)).toBeNull();
    expect(matchOpportunity(null, OPPORTUNITIES)).toBeNull();
  });
});
