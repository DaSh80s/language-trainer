import { describe, expect, it } from 'vitest';
import {
  CLIENT_AFFINITY_MIN,
  findClientAffinities,
  profileRoleSimilarity,
  rankCrossCandidates,
} from '../src/core/affinity.js';
import type { CandidateProfile, Opportunity } from '../src/types.js';

const profile: CandidateProfile = {
  name: 'Dana Mizrahi',
  email: 'dana@example.com',
  currentTitle: 'Senior Data Engineer',
  skills: ['SQL', 'Data Vault', 'Python'],
  education: [],
};

const opp = (id: string, title: string, jd: string, stage: string, clientIds?: string[]): Opportunity => ({
  id,
  title,
  jobDescription: jd,
  stage,
  ...(clientIds ? { clientIds } : {}),
});

describe('rankCrossCandidates', () => {
  const roles = [
    opp('applied', 'Senior Data Engineer SQL', 'SQL, Data Vault.', 'Sourcing priority 1'),
    opp('similar', 'Data Engineer', 'SQL pipelines, Python, Data Vault modelling.', 'Sourcing priority 1'),
    opp('low-prio', 'Data Engineer (pooling)', 'SQL, Python.', 'Open to all'),
    opp('unrelated', 'Office Manager', 'Front desk, scheduling.', 'Sourcing priority 2'),
  ];

  it('keeps only priority-stage roles that resemble the candidate, excluding the applied one', () => {
    expect(rankCrossCandidates(profile, roles, 'applied').map((o) => o.id)).toEqual(['similar']);
  });

  it('caps the number of roles sent to (paid) scoring', () => {
    const many = Array.from({ length: 6 }, (_, i) =>
      opp(`r${i}`, 'Senior Data Engineer', 'SQL, Python, Data Vault.', 'Sourcing priority 1'),
    );
    expect(rankCrossCandidates(profile, many, null)).toHaveLength(3);
  });
});

describe('findClientAffinities', () => {
  const history = [
    opp('h1', 'LUX - Senior Data Engineer SQL (rfx1557530)', 'Expert SQL, Data Vault, Python.', 'Done deal!', ['client-jb']),
    opp('h2', 'Data Engineer Platform', 'SQL, Data Vault pipelines, Python.', 'Extended', ['client-jb']),
    opp('h3', 'Office Manager', 'Front desk.', 'Done deal!', ['client-other']),
    opp('h4', 'Senior Data Engineer', 'SQL, Data Vault, Python.', 'Sourcing priority 1', ['client-live']), // not hired
  ];

  it('finds clients who hired similar roles, grouping the evidence', () => {
    const hits = findClientAffinities(profile, history);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.clientId).toBe('client-jb');
    expect(hits[0]!.viaRoles).toHaveLength(2);
  });

  it('ignores dissimilar history and roles never hired for', () => {
    const ids = findClientAffinities(profile, history).map((h) => h.clientId);
    expect(ids).not.toContain('client-other');
    expect(ids).not.toContain('client-live');
  });
});

describe('profileRoleSimilarity', () => {
  it('clears the affinity threshold only when title and skills both align', () => {
    const aligned = opp('a', 'Senior Data Engineer', 'SQL, Data Vault, Python.', 'Done deal!');
    const skillsOnly = opp('b', 'Quantitative Researcher', 'SQL and Python heavy.', 'Done deal!');
    expect(profileRoleSimilarity(profile, aligned)).toBeGreaterThanOrEqual(CLIENT_AFFINITY_MIN);
    expect(profileRoleSimilarity(profile, skillsOnly)).toBeLessThan(CLIENT_AFFINITY_MIN);
  });
});
