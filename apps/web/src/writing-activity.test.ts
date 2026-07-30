import { describe, expect, it } from 'vitest';
import { addWritingActivity, localDateKey, writingStreak } from './writing-activity';

describe('writing activity', () => {
  it('counts only positive word additions', () => {
    const initial = { days: { '2026-07-30': 4 } };
    const added = addWritingActivity(initial, '2026-07-30', 3);

    expect(added.days['2026-07-30']).toBe(7);
    expect(addWritingActivity(added, '2026-07-30', -2)).toBe(added);
  });

  it('counts consecutive local calendar days ending today', () => {
    const activity = {
      days: {
        '2026-07-28': 2,
        '2026-07-29': 5,
        '2026-07-30': 1,
      },
    };

    expect(writingStreak(activity, new Date(2026, 6, 30, 20))).toBe(3);
    expect(localDateKey(new Date(2026, 6, 4))).toBe('2026-07-04');
  });
});
