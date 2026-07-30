import { describe, expect, it } from 'vitest';
import { isSupportedTextFileName } from './file-access';

describe('local text file support', () => {
  it('accepts only formats that WriteMelo can round-trip as text', () => {
    expect(['draft.txt', 'notes.text', 'essay.md', 'README.MARKDOWN']
      .every(isSupportedTextFileName)).toBe(true);
    expect(['report.docx', 'paper.pdf', 'archive.rtf']
      .some(isSupportedTextFileName)).toBe(false);
  });
});
