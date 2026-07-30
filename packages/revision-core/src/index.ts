export { compareRevisions } from './compare';
export {
  defaultSnapshotPolicy,
  shouldCreateSnapshot,
  snapshotIdsToPrune,
  summarizeComparison,
  summarizeRevision,
} from './snapshots';
export type {
  DiffMode,
  DiffOperation,
  DiffSegment,
  RevisionComparison,
  RevisionStats,
  SnapshotLike,
  SnapshotPolicy,
} from './types';
