import { describe, expect, it } from 'vitest';
import {
  compareRevisions,
  shouldCreateSnapshot,
  snapshotIdsToPrune,
  summarizeComparison,
} from './index';

describe('compareRevisions', () => {
  it('returns an unchanged comparison for identical text', () => {
    const comparison = compareRevisions('A clear sentence.', 'A clear sentence.', 'words');

    expect(comparison.changed).toBe(false);
    expect(comparison.stats).toEqual({ added: 0, removed: 0, modified: 0 });
    expect(comparison.segments).toEqual([
      { operation: 'equal', value: 'A clear sentence.', count: 3 },
    ]);
  });

  it('preserves whitespace while comparing words and counts a replacement once', () => {
    const comparison = compareRevisions(
      'This is very useful.',
      'This is genuinely useful.',
      'words',
    );

    expect(comparison.segments).toEqual([
      { operation: 'equal', value: 'This is ', count: 2 },
      { operation: 'delete', value: 'very', count: 1 },
      { operation: 'insert', value: 'genuinely', count: 1 },
      { operation: 'equal', value: ' useful.', count: 1 },
    ]);
    expect(comparison.stats).toEqual({ added: 0, removed: 0, modified: 1 });
  });

  it('compares complete lines and distinguishes insertion from replacement', () => {
    const comparison = compareRevisions(
      'Opening\nOld point\nClosing',
      'Opening\nNew point\nSupporting detail\nClosing',
      'lines',
    );

    expect(comparison.stats).toEqual({ added: 1, removed: 0, modified: 1 });
    expect(comparison.segments.filter(segment => segment.operation === 'equal'))
      .toEqual(expect.arrayContaining([
        { operation: 'equal', value: 'Opening\n', count: 1 },
        { operation: 'equal', value: 'Closing', count: 1 },
      ]));
  });
});

describe('revision snapshots', () => {
  it('generates a user-facing summary from comparison statistics', () => {
    const comparison = compareRevisions('Old sentence.', 'New sentence plus detail.', 'words');

    expect(summarizeComparison(comparison)).toBe('1 modified, 2 added');
  });

  it('deduplicates snapshots and applies the interval unless forced', () => {
    const previous = {
      id: 'previous',
      text: 'First draft',
      createdAt: '2026-07-30T00:00:00.000Z',
    };

    expect(shouldCreateSnapshot(previous, {
      text: 'First draft',
      createdAt: '2026-07-30T00:01:00.000Z',
    })).toBe(false);
    expect(shouldCreateSnapshot(previous, {
      text: 'Second draft',
      createdAt: '2026-07-30T00:00:10.000Z',
    })).toBe(false);
    expect(shouldCreateSnapshot(previous, {
      text: 'Second draft',
      createdAt: '2026-07-30T00:00:10.000Z',
    }, true)).toBe(true);
  });

  it('prunes only snapshots beyond the retention limit', () => {
    const snapshots = Array.from({ length: 4 }, (_, index) => ({
      id: `revision-${index}`,
      text: `${index}`,
      createdAt: new Date(index * 1_000).toISOString(),
    }));

    expect(snapshotIdsToPrune(snapshots, {
      minimumIntervalMs: 0,
      maximumSnapshots: 2,
    })).toEqual(['revision-1', 'revision-0']);
  });
});
