import Dexie, { type EntityTable } from 'dexie';
import type { EnglishVariant, LearnerLevel, Revision, WritingFormat } from '@writemelo/contracts';

export interface LocalDocument {
  id: string;
  title: string;
  text: string;
  format: WritingFormat;
  level: LearnerLevel;
  variant: EnglishVariant;
  updatedAt: string;
}

class WriteMeloDatabase extends Dexie {
  documents!: EntityTable<LocalDocument, 'id'>;
  revisions!: EntityTable<Revision, 'id'>;

  constructor() {
    super('WriteMelo');
    this.version(1).stores({
      documents: 'id, updatedAt',
      revisions: 'id, documentId, createdAt',
    });
  }
}

export const db = new WriteMeloDatabase();
