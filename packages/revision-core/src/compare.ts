import { diffLines, diffWordsWithSpace, type Change } from 'diff';
import type {
  DiffMode,
  DiffOperation,
  DiffSegment,
  RevisionComparison,
  RevisionStats,
} from './types';

function operationOf(change: Change): DiffOperation {
  if (change.added) return 'insert';
  if (change.removed) return 'delete';
  return 'equal';
}

function countWords(value: string): number {
  return value.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g)?.length ?? 0;
}

function countUnits(change: Change, mode: DiffMode): number {
  if (mode === 'lines') return change.count ?? 0;
  return countWords(change.value);
}

function toSegments(changes: readonly Change[], mode: DiffMode): DiffSegment[] {
  return changes.map(change => ({
    operation: operationOf(change),
    value: change.value,
    count: countUnits(change, mode),
  }));
}

function calculateStats(segments: readonly DiffSegment[]): RevisionStats {
  const stats: RevisionStats = { added: 0, removed: 0, modified: 0 };

  for (let index = 0; index < segments.length; index += 1) {
    const current = segments[index];
    if (!current || current.operation === 'equal') continue;

    const next = segments[index + 1];
    const isReplacement = next
      && next.operation !== 'equal'
      && next.operation !== current.operation;

    if (!isReplacement) {
      if (current.operation === 'insert') stats.added += current.count;
      if (current.operation === 'delete') stats.removed += current.count;
      continue;
    }

    const inserted = current.operation === 'insert' ? current.count : next.count;
    const deleted = current.operation === 'delete' ? current.count : next.count;
    const modified = Math.min(inserted, deleted);
    stats.modified += modified;
    stats.added += inserted - modified;
    stats.removed += deleted - modified;
    index += 1;
  }

  return stats;
}

export function compareRevisions(
  before: string,
  after: string,
  mode: DiffMode = 'words',
): RevisionComparison {
  const changes = mode === 'lines'
    ? diffLines(before, after)
    : diffWordsWithSpace(before, after);
  const segments = toSegments(changes, mode);

  return {
    before,
    after,
    mode,
    segments,
    stats: calculateStats(segments),
    changed: segments.some(segment => segment.operation !== 'equal'),
  };
}
