import { describe, expect, it } from 'vitest';

import { buildTriggerPattern } from './index.js';
import { RegisteredGroup } from './types.js';

function makeGroup(trigger: string): RegisteredGroup {
  return {
    name: 'Test Group',
    folder: 'test-group',
    trigger,
    added_at: '2026-02-25T00:00:00.000Z',
  };
}

describe('buildTriggerPattern', () => {
  it('matches trigger with leading @', () => {
    const pattern = buildTriggerPattern(makeGroup('@AI4U'));
    expect(pattern.test('@AI4U hello')).toBe(true);
    expect(pattern.test('@ai4u hello')).toBe(true);
    expect(pattern.test('hello @AI4U')).toBe(false);
  });

  it('matches trigger without leading @', () => {
    const pattern = buildTriggerPattern(makeGroup('Procaffe'));
    expect(pattern.test('@Procaffe hello')).toBe(true);
    expect(pattern.test('@procaffe hello')).toBe(true);
  });

  it('escapes regex special characters in trigger', () => {
    const pattern = buildTriggerPattern(makeGroup('@A.I4U'));
    expect(pattern.test('@A.I4U hi')).toBe(true);
    expect(pattern.test('@A-I4U hi')).toBe(false);
  });

  it('matches whole trigger token boundary', () => {
    const pattern = buildTriggerPattern(makeGroup('@AI4U'));
    expect(pattern.test('@AI4U-team')).toBe(true);
    expect(pattern.test('@AI4Users')).toBe(false);
  });
});
