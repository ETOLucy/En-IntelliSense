import { compareRevisions } from './compare';
import type {
  RevisionComparison,
  SnapshotLike,
  SnapshotPolicy,
} from './types';

export const defaultSnapshotPolicy: SnapshotPolicy = {
  minimumIntervalMs: 30_000,
  maximumSnapshots: 100,
};

export function summarizeComparison(comparison: RevisionComparison): string {
  if (!comparison.changed) return 'No text changes';
  const parts = [
    comparison.stats.modified ? `${comparison.stats.modified} modified` : '',
    comparison.stats.added ? `${comparison.stats.added} added` : '',
    comparison.stats.removed ? `${comparison.stats.removed} removed` : '',
  ].filter(Boolean);
  return parts.join(', ');
}

export function summarizeRevision(before: string, after: string): string {
  return summarizeComparison(compareRevisions(before, after, 'words'));
}

export function shouldCreateSnapshot(
  previous: SnapshotLike | undefined,
  next: Pick<SnapshotLike, 'text' | 'createdAt'>,
  force = false,
  policy: SnapshotPolicy = defaultSnapshotPolicy,
): boolean {
  if (!previous) return true;
  if (previous.text === next.text) return false;
  if (force) return true;
  return Date.parse(next.createdAt) - Date.parse(previous.createdAt) >= policy.minimumIntervalMs;
}

export function snapshotIdsToPrune(
  snapshots: readonly SnapshotLike[],
  policy: SnapshotPolicy = defaultSnapshotPolicy,
): string[] {
  return [...snapshots]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(policy.maximumSnapshots)
    .map(snapshot => snapshot.id);
}
