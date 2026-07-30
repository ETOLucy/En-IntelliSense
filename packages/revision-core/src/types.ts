export type DiffMode = 'words' | 'lines';
export type DiffOperation = 'equal' | 'insert' | 'delete';

export interface DiffSegment {
  operation: DiffOperation;
  value: string;
  count: number;
}

export interface RevisionStats {
  added: number;
  removed: number;
  modified: number;
}

export interface RevisionComparison {
  before: string;
  after: string;
  mode: DiffMode;
  segments: readonly DiffSegment[];
  stats: RevisionStats;
  changed: boolean;
}

export interface SnapshotLike {
  id: string;
  text: string;
  createdAt: string;
}

export interface SnapshotPolicy {
  minimumIntervalMs: number;
  maximumSnapshots: number;
}
